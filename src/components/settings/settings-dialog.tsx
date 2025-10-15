import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, SettingsIcon } from 'lucide-react';
import { getWindowApi } from '@/lib/window-api';
import { useSettingsStore } from '@/stores/settings';
import { type UiStore, useUiStore } from '@/stores/ui';
import type { SettingsState } from '@/types/settings';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AboutTab from './about-tab';
import AdvancedTab from './advanced-tab';
import { TAB_ITEMS } from './const';
import GeneralTab from './general-tab';
import MiscTab from './misc-tab';
import { UpdateDraft } from './types';

export default function SettingsDialog() {
  const open = useUiStore((state: UiStore) => state.dialogs.settingsOpen);
  const closeSettings = useUiStore((state: UiStore) => state.closeSettings);
  const status = useSettingsStore((state) => state.status);
  const draft = useSettingsStore((state) => state.draft);
  const settings = useSettingsStore((state) => state.settings);
  const setDraft = useSettingsStore((state) => state.setDraft);
  const save = useSettingsStore((state) => state.save);
  const resetDraft = useSettingsStore((state) => state.resetDraft);
  const refreshConnectionStatus = useSettingsStore((state) => state.refreshConnectionStatus);
  const connectionStatus = useSettingsStore((state) => state.connectionStatus);
  const loadingConnection = useSettingsStore((state) => state.loadingConnection);
  const load = useSettingsStore((state) => state.load);
  const updateRelayStatus = useSettingsStore((state) => state.updateRelayStatus);
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<(typeof TAB_ITEMS)[number]['value']>('general');

  useEffect(() => {
    if (open) {
      void load();
      void refreshConnectionStatus();
    }
  }, [open, load, refreshConnectionStatus]);

  useEffect(() => {
    if (!open) return;

    const api = getWindowApi();
    const unsubscribe = api.events.on('relay:status', (payload) => {
      updateRelayStatus({
        host: payload.relay,
        latencyMs: payload.latencyMs,
        online: payload.online,
        checkedAt: payload.checkedAt,
        ipv6: payload.ipv6,
        port: payload.port
      });
    });

    return () => {
      unsubscribe?.();
    };
  }, [open, updateRelayStatus]);

  const updateDraft: UpdateDraft = (updater) => {
    setDraft((current: SettingsState | null) => {
      if (!current) return current;
      const next = JSON.parse(JSON.stringify(current)) as SettingsState;
      updater(next);
      return next;
    });
  };

  const isSaving = status === 'loading';
  const isDirty = useMemo(() => {
    if (!draft || !settings) return false;
    return JSON.stringify(draft) !== JSON.stringify(settings);
  }, [draft, settings]);

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      setActiveTab('general');
      closeSettings();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="flex h-[80vh] w-full flex-col overflow-hidden sm:min-w-[720px] sm:max-w-6xl">
        <DialogHeader className="shrink-0 text-left">
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
            <SettingsIcon /> {t('settings.dialog.title')}
          </DialogTitle>
          <DialogDescription>{t('settings.dialog.description')}</DialogDescription>
        </DialogHeader>

        {!draft ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">{t('settings.dialog.loading')}</div>
        ) : (
          <div className="flex flex-1 flex-col gap-4 overflow-hidden">
            <Tabs
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as typeof activeTab)}
              className="flex flex-1 flex-col overflow-hidden"
            >
              <TabsList className="sticky top-0 z-10 flex flex-wrap items-center justify-start gap-2 bg-background/80 p-1 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                {TAB_ITEMS.map(({ value, labelKey, icon: Icon }) => (
                  <TabsTrigger key={value} value={value} className="gap-2">
                    <Icon className="size-4" aria-hidden />
                    {t(labelKey)}
                  </TabsTrigger>
                ))}
              </TabsList>
              <div className="flex-1 overflow-y-auto px-1">
                <TabsContent value="general" className="pb-16">
                  <GeneralTab settings={draft} updateDraft={updateDraft} />
                </TabsContent>
                <TabsContent value="advanced" className="pb-16">
                  <AdvancedTab
                    settings={draft}
                    updateDraft={updateDraft}
                    connectionStatus={connectionStatus}
                    loadingConnection={loadingConnection}
                    onRefreshStatus={() => refreshConnectionStatus()}
                  />
                </TabsContent>
                <TabsContent value="misc" className="pb-16">
                  <MiscTab settings={draft} updateDraft={updateDraft} />
                </TabsContent>
                <TabsContent value="about" className="pb-16">
                  <AboutTab settings={draft} />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        )}

        <DialogFooter className="mt-4 flex-col gap-2 border-t border-border/60 pt-4 sm:flex-row sm:justify-between">
          <div className="text-xs text-muted-foreground">{t('settings.dialog.footer.note')}</div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button variant="ghost" size="sm" onClick={() => resetDraft()} disabled={!isDirty || isSaving}>
              {t('common.actions.reset')}
            </Button>
            <Button size="sm" onClick={() => void save()} disabled={!isDirty || isSaving}>
              <Save className="mr-2 size-4" aria-hidden /> {t('common.actions.saveChanges')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
