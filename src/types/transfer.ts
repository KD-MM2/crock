export type TransferType = 'send' | 'receive';

export type TransferPhase = 'idle' | 'connecting' | 'sending' | 'receiving' | 'done' | 'failed' | 'canceled';

export interface TransferProgress {
  id: string;
  type: TransferType;
  phase: TransferPhase;
  percent: number;
  speed?: string;
  eta?: string;
  code?: string;
  message?: string;
  log?: string;
  error?: string;
}

export interface TransferSession {
  id: string;
  type: TransferType;
  mode?: 'files' | 'text';
  phase: TransferPhase;
  percent: number;
  speed?: string;
  eta?: string;
  code?: string;
  startedAt: number;
  finishedAt?: number;
  logTail: TransferLogEntry[];
  error?: string;
  badge?: 'success' | 'warning' | 'error';
}

export interface TransferLogEntry {
  id: string;
  timestamp: number;
  level: 'info' | 'warn' | 'error';
  message: string;
}
