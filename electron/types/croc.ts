export type TransferPhase = 'connecting' | 'hashing' | 'waiting' | 'sending' | 'receiving' | 'done' | 'failed' | 'canceled';
export type TransferType = 'send' | 'receive';
export type SendMode = 'files' | 'text';

export type SendOptions = {
  id?: string;
  mode: SendMode;
  paths?: string[];
  text?: string;
  code?: string;
  relay?: string;
  relay6?: string;
  pass?: string;
  socks5?: string;
  local?: boolean;
  internalDns?: boolean;
  noCompress?: boolean;
  exclude?: string[];
  throttleUpload?: string;
  yes?: boolean;
  extraFlags?: string;
};

export type ReceiveOptions = {
  id?: string;
  code: string;
  outDir?: string;
  overwrite?: boolean;
  yes?: boolean;
  relay?: string;
  relay6?: string;
  pass?: string;
  socks5?: string;
  local?: boolean;
  internalDns?: boolean;
  curve?: 'curve25519' | 'p256' | 'p384' | 'p521';
  extraFlags?: string;
};

export type TransferProgress = {
  id: string;
  type: TransferType;
  phase: TransferPhase;
  percent?: number;
  speed?: string;
  eta?: string;
  fileName?: string;
  message?: string;
  code?: string;
  targetAddress?: string;
  sizeTransferred?: string;
  sizeTotal?: string;
  bytesTransferred?: number;
  bytesTotal?: number;
  raw?: string;
  ts: number;
};

export type TransferDonePayload = {
  id: string;
  type: TransferType;
  success: boolean;
  canceled?: boolean;
  error?: string;
  code?: string;
  bytesTransferred?: number;
  durationMs?: number;
  finishedAt: number;
};
