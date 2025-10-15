import { type ComponentProps, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface HeaderActionButtonProps {
  icon: ReactNode;
  label: string;
  tooltip: string;
  onClick: () => void;
  ariaLabel: string;
  variant?: ComponentProps<typeof Button>['variant'];
  className?: string;
}

export default function HeaderActionButton({ icon, label, tooltip, onClick, ariaLabel, variant = 'outline', className }: HeaderActionButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={variant}
          size="icon"
          className={cn('size-9 text-muted-foreground hover:text-foreground', className)}
          onClick={onClick}
          aria-label={ariaLabel}
        >
          {icon}
          <span className="sr-only">{label}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{tooltip}</TooltipContent>
    </Tooltip>
  );
}
