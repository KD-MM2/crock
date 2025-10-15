import { SettingsStoreState } from '@/stores/settings';
import { SettingsState } from '@/types/settings';

type UpdateDraft = (updater: (draft: SettingsState) => void) => void;
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
