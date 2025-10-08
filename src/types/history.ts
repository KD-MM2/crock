import type { HistoryRecord } from '../../electron/types/history';

export type { HistoryRecord } from '../../electron/types/history';

export type HistoryStatus = import('../../electron/types/croc').TransferPhase | 'in-progress';

export interface HistoryFilter {
  type: 'all' | HistoryRecord['type'];
  status: 'all' | HistoryStatus;
  search: string;
}
