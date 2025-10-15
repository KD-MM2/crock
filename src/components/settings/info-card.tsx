import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

export default function InfoCard({ title, description, status }: { title: string; description: string; status: 'online' | 'offline' }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-lg border border-border/60 bg-background/40 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{title}</p>
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
            status === 'online' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
          )}
        >
          {status === 'online' ? t('common.status.online') : t('common.status.offline')}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
