import { type ReactNode, useEffect, useMemo } from 'react';
import { Activity, ArrowUpRight, Clock, Download, ExternalLink, FileText, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useUiStore, type UiStore } from '@/stores/ui';
import { useHistoryStore } from '@/stores/history';
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

  const status = useHistoryStore((state) => state.status);
  const load = useHistoryStore((state) => state.load);
  const refresh = useHistoryStore((state) => state.refresh);
  const allRecords = useHistoryStore((state) => state.records);
  const filters = useHistoryStore((state) => state.filters);
  const setFilters = useHistoryStore((state) => state.setFilters);
  const clearAll = useHistoryStore((state) => state.clearAll);
  const select = useHistoryStore((state) => state.select);
  const selectedId = useHistoryStore((state) => state.selectedId);

  const records = useMemo(() => {
    return allRecords.filter((record) => {
      if (filters.type !== 'all' && record.type !== filters.type) return false;
      if (filters.status !== 'all' && record.status !== filters.status) return false;
      if (filters.search) {
        const keyword = filters.search.toLowerCase();
        const haystack = [record.code, record.relay, record.files?.map((file) => file.name).join(' ')].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(keyword)) return false;
      }
      return true;
    });
  }, [allRecords, filters]);

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
              <div className="flex items-center gap-4 rounded-lg border border-border/60 bg-muted/20 p-3">
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
                <div className="flex-[2]">
                  <Input placeholder={t('history.dialog.filters.search.placeholder')} value={filters.search} onChange={(event) => setFilters({ search: event.target.value })} />
                </div>
                <Button variant="outline" size="sm" onClick={() => void refresh()}>
                  <RefreshCw className="mr-2 size-4" aria-hidden /> {t('history.dialog.actions.refresh')}
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setFilters({ type: 'all', status: 'all', search: '' })}>
                  {t('history.dialog.actions.resetFilters')}
                </Button>
              </div>
              <div className="rounded-lg border border-border/60">
                <div className="max-h-[320px] overflow-y-auto">
                  {status === 'loading' && (
                    <div className="flex items-center justify-center gap-2 px-4 py-6 text-muted-foreground">
                      <Activity className="size-4 animate-spin" aria-hidden /> {t('history.dialog.loading')}
                    </div>
                  )}
                  {status === 'ready' && records.length === 0 && <div className="px-4 py-6 text-sm text-muted-foreground">{t('history.dialog.empty')}</div>}
                  {status === 'ready' && records.length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">{t('history.dialog.table.headers.type')}</TableHead>
                          <TableHead>{t('history.dialog.table.headers.time')}</TableHead>
                          <TableHead className="w-24 text-right">{t('history.dialog.table.headers.size')}</TableHead>
                          <TableHead className="w-32 text-right">{t('history.dialog.table.headers.relay')}</TableHead>
                          <TableHead className="w-32 text-right">{t('history.dialog.table.headers.code')}</TableHead>
                          <TableHead className="w-24 text-right">{t('history.dialog.table.headers.status')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {records.map((record: HistoryRecord) => {
                          const totalSize = record.totalSize ?? record.files?.reduce((sum, file) => sum + (file.size ?? 0), 0) ?? 0;
                          return (
                            <TableRow key={record.id} className={cn('cursor-pointer', selectedId === record.id && 'bg-primary/10')} onClick={() => select(record.id)} data-state={selectedId === record.id ? 'selected' : undefined}>
                              <TableCell className="font-medium text-muted-foreground">{t(typeLabelKeys[record.type] ?? 'history.types.unknown', { defaultValue: record.type })}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{formatDateTime(record.createdAt)}</TableCell>
                              <TableCell className="text-right font-medium">{formatBytes(totalSize)}</TableCell>
                              <TableCell className="truncate text-right text-xs text-muted-foreground" title={record.relay ?? ''}>
                                {record.relay ?? '—'}
                              </TableCell>
                              <TableCell className="truncate text-right font-mono text-xs text-muted-foreground" title={record.code ?? ''}>
                                {maskCode(record.code)}
                              </TableCell>
                              <TableCell className="text-right">
                                <StatusBadge status={record.status} />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={allRecords.length === 0}>
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
                      <AlertDialogAction variant="destructive" onClick={() => void handleClearAll()}>
                        <Trash2 className="size-4" aria-hidden /> {t('history.dialog.clearConfirm.confirm')}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button variant="secondary" size="sm" onClick={() => void handleExport()} disabled={allRecords.length === 0}>
                  <Download className="mr-2 size-4" aria-hidden /> {t('history.dialog.actions.exportJson')}
                </Button>
              </div>
            </div>
          </div>

          <Separator orientation="vertical" className="hidden h-full sm:block" />

          <aside className="flex h-full flex-col w-full border-t border-border/60 bg-muted/20 sm:w-[360px] sm:border-l sm:border-t-0">
            <div className="flex-1 overflow-hidden p-6">
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
            </div>
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
  const totalSize = record.totalSize ?? record.files?.reduce((sum, file) => sum + (file.size ?? 0), 0) ?? 0;

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
    <div className="flex h-full flex-col gap-4 text-sm overflow-hidden">
      <div className="flex-shrink-0">
        <p className="text-xs uppercase text-muted-foreground">{t('history.detail.sessionLabel', { type: typeLabel })}</p>
        <p className="font-semibold text-foreground">{formatDateTime(record.createdAt)}</p>
      </div>
      <div className="flex-1 overflow-y-auto space-y-4">
        <div className="space-y-2 rounded-lg border border-border/60 bg-background/40 p-3">
          <DetailRow label={t('history.detail.fields.code')} value={record.code ?? '—'} mono />
          <DetailRow label={t('history.detail.fields.relay')} value={record.relay ?? '—'} />
          <DetailRow label={t('history.detail.fields.status')} value={<StatusBadge status={record.status} />} />
          <DetailRow label={t('history.detail.fields.totalSize')} value={formatBytes(totalSize)} />
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
      </div>
      <div className="flex-shrink-0 grid gap-2">
        <Button variant="outline" size="sm" onClick={onClose}>
          {t('common.actions.close')}
        </Button>
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
