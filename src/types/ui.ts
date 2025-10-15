export interface UiDialogsState {
  historyOpen: boolean;
  settingsOpen: boolean;
}

export interface DeepLinkData {
  action: 'receive' | 'send';
  code?: string;
  relay?: string;
  password?: string;
}

export interface UiState {
  dialogs: UiDialogsState;
  theme: 'light' | 'dark' | 'system';
  activeTransferId?: string;
  activeTransferTab: string;
  pendingDeepLink?: DeepLinkData;
}
