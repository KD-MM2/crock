import { app } from 'electron';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, stat, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import type { ReadableStream as NodeReadableStream } from 'node:stream/web';
import decompress from 'decompress';
import decompressTargz from 'decompress-targz';
import decompressUnzip from 'decompress-unzip';
import fg from 'fast-glob';
import semver from 'semver';
import { spawn } from 'node:child_process';
import which from 'which';
import type { Asset, Author, Release, Reactions } from '../types/release';

export type EnsureOptions = {
  preferSystem?: boolean;
  version?: string;
};

export type CrocBinaryTarget = {
  assetName: string;
  binaryName: string;
  platform: NodeJS.Platform;
  arch: NodeJS.Architecture;
};

const OWNER = 'schollz';
const REPO = 'croc';
const DEFAULT_VERSION = 'v10.2.5';

const manifestFileName = 'manifest.json';
const RELEASE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function pathExists(target: string) {
  try {
    await stat(target);
    return true;
  } catch (error) {
    return false;
  }
}

async function computeSha256(filePath: string) {
  const hash = createHash('sha256');
  await pipeline(fs.createReadStream(filePath), hash);
  return hash.digest('hex');
}

async function readJsonSafe<T>(filePath: string): Promise<T | null> {
  try {
    const content = await readFile(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch (error) {
    return null;
  }
}

async function ensureDir(dir: string) {
  await mkdir(dir, { recursive: true });
}

function resolveGithubAsset(version: string, target: CrocBinaryTarget) {
  const base = `https://github.com/${OWNER}/${REPO}/releases/download/${version}`;
  return `${base}/${target.assetName}`;
}

async function fetchText(url: string) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'crock-app/1.0',
      Accept: 'application/octet-stream'
    }
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  return res.text();
}

async function downloadFile(url: string, destination: string) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'crock-app/1.0',
      Accept: 'application/octet-stream'
    }
  });
  if (!res.ok || !res.body) {
    throw new Error(`Failed to download ${url}: ${res.status} ${res.statusText}`);
  }
  await ensureDir(path.dirname(destination));
  const nodeStream = Readable.fromWeb(res.body as unknown as NodeReadableStream<Uint8Array>);
  await pipeline(nodeStream, fs.createWriteStream(destination));
}

function resolveTarget(version: string): CrocBinaryTarget {
  const platform = os.platform();
  const arch = os.arch();

  if (platform === 'win32') {
    if (arch === 'arm64') {
      return { platform, arch, assetName: `croc_${version}_Windows-ARM64.zip`, binaryName: 'croc.exe' };
    }
    if (arch === 'arm') {
      return { platform, arch, assetName: `croc_${version}_Windows-ARM.zip`, binaryName: 'croc.exe' };
    }
    if (arch === 'ia32') {
      return { platform, arch, assetName: `croc_${version}_Windows-32bit.zip`, binaryName: 'croc.exe' };
    }
    return { platform, arch, assetName: `croc_${version}_Windows-64bit.zip`, binaryName: 'croc.exe' };
  }

  if (platform === 'darwin') {
    if (arch === 'arm64') {
      return { platform, arch, assetName: `croc_${version}_macOS-ARM64.tar.gz`, binaryName: 'croc' };
    }
    return { platform, arch, assetName: `croc_${version}_macOS-64bit.tar.gz`, binaryName: 'croc' };
  }

  // Linux and others
  if (arch === 'arm64') {
    return { platform, arch, assetName: `croc_${version}_Linux-ARM64.tar.gz`, binaryName: 'croc' };
  }
  if (arch === 'arm') {
    return { platform, arch, assetName: `croc_${version}_Linux-ARM.tar.gz`, binaryName: 'croc' };
  }
  if (arch === 'ia32') {
    return { platform, arch, assetName: `croc_${version}_Linux-32bit.tar.gz`, binaryName: 'croc' };
  }
  return { platform, arch, assetName: `croc_${version}_Linux-64bit.tar.gz`, binaryName: 'croc' };
}

