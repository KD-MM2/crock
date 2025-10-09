import { ipcMain } from 'electron';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import type { HistoryFileEntry, HistoryRecord } from '../../types/history';
import type { ReceiveOptions, SendMode, SendOptions } from '../../types/croc';
import type { Settings } from '../../types/settings';
import type { ReleaseInfo } from '../../types/release';
import { parseHostPort } from '../../utils/network';
import type { AppIpcContext } from '../context';

const CODE_REGEX = /^[a-z0-9-]{6,}$/i;

const sendPayloadBase = z.object({
  id: z.string().optional(),
  code: z.string().optional(),
  text: z.string().optional(),
  paths: z.array(z.string()).optional(),
  mode: z.enum(['files', 'text']).optional(),
  relay: z.string().optional(),
  relay6: z.string().optional(),
  pass: z.string().optional(),
  socks5: z.string().optional(),
  local: z.boolean().optional(),
  internalDns: z.boolean().optional(),
  noCompress: z.boolean().optional(),
  exclude: z.array(z.string()).optional(),
  throttleUpload: z.string().optional(),
  yes: z.boolean().optional(),
  extraFlags: z.string().optional()
});

type SendPayloadInput = z.infer<typeof sendPayloadBase>;

const sendSchema = sendPayloadBase.superRefine((data: SendPayloadInput, ctx: z.RefinementCtx) => {
  const mode: SendMode = data.mode ?? (data.text ? 'text' : 'files');
  if (mode === 'text' && (!data.text || !data.text.trim())) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Text payload is required for text mode', path: ['text'] });
  }
  if (mode === 'files' && !data.paths?.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'At least one path is required', path: ['paths'] });
  }
});

const receivePayloadBase = z.object({
  id: z.string().optional(),
  code: z.string(),
  relay: z.string().optional(),
  relay6: z.string().optional(),
  pass: z.string().optional(),
  socks5: z.string().optional(),
  local: z.boolean().optional(),
  internalDns: z.boolean().optional(),
  overwrite: z.boolean().optional(),
  yes: z.boolean().optional(),
  outDir: z.string().optional(),
  curve: z.enum(['curve25519', 'p256', 'p384', 'p521']).optional(),
  extraFlags: z.string().optional()
});

type ReceivePayloadInput = z.infer<typeof receivePayloadBase>;

const receiveSchema = receivePayloadBase.superRefine((data: ReceivePayloadInput, ctx: z.RefinementCtx) => {
  if (!data.code?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Code is required', path: ['code'] });
  }
});

async function collectFileEntries(paths: string[]): Promise<HistoryFileEntry[]> {
  const entries: HistoryFileEntry[] = [];
  for (const p of paths) {
    const resolved = path.resolve(p);
    const info = await stat(resolved);
    entries.push({
      name: path.basename(resolved),
      size: info.isFile() ? info.size : undefined,
      path: resolved,
      kind: info.isDirectory() ? 'folder' : 'file'
    });
  }
  return entries;
}

function sanitizeCode(settings: Settings, code: string | undefined): string | undefined {
  if (!code) return undefined;
  if (settings.advanced?.allowCodeFormatValidation) {
    if (!CODE_REGEX.test(code)) {
      throw new Error('Invalid code format');
    }
  }
  return code;
}

function mergeExtraFlags(settings: Settings, extraFlags?: string): string | undefined {
  const flags = [settings.advanced?.extraFlags, extraFlags].filter((value) => typeof value === 'string' && value.trim().length > 0) as string[];
  if (!flags.length) return undefined;
  return flags.join(' ');
}

function ensureHostPort(value: string | undefined, label: string): string | undefined {
  if (!value) return undefined;
  if (!parseHostPort(value)) {
    throw new Error(`Invalid ${label} address: ${value}`);
  }
  return value;
}

