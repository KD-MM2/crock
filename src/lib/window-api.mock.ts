import type { WindowApi, EventUnsubscribe, IpcEventName, EventPayloadMap } from '@/types/ipc';

function createEventBus() {
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>();

  return {
    on<T extends IpcEventName>(event: T, handler: (payload: EventPayloadMap[T]) => void): EventUnsubscribe {
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }
      listeners.get(event)!.add(handler as (...args: unknown[]) => void);
      return () => {
        listeners.get(event)?.delete(handler as (...args: unknown[]) => void);
      };
    },
    emit<T extends IpcEventName>(event: T, payload: EventPayloadMap[T]) {
      listeners.get(event)?.forEach((handler) => handler(payload));
    }
  };
}

export function createMockWindowApi(): WindowApi {
  const eventBus = createEventBus();

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // clipboard API unavailable
    }
  };

  const pasteFromClipboard = async (): Promise<string> => {
    try {
      return await navigator.clipboard.readText();
    } catch {
      return '';
    }
  };

  return {
    app: {
      selectFiles: async () => [],
      selectFolder: async () => null,
      clipboardRead: pasteFromClipboard,
      clipboardWrite: copyToClipboard,
      openPath: async () => undefined,
      getPathStats: async () => [],
      getFilePath: () => null
    },
    window: {
      minimize: async () => undefined,
      toggleMaximize: async () => undefined,
      close: async () => window.close()
    },
    croc: {
      getVersion: async () => 'mock',
      listVersions: async () => [],
      installVersion: async () => ({
        version: 'mock',
        path: '',
        settings: {} as ReturnType<WindowApi['settings']['get']> extends Promise<infer T> ? T : never
      }),
      startSend: async () => ({ id: 'mock-send' }),
      startReceive: async () => ({ id: 'mock-receive' }),
      stop: async () => undefined
    },
    history: {
      list: async () => [],
      detail: async () => null,
      clear: async () => undefined,
      export: async () => [],
      saveExport: async () => null
    },
    settings: {
      get: async () =>
        ({
          general: {
            downloadDir: '',
            autoOpenOnDone: true,
            autoCopyCodeOnSend: true,
            autoResetOnSendSuccess: false,
            autoResetOnSendFailure: false,
            language: 'en' as const,
            theme: 'system' as const
          },
          binary: { crocVersion: '', crocPath: '' },
          relayProxy: { defaultRelay: { host: '' }, favorites: [] },
          transferDefaults: { send: { exclude: [], noCompress: false }, receive: { overwrite: false, yes: false } },
          advanced: { logTailLines: 100, historyRetentionDays: 30 },
          security: {}
        }) as unknown as ReturnType<WindowApi['settings']['get']> extends Promise<infer T> ? T : never,
      set: async (patch) => patch as unknown as ReturnType<WindowApi['settings']['get']> extends Promise<infer T> ? T : never,
      validate: async () => ({ valid: true }),
      connectionStatus: async () => ({
        relay: { host: undefined, online: false, checkedAt: Date.now(), ipv6: false },
        proxy: {},
        croc: { installed: false }
      })
    },
    events: {
      on: eventBus.on,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      _emit: eventBus.emit as any
      //
    } as WindowApi['events'] & { _emit: typeof eventBus.emit }
  };
}