export class CrocBinaryManager {
  private readonly baseDir: string;
  private readonly manifestPath: string;
  private ensurePromise: Promise<string> | null = null;
  private releaseCache: { expiresAt: number; releases: Release[] } | null = null;

  constructor(private readonly defaultVersion: string = DEFAULT_VERSION) {
    const userData = app.getPath('userData');
    this.baseDir = path.join(userData, 'bin');
    this.manifestPath = path.join(this.baseDir, manifestFileName);
  }

  async ensure(options: EnsureOptions = {}): Promise<string> {
    if (!this.ensurePromise) {
      this.ensurePromise = this.resolveEnsure(options).finally(() => {
        this.ensurePromise = null;
      });
    }
    return this.ensurePromise;
  }

  private async resolveEnsure(options: EnsureOptions): Promise<string> {
    if (options.preferSystem) {
      const systemBinary = await this.tryResolveSystemBinary();
      if (systemBinary) {
        return systemBinary;
      }
    }

    const manifest = await readJsonSafe<{ version: string; binaryPath: string }>(this.manifestPath);
    const normalizedOptionVersion = options.version ? this.normalizeVersion(options.version) : null;
    const targetVersion = normalizedOptionVersion ?? manifest?.version ?? this.normalizeVersion(this.defaultVersion);

    if (manifest?.version === targetVersion && (await pathExists(manifest.binaryPath))) {
      return manifest.binaryPath;
    }

    const binaryDir = path.join(this.baseDir, `croc-${targetVersion}`);
    const binaryPath = path.join(binaryDir, os.platform() === 'win32' ? 'croc.exe' : 'croc');

    if (await pathExists(binaryPath)) {
      await this.updateManifest(targetVersion, binaryPath);
      return binaryPath;
    }

    await this.downloadAndExtract(targetVersion, binaryDir);
    await this.updateManifest(targetVersion, binaryPath);
    return binaryPath;
  }

