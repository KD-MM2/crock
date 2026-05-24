import { SettingsStoreState } from '@/stores/settings';
import { Settings } from '@/types/settings';

type UpdateDraft = (updater: (draft: Settings) => void) => void;
type SettingsDialogSelectors = Pick<
  SettingsStoreState,
  | 'status'
  | 'draft'
  | 'settings'
  | 'setDraft'
  | 'save'
  | 'resetDraft'
  | 'refreshConnectionStatus'
  | 'connectionStatus'
  | 'loadingConnection'
  | 'load'
  | 'updateRelayStatus'
>;

export type { UpdateDraft, SettingsDialogSelectors };