function buildSendOptions(payload: SendPayloadInput, settings: Settings): SendOptions {
  const mode: SendMode = payload.mode ?? (payload.text ? 'text' : 'files');
  const defaults = settings.transferDefaults.send;
  const relayDefaults = settings.relayProxy;
  const options: SendOptions = {
    id: payload.id,
    mode,
    code: sanitizeCode(settings, payload.code),
    local: payload.local ?? defaults.local,
    internalDns: payload.internalDns ?? defaults.internalDns,
    noCompress: payload.noCompress ?? defaults.noCompress,
    exclude: payload.exclude?.length ? payload.exclude : defaults.exclude,
    throttleUpload: payload.throttleUpload ?? defaults.throttleUpload,
    yes: payload.yes,
    extraFlags: mergeExtraFlags(settings, payload.extraFlags)
  };

  const relay = payload.relay ?? relayDefaults.defaultRelay.host;
  options.relay = ensureHostPort(relay, 'relay');
  options.relay6 = ensureHostPort(payload.relay6 ?? relayDefaults.defaultRelay.relay6, 'relay6');
  options.pass = payload.pass ?? relayDefaults.defaultRelay.pass;
  options.socks5 = ensureHostPort(payload.socks5 ?? relayDefaults.proxy?.socks5, 'socks5');

  if (mode === 'text') {
    options.text = payload.text ?? '';
  } else {
    options.paths = (payload.paths ?? []).map((p: string) => path.resolve(p));
  }

  return options;
}

async function buildReceiveOptions(payload: ReceivePayloadInput, settings: Settings): Promise<ReceiveOptions> {
  const defaults = settings.transferDefaults.receive;
  const relayDefaults = settings.relayProxy;
  const outDir = payload.outDir ? path.resolve(payload.outDir) : path.resolve(settings.general.downloadDir || path.join(process.cwd(), 'Downloads'));
  await mkdir(outDir, { recursive: true });

  return {
    id: payload.id,
    code: sanitizeCode(settings, payload.code) ?? payload.code,
    relay: ensureHostPort(payload.relay ?? relayDefaults.defaultRelay.host, 'relay'),
    relay6: ensureHostPort(payload.relay6 ?? relayDefaults.defaultRelay.relay6, 'relay6'),
    pass: payload.pass ?? relayDefaults.defaultRelay.pass,
    socks5: ensureHostPort(payload.socks5 ?? relayDefaults.proxy?.socks5, 'socks5'),
    local: payload.local ?? defaults.local,
    internalDns: payload.internalDns ?? defaults.internalDns,
    overwrite: payload.overwrite ?? defaults.overwrite,
    yes: payload.yes ?? defaults.yes,
    curve: payload.curve ?? defaults.curve,
    outDir,
    extraFlags: mergeExtraFlags(settings, payload.extraFlags)
  };
}

function normalizeHistoryOptions(options: SendOptions | ReceiveOptions): Record<string, unknown> {
  const copy = { ...options } as Record<string, unknown>;
  delete copy.paths;
  delete copy.text;
  delete copy.extraFlags;
  return copy;
}

