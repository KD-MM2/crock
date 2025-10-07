export type SendMode = 'files' | 'text';

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
  options: {
    overwrite: boolean;
    autoConfirm: boolean;
  };
}
