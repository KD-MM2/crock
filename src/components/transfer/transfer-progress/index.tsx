import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useTransferStore } from '@/stores/transfer';
import { useHistoryStore, type HistoryStoreState } from '@/stores/history';
import { useSettingsStore } from '@/stores/settings';
import { getWindowApi } from '@/lib/window-api';
import type { TransferSession } from '@/types/transfer';
import { PHASE_COLORS, STATUS_ICON, PHASE_LABEL_KEYS } from './const';
import { normalizeProgress, createLogEntry, normalizeDone } from './utils';

export function TransferProgressPanel() {
  const activeId = useTransferStore((state) => state.activeTransferId);
  const sessions = useTransferStore((state) => state.sessions);
  const updateProgress = useTransferStore((state) => state.updateProgress);
  const finalizeSession = useTransferStore((state) => state.finalizeSession);
  const appendLog = useTransferStore((state) => state.appendLog);
  const refreshHistory = useHistoryStore((state: HistoryStoreState) => state.refresh);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const showLogs = useSettingsStore((state) => state.settings?.advanced?.showTransferLogs ?? true);
  const { t } = useTranslation();

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
        toast.info(t('transfer.progress.toast.canceled'));
      } else if (done.success) {
        toast.success(t('transfer.progress.toast.completed'));
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
  }, [updateProgress, finalizeSession, appendLog, refreshHistory, t]);

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
      toast.info(t('transfer.progress.toast.canceling'));
    } catch (error) {
      console.error('[TransferProgress] cancel failed', error);
      toast.error(t('transfer.progress.toast.cancelFailed'));
    } finally {
      setCancelingId(null);
    }
  };

  if (!session) {
    return (
      <section className="flex flex-col justify-center gap-3 rounded-xl border border-dashed border-border/70 bg-muted/10 p-6 text-center text-sm text-muted-foreground">
        <p>{t('transfer.progress.empty.title')}</p>
        <p>{t('transfer.progress.empty.description')}</p>
      </section>
    );
  }

  const percent = Math.min(100, Math.max(0, Math.round(session.percent)));
  const phase = session.phase;
  const isIndeterminate = phase === 'waiting';
  const percentLabel = isIndeterminate ? '—' : `${percent}%`;
  const progressStatusText =
    phase === 'done'
      ? t('transfer.progress.status.done')
      : isIndeterminate
        ? t('transfer.progress.status.waiting')
        : t('transfer.progress.status.processing');
  const hasRatio = phase !== 'hashing' && session.sizeTransferred && session.sizeTotal;
  const sizeLabel = hasRatio
    ? t('transfer.progress.info.sizeRatio', { transferred: session.sizeTransferred, total: session.sizeTotal })
    : session.sizeTotal
      ? t('transfer.progress.info.sizeTotal', { total: session.sizeTotal })
      : null;
  const infoItems =
    phase === 'waiting'
      ? []
      : [
          session.targetAddress ? t('transfer.progress.info.connection', { address: session.targetAddress }) : null,
          sizeLabel,
          session.speed ? t('transfer.progress.info.speed', { speed: session.speed }) : null,
          session.eta ? t('transfer.progress.info.eta', { eta: session.eta }) : null
        ].filter(Boolean);

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border/80 bg-background/80 p-5 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${PHASE_COLORS[phase]}`}>
            {STATUS_ICON[phase]}
            {t(PHASE_LABEL_KEYS[phase])}
          </span>
        </div>
        {canCancel ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={cancelingId === session.id}>
                {t('transfer.progress.cancel.button')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('transfer.progress.cancel.confirmTitle')}</AlertDialogTitle>
                <AlertDialogDescription>{t('transfer.progress.cancel.confirmDescription')}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('common.actions.cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={() => void handleCancel()} disabled={cancelingId === session.id}>
                  {t('transfer.progress.cancel.confirm')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}
      </header>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span>{percentLabel}</span>
          <span>{progressStatusText}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          {isIndeterminate ? (
            <div className="animate-progress-indeterminate h-full w-full rounded-full bg-primary/30">
              <span className="sr-only">{t('transfer.progress.progressbar.srWaiting')}</span>
            </div>
          ) : (
            <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${percent}%` }} />
          )}
        </div>
        {infoItems.length > 0 && <p className="text-xs text-muted-foreground">{infoItems.join(' • ')}</p>}
      </div>

      {showLogs && session.logTail.length > 0 && (
        <div className="space-y-2">
          <Separator />
          <div className="flex items-center justify-between gap-2 text-sm font-medium">
            <span>{t('transfer.progress.logs.title')}</span>
          </div>
          <div className="max-h-48 overflow-y-auto rounded-md border border-border/60 bg-muted/20 p-2 text-xs font-mono">
            <ul className="space-y-1">
              {session.logTail.map((entry: TransferSession['logTail'][number]) => (
                <li key={entry.id} className="flex gap-2">
                  <span className="text-muted-foreground">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                  <span
                    className={
                      entry.level === 'error' ? 'text-destructive' : entry.level === 'warn' ? 'text-amber-500 dark:text-amber-300' : 'text-foreground'
                    }
                  >
                    {entry.message}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
