import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, CircleSlash, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useTransferStore, type TransferStoreState } from '@/stores/transfer';
import { useHistoryStore, type HistoryStoreState } from '@/stores/history';
import { getWindowApi } from '@/lib/window-api';
import { createLocalId } from '@/lib/id';
import type { TransferLogEntry, TransferProgress, TransferSession, TransferDonePayload } from '@/types/transfer';

const selectSessions = (state: TransferStoreState) => ({
  activeId: state.activeTransferId,
  sessions: state.sessions
});

const selectActions = (state: TransferStoreState) => ({
  updateProgress: state.updateProgress,
  finalizeSession: state.finalizeSession,
  appendLog: state.appendLog
});

const PHASE_LABELS: Record<TransferSession['phase'], string> = {
  idle: 'Sẵn sàng',
  connecting: 'Đang kết nối',
  sending: 'Đang gửi',
  receiving: 'Đang nhận',
  done: 'Hoàn tất',
  failed: 'Thất bại',
  canceled: 'Đã hủy'
};

const PHASE_COLORS: Record<TransferSession['phase'], string> = {
  idle: 'bg-muted text-muted-foreground',
  connecting: 'bg-blue-500/15 text-blue-500 dark:bg-blue-400/10 dark:text-blue-300',
  sending: 'bg-emerald-500/15 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300',
  receiving: 'bg-amber-500/15 text-amber-600 dark:bg-amber-400/10 dark:text-amber-300',
  done: 'bg-emerald-500/15 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300',
  failed: 'bg-destructive/15 text-destructive',
  canceled: 'bg-muted text-muted-foreground'
};

const STATUS_ICON: Record<TransferSession['phase'], ReactNode> = {
  idle: <Activity className="size-4" aria-hidden />,
  connecting: <Loader2 className="size-4 animate-spin" aria-hidden />,
  sending: <Loader2 className="size-4 animate-spin" aria-hidden />,
  receiving: <Loader2 className="size-4 animate-spin" aria-hidden />,
  done: <CheckCircle2 className="size-4" aria-hidden />,
  failed: <AlertTriangle className="size-4" aria-hidden />,
  canceled: <CircleSlash className="size-4" aria-hidden />
};

export function TransferProgressPanel() {
  const { activeId, sessions } = useTransferStore(selectSessions);
  const { updateProgress, finalizeSession, appendLog } = useTransferStore(selectActions);
  const refreshHistory = useHistoryStore((state: HistoryStoreState) => state.refresh);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  useEffect(() => {
    const api = getWindowApi();

    const handleProgress = (payload: unknown) => {
      const progress = normalizeProgress(payload);
      if (!progress) return;
      updateProgress(progress);
      if (progress.raw) {
        appendLog(progress.id, createLogEntry('info', progress.raw));
      }
      if (progress.message && progress.message !== progress.raw) {
        appendLog(progress.id, createLogEntry('info', progress.message));
      }
    };

    const handleDone = async (payload: unknown) => {
      const done = normalizeDone(payload);
      if (!done) return;
      const phase: TransferSession['phase'] = done.canceled ? 'canceled' : done.success ? 'done' : 'failed';
      finalizeSession(done.id, {
        phase,
        percent: phase === 'done' ? 100 : 0,
        error: done.error,
        finishedAt: done.finishedAt ?? Date.now(),
        badge: done.canceled ? 'warning' : done.success ? 'success' : 'error'
      });

      if (done.error) {
        appendLog(done.id, createLogEntry('error', done.error));
        toast.error(done.error);
      } else if (done.canceled) {
        toast.info('Phiên truyền tải đã bị hủy.');
      } else if (done.success) {
        toast.success('Phiên truyền tải hoàn tất.');
      }

      try {
        await refreshHistory();
      } catch (error) {
        console.warn('[TransferProgress] refresh history failed', error);
      }
    };

    const unsubProgress = api.events.on('transfer:progress', handleProgress);
    const unsubDone = api.events.on('transfer:done', handleDone);

    return () => {
      unsubProgress();
      unsubDone();
    };
  }, [updateProgress, finalizeSession, appendLog, refreshHistory]);

  const session = useMemo<TransferSession | undefined>(() => {
    if (activeId && sessions[activeId]) return sessions[activeId];
    const values = Object.values(sessions) as TransferSession[];
    if (values.length === 0) return undefined;
    return values.slice().sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0))[0];
  }, [activeId, sessions]);

  const canCancel = session && !['done', 'failed', 'canceled'].includes(session.phase);

  const handleCancel = async () => {
    if (!session) return;
    setCancelingId(session.id);
    try {
      const api = getWindowApi();
      await api.croc.stop(session.id);
      toast.info('Đang yêu cầu hủy phiên…');
    } catch (error) {
      console.error('[TransferProgress] cancel failed', error);
      toast.error('Không thể hủy phiên.');
    } finally {
      setCancelingId(null);
    }
  };

  if (!session) {
    return (
      <section className="flex flex-col justify-center gap-3 rounded-xl border border-dashed border-border/70 bg-muted/10 p-6 text-center text-sm text-muted-foreground">
        <p>Chưa có phiên truyền tải nào đang hoạt động.</p>
        <p>Sau khi bắt đầu gửi hoặc nhận, tiến trình sẽ hiển thị tại đây.</p>
      </section>
    );
  }

  const percent = Math.min(100, Math.max(0, Math.round(session.percent)));
  const phase = session.phase;
  const infoItems = [session.speed ? `Tốc độ ${session.speed}` : null, session.eta ? `ETA ${session.eta}` : null, session.code ? `Code ${session.code}` : null].filter(Boolean);

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border/80 bg-background/80 p-5 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${PHASE_COLORS[phase]}`}>
            {STATUS_ICON[phase]}
            {PHASE_LABELS[phase]}
          </span>
          <span className="text-xs uppercase tracking-wide text-muted-foreground">{session.type === 'send' ? 'Đang gửi' : 'Đang nhận'}</span>
        </div>
        {canCancel ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={cancelingId === session.id}>
                Hủy phiên
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Hủy phiên hiện tại?</AlertDialogTitle>
                <AlertDialogDescription>Việc hủy sẽ dừng quá trình truyền tải. Bạn có thể bắt đầu lại sau nếu cần.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Đóng</AlertDialogCancel>
                <AlertDialogAction onClick={() => void handleCancel()} disabled={cancelingId === session.id}>
                  Xác nhận hủy
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}
      </header>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span>{percent}%</span>
          <span>{phase === 'done' ? 'Hoàn tất' : 'Đang xử lý'}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${percent}%` }} />
        </div>
        {infoItems.length > 0 && <p className="text-xs text-muted-foreground">{infoItems.join(' • ')}</p>}
      </div>

      {session.logTail.length > 0 && (
        <div className="space-y-2">
          <Separator />
          <div className="flex items-center justify-between gap-2 text-sm font-medium">
            <span>Nhật ký gần nhất</span>
          </div>
          <div className="max-h-48 overflow-y-auto rounded-md border border-border/60 bg-muted/20 p-2 text-xs font-mono">
            <ul className="space-y-1">
              {session.logTail.map((entry: TransferSession['logTail'][number]) => (
                <li key={entry.id} className="flex gap-2">
                  <span className="text-muted-foreground">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                  <span className={entry.level === 'error' ? 'text-destructive' : entry.level === 'warn' ? 'text-amber-500 dark:text-amber-300' : 'text-foreground'}>{entry.message}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}

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
