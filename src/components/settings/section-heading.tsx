import { ComponentType } from 'react';

export default function SectionHeading({
  icon: Icon,
  title,
  description
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-4 text-primary" aria-hidden />
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
        {description ? <p className="text-sm text-muted-foreground/80">{description}</p> : null}
      </div>
    </div>
  );
}