function formatDuration(durationMs?: number): string | undefined {
  if (!durationMs) return undefined;
  const seconds = Math.round(durationMs / 1000);
  const h = Math.floor(seconds / 3600)
    .toString()
    .padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60)
    .toString()
    .padStart(2, '0');
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export function registerCrocHandlers(context: AppIpcContext) {
  const { processRunner, historyStore, settingsStore, binaryManager, capabilityDetector, commandBuilder } = context;

  processRunner.on('progress', (payload) => {
    if (payload.raw) {
      historyStore.appendLog(payload.id, payload.raw);
    } else if (payload.message) {
      historyStore.appendLog(payload.id, payload.message);
    }

    const patch: Partial<HistoryRecord> = {
      status: payload.phase
    };
    if (payload.code) patch.code = payload.code;
    historyStore.update(payload.id, patch);
  });

  processRunner.on('done', (payload) => {
    const status = payload.canceled ? 'canceled' : payload.success ? 'done' : 'failed';
    historyStore.update(payload.id, {
      status,
      finishedAt: payload.finishedAt,
      duration: formatDuration(payload.durationMs)
    });
    historyStore.pruneRetention();
  });

  ipcMain.handle('croc:getVersion', async () => {
    const binaryPath = await binaryManager.ensure();
    const version = await binaryManager.getVersion(binaryPath);
    settingsStore.set({
      binary: {
        crocVersion: version,
        crocPath: binaryPath
      }
    });
    return version;
  });

  ipcMain.handle('croc:listVersions', async (): Promise<ReleaseInfo[]> => {
    const releases = await binaryManager.listReleases();
    return releases.map((release) => ({
      tagName: release.tag_name,
      name: release.name,
      prerelease: release.prerelease,
      draft: release.draft,
      immutable: Boolean(release.immutable),
      publishedAt: release.published_at ? release.published_at.toISOString() : undefined
    }));
  });

  ipcMain.handle('croc:installVersion', async (_event, rawVersion: unknown) => {
    if (typeof rawVersion !== 'string' || !rawVersion.trim()) {
      throw new Error('Version is required');
    }

    const { path: binaryPath } = await binaryManager.ensureVersion(rawVersion.trim());
    const version = await binaryManager.getVersion(binaryPath);

    processRunner.setBinaryPath(binaryPath);
    capabilityDetector.setBinaryPath(binaryPath);
    const capabilities = await capabilityDetector.getCapabilities();
    commandBuilder.setCapabilities(capabilities);

    settingsStore.set({
      binary: {
        crocVersion: version,
        crocPath: binaryPath
      }
    });

    context.binaryPath = binaryPath;
    settingsStore.applyCapabilities(capabilities);

    return {
      version,
      path: binaryPath,
      settings: settingsStore.get()
    };
  });

  ipcMain.handle('croc:startSend', async (_event, rawOptions: unknown) => {
    const parsed = sendSchema.parse(rawOptions ?? {});
    const settings = settingsStore.get();
    const options = buildSendOptions(parsed, settings);

    if (options.mode === 'files') {
      if (!options.paths?.length) {
        throw new Error('Missing paths for file transfer');
      }
      await Promise.all(
        options.paths.map(async (p) => {
          const exists = await fs.promises
            .access(p, fs.constants.R_OK)
            .then(() => true)
            .catch(() => false);
          if (!exists) throw new Error(`Path does not exist or cannot be read: ${p}`);
        })
      );
    }

    const id = options.id ?? randomUUID();
    options.id = id;

    const files = options.mode === 'files' ? await collectFileEntries(options.paths ?? []) : undefined;
    const relay = options.relay ?? settings.relayProxy.defaultRelay.host;

    historyStore.add({
      id,
      type: 'send',
      createdAt: Date.now(),
      status: 'in-progress',
      files,
      relay,
      code: options.code,
      options: normalizeHistoryOptions(options),
      sourcePath: options.mode === 'files' && options.paths?.length ? options.paths[0] : undefined
    });

    processRunner.runSend(id, options);
    return { id };
  });

  ipcMain.handle('croc:startReceive', async (_event, rawOptions: unknown) => {
    const parsed = receiveSchema.parse(rawOptions ?? {});
    const settings = settingsStore.get();
    const options = await buildReceiveOptions(parsed, settings);

    const id = options.id ?? randomUUID();
    options.id = id;

    historyStore.add({
      id,
      type: 'receive',
      createdAt: Date.now(),
      status: 'in-progress',
      relay: options.relay ?? settings.relayProxy.defaultRelay.host,
      code: options.code,
      options: normalizeHistoryOptions(options),
      destinationPath: options.outDir
    });

    processRunner.runReceive(id, options);
    return { id };
  });

  ipcMain.handle('croc:stop', async (_event, id: string) => {
    processRunner.stop(id);
  });
}
