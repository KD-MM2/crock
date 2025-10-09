import Store from 'electron-store';
import { z } from 'zod';
import type { CrocCapabilities } from '../types/capabilities';
import type { Settings } from '../types/settings';

const CURVE_ENUM = ['curve25519', 'p256', 'p384', 'p521'] as const;

const settingsSchema = z.object({
  general: z.object({
    downloadDir: z.string().min(1),
    autoOpenOnDone: z.boolean(),
    autoCopyCodeOnSend: z.boolean(),
    language: z.enum(['vi', 'en']).optional(),
    theme: z.enum(['system', 'light', 'dark']).optional()
  }),
  transferDefaults: z.object({
    send: z.object({
      noCompress: z.boolean(),
      exclude: z.array(z.string()),
      local: z.boolean().optional(),
      internalDns: z.boolean().optional(),
      throttleUpload: z.string().optional()
    }),
    receive: z.object({
      overwrite: z.boolean(),
      yes: z.boolean(),
      local: z.boolean().optional(),
      internalDns: z.boolean().optional(),
      curve: z.enum(CURVE_ENUM).optional()
    })
  }),
  relayProxy: z.object({
    defaultRelay: z.object({
      host: z.string().min(1),
      pass: z.string().optional(),
      relay6: z.string().optional()
    }),
    favorites: z.array(
      z.object({
        host: z.string().min(1),
        pass: z.string().optional(),
        relay6: z.string().optional()
      })
    ),
    proxy: z
      .object({
        http: z.string().optional(),
        https: z.string().optional(),
        socks5: z.string().optional()
      })
      .optional()
  }),
  security: z.object({
    curve: z.enum(CURVE_ENUM).optional()
  }),
  advanced: z.object({
    logTailLines: z.number().int().min(10).max(2000),
    historyRetentionDays: z.number().int().min(1).max(365),
    deepLink: z.boolean().optional(),
    extraFlags: z.string().optional(),
    verboseLogs: z.boolean().optional(),
    allowCodeFormatValidation: z.boolean().optional(),
    showTransferLogs: z.boolean().optional()
  }),
  binary: z.object({
    crocVersion: z.string(),
    crocPath: z.string()
  })
});

type SettingsInput = z.input<typeof settingsSchema>;

const DEFAULT_SETTINGS: Settings = {
  general: {
    downloadDir: '',
    autoOpenOnDone: true,
    autoCopyCodeOnSend: true,
    language: 'vi',
    theme: 'system'
  },
  transferDefaults: {
    send: {
      noCompress: false,
      exclude: [],
      local: false,
      internalDns: false
    },
    receive: {
      overwrite: false,
      yes: true,
      local: false,
      internalDns: false,
      curve: 'p256'
    }
  },
  relayProxy: {
    defaultRelay: { host: 'croc.schollz.com:9009' },
    favorites: [],
    proxy: {}
  },
  security: {
    curve: 'p256'
  },
  advanced: {
    logTailLines: 200,
    historyRetentionDays: 30,
    deepLink: true,
    extraFlags: '',
    verboseLogs: false,
    allowCodeFormatValidation: true,
    showTransferLogs: true
  },
  binary: {
    crocVersion: 'not-installed',
    crocPath: ''
  }
};

function deepMerge<T>(target: T, source: Partial<T>): T {
  if (typeof target !== 'object' || target === null) return source as T;
  const result = Array.isArray(target) ? [...(target as unknown as [])] : { ...(target as Record<string, unknown>) };
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const current = (result as Record<string, unknown>)[key];
      (result as Record<string, unknown>)[key] = deepMerge(current ?? {}, value as Record<string, unknown>);
    } else if (value !== undefined) {
      (result as Record<string, unknown>)[key] = value;
    }
  }
  return result as T;
}

export class SettingsStore {
  private readonly store: Store<Settings>;

  constructor(initialDefaults: Partial<Settings> = {}) {
    const defaults = deepMerge(DEFAULT_SETTINGS, initialDefaults);
    this.store = new Store<Settings>({
      name: 'settings',
      defaults
    });
  }

  get(): Settings {
    return deepMerge(DEFAULT_SETTINGS, this.store.store);
  }

  set(patch: Partial<Settings>): Settings {
    const current = this.get();
    const next = deepMerge(current, patch);
    const validation = this.validate(next);
    if (!validation.valid) {
      throw new Error(`Invalid settings: ${JSON.stringify(validation.errors)}`);
    }
    this.store.store = next;
    return next;
  }

  validate(settings: Settings): { valid: boolean; errors?: Record<string, string> } {
    const result = settingsSchema.safeParse(settings as SettingsInput);
    if (result.success) return { valid: true };
    const errors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.join('.') || 'root';
      errors[path] = issue.message;
    }
    return { valid: false, errors };
  }

  applyCapabilities(capabilities: CrocCapabilities) {
    const current = this.get();
    const filtered = { ...current };
    if (capabilities.curve === false && filtered.transferDefaults.receive.curve) {
      delete filtered.transferDefaults.receive.curve;
    }
    if (capabilities.internalDns === false) {
      filtered.transferDefaults.send.internalDns = false;
      filtered.transferDefaults.receive.internalDns = false;
    }
    if (capabilities.local === false) {
      filtered.transferDefaults.send.local = false;
      filtered.transferDefaults.receive.local = false;
    }
    this.store.store = filtered;
  }
}
