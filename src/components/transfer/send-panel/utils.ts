import { normalizeRelayHost, DEFAULT_RELAY_HOST, DEFAULT_CURVE } from '@/lib/croc';
import { createLocalId } from '@/lib/id';
import { getWindowApi } from '@/lib/window-api';
import { HistoryRecord } from '@/types/history';
import { SettingsState, CurveName } from '@/types/settings';
import { SendFormState, SelectedPathItem, SendMode } from '@/types/transfer-ui';
import i18next from 'i18next';
import { toast } from 'sonner';

function buildInitialForm(settings?: SettingsState | null): SendFormState {
  return {
    mode: 'files',
    items: [],
    text: '',
    code: '',
    resolvedCode: undefined,
    options: {
      noCompress: settings?.transferDefaults.send.noCompress ?? false
    },
    sessionOverrides: {}
  };
}

function createItemFromPath(path: string, kind: 'file' | 'folder' = 'file'): SelectedPathItem {
  const segments = path.split(/[/\\]/);
  const name = segments[segments.length - 1] || path;
  return {
    id: createLocalId('path'),
    name,
    path,
    size: undefined,
    kind
  };
}

function addItems(form: SendFormState, items: SelectedPathItem[]): SendFormState | null {
  // Validation: Check if mixing files and folders
  const existingHasFolders = form.items.some((item) => item.kind === 'folder');
  const existingHasFiles = form.items.some((item) => item.kind === 'file');
  const newHasFolders = items.some((item) => item.kind === 'folder');
  const newHasFiles = items.some((item) => item.kind === 'file');

  // Rule 1: Can't mix files and folders
  if ((existingHasFolders && newHasFiles) || (existingHasFiles && newHasFolders)) {
    return null; // Invalid: mixing files and folders
  }

  // Rule 2: Only one folder allowed at a time
  if (existingHasFolders && newHasFolders) {
    return null; // Invalid: trying to add folder when one already exists
  }

  const existingPaths = new Set(form.items.map((item) => item.path ?? item.name));
  const merged = [...form.items];
  for (const item of items) {
    const key = item.path ?? item.name;
    if (!existingPaths.has(key)) {
      merged.push(item);
      existingPaths.add(key);
    }
  }
  return { ...form, items: merged };
}

