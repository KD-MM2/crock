import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { statusLabelKeys } from './const';

export default function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const labelKey = statusLabelKeys[status];
  const label = labelKey ? t(labelKey) : status;
  const color =
    status === 'done'
      ? 'bg-emerald-500/10 text-emerald-500'
      : status === 'failed'
        ? 'bg-red-500/10 text-red-500'
        : status === 'canceled'
          ? 'bg-amber-500/10 text-amber-500'
          : 'bg-slate-500/10 text-slate-500';
  return <span className={cn('inline-flex items-center justify-end rounded-full px-2 py-0.5 text-xs font-medium', color)}>{label}</span>;
}
