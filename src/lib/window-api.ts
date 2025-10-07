import type { EventUnsubscribe, IpcEventName, WindowApi } from '@/types/ipc';
import type { HistoryRecord } from '@/types/history';
import type { SettingsState } from '@/types/settings';
import type { TransferPhase, TransferProgress, TransferType } from '@/types/transfer';
import { generateCodePhrase } from '@/lib/code';

const SETTINGS_STORAGE_KEY = 'crock.settings';
const HISTORY_STORAGE_KEY = 'crock.history';

const listeners = new Map<IpcEventName, Set<(payload: unknown) => void>>();
const activeTimers = new Map<string, number>();

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const defaultSettings: SettingsState = {
  general: {
    downloadDir: 'Downloads',
    autoOpenOnDone: true,
    autoCopyCodeOnSend: true,
    language: 'vi',
    theme: 'system'
  },
  transferDefaults: {
    send: {
      noCompress: false,
      exclude: [],
      connections: 1,
      protocol: 'tcp',
      forceLocal: false,
      disableLocal: false
    },
    receive: {
      overwrite: false,
      yes: true
    }
  },
  relayProxy: {
    defaultRelay: { host: 'croc.schollz.com:9009' },
    favorites: [],
    proxy: {}
  },
  security: {
    curve: 'p256',
    hash: 'sha256'
  },
  advanced: {
    logTailLines: 200,
    historyRetentionDays: 30,
    deepLink: true,
    extraFlags: '',
    verboseLogs: false,
    allowCodeFormatValidation: true
  },
  binary: {
    crocVersion: 'not-installed',
    crocPath: ''
  }
};

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

function emit(event: IpcEventName, payload: unknown) {
  const handlers = listeners.get(event);
  if (!handlers) return;
  handlers.forEach((handler) => handler(payload));
}

function loadPersistedSettings(): SettingsState {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return clone(defaultSettings);
    const parsed = JSON.parse(raw) as SettingsState;
    return { ...clone(defaultSettings), ...parsed };
  } catch (error) {
    console.warn('[mock] Failed to parse stored settings', error);
    return clone(defaultSettings);
  }
}

function loadPersistedHistory(): HistoryRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HistoryRecord[];
    return parsed;
  } catch (error) {
    console.warn('[mock] Failed to parse stored history', error);
    return [];
  }
}

let settingsState: SettingsState | null = null;
let historyRecords: HistoryRecord[] | null = null;

const ensureSettings = () => {
  if (!settingsState) settingsState = loadPersistedSettings();
  return settingsState;
};

const ensureHistory = () => {
  if (!historyRecords) historyRecords = loadPersistedHistory();
  return historyRecords;
};

function persistSettings(next: SettingsState) {
  settingsState = clone(next);
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settingsState));
}

function persistHistory(next: HistoryRecord[]) {
  historyRecords = clone(next);
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(historyRecords));
}

function buildMockHistoryRecord(payload: TransferProgress, result: { success: boolean; message?: string }) {
  const records = ensureHistory();
  const existing = records.find((record) => record.id === payload.id);
  if (existing) {
    existing.status = result.success ? 'done' : 'failed';
    existing.finishedAt = Date.now();
    existing.logTail = [...(existing.logTail ?? []), result.message ?? ''];
    persistHistory(records);
    return;
  }

  const newRecord: HistoryRecord = {
    id: payload.id,
    type: payload.type,
    createdAt: Date.now(),
    finishedAt: Date.now(),
    status: result.success ? 'done' : 'failed',
    code: payload.code,
    totalSize: Math.round(Math.random() * 50 * 1024 * 1024),
    relay: ensureSettings().relayProxy.defaultRelay.host,
    logTail: result.message ? [result.message] : []
  };

  persistHistory([newRecord, ...records]);
}

function simulateTransfer({ id, type, code }: { id: string; type: TransferType; code?: string }) {
  let percent = 0;
  const steps = [0, 10, 25, 40, 60, 75, 90, 100];
  const phases: TransferPhase[] = type === 'send' ? ['connecting', 'sending', 'sending', 'sending', 'sending', 'sending', 'sending', 'done'] : ['connecting', 'receiving', 'receiving', 'receiving', 'receiving', 'receiving', 'receiving', 'done'];
  const start = Date.now();

  const tick = (stepIndex: number) => {
    const percentValue = steps[stepIndex];
    const phase = phases[stepIndex];
    percent = percentValue;

    const payload: TransferProgress = {
      id,
      type,
      phase,
      percent,
      speed: `${(Math.random() * 20 + 5).toFixed(1)} MB/s`,
      eta: percent < 100 ? `${Math.max(1, Math.round((100 - percent) / 10))}s` : '0s',
      code,
      message: phase === 'done' ? 'Transfer completed' : undefined
    };

    emit('transfer:progress', payload);

    if (phase === 'done') {
      activeTimers.delete(id);
      emit('transfer:done', { id, success: true, finishedAt: Date.now(), duration: Date.now() - start });
      buildMockHistoryRecord(payload, { success: true, message: 'Transfer completed successfully.' });
      return;
    }

    const timeout = window.setTimeout(() => tick(stepIndex + 1), 500 + Math.random() * 600);
    activeTimers.set(id, timeout);
  };

  const timeout = window.setTimeout(() => tick(0), 200);
  activeTimers.set(id, timeout);
}

