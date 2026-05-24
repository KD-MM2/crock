import type { TransferPhase, TransferType } from '../../electron/types/croc';

export type { TransferProgress, TransferDonePayload } from '../../electron/types/croc';

export interface TransferSession {
  id: string;
  type: TransferType;
  mode?: 'files' | 'text';
  phase: TransferPhase | 'idle';
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
