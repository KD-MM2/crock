import { formatDateTime, formatBytes, formatDuration } from '@/lib/format';
import { getWindowApi } from '@/lib/window-api';
import { HistoryRecord } from '@/types/history';
import { ArrowUpRight, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/button';
import { typeLabelKeys } from './const';
import DetailRow from './detail-row';
import StatusBadge from './status-badge';

export default function HistoryDetail({ record, onClose }: { record: HistoryRecord; onClose: () => void }) {
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
          <DetailRow
            label={t('history.detail.fields.duration')}
            value={record.duration ?? formatDuration(record.finishedAt && record.createdAt ? record.finishedAt - record.createdAt : undefined)}
          />
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
