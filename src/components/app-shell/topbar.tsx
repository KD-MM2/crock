import { type ComponentProps, type ReactNode, useEffect, useMemo } from 'react';
import { Check, Globe, History, Minus, Settings, Square, X } from 'lucide-react';

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
import { useTranslation } from 'react-i18next';
import type { SupportedLanguage } from '@/lib/i18n';
import i18next from '@/lib/i18n';

const selectSettings = (state: SettingsStoreState) => ({
  status: state.status,
  settings: state.settings,
  load: state.load,
  patch: state.patch
});

export function AppShellTopbar() {
  const openHistory = useUiStore((state: UiStore) => state.openHistory);
  const openSettings = useUiStore((state: UiStore) => state.openSettings);
  const { status, settings, load, patch } = useSettingsStore(selectSettings);
  const { t } = useTranslation();

  const languageOptions = useMemo(
    () => ({
      vi: t('topbar.language.options.vi'),
      en: t('topbar.language.options.en')
    }),
    [t]
  );

  useEffect(() => {
    if (status === 'idle') {
      void load();
    }
  }, [status, load]);

  const language = (settings?.general.language ?? 'vi') as SupportedLanguage;
  const currentLanguageLabel = languageOptions[language];

  useEffect(() => {
    void i18next.changeLanguage(language);
  }, [language]);

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
      aria-label={t('topbar.ariaLabel')}
    >
      <div className="flex items-center gap-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
        <img src="/crock.svg" alt="Crock logo" className="size-14" style={{ WebkitAppRegion: 'no-drag' }} />
        <span className="text-base font-semibold normal-case text-foreground" style={{ WebkitAppRegion: 'no-drag' }}>
          crock
        </span>
      </div>
      <div className="ml-auto flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' }}>
        <HeaderActionButton icon={<History className="size-4" aria-hidden />} label={t('topbar.history.label')} tooltip={t('topbar.history.tooltip')} onClick={openHistory} ariaLabel={t('topbar.history.ariaLabel')} />
        <HeaderActionButton icon={<Settings className="size-4" aria-hidden />} label={t('topbar.settings.label')} tooltip={t('topbar.settings.tooltip')} onClick={openSettings} ariaLabel={t('topbar.settings.ariaLabel')} />
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="size-9 text-muted-foreground hover:text-foreground" aria-label={t('topbar.language.buttonAria', { language: currentLanguageLabel })} disabled={!settings || status === 'loading'}>
                  <Globe className="size-4" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom">{t('topbar.language.tooltip', { language: currentLanguageLabel })}</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end" sideOffset={8} className="min-w-[160px]">
            <DropdownMenuItem onSelect={() => handleLanguageChange('vi')}>
              <div className="flex w-full items-center justify-between">
                <span>{languageOptions.vi}</span>
                {language === 'vi' ? <Check className="size-4" aria-hidden /> : null}
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleLanguageChange('en')}>
              <div className="flex w-full items-center justify-between">
                <span>{languageOptions.en}</span>
                {language === 'en' ? <Check className="size-4" aria-hidden /> : null}
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <ModeToggle />
        <Separator orientation="vertical" className="mx-1 h-6" />
        <div className="flex items-center gap-1">
          <HeaderActionButton
            icon={<Minus className="size-4" aria-hidden />}
            label={t('topbar.window.minimize.label')}
            tooltip={t('topbar.window.minimize.tooltip')}
            onClick={handleMinimize}
            ariaLabel={t('topbar.window.minimize.ariaLabel')}
            variant="ghost"
            className="hover:bg-muted"
          />
          <HeaderActionButton
            icon={<Square className="size-3.5" aria-hidden />}
            label={t('topbar.window.maximize.label')}
            tooltip={t('topbar.window.maximize.tooltip')}
            onClick={handleToggleMaximize}
            ariaLabel={t('topbar.window.maximize.ariaLabel')}
            variant="ghost"
            className="hover:bg-muted"
          />
          <HeaderActionButton
            icon={<X className="size-4" aria-hidden />}
            label={t('topbar.window.close.label')}
            tooltip={t('topbar.window.close.tooltip')}
            onClick={handleClose}
            ariaLabel={t('topbar.window.close.ariaLabel')}
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
