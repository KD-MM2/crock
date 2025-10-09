export type { TransferType, TransferPhase, TransferProgress, TransferDonePayload } from '../../electron/types/croc';

export interface TransferSession {
  id: string;
  type: import('../../electron/types/croc').TransferType;
  mode?: 'files' | 'text';
  phase: import('../../electron/types/croc').TransferPhase | 'idle';
  percent: number;
  speed?: string;
  eta?: string;
  code?: string;
  targetAddress?: string;
  sizeTransferred?: string;
  sizeTotal?: string;
  bytesTransferred?: number;
  bytesTotal?: number;
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
