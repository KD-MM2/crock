import { ReactNode } from 'react';
import { Activity, AlertTriangle, CheckCircle2, CircleSlash, Loader2 } from 'lucide-react';
import { TransferSession } from '@/types/transfer';

const PHASE_LABEL_KEYS: Record<TransferSession['phase'], string> = {
  idle: 'transfer.progress.phases.idle',
  connecting: 'transfer.progress.phases.connecting',
  hashing: 'transfer.progress.phases.hashing',
  waiting: 'transfer.progress.phases.waiting',
  sending: 'transfer.progress.phases.sending',
  receiving: 'transfer.progress.phases.receiving',
  done: 'transfer.progress.phases.done',
  failed: 'transfer.progress.phases.failed',
  canceled: 'transfer.progress.phases.canceled'
};

const PHASE_COLORS: Record<TransferSession['phase'], string> = {
  idle: 'bg-muted text-muted-foreground',
  connecting: 'bg-blue-500/15 text-blue-500 dark:bg-blue-400/10 dark:text-blue-300',
  hashing: 'bg-purple-500/15 text-purple-600 dark:bg-purple-400/10 dark:text-purple-200',
  waiting: 'bg-sky-500/15 text-sky-600 dark:bg-sky-400/10 dark:text-sky-300',
  sending: 'bg-emerald-500/15 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300',
  receiving: 'bg-amber-500/15 text-amber-600 dark:bg-amber-400/10 dark:text-amber-300',
  done: 'bg-emerald-500/15 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300',
  failed: 'bg-destructive/15 text-destructive',
  canceled: 'bg-muted text-muted-foreground'
};

const STATUS_ICON: Record<TransferSession['phase'], ReactNode> = {
  idle: <Activity className="size-4" aria-hidden />,
  connecting: <Loader2 className="size-4 animate-spin" aria-hidden />,
  hashing: <Loader2 className="size-4 animate-spin" aria-hidden />,
  waiting: <Loader2 className="size-4 animate-spin" aria-hidden />,
  sending: <Loader2 className="size-4 animate-spin" aria-hidden />,
  receiving: <Loader2 className="size-4 animate-spin" aria-hidden />,
  done: <CheckCircle2 className="size-4" aria-hidden />,
  failed: <AlertTriangle className="size-4" aria-hidden />,
  canceled: <CircleSlash className="size-4" aria-hidden />
};

export { PHASE_LABEL_KEYS, PHASE_COLORS, STATUS_ICON };
