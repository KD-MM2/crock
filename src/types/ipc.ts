import type { ConnectionStatus, SettingsState } from './settings';
import type { HistoryRecord } from './history';
import type { TransferProgress } from './transfer';

export interface SelectFilesOptions {
  allowFolders?: boolean;
  multiple?: boolean;
}

export interface CrocStartSendOptions {
  code?: string;
  text?: string;
  paths?: string[];
  noCompress?: boolean;
  relay?: string;
  pass?: string;
  curve?: string;
  hash?: string;
  yes?: boolean;
  exclude?: string[];
  extraFlags?: string;
}

export interface CrocStartReceiveOptions {
  code: string;
  relay?: string;
  pass?: string;
  overwrite?: boolean;
  yes?: boolean;
  outDir?: string;
  extraFlags?: string;
}

export interface TransferResult {
  id: string;
}

export type EventUnsubscribe = () => void;

export type IpcEventName = 'transfer:progress' | 'transfer:done' | 'relay:status';

export interface IpcEventHandlers {
  on: (event: IpcEventName, handler: (payload: unknown) => void) => EventUnsubscribe;
}

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
    startSend: (options: CrocStartSendOptions) => Promise<TransferResult>;
    startReceive: (options: CrocStartReceiveOptions) => Promise<TransferResult>;
    stop: (id: string) => Promise<void>;
  };
  history: {
    list: () => Promise<HistoryRecord[]>;
    detail: (id: string) => Promise<HistoryRecord | null>;
    clear: () => Promise<void>;
    export: () => Promise<HistoryRecord[]>;
    saveExport: () => Promise<void>;
  };
  settings: {
    get: () => Promise<SettingsState>;
    set: (settings: Partial<SettingsState>) => Promise<SettingsState>;
    validate: (settings: SettingsState) => Promise<{ valid: boolean; errors?: Record<string, string> }>;
    connectionStatus: () => Promise<ConnectionStatus>;
  };
  events: IpcEventHandlers;
}

declare global {
  interface Window {
    api?: WindowApi;
  }
}

export interface TransferProgressEvent {
  id: string;
  payload: TransferProgress;
}

export interface TransferDonePayload {
  id: string;
  success: boolean;
  canceled?: boolean;
  error?: string;
  finishedAt?: number;
  duration?: number;
  message?: string;
}
