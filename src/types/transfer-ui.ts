import type { SendMode } from '../../electron/types/croc';

export type { SendMode };

export interface SelectedPathItem {
  id: string;
  name: string;
  path?: string;
  size?: number;
  kind: 'file' | 'folder';
}

export interface SendFormState {
  mode: SendMode;
  items: SelectedPathItem[];
  text: string;
  code: string;
  resolvedCode?: string;
  options: {
    noCompress: boolean;
  };
  sessionOverrides: {
    relay?: string;
    pass?: string;
    exclude?: string[];
    autoConfirm?: boolean;
  };
}

export interface ReceiveFormState {
  code: string;
  autoPaste: boolean;
  sessionOverrides: {
    relay?: string;
    pass?: string;
  };
  options: {
    overwrite: boolean;
    autoConfirm: boolean;
  };
}
