import type { TransferPhase } from '../../electron/types/croc';
import type { HistoryRecord } from '../../electron/types/history';

export type { HistoryRecord };

export type HistoryStatus = TransferPhase | 'in-progress';

export interface HistoryFilter {
  type: 'all' | HistoryRecord['type'];
  status: 'all' | HistoryStatus;
  search: string;
}
