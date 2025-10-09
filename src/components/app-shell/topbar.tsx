import { type ComponentProps, type ReactNode, useEffect } from 'react';
import { Globe, History, Minus, Settings, Square, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ModeToggle } from '@/components/mode-toggle';
import { useUiStore, type UiStore } from '@/stores/ui';
import { useSettingsStore, type SettingsStoreState } from '@/stores/settings';
import { cn } from '@/lib/utils';
import type { SettingsState } from '@/types/settings';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { getWindowApi } from '@/lib/window-api';

const selectSettings = (state: SettingsStoreState) => ({
  status: state.status,
  settings: state.settings,
  load: state.load,
  patch: state.patch
});

const LANGUAGE_LABELS: Record<NonNullable<SettingsState['general']['language']>, string> = {
  vi: 'Tiếng Việt',
  en: 'English'
};

export function AppShellTopbar() {
  const openHistory = useUiStore((state: UiStore) => state.openHistory);
  const openSettings = useUiStore((state: UiStore) => state.openSettings);
  const { status, settings, load, patch } = useSettingsStore(selectSettings);

  useEffect(() => {
    if (status === 'idle') {
      void load();
    }
  }, [status, load]);

  const language = settings?.general.language ?? 'vi';

  const handleLanguageChange = (value: string) => {
    if (!settings) return;
    const nextLanguage = value as SettingsState['general']['language'];
    if (settings.general.language === nextLanguage) return;
    void patch({
      general: {
        ...settings.general,
        language: nextLanguage
      }
    });
  };

  const handleMinimize = () => {
    try {
      void getWindowApi().window.minimize();
    } catch (error) {
      console.error('[AppShellTopbar] Failed to minimize window', error);
    }
  };

  const handleToggleMaximize = () => {
    try {
      void getWindowApi().window.toggleMaximize();
    } catch (error) {
      console.error('[AppShellTopbar] Failed to toggle maximize window', error);
    }
  };

  const handleClose = () => {
    try {
      void getWindowApi().window.close();
    } catch (error) {
      console.error('[AppShellTopbar] Failed to close window', error);
    }
  };

  return (
    <header
      className={cn('flex h-14 shrink-0 items-center gap-2 border-b border-border/80 bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60', 'app-region-drag')}
      style={{ WebkitAppRegion: 'drag' }}
      aria-label="Thanh tiêu đề ứng dụng"
    >
      <div className="flex items-center gap-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
        <img src="/crock.svg" alt="Crock logo" className="size-14" style={{ WebkitAppRegion: 'no-drag' }} />
        <span className="text-base font-semibold normal-case text-foreground" style={{ WebkitAppRegion: 'no-drag' }}>
          crock
        </span>
      </div>
      <div className="ml-auto flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' }}>
        <HeaderActionButton icon={<History className="size-4" aria-hidden />} label="Lịch sử" tooltip="Xem lịch sử truyền tải (Ctrl+H)" onClick={openHistory} ariaLabel="Mở lịch sử truyền tải" />
        <HeaderActionButton icon={<Settings className="size-4" aria-hidden />} label="Cài đặt" tooltip="Mở cài đặt (Ctrl+,)" onClick={openSettings} ariaLabel="Mở cài đặt" />
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="size-9 text-muted-foreground hover:text-foreground" aria-label={`Đổi ngôn ngữ (hiện tại: ${LANGUAGE_LABELS[language]})`} disabled={!settings || status === 'loading'}>
                  <Globe className="size-4" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom">Ngôn ngữ: {LANGUAGE_LABELS[language]}</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end" sideOffset={8} className="min-w-[160px]">
            <DropdownMenuItem onSelect={() => handleLanguageChange('vi')}>Tiếng Việt {language === 'vi' ? '✓' : ''}</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleLanguageChange('en')}>English {language === 'en' ? '✓' : ''}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <ModeToggle />
        <Separator orientation="vertical" className="mx-1 h-6" />
        <div className="flex items-center gap-1">
          <HeaderActionButton icon={<Minus className="size-4" aria-hidden />} label="Thu nhỏ" tooltip="Thu nhỏ cửa sổ" onClick={handleMinimize} ariaLabel="Thu nhỏ cửa sổ" variant="ghost" className="hover:bg-muted" />
          <HeaderActionButton
            icon={<Square className="size-3.5" aria-hidden />}
            label="Phóng to"
            tooltip="Phóng to hoặc khôi phục"
            onClick={handleToggleMaximize}
            ariaLabel="Phóng to hoặc khôi phục cửa sổ"
            variant="ghost"
            className="hover:bg-muted"
          />
          <HeaderActionButton
            icon={<X className="size-4" aria-hidden />}
            label="Đóng"
            tooltip="Đóng ứng dụng"
            onClick={handleClose}
            ariaLabel="Đóng ứng dụng"
            variant="ghost"
            className="hover:bg-destructive hover:text-destructive-foreground focus-visible:bg-destructive/90"
          />
        </div>
      </div>
    </header>
  );
}

interface HeaderActionButtonProps {
  icon: ReactNode;
  label: string;
  tooltip: string;
  onClick: () => void;
  ariaLabel: string;
  variant?: ComponentProps<typeof Button>['variant'];
  className?: string;
}

function HeaderActionButton({ icon, label, tooltip, onClick, ariaLabel, variant = 'outline', className }: HeaderActionButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant={variant} size="icon" className={cn('size-9 text-muted-foreground hover:text-foreground', className)} onClick={onClick} aria-label={ariaLabel}>
          {icon}
          <span className="sr-only">{label}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{tooltip}</TooltipContent>
    </Tooltip>
  );
}