function buildItemsFromHistory(files?: HistoryRecord['files'], fallbackPaths?: string[]): SelectedPathItem[] {
  if (files && files.length > 0) {
    return files.map((file) => ({
      id: createLocalId('history'),
      name: file.name,
      path: file.path,
      size: file.size,
      kind: file.kind ?? 'file'
    }));
  }

  if (fallbackPaths && fallbackPaths.length > 0) {
    return fallbackPaths.map((path) => createItemFromPath(path));
  }

  return [];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isSendMode(value: unknown): value is SendMode {
  return value === 'files' || value === 'text';
}

function pickFirstOption<T>(
  sources: Array<Record<string, unknown> | undefined>,
  keys: string[],
  predicate: (value: unknown) => value is T
): T | undefined {
  for (const source of sources) {
    if (!source) continue;
    for (const key of keys) {
      const value = source[key];
      if (predicate(value)) {
        return value;
      }
    }
  }
  return undefined;
}

function hasSessionOverrides(overrides: SendFormState['sessionOverrides']): boolean {
  return Boolean(overrides.relay || overrides.pass || (overrides.exclude && overrides.exclude.length > 0) || overrides.autoConfirm);
}

async function copyToClipboard(text: string, options?: { silent?: boolean }): Promise<boolean> {
  try {
    const api = getWindowApi();
    await api.app.clipboardWrite(text);
    if (!options?.silent) {
      toast.success(i18next.t('transfer.common.toast.copySuccess'));
    }
    return true;
  } catch (error) {
    console.error('[SendPanel] copy failed', error);
    toast.error(i18next.t('transfer.common.toast.copyFailure'));
    return false;
  }
}

function buildSendCliCommand({
  form,
  settings,
  originalCode
}: {
  form: SendFormState;
  settings?: SettingsState | null;
  originalCode?: string;
}): string | null {
  const parts: string[] = ['croc', 'send'];

  // Use originalCode if available (when session started), otherwise use current form.code
  const codeToShow = originalCode !== undefined ? originalCode : form.code.trim() || undefined;
  if (codeToShow) {
    parts.push('--code', codeToShow);
  }

  if (form.options.noCompress) {
    parts.push('--no-compress');
  }

  const overrides = form.sessionOverrides;
  const relayHost = resolveRelay(overrides, settings);
  if (relayHost && normalizeRelayHost(relayHost) !== normalizeRelayHost(DEFAULT_RELAY_HOST)) {
    parts.push('--relay', relayHost);
  }
  const relayPass = resolveRelayPass(overrides, settings);
  if (relayPass) {
    parts.push('--pass', relayPass);
  }

  const excludes = resolveExcludePatterns(overrides, settings) ?? [];
  for (const pattern of excludes) {
    parts.push('--exclude', pattern);
  }

  if (overrides.autoConfirm) {
    parts.push('--yes');
  }

  const curve = resolveCurve(settings);
  if (curve && curve !== DEFAULT_CURVE) {
    parts.push('--curve', curve);
  }

  const extraFlags = settings?.advanced.extraFlags?.trim();
  if (extraFlags) {
    const tokens = extraFlags.match(/(?:[^\s"]+|"[^"]*")+/g) ?? [];
    parts.push(...tokens);
  }

  if (form.mode === 'text') {
    parts.push('--text', formatCliText(form.text));
  }

  if (form.mode === 'files') {
    const fileArgs = form.items.length > 0 ? form.items.map((item) => item.path ?? item.name) : ['<paths>'];
    parts.push(...fileArgs);
  }

  const formatted = parts
    .map((part, index) => {
      if (index === 0 || part === 'send' || part.startsWith('--')) {
        return part;
      }
      return quoteCliArg(part);
    })
    .join(' ')
    .trim();

  return formatted.length > 0 ? formatted : null;
}

function quoteCliArg(value: string): string {
  const sanitized = value.replace(/\s+/g, ' ');
  if (!sanitized.includes(' ') && !sanitized.includes('"')) {
    return sanitized;
  }
  return `"${sanitized.replace(/"/g, '\\"')}"`;
}

function formatCliText(text: string): string {
  const normalized = text.trim().replace(/\s+/g, ' ');
  if (!normalized) return '<message>';
  return normalized.length > 40 ? `${normalized.slice(0, 37)}…` : normalized;
}

function resolveRelay(overrides: SendFormState['sessionOverrides'], settings?: SettingsState | null): string | undefined {
  const overrideRelay = overrides.relay?.trim();
  if (overrideRelay) return overrideRelay;
  const defaultRelay = settings?.relayProxy?.defaultRelay?.host?.trim();
  return defaultRelay && defaultRelay.length > 0 ? defaultRelay : undefined;
}

function resolveRelayPass(overrides: SendFormState['sessionOverrides'], settings?: SettingsState | null): string | undefined {
  if (overrides.pass !== undefined) {
    const trimmed = overrides.pass.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  const defaultPass = settings?.relayProxy?.defaultRelay?.pass?.trim();
  return defaultPass && defaultPass.length > 0 ? defaultPass : undefined;
}

function resolveExcludePatterns(overrides: SendFormState['sessionOverrides'], settings?: SettingsState | null): string[] | undefined {
  if (overrides.exclude && overrides.exclude.length > 0) {
    return overrides.exclude;
  }
  const defaults = settings?.transferDefaults.send.exclude ?? [];
  return defaults.length > 0 ? defaults : undefined;
}

function resolveCurve(settings?: SettingsState | null): CurveName | undefined {
  return settings?.security.curve;
}

export {
  buildInitialForm,
  createItemFromPath,
  addItems,
  buildItemsFromHistory,
  isPlainObject,
  isBoolean,
  isString,
  isStringArray,
  isSendMode,
  pickFirstOption,
  hasSessionOverrides,
  copyToClipboard,
  buildSendCliCommand,
  resolveExcludePatterns
};
