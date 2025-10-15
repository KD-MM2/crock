import { createLocalId } from '@/lib/id';
import { TransferDonePayload, TransferLogEntry, TransferProgress } from '@/types/transfer';

function normalizeProgress(payload: unknown): TransferProgress | null {
  if (!payload || typeof payload !== 'object') return null;
  const candidate = payload as Partial<TransferProgress>;
  if (!candidate.id || typeof candidate.id !== 'string') return null;
  if (!candidate.phase || typeof candidate.phase !== 'string') return null;
  if (typeof candidate.percent !== 'number') return null;
  if (!candidate.type || (candidate.type !== 'send' && candidate.type !== 'receive')) return null;
  return candidate as TransferProgress;
}

function normalizeDone(payload: unknown): TransferDonePayload | null {
  if (!payload || typeof payload !== 'object') return null;
  const candidate = payload as Partial<TransferDonePayload>;
  if (!candidate.id || typeof candidate.id !== 'string') return null;
  if (typeof candidate.success !== 'boolean' && !candidate.canceled) return null;
  const type = candidate.type === 'receive' || candidate.type === 'send' ? candidate.type : 'send';
  return {
    id: candidate.id,
    type,
    success: Boolean(candidate.success),
    canceled: Boolean(candidate.canceled),
    error: typeof candidate.error === 'string' ? candidate.error : undefined,
    finishedAt: typeof candidate.finishedAt === 'number' ? candidate.finishedAt : Date.now(),
    durationMs: typeof candidate.durationMs === 'number' ? candidate.durationMs : undefined,
    code: typeof candidate.code === 'string' ? candidate.code : undefined,
    bytesTransferred: typeof candidate.bytesTransferred === 'number' ? candidate.bytesTransferred : undefined
  };
}

function createLogEntry(level: TransferLogEntry['level'], message: string): TransferLogEntry {
  return {
    id: createLocalId('log'),
    timestamp: Date.now(),
    level,
    message
  };
}
export { normalizeProgress, normalizeDone, createLogEntry };
