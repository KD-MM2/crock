import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

type InfoCardStatus = 'online' | 'offline' | 'configured';

const statusStyles: Record<InfoCardStatus, string> = {
  online: 'bg-emerald-500/10 text-emerald-500',
  offline: 'bg-red-500/10 text-red-500',
  configured: 'bg-sky-500/10 text-sky-500'
};

export default function InfoCard({ title, description, status }: { title: string; description: string; status: InfoCardStatus }) {
  const { t } = useTranslation();

  const labelMap: Record<InfoCardStatus, string> = {
    online: t('common.status.online'),
    offline: t('common.status.offline'),
    configured: t('common.status.configured')
  };

  return (
    <div className="rounded-lg border border-border/60 bg-background/40 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{title}</p>
        <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold', statusStyles[status])}>
          {labelMap[status]}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
