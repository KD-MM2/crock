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

    const targetVersion = this.normalizeVersion(options.version ?? this.defaultVersion);
    const manifest = await readJsonSafe<{ version: string; binaryPath: string }>(this.manifestPath);

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
      const child = spawn(binaryPath, ['--version']);
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