function cancelSimulation(id: string) {
  const timer = activeTimers.get(id);
  if (!timer) return;
  window.clearTimeout(timer);
  activeTimers.delete(id);
  emit('transfer:done', { id, success: false, canceled: true });
}

function createMockWindowApi(): WindowApi {
  return {
    app: {
      selectFiles: async () => [],
      selectFolder: async () => 'Downloads',
      clipboardRead: async () => {
        try {
          if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
            return await navigator.clipboard.readText();
          }
        } catch (error) {
          console.warn('[mock] clipboardRead failed', error);
        }
        return '';
      },
      clipboardWrite: async (text: string) => {
        try {
          if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
          }
        } catch (error) {
          console.warn('[mock] clipboardWrite failed', error);
        }
      },
      openPath: async (path: string) => {
        console.info('[mock] openPath', path);
      }
    },
    croc: {
      getVersion: async () => ensureSettings().binary.crocVersion ?? 'not-installed',
      startSend: async (options) => {
        const id = createId('send');
        const code = options.code || generateCodePhrase();
        simulateTransfer({ id, type: 'send', code });
        return { id };
      },
      startReceive: async (options) => {
        const id = createId('recv');
        simulateTransfer({ id, type: 'receive', code: options.code });
        return { id };
      },
      stop: async (id: string) => {
        cancelSimulation(id);
      }
    },
    history: {
      list: async () => ensureHistory(),
      detail: async (id: string) => ensureHistory().find((record) => record.id === id) ?? null,
      clear: async () => {
        persistHistory([]);
      },
      export: async () => ensureHistory(),
      saveExport: async () => {
        const records = ensureHistory();
        const url = URL.createObjectURL(new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `crock-history-${Date.now()}.json`;
        link.click();
        URL.revokeObjectURL(url);
      }
    },
    settings: {
      get: async () => ensureSettings(),
      set: async (partial) => {
        const current = ensureSettings();
        const next = clone({ ...current, ...partial });
        persistSettings(next);
        return next;
      },
      validate: async () => ({ valid: true }),
      connectionStatus: async () => ({
        relay: {
          host: ensureSettings().relayProxy.defaultRelay.host,
          online: true,
          latencyMs: Math.round(Math.random() * 80 + 20),
          lastChecked: Date.now()
        },
        proxy: {
          http: Boolean(ensureSettings().relayProxy.proxy?.http),
          https: Boolean(ensureSettings().relayProxy.proxy?.https)
        },
        croc: {
          version: ensureSettings().binary.crocVersion,
          path: ensureSettings().binary.crocPath,
          installed: ensureSettings().binary.crocVersion !== 'not-installed'
        }
      })
    },
    events: {
      on: (event: IpcEventName, handler: (payload: unknown) => void): EventUnsubscribe => {
        const existing = listeners.get(event) ?? new Set();
        existing.add(handler);
        listeners.set(event, existing);
        return () => {
          const handlers = listeners.get(event);
          if (!handlers) return;
          handlers.delete(handler);
          if (handlers.size === 0) listeners.delete(event);
        };
      }
    }
  };
}

function ensureWindowApiInternal(): WindowApi {
  if (!window.api) {
    window.api = createMockWindowApi();
  }
  return window.api;
}

let cachedApi: WindowApi | null = null;

export function getWindowApi(): WindowApi {
  if (typeof window === 'undefined') throw new Error('window is undefined');
  if (cachedApi) return cachedApi;
  cachedApi = ensureWindowApiInternal();
  return cachedApi;
}

export const api: WindowApi = typeof window === 'undefined' ? ({} as WindowApi) : getWindowApi();

export function emitRelayStatusMock() {
  const relay = ensureSettings().relayProxy.defaultRelay.host;
  emit('relay:status', {
    relay,
    latencyMs: Math.round(Math.random() * 40 + 10),
    online: true,
    checkedAt: Date.now()
  });
}
