export interface GeneralSettings {
  downloadDir: string;
  autoOpenOnDone: boolean;
  autoCopyCodeOnSend: boolean;
  language: 'vi' | 'en';
  theme: 'system' | 'light' | 'dark';
}

export interface SendDefaults {
  noCompress: boolean;
  exclude: string[];
  connections?: number;
  protocol?: 'tcp' | 'udp';
  forceLocal?: boolean;
  disableLocal?: boolean;
}

export interface ReceiveDefaults {
  overwrite: boolean;
  yes: boolean;
}

export interface TransferDefaults {
  send: SendDefaults;
  receive: ReceiveDefaults;
}

export interface RelayConfig {
  host: string;
  pass?: string;
}

export interface ProxyConfig {
  http?: string;
  https?: string;
}

export interface RelayProxySettings {
  defaultRelay: RelayConfig;
  favorites: RelayConfig[];
  proxy?: ProxyConfig;
}

export interface SecuritySettings {
  curve?: string;
  hash?: string;
}

export interface AdvancedSettings {
  logTailLines: number;
  historyRetentionDays: number;
  deepLink?: boolean;
  extraFlags?: string;
  verboseLogs?: boolean;
  allowCodeFormatValidation?: boolean;
}

export interface BinarySettings {
  crocVersion?: string;
  crocPath?: string;
}

export interface SettingsState {
  general: GeneralSettings;
  transferDefaults: TransferDefaults;
  relayProxy: RelayProxySettings;
  security: SecuritySettings;
  advanced: AdvancedSettings;
  binary: BinarySettings;
}

export interface ConnectionStatus {
  relay?: {
    host?: string;
    online: boolean;
    latencyMs?: number;
    lastChecked?: number;
  };
  proxy?: {
    http?: boolean;
    https?: boolean;
  };
  croc?: {
    version?: string;
    path?: string;
    installed: boolean;
  };
}
