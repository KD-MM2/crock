export type DeepLinkAction = 'receive' | 'send';

export interface DeepLinkData {
  action: DeepLinkAction;
  code?: string;
  relay?: string;
  password?: string;
}

export interface ParsedDeepLink {
  valid: boolean;
  data?: DeepLinkData;
  error?: string;
}