  async getVersion(binaryPath: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const child = spawn(binaryPath, ['--version'], {
        stdio: ['ignore', 'pipe', 'pipe']
      });
      let output = '';
      let err = '';
      child.stdout.on('data', (chunk) => {
        output += chunk.toString();
      });
      child.stderr.on('data', (chunk) => {
        err += chunk.toString();
      });
      child.once('close', (code) => {
        if (code !== 0) {
          reject(new Error(err || `croc exited with code ${code}`));
          return;
        }
        resolve(output.trim());
      });
      child.once('error', (error) => reject(error));
    });
  }

  async update(version?: string): Promise<string> {
    const targetVersion = this.normalizeVersion(version ?? this.defaultVersion);
    const binaryDir = path.join(this.baseDir, `croc-${targetVersion}`);
    const binaryPath = path.join(binaryDir, os.platform() === 'win32' ? 'croc.exe' : 'croc');
    await this.downloadAndExtract(targetVersion, binaryDir, true);
    await this.updateManifest(targetVersion, binaryPath);
    return binaryPath;
  }

  async ensureVersion(version: string): Promise<{ version: string; path: string }> {
    const normalized = this.normalizeVersion(version);
    const binaryPath = await this.ensure({ version: normalized });
    return { version: normalized, path: binaryPath };
  }

  async getInstalledBinary(): Promise<{ version: string; path: string } | null> {
    const manifest = await readJsonSafe<{ version: string; binaryPath: string }>(this.manifestPath);
    if (!manifest) return null;
    if (!(await pathExists(manifest.binaryPath))) {
      return null;
    }
    return { version: manifest.version, path: manifest.binaryPath };
  }

  async listReleases(): Promise<Release[]> {
    if (this.releaseCache && this.releaseCache.expiresAt > Date.now()) {
      return this.releaseCache.releases;
    }

    const response = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/releases`, {
      headers: {
        'User-Agent': 'crock-app/1.0',
        Accept: 'application/vnd.github+json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch releases: ${response.status} ${response.statusText}`);
    }

    const payload = (await response.json()) as Array<Record<string, unknown>>;
    const releases: Release[] = payload.map((entry) => this.parseRelease(entry));

    this.releaseCache = {
      expiresAt: Date.now() + RELEASE_CACHE_TTL_MS,
      releases
    };

    return releases;
  }

  private parseRelease(entry: Record<string, unknown>): Release {
    return {
      url: String(entry['url'] ?? ''),
      assets_url: String(entry['assets_url'] ?? ''),
      upload_url: String(entry['upload_url'] ?? ''),
      html_url: String(entry['html_url'] ?? ''),
      id: Number(entry['id'] ?? 0),
      author: this.parseAuthor(entry['author']),
      node_id: String(entry['node_id'] ?? ''),
      tag_name: String(entry['tag_name'] ?? ''),
      target_commitish: String(entry['target_commitish'] ?? ''),
      name: String(entry['name'] ?? ''),
      draft: Boolean(entry['draft']),
      immutable: Boolean(entry['immutable']),
      prerelease: Boolean(entry['prerelease']),
      created_at: this.parseDate(entry['created_at']),
      updated_at: this.parseDate(entry['updated_at']),
      published_at: this.parseDate(entry['published_at']),
      assets: Array.isArray(entry['assets']) ? entry['assets'].map((asset) => this.parseAsset(asset)) : [],
      tarball_url: String(entry['tarball_url'] ?? ''),
      zipball_url: String(entry['zipball_url'] ?? ''),
      body: String(entry['body'] ?? ''),
      reactions: this.parseReactions(entry['reactions']),
      mentions_count: Number(entry['mentions_count'] ?? 0)
    };
  }

  private parseAsset(raw: unknown): Asset {
    const entry = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
    return {
      url: String(entry['url'] ?? ''),
      id: Number(entry['id'] ?? 0),
      node_id: String(entry['node_id'] ?? ''),
      name: String(entry['name'] ?? ''),
      label: String(entry['label'] ?? ''),
      uploader: this.parseAuthor(entry['uploader']),
      content_type: String(entry['content_type'] ?? ''),
      state: String(entry['state'] ?? ''),
      size: Number(entry['size'] ?? 0),
      digest: String(entry['digest'] ?? ''),
      download_count: Number(entry['download_count'] ?? 0),
      created_at: this.parseDate(entry['created_at']),
      updated_at: this.parseDate(entry['updated_at']),
      browser_download_url: String(entry['browser_download_url'] ?? '')
    };
  }

  private parseAuthor(raw: unknown): Author {
    const entry = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
    return {
      login: String(entry['login'] ?? ''),
      id: Number(entry['id'] ?? 0),
      node_id: String(entry['node_id'] ?? ''),
      avatar_url: String(entry['avatar_url'] ?? ''),
      gravatar_id: String(entry['gravatar_id'] ?? ''),
      url: String(entry['url'] ?? ''),
      html_url: String(entry['html_url'] ?? ''),
      followers_url: String(entry['followers_url'] ?? ''),
      following_url: String(entry['following_url'] ?? ''),
      gists_url: String(entry['gists_url'] ?? ''),
      starred_url: String(entry['starred_url'] ?? ''),
      subscriptions_url: String(entry['subscriptions_url'] ?? ''),
      organizations_url: String(entry['organizations_url'] ?? ''),
      repos_url: String(entry['repos_url'] ?? ''),
      events_url: String(entry['events_url'] ?? ''),
      received_events_url: String(entry['received_events_url'] ?? ''),
      type: String(entry['type'] ?? ''),
      user_view_type: String(entry['user_view_type'] ?? ''),
      site_admin: Boolean(entry['site_admin'])
    };
  }

  private parseReactions(raw: unknown): Reactions {
    const entry = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
    return {
      url: String(entry['url'] ?? ''),
      total_count: Number(entry['total_count'] ?? 0),
      '+1': Number(entry['+1'] ?? 0),
      '-1': Number(entry['-1'] ?? 0),
      laugh: Number(entry['laugh'] ?? 0),
      hooray: Number(entry['hooray'] ?? 0),
      confused: Number(entry['confused'] ?? 0),
      heart: Number(entry['heart'] ?? 0),
      rocket: Number(entry['rocket'] ?? 0),
      eyes: Number(entry['eyes'] ?? 0)
    };
  }

  private parseDate(value: unknown): Date {
    if (value == null) return new Date(0);
    const iso = String(value);
    const timestamp = Date.parse(iso);
    if (Number.isNaN(timestamp)) return new Date(0);
    return new Date(timestamp);
  }

  private async tryResolveSystemBinary(): Promise<string | null> {
    try {
      const binPath = await which('croc');
      const version = await this.getVersion(binPath);
      if (version && version.startsWith('v')) {
        return binPath;
      }
      return binPath;
    } catch (error) {
      return null;
    }
  }

  private normalizeVersion(version: string): string {
    const trimmed = version.startsWith('v') ? version : `v${version}`;
    if (!semver.valid(trimmed.replace(/^v/, ''))) {
      throw new Error(`Invalid croc version: ${version}`);
    }
    return trimmed;
  }

  private async downloadAndExtract(version: string, targetDir: string, force = false) {
    const target = resolveTarget(version);
    const assetUrl = resolveGithubAsset(version, target);
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'croc-download-'));
    const assetDownloadPath = path.join(tmpDir, target.assetName);

    await downloadFile(assetUrl, assetDownloadPath);

    await this.verifyChecksum(version, target.assetName, assetDownloadPath).catch((error) => {
      console.warn('[croc] checksum verification skipped', error);
    });

    if (force && (await pathExists(targetDir))) {
      await rm(targetDir, { recursive: true, force: true });
    }

    await ensureDir(targetDir);

    await decompress(assetDownloadPath, targetDir, {
      plugins: [decompressTargz(), decompressUnzip()]
    });

    await rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);

    const binaryName = target.binaryName;
    const potentialBinary = path.join(targetDir, binaryName);

    let resolvedBinary = potentialBinary;

    if (!(await pathExists(resolvedBinary))) {
      const matches = await fg([`**/${binaryName}`, '**/croc', '**/croc.exe'], {
        cwd: targetDir,
        absolute: true,
        suppressErrors: true
      });
      if (!matches.length) {
        throw new Error(`Downloaded croc archive did not contain ${binaryName}`);
      }
      resolvedBinary = matches[0];
    }

    if (os.platform() !== 'win32') {
      await fs.promises.chmod(resolvedBinary, 0o755);
    }

    if (resolvedBinary !== potentialBinary) {
      await ensureDir(path.dirname(potentialBinary));
      await fs.promises.copyFile(resolvedBinary, potentialBinary);
    }
  }

  private async verifyChecksum(version: string, assetName: string, assetPath: string) {
    const checksums = await fetchText(`https://github.com/${OWNER}/${REPO}/releases/download/${version}/croc_${version}_checksums.txt`);
    const lines = checksums.split(/\r?\n/).filter(Boolean);
    const entry = lines.find((line) => line.includes(assetName));
    if (!entry) return;
    const [expected] = entry.trim().split(/\s+/);
    const actual = await computeSha256(assetPath);
    if (expected.toLowerCase() !== actual.toLowerCase()) {
      throw new Error(`Checksum mismatch for ${assetName}`);
    }
  }

  private async updateManifest(version: string, binaryPath: string) {
    await ensureDir(this.baseDir);
    const payload = { version, binaryPath };
    await writeFile(this.manifestPath, JSON.stringify(payload, null, 2), 'utf-8');

    const currentLink = path.join(this.baseDir, 'current');
    try {
      await rm(currentLink, { force: true });
      await symlink(binaryPath, currentLink);
    } catch (error) {
      // Symlinks may fail on Windows; ignore.
    }
  }
}
