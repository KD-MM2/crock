import { type ReactNode, useEffect, useMemo } from 'react';
import { Activity, ArrowUpRight, Clock, Download, ExternalLink, FileText, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useUiStore, type UiStore } from '@/stores/ui';
import { selectFilteredHistory, useHistoryStore, type HistoryStoreState } from '@/stores/history';
import type { HistoryRecord } from '@/types/history';
import { formatBytes, formatDateTime, formatDuration, maskCode } from '@/lib/format';
import { cn } from '@/lib/utils';
import { getWindowApi } from '@/lib/window-api';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const statusLabelKeys: Record<string, string> = {
  'in-progress': 'history.statuses.in-progress',
  connecting: 'history.statuses.connecting',
  sending: 'history.statuses.sending',
  receiving: 'history.statuses.receiving',
  done: 'history.statuses.done',
  failed: 'history.statuses.failed',
  canceled: 'history.statuses.canceled'
};

const typeLabelKeys: Record<string, string> = {
  send: 'history.types.send',
  receive: 'history.types.receive'
};

export function HistoryDialog() {
  const open = useUiStore((state: UiStore) => state.dialogs.historyOpen);
  const closeHistory = useUiStore((state: UiStore) => state.closeHistory);
  const { t } = useTranslation();

  const status = useHistoryStore((state: HistoryStoreState) => state.status);
  const load = useHistoryStore((state: HistoryStoreState) => state.load);
  const refresh = useHistoryStore((state: HistoryStoreState) => state.refresh);
  const filters = useHistoryStore((state: HistoryStoreState) => state.filters);
  const setFilters = useHistoryStore((state: HistoryStoreState) => state.setFilters);
  const clearAll = useHistoryStore((state: HistoryStoreState) => state.clearAll);
  const select = useHistoryStore((state: HistoryStoreState) => state.select);
  const selectedId = useHistoryStore((state: HistoryStoreState) => state.selectedId);
  const records = useHistoryStore((state: HistoryStoreState) => selectFilteredHistory(state));
  const selectedRecord = useMemo<HistoryRecord | undefined>(() => records.find((record: HistoryRecord) => record.id === selectedId), [records, selectedId]);

  useEffect(() => {
    if (open) {
      void load();
    }
  }, [open, load]);

  const handleExport = async () => {
    const api = getWindowApi();
    await api.history.saveExport();
  };

  const handleClearAll = async () => {
    try {
      await clearAll();
      toast.success(t('history.toast.clearAllSuccess'));
    } catch (error) {
      console.error('[HistoryDialog] clear all failed', error);
      toast.error(t('history.toast.clearAllFailure'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? closeHistory() : null)}>
      <DialogContent className="max-h-[90vh] w-full overflow-hidden p-0 sm:rounded-xl sm:min-w-[720px] sm:max-w-6xl">
        <div className="flex h-full flex-col sm:flex-row">
          <div className="flex-1 overflow-hidden p-6">
            <DialogHeader className="items-start text-left">
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Clock className="size-5 text-primary" aria-hidden />
                {t('history.dialog.title')}
              </DialogTitle>
              <DialogDescription>{t('history.dialog.description')}</DialogDescription>
            </DialogHeader>

            <div className="mt-4 grid gap-4">
              <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border/60 bg-muted/20 p-3">
                <div className="flex-1 min-w-[200px]">
                  <label className="mb-1 block text-xs font-medium uppercase text-muted-foreground">{t('history.dialog.filters.type.label')}</label>
                  <Select value={filters.type} onValueChange={(value) => setFilters({ type: value as typeof filters.type })}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('history.dialog.filters.type.options.all')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('history.dialog.filters.type.options.all')}</SelectItem>
                      <SelectItem value="send">{t(typeLabelKeys.send)}</SelectItem>
                      <SelectItem value="receive">{t(typeLabelKeys.receive)}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="mb-1 block text-xs font-medium uppercase text-muted-foreground">{t('history.dialog.filters.status.label')}</label>
                  <Select value={filters.status} onValueChange={(value) => setFilters({ status: value as typeof filters.status })}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('history.dialog.filters.status.options.all')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('history.dialog.filters.status.options.all')}</SelectItem>
                      <SelectItem value="done">{t(statusLabelKeys.done)}</SelectItem>
                      <SelectItem value="failed">{t(statusLabelKeys.failed)}</SelectItem>
                      <SelectItem value="canceled">{t(statusLabelKeys.canceled)}</SelectItem>
                      <SelectItem value="in-progress">{t(statusLabelKeys['in-progress'])}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="mb-1 block text-xs font-medium uppercase text-muted-foreground">{t('history.dialog.filters.search.label')}</label>
                  <Input placeholder={t('history.dialog.filters.search.placeholder')} value={filters.search} onChange={(event) => setFilters({ search: event.target.value })} />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <Button variant="outline" size="sm" onClick={() => void refresh()}>
                    <RefreshCw className="mr-2 size-4" aria-hidden /> {t('history.dialog.actions.refresh')}
                  </Button>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <Button variant="ghost" size="sm" onClick={() => setFilters({ type: 'all', status: 'all', search: '' })}>
                    {t('history.dialog.actions.resetFilters')}
                  </Button>
                </div>
              </div>
              <div className="rounded-lg border border-border/60">
                <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <span className="w-12">{t('history.dialog.table.headers.type')}</span>
                  <span className="flex-1">{t('history.dialog.table.headers.time')}</span>
                  <span className="w-24 text-right">{t('history.dialog.table.headers.size')}</span>
                  <span className="w-32 text-right">{t('history.dialog.table.headers.relay')}</span>
                  <span className="w-32 text-right">{t('history.dialog.table.headers.code')}</span>
                  <span className="w-24 text-right">{t('history.dialog.table.headers.status')}</span>
                </div>
                <div className="max-h-[320px] overflow-y-auto">
                  {status === 'loading' && (
                    <div className="flex items-center justify-center gap-2 px-4 py-6 text-muted-foreground">
                      <Activity className="size-4 animate-spin" aria-hidden /> {t('history.dialog.loading')}
                    </div>
                  )}
                  {status === 'ready' && records.length === 0 && <div className="px-4 py-6 text-sm text-muted-foreground">{t('history.dialog.empty')}</div>}
                  {records.map((record: HistoryRecord) => (
                    <button
                      key={record.id}
                      className={cn('flex w-full items-center gap-2 border-b border-border/40 px-4 py-3 text-sm transition-colors last:border-none hover:bg-muted/40', selectedId === record.id && 'bg-primary/10')}
                      onClick={() => select(record.id)}
                    >
                      <span className="w-12 text-left font-medium text-muted-foreground">{t(typeLabelKeys[record.type] ?? 'history.types.unknown', { defaultValue: record.type })}</span>
                      <span className="flex-1 text-left text-xs text-muted-foreground">{formatDateTime(record.createdAt)}</span>
                      <span className="w-24 text-right font-medium">{formatBytes(record.totalSize)}</span>
                      <span className="w-32 truncate text-right text-xs text-muted-foreground" title={record.relay ?? ''}>
                        {record.relay ?? '—'}
                      </span>
                      <span className="w-32 truncate text-right font-mono text-xs text-muted-foreground" title={record.code ?? ''}>
                        {maskCode(record.code)}
                      </span>
                      <span className="w-24 text-right">
                        <StatusBadge status={record.status} />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <Separator orientation="vertical" className="hidden h-full sm:block" />

          <aside className="w-full border-t border-border/60 bg-muted/20 p-6 sm:w-[320px] sm:border-l sm:border-t-0">
            {selectedRecord ? (
              <HistoryDetail record={selectedRecord} onClose={() => select(undefined)} />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-sm text-muted-foreground">
                <FileText className="size-10 text-muted-foreground" aria-hidden />
                <div>
                  <p className="font-medium text-foreground">{t('history.dialog.selection.promptTitle')}</p>
                  <p>{t('history.dialog.selection.promptDescription')}</p>
                </div>
              </div>
            )}
            <DialogFooter className="mt-6 flex-col gap-2 sm:flex-col">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="w-full">
                    <Trash2 className="mr-2 size-4" aria-hidden /> {t('history.dialog.actions.clearAll')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('history.dialog.clearConfirm.title')}</AlertDialogTitle>
                    <AlertDialogDescription>{t('history.dialog.clearConfirm.description')}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('common.actions.cancel')}</AlertDialogCancel>
                    <AlertDialogAction className="gap-2 bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive" onClick={() => void handleClearAll()}>
                      <Trash2 className="size-4" aria-hidden /> {t('history.dialog.clearConfirm.confirm')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button variant="secondary" size="sm" onClick={() => void handleExport()} className="w-full">
                <Download className="mr-2 size-4" aria-hidden /> {t('history.dialog.actions.exportJson')}
              </Button>
            </DialogFooter>
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const labelKey = statusLabelKeys[status];
  const label = labelKey ? t(labelKey) : status;
  const color = status === 'done' ? 'bg-emerald-500/10 text-emerald-500' : status === 'failed' ? 'bg-red-500/10 text-red-500' : status === 'canceled' ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-500/10 text-slate-500';
  return <span className={cn('inline-flex items-center justify-end rounded-full px-2 py-0.5 text-xs font-medium', color)}>{label}</span>;
}

function HistoryDetail({ record, onClose }: { record: HistoryRecord; onClose: () => void }) {
  const api = getWindowApi();
  const { t } = useTranslation();
  const typeLabelKey = typeLabelKeys[record.type];
  const typeLabel = typeLabelKey ? t(typeLabelKey) : record.type;

  const handleOpenFolder = async () => {
    const path = record.type === 'receive' ? record.destinationPath : record.sourcePath;
    if (path) {
      await api.app.openPath(path);
    }
  };

  const handleResend = async () => {
    window.dispatchEvent(
      new CustomEvent('history:resend', {
        detail: record
      })
    );
  };

  return (
    <div className="flex h-full flex-col gap-4 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs uppercase text-muted-foreground">{t('history.detail.sessionLabel', { type: typeLabel })}</p>
          <p className="font-semibold text-foreground">{formatDateTime(record.createdAt)}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          {t('common.actions.close')}
        </Button>
      </div>
      <div className="space-y-2 rounded-lg border border-border/60 bg-background/40 p-3">
        <DetailRow label={t('history.detail.fields.code')} value={record.code ?? '—'} mono />
        <DetailRow label={t('history.detail.fields.relay')} value={record.relay ?? '—'} />
        <DetailRow label={t('history.detail.fields.status')} value={<StatusBadge status={record.status} />} />
        <DetailRow label={t('history.detail.fields.totalSize')} value={formatBytes(record.totalSize)} />
        <DetailRow label={t('history.detail.fields.duration')} value={record.duration ?? formatDuration(record.finishedAt && record.createdAt ? record.finishedAt - record.createdAt : undefined)} />
      </div>
      {record.files && record.files.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">{t('history.detail.files.title')}</p>
          <div className="space-y-2 rounded-lg border border-border/60 bg-background/40 p-3">
            {record.files.map((file: NonNullable<HistoryRecord['files']>[number]) => (
              <div key={file.name} className="flex items-center justify-between text-xs">
                <span className="truncate" title={file.path ?? file.name}>
                  {file.name}
                </span>
                <span className="text-muted-foreground">{formatBytes(file.size)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {record.logTail && record.logTail.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">{t('history.detail.log.title')}</p>
          <div className="max-h-32 space-y-1 overflow-y-auto rounded-lg border border-border/60 bg-background/60 p-3 text-xs font-mono">
            {record.logTail.map((line: string, index: number) => (
              <p key={`${record.id}-log-${index}`} className="whitespace-pre-wrap text-left">
                {line}
              </p>
            ))}
          </div>
        </div>
      )}
      <div className="mt-auto grid gap-2">
        <Button variant="outline" size="sm" onClick={() => void handleResend()}>
          <ArrowUpRight className="mr-2 size-4" aria-hidden /> {t('history.detail.actions.resend')}
        </Button>
        {record.type === 'receive' && record.destinationPath && (
          <Button variant="secondary" size="sm" onClick={() => void handleOpenFolder()}>
            <ExternalLink className="mr-2 size-4" aria-hidden /> {t('history.detail.actions.openDestination')}
          </Button>
        )}
      </div>
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('text-right font-medium', mono && 'font-mono')}>{value}</span>
    </div>
  );
}
