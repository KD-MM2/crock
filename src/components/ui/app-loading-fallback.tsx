import { cn } from '@/lib/utils';
import { Spinner } from './spinner';

type AppLoadingFallbackProps = {
  fullscreen?: boolean;
  className?: string;
};

function AppLoadingFallback({ fullscreen = false, className }: AppLoadingFallbackProps) {
  const containerClasses = fullscreen ? 'fixed inset-0 z-50' : 'relative h-full w-full';

  return (
    <div className={cn('relative flex items-center justify-center', containerClasses, className)}>
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" aria-hidden />
      <div className="relative flex flex-col items-center gap-3 rounded-lg border border-border/50 bg-card/80 px-6 py-5 shadow-lg">
        <Spinner className="size-8" />
        <span className="text-sm font-medium text-muted-foreground">Loading...</span>
      </div>
    </div>
  );
}

export { AppLoadingFallback };
