import type { TransferDonePayload, TransferProgress } from '../types/croc';
import type { HistoryRecord } from '../types/history';
import type { ConnectionStatus, Settings } from '../types/settings';

export type SelectFilesOptions = {
  allowFolders?: boolean;
  multiple?: boolean;
};

export type SendRequest = {
  id?: string;
  mode?: 'files' | 'text';
  paths?: string[];
  text?: string;
  code?: string;
  relay?: string;
  relay6?: string;
  pass?: string;
  socks5?: string;
  local?: boolean;
  internalDns?: boolean;
  noCompress?: boolean;
  exclude?: string[];
  throttleUpload?: string;
  yes?: boolean;
  extraFlags?: string;
};

export type ReceiveRequest = {
  id?: string;
  code: string;
  relay?: string;
  relay6?: string;
  pass?: string;
  socks5?: string;
  local?: boolean;
  internalDns?: boolean;
  overwrite?: boolean;
  yes?: boolean;
  outDir?: string;
  curve?: 'curve25519' | 'p256' | 'p384' | 'p521';
  extraFlags?: string;
};

export type TransferHandle = {
  id: string;
};

export type IpcEventName = 'transfer:progress' | 'transfer:done' | 'relay:status';

export type EventPayloadMap = {
  'transfer:progress': TransferProgress;
  'transfer:done': TransferDonePayload;
  'relay:status': {
    relay: string;
    online: boolean;
    latencyMs?: number;
    checkedAt: number;
    ipv6?: boolean;
    port?: number;
  };
};

export type EventUnsubscribe = () => void;

export interface WindowApi {
  app: {
    selectFiles: (options?: SelectFilesOptions) => Promise<string[]>;
    selectFolder: () => Promise<string | null>;
    clipboardRead: () => Promise<string>;
    clipboardWrite: (text: string) => Promise<void>;
    openPath: (path: string) => Promise<void>;
  };
  croc: {
    getVersion: () => Promise<string>;
    startSend: (options: SendRequest) => Promise<TransferHandle>;
    startReceive: (options: ReceiveRequest) => Promise<TransferHandle>;
    stop: (id: string) => Promise<void>;
  };
  history: {
    list: () => Promise<HistoryRecord[]>;
    detail: (id: string) => Promise<HistoryRecord | null>;
    clear: () => Promise<void>;
    export: () => Promise<HistoryRecord[]>;
    saveExport: () => Promise<string | null>;
  };
  settings: {
    get: () => Promise<Settings>;
    set: (patch: Partial<Settings>) => Promise<Settings>;
    validate: (settings: Settings) => Promise<{ valid: boolean; errors?: Record<string, string> }>;
    connectionStatus: () => Promise<ConnectionStatus>;
  };
  events: {
    on: <T extends IpcEventName>(event: T, handler: (payload: EventPayloadMap[T]) => void) => EventUnsubscribe;
  };
}

declare global {
  interface Window {
    api: WindowApi;
  }
}

export {};
