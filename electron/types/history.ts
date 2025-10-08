import type { TransferPhase, TransferType } from './croc';

export type HistoryFileEntry = {
  name: string;
  size?: number;
  path?: string;
  kind?: 'file' | 'folder';
};

export type HistoryRecord = {
  id: string;
  type: TransferType;
  createdAt: number;
  finishedAt?: number;
  status: TransferPhase | 'in-progress';
  files?: HistoryFileEntry[];
  totalSize?: number;
  relay?: string;
  code?: string;
  options?: Record<string, unknown>;
  speedAvg?: string;
  duration?: string;
  logTail?: string[];
  destinationPath?: string;
  sourcePath?: string;
};
