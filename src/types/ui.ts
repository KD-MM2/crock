export interface UiDialogsState {
  historyOpen: boolean;
  settingsOpen: boolean;
}

export interface UiState {
  dialogs: UiDialogsState;
  theme: 'light' | 'dark' | 'system';
  activeTransferId?: string;
}
