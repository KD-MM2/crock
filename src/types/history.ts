import type { TransferPhase, TransferType } from './transfer';

export type HistoryStatus = TransferPhase | 'in-progress';

export interface HistoryRecord {
  id: string;
  type: TransferType;
  createdAt: number;
  finishedAt?: number;
  status: HistoryStatus;
  files?: Array<{ name: string; size: number; path?: string; kind: 'file' | 'folder' }>;
  totalSize?: number;
  relay?: string;
  code?: string;
  options?: Record<string, unknown>;
  speedAvg?: string;
  duration?: string;
  logTail?: string[];
  destinationPath?: string;
  sourcePath?: string;
}

export interface HistoryFilter {
  type: 'all' | HistoryRecord['type'];
  status: 'all' | HistoryStatus;
  search: string;
}
