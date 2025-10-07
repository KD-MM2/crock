import { type ReactNode, useEffect } from 'react';
import { Globe, History, Settings, Send } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ModeToggle } from '@/components/mode-toggle';
import { useUiStore, type UiStore } from '@/stores/ui';
import { useSettingsStore, type SettingsStoreState } from '@/stores/settings';
import { cn } from '@/lib/utils';
import type { SettingsState } from '@/types/settings';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const selectSettings = (state: SettingsStoreState) => ({
  status: state.status,
  settings: state.settings,
  load: state.load,
  patch: state.patch
});

const LANGUAGE_LABELS: Record<SettingsState['general']['language'], string> = {
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

  return (
    <header
      className={cn('flex h-14 shrink-0 items-center gap-2 border-b border-border/80 bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60', 'app-region-drag')}
      style={{ WebkitAppRegion: 'drag' }}
      aria-label="Thanh tiêu đề ứng dụng"
    >
      <div className="flex items-center gap-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
        <div className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm" style={{ WebkitAppRegion: 'no-drag' }}>
          <Send className="size-4" aria-hidden />
        </div>
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
                <Button variant="ghost" size="icon" className="size-9 text-muted-foreground hover:text-foreground" aria-label={`Đổi ngôn ngữ (hiện tại: ${LANGUAGE_LABELS[language]})`} disabled={!settings || status === 'loading'}>
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
}

function HeaderActionButton({ icon, label, tooltip, onClick, ariaLabel }: HeaderActionButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" className="size-9 text-muted-foreground hover:text-foreground" onClick={onClick} aria-label={ariaLabel}>
          {icon}
          <span className="sr-only">{label}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{tooltip}</TooltipContent>
    </Tooltip>
  );
}
