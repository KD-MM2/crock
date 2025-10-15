import { ComponentType } from 'react';

export default function AlertNote({ icon: Icon, text }: { icon: ComponentType<{ className?: string }>; text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-dashed border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
      <Icon className="mt-0.5 size-4" aria-hidden />
      <span>{text}</span>
    </div>
  );
}
