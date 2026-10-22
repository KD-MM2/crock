import type { CurveName } from './settings';

export type TransferPhase = 'connecting' | 'hashing' | 'waiting' | 'sending' | 'receiving' | 'done' | 'failed' | 'canceled';
export type TransferType = 'send' | 'receive';
export type SendMode = 'files' | 'text';

export type CrocHashAlgorithm = 'xxhash' | 'imohash' | 'md5' | 'highway';
export type CrocTransport = 'auto' | 'derp' | 'relay';

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
  connect?: string;
  local?: boolean;
  internalDns?: boolean;
  noCompress?: boolean;
  curve?: CurveName;
  exclude?: string[];
  excludeFile?: string;
  throttleUpload?: string;
  yes?: boolean;
  zip?: boolean;
  git?: boolean;
  hash?: CrocHashAlgorithm;
  noLocal?: boolean;
  noMulti?: boolean;
  transport?: CrocTransport;
  store?: boolean;
  extraFlags?: string;
};

export type ReceiveOptions = {
  id?: string;
  code: string;
  outDir?: string;
  overwrite?: boolean;
  rename?: boolean;
  yes?: boolean;
  relay?: string;
  relay6?: string;
  pass?: string;
  socks5?: string;
  connect?: string;
  local?: boolean;
  internalDns?: boolean;
  noCompress?: boolean;
  curve?: CurveName;
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
