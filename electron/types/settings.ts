export type CurveName = 'curve25519' | 'p256' | 'p384' | 'p521';

export type Settings = {
  general: {
    downloadDir: string;
    autoOpenOnDone: boolean;
    autoCopyCodeOnSend: boolean;
    language?: 'vi' | 'en' | 'ja';
    theme?: 'system' | 'light' | 'dark';
  };
  transferDefaults: {
    send: {
      noCompress: boolean;
      exclude: string[];
      local?: boolean;
      internalDns?: boolean;
      throttleUpload?: string;
    };
    receive: {
      overwrite: boolean;
      yes: boolean;
      local?: boolean;
      internalDns?: boolean;
      curve?: CurveName;
    };
  };
  relayProxy: {
    defaultRelay: { host: string; pass?: string; relay6?: string };
    favorites: Array<{ host: string; pass?: string; relay6?: string }>;
    proxy?: { http?: string; https?: string; socks5?: string };
  };
  security: {
    curve?: CurveName;
  };
  advanced: {
    logTailLines: number;
    historyRetentionDays: number;
    deepLink?: boolean;
    extraFlags?: string;
    verboseLogs?: boolean;
    allowCodeFormatValidation?: boolean;
    showTransferLogs?: boolean;
  };
  binary: {
    crocVersion: string;
    crocPath: string;
  };
};

export type RelayConnectionStatus = {
  host?: string;
  online: boolean;
  latencyMs?: number;
  checkedAt: number;
  ipv6?: boolean;
  port?: number;
};

export type ProxyConnectionStatus = {
  http?: { set?: boolean; ok?: boolean };
  https?: { set?: boolean; ok?: boolean };
  socks5?: { set?: boolean; ok?: boolean };
};

export type CrocBinaryStatus = {
  version?: string;
  path?: string;
  installed: boolean;
};

export type ConnectionStatus = {
  relay: RelayConnectionStatus;
  proxy: ProxyConnectionStatus;
  croc: CrocBinaryStatus;
};
