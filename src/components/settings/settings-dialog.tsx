import { type ComponentType, type ReactNode, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, ClipboardCopy, Cpu, Download, FileCode2, FolderOpen, Globe, Info, Link2, Network, RefreshCw, Save, ShieldCheck, ShieldQuestion, ShieldAlert, Waypoints } from 'lucide-react';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useUiStore, type UiStore } from '@/stores/ui';
import { useSettingsStore, type SettingsStoreState } from '@/stores/settings';
import type { SettingsState, ConnectionStatus, CurveName } from '@/types/settings';
import type { ReleaseInfo } from '@/types/release';
import { getWindowApi } from '@/lib/window-api';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';
import { Trans, useTranslation } from 'react-i18next';

const TAB_ITEMS = [
  { value: 'general', labelKey: 'settings.tabs.general', icon: Info },
  { value: 'advanced', labelKey: 'settings.tabs.advanced', icon: Globe },
  { value: 'misc', labelKey: 'settings.tabs.misc', icon: Cpu },
  { value: 'about', labelKey: 'settings.tabs.about', icon: FileCode2 }
] as const;

type UpdateDraft = (updater: (draft: SettingsState) => void) => void;
type SettingsDialogSelectors = Pick<SettingsStoreState, 'status' | 'draft' | 'settings' | 'setDraft' | 'save' | 'resetDraft' | 'refreshConnectionStatus' | 'connectionStatus' | 'loadingConnection' | 'load' | 'updateRelayStatus'>;

export function SettingsDialog() {
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
    if (!open) {
      setActiveTab('general');
    }
  }, [open]);

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
    if (!nextOpen) closeSettings();
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
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)} className="flex flex-1 flex-col overflow-hidden">
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
                  <AdvancedTab settings={draft} updateDraft={updateDraft} connectionStatus={connectionStatus} loadingConnection={loadingConnection} onRefreshStatus={() => refreshConnectionStatus()} />
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

function GeneralTab({ settings, updateDraft }: { settings: SettingsState; updateDraft: UpdateDraft }) {
  const api = getWindowApi();
  const excludeText = settings.transferDefaults.send.exclude.join('\n');
  const { t } = useTranslation();

  const handleSelectFolder = async () => {
    const folder = await api.app.selectFolder();
    if (folder) {
      updateDraft((draft) => {
        draft.general.downloadDir = folder;
      });
    }
  };

  const handleCopyDownloadPath = async () => {
    await api.app.clipboardWrite(settings.general.downloadDir);
  };

  return (
    <div className="space-y-8">
      <div className="space-y-6">
        <SectionHeading icon={FolderOpen} title={t('settings.general.download.title')} description={t('settings.general.download.description')} />
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
          <Input value={settings.general.downloadDir} readOnly className="font-mono" />
          <Button variant="outline" size="sm" onClick={() => void handleSelectFolder()}>
            <FolderOpen className="mr-2 size-4" aria-hidden /> {t('settings.general.download.selectFolder')}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => void handleCopyDownloadPath()}>
            <ClipboardCopy className="mr-2 size-4" aria-hidden /> {t('common.actions.copy')}
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <SectionHeading icon={Waypoints} title={t('settings.general.behavior.title')} description={t('settings.general.behavior.description')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <ToggleField
            label={t('settings.general.behavior.autoOpen.label')}
            description={t('settings.general.behavior.autoOpen.description')}
            checked={settings.general.autoOpenOnDone}
            onCheckedChange={(checked) =>
              updateDraft((draft) => {
                draft.general.autoOpenOnDone = checked;
              })
            }
          />
          <ToggleField
            label={t('settings.general.behavior.autoCopy.label')}
            description={t('settings.general.behavior.autoCopy.description')}
            checked={settings.general.autoCopyCodeOnSend}
            onCheckedChange={(checked) =>
              updateDraft((draft) => {
                draft.general.autoCopyCodeOnSend = checked;
              })
            }
          />
        </div>
      </div>

      <div className="space-y-4">
        <SectionHeading icon={Download} title={t('settings.general.sendDefaults.title')} description={t('settings.general.sendDefaults.description')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <ToggleField
            label={t('settings.general.sendDefaults.noCompress.label')}
            description={t('settings.general.sendDefaults.noCompress.description')}
            checked={settings.transferDefaults.send.noCompress}
            onCheckedChange={(checked) =>
              updateDraft((draft) => {
                draft.transferDefaults.send.noCompress = checked;
              })
            }
          />
        </div>
        <Field label={t('settings.general.sendDefaults.exclude.label')}>
          <Textarea
            value={excludeText}
            placeholder={t('settings.general.sendDefaults.exclude.placeholder')}
            rows={4}
            onChange={(event) =>
              updateDraft((draft) => {
                const patterns = event.target.value
                  .split('\n')
                  .map((line) => line.trim())
                  .filter(Boolean);
                draft.transferDefaults.send.exclude = patterns;
              })
            }
          />
          <p className="mt-1 text-xs text-muted-foreground">{t('settings.general.sendDefaults.exclude.help')}</p>
        </Field>
      </div>

      <div className="space-y-4">
        <SectionHeading icon={Download} title={t('settings.general.receiveDefaults.title')} description={t('settings.general.receiveDefaults.description')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <ToggleField
            label={t('settings.general.receiveDefaults.overwrite.label')}
            description={t('settings.general.receiveDefaults.overwrite.description')}
            checked={settings.transferDefaults.receive.overwrite}
            onCheckedChange={(checked) =>
              updateDraft((draft) => {
                draft.transferDefaults.receive.overwrite = checked;
              })
            }
          />
          <ToggleField
            label={t('settings.general.receiveDefaults.yes.label')}
            description={t('settings.general.receiveDefaults.yes.description')}
            checked={settings.transferDefaults.receive.yes}
            onCheckedChange={(checked) =>
              updateDraft((draft) => {
                draft.transferDefaults.receive.yes = checked;
              })
            }
          />
          <Field label={t('settings.general.receiveDefaults.defaultDir')}>
            <Input value={settings.general.downloadDir} readOnly className="font-mono" />
          </Field>
        </div>
      </div>
    </div>
  );
}

function AdvancedTab({
  settings,
  updateDraft,
  connectionStatus,
  loadingConnection,
  onRefreshStatus
}: {
  settings: SettingsState;
  updateDraft: UpdateDraft;
  connectionStatus: SettingsDialogSelectors['connectionStatus'];
  loadingConnection: boolean;
  onRefreshStatus: () => Promise<ConnectionStatus | null>;
}) {
  const [newRelayHost, setNewRelayHost] = useState('');
  const [newRelayPass, setNewRelayPass] = useState('');
  const { t } = useTranslation();

  const addRelay = () => {
    if (!newRelayHost.trim()) return;
    updateDraft((draft) => {
      draft.relayProxy.favorites.push({ host: newRelayHost.trim(), pass: newRelayPass.trim() || undefined });
    });
    setNewRelayHost('');
    setNewRelayPass('');
  };

  const handleTestRelay = async () => {
    const status = await onRefreshStatus();
    if (!status?.relay) {
      toast.error(t('settings.advanced.toast.relayTestFailure'));
      return;
    }

    const hostLabel = status.relay.host ?? t('settings.advanced.labels.relay') ?? 'Relay';
    if (status.relay.online) {
      toast.success(t('settings.advanced.toast.relayOnline', { host: hostLabel, latency: status.relay.latencyMs ?? '—' }));
    } else {
      toast.warning(t('settings.advanced.toast.relayOffline', { host: hostLabel }));
    }
  };

  const handleTestProxy = async () => {
    const status = await onRefreshStatus();
    if (!status) {
      toast.error(t('settings.advanced.toast.proxyTestFailure'));
      return;
    }

    const proxy = status.proxy;
    if (proxy?.http || proxy?.https) {
      toast.success(
        t('settings.advanced.toast.proxyOnline', {
          http: proxy.http ? t('common.status.on') : t('common.status.off'),
          https: proxy.https ? t('common.status.on') : t('common.status.off')
        })
      );
    } else {
      toast.warning(t('settings.advanced.toast.proxyOffline'));
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-6">
        <SectionHeading icon={Link2} title={t('settings.advanced.defaultRelay.title')} description={t('settings.advanced.defaultRelay.description')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('settings.advanced.defaultRelay.fields.host')}>
            <Input
              value={settings.relayProxy.defaultRelay.host}
              onChange={(event) =>
                updateDraft((draft) => {
                  draft.relayProxy.defaultRelay.host = event.target.value;
                })
              }
              placeholder={t('settings.advanced.defaultRelay.fields.hostPlaceholder')}
            />
          </Field>
          <Field label={t('settings.advanced.defaultRelay.fields.pass')}>
            <Input
              type="password"
              value={settings.relayProxy.defaultRelay.pass ?? ''}
              onChange={(event) =>
                updateDraft((draft) => {
                  draft.relayProxy.defaultRelay.pass = event.target.value || undefined;
                })
              }
            />
          </Field>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => void handleTestRelay()} disabled={loadingConnection}>
            <RefreshCw className={cn('mr-2 size-4', loadingConnection && 'animate-spin')} aria-hidden /> {t('settings.advanced.defaultRelay.actions.testRelay')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => void handleTestProxy()} disabled={loadingConnection}>
            <RefreshCw className={cn('mr-2 size-4', loadingConnection && 'animate-spin')} aria-hidden /> {t('settings.advanced.defaultRelay.actions.testProxy')}
          </Button>
        </div>

        {connectionStatus?.relay && (
          <InfoCard
            title={t('settings.advanced.defaultRelay.info.title', {
              host: connectionStatus.relay.host ?? t('common.status.notAvailable')
            })}
            status={connectionStatus.relay.online ? 'online' : 'offline'}
            description={t('settings.advanced.defaultRelay.info.description', {
              latency: connectionStatus.relay.latencyMs ?? '—',
              checkedAt: connectionStatus.relay.checkedAt ? new Date(connectionStatus.relay.checkedAt).toLocaleTimeString() : t('common.status.unknown')
            })}
          />
        )}
      </div>

      <div className="space-y-3">
        <SectionHeading icon={Link2} title={t('settings.advanced.favorites.title')} description={t('settings.advanced.favorites.description')} />
        {settings.relayProxy.favorites.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('settings.advanced.favorites.empty')}</p>
        ) : (
          <div className="space-y-2">
            {settings.relayProxy.favorites.map((relay, index) => (
              <div key={`${relay.host}-${index}`} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 p-3">
                <div>
                  <p className="font-medium">{relay.host}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('settings.advanced.favorites.passLabel', {
                      value: relay.pass ? t('settings.advanced.favorites.passMasked') : t('settings.advanced.favorites.passMissing')
                    })}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      updateDraft((draft) => {
                        draft.relayProxy.defaultRelay = { ...relay };
                      })
                    }
                  >
                    {t('settings.advanced.favorites.actions.setDefault')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      updateDraft((draft) => {
                        draft.relayProxy.favorites.splice(index, 1);
                      })
                    }
                  >
                    {t('common.actions.delete')}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="grid gap-3 rounded-lg border border-dashed border-border/60 p-3">
          <Field label={t('settings.advanced.favorites.add.fields.host')}>
            <Input value={newRelayHost} onChange={(event) => setNewRelayHost(event.target.value)} placeholder={t('settings.advanced.favorites.add.fields.hostPlaceholder')} />
          </Field>
          <Field label={t('settings.advanced.favorites.add.fields.pass')}>
            <Input value={newRelayPass} onChange={(event) => setNewRelayPass(event.target.value)} placeholder={t('settings.advanced.favorites.add.fields.passPlaceholder')} />
          </Field>
          <Button variant="secondary" size="sm" onClick={addRelay}>
            {t('settings.advanced.favorites.add.button')}
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <SectionHeading icon={Globe} title={t('settings.advanced.proxy.title')} description={t('settings.advanced.proxy.description')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('settings.advanced.proxy.fields.http')}>
            <Input
              value={settings.relayProxy.proxy?.http ?? ''}
              onChange={(event) =>
                updateDraft((draft) => {
                  draft.relayProxy.proxy = {
                    ...draft.relayProxy.proxy,
                    http: event.target.value || undefined
                  };
                })
              }
              placeholder={t('settings.advanced.proxy.fields.httpPlaceholder')}
            />
          </Field>
          <Field label={t('settings.advanced.proxy.fields.https')}>
            <Input
              value={settings.relayProxy.proxy?.https ?? ''}
              onChange={(event) =>
                updateDraft((draft) => {
                  draft.relayProxy.proxy = {
                    ...draft.relayProxy.proxy,
                    https: event.target.value || undefined
                  };
                })
              }
              placeholder={t('settings.advanced.proxy.fields.httpsPlaceholder')}
            />
          </Field>
        </div>
        {connectionStatus?.proxy && (
          <div className="grid gap-2">
            <InfoCard
              title={t('settings.advanced.proxy.info.title')}
              status={connectionStatus.proxy.http || connectionStatus.proxy.https ? 'online' : 'offline'}
              description={t('settings.advanced.proxy.info.description', {
                http: connectionStatus.proxy.http ? t('common.status.on') : t('common.status.off'),
                https: connectionStatus.proxy.https ? t('common.status.on') : t('common.status.off')
              })}
            />
          </div>
        )}
      </div>

      <div className="space-y-4">
        <SectionHeading icon={ShieldCheck} title={t('settings.advanced.security.title')} description={t('settings.advanced.security.description')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('settings.advanced.security.fields.curve')}>
            <Select
              value={settings.security.curve ?? 'p256'}
              onValueChange={(value) =>
                updateDraft((draft) => {
                  draft.security.curve = value as CurveName;
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="p256">p256</SelectItem>
                <SelectItem value="p521">p521</SelectItem>
                <SelectItem value="chacha20-curve25519">chacha20-curve25519</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
        <AlertNote icon={ShieldQuestion} text={t('settings.advanced.security.note')} />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <SectionHeading icon={Network} title={t('settings.advanced.connectionStatus.title')} description={t('settings.advanced.connectionStatus.description')} />
          <Button variant="outline" size="sm" onClick={() => void onRefreshStatus()} disabled={loadingConnection}>
            <RefreshCw className={cn('mr-2 size-4', loadingConnection && 'animate-spin')} aria-hidden /> {t('common.actions.refresh')}
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <InfoCard
            title={t('settings.advanced.connectionStatus.cards.relay.title', {
              host: connectionStatus?.relay?.host ?? t('common.status.notConfigured')
            })}
            status={connectionStatus?.relay?.online ? 'online' : 'offline'}
            description={t('settings.advanced.connectionStatus.cards.relay.description', {
              latency: connectionStatus?.relay?.latencyMs ?? '—'
            })}
          />
          <InfoCard
            title={t('settings.advanced.connectionStatus.cards.proxy.title')}
            status={connectionStatus?.proxy?.http || connectionStatus?.proxy?.https ? 'online' : 'offline'}
            description={t('settings.advanced.connectionStatus.cards.proxy.description', {
              http: connectionStatus?.proxy?.http ? t('common.status.on') : t('common.status.off'),
              https: connectionStatus?.proxy?.https ? t('common.status.on') : t('common.status.off')
            })}
          />
          <InfoCard
            title={t('settings.advanced.connectionStatus.cards.croc.title')}
            status={connectionStatus?.croc?.installed ? 'online' : 'offline'}
            description={t('settings.advanced.connectionStatus.cards.croc.description', {
              version: connectionStatus?.croc?.version ?? t('common.status.unknown')
            })}
          />
        </div>
      </div>
    </div>
  );
}

function MiscTab({ settings, updateDraft }: { settings: SettingsState; updateDraft: UpdateDraft }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-8">
      <SectionHeading icon={Cpu} title={t('settings.misc.logging.title')} description={t('settings.misc.logging.description')} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('settings.misc.logging.fields.logTail')}>
          <Input
            type="number"
            min={10}
            value={settings.advanced.logTailLines}
            onChange={(event) =>
              updateDraft((draft) => {
                draft.advanced.logTailLines = Number(event.target.value) || 0;
              })
            }
          />
        </Field>
        <Field label={t('settings.misc.logging.fields.historyRetention')}>
          <Input
            type="number"
            min={1}
            value={settings.advanced.historyRetentionDays}
            onChange={(event) =>
              updateDraft((draft) => {
                draft.advanced.historyRetentionDays = Number(event.target.value) || 0;
              })
            }
          />
        </Field>
        <div className="sm:col-span-2">
          <ToggleField
            label={t('settings.misc.logging.showLogs.label')}
            description={t('settings.misc.logging.showLogs.description')}
            checked={settings.advanced.showTransferLogs ?? true}
            onCheckedChange={(checked) =>
              updateDraft((draft) => {
                draft.advanced.showTransferLogs = checked;
              })
            }
          />
        </div>
      </div>

      <SectionHeading icon={ShieldAlert} title={t('settings.misc.security.title')} description={t('settings.misc.security.description')} />
      <div className="grid gap-4 sm:grid-cols-2">
        <ToggleField
          label={t('settings.misc.security.deepLink.label')}
          description={t('settings.misc.security.deepLink.description')}
          checked={settings.advanced.deepLink ?? false}
          onCheckedChange={(checked) =>
            updateDraft((draft) => {
              draft.advanced.deepLink = checked;
            })
          }
        />
        <ToggleField
          label={t('settings.misc.security.verbose.label')}
          description={t('settings.misc.security.verbose.description')}
          checked={settings.advanced.verboseLogs ?? false}
          onCheckedChange={(checked) =>
            updateDraft((draft) => {
              draft.advanced.verboseLogs = checked;
            })
          }
        />
        <ToggleField
          label={t('settings.misc.security.validate.label')}
          description={t('settings.misc.security.validate.description')}
          checked={settings.advanced.allowCodeFormatValidation ?? false}
          onCheckedChange={(checked) =>
            updateDraft((draft) => {
              draft.advanced.allowCodeFormatValidation = checked;
            })
          }
        />
      </div>

      <Field label={t('settings.misc.extraFlags.label')}>
        <Textarea
          rows={4}
          placeholder={t('settings.misc.extraFlags.placeholder')}
          value={settings.advanced.extraFlags ?? ''}
          onChange={(event) =>
            updateDraft((draft) => {
              draft.advanced.extraFlags = event.target.value || undefined;
            })
          }
        />
        <p className="mt-1 text-xs text-muted-foreground">{t('settings.misc.extraFlags.help')}</p>
      </Field>
    </div>
  );
}

function AboutTab({ settings }: { settings: SettingsState }) {
  const installedVersion = settings.binary.crocVersion?.startsWith('v') ? settings.binary.crocVersion : undefined;
  const hasBinary = Boolean(settings.binary.crocPath);
  const [versions, setVersions] = useState<ReleaseInfo[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<string | undefined>(() => installedVersion);
  const { t } = useTranslation();

  const selectableVersions = useMemo(() => versions.filter((release) => !release.draft), [versions]);
  const versionItems = useMemo(() => {
    if (!selectedVersion || selectableVersions.some((release) => release.tagName === selectedVersion)) {
      return selectableVersions;
    }
    return [
      {
        tagName: selectedVersion,
        name: selectedVersion,
        prerelease: false,
        draft: false,
        immutable: false,
        publishedAt: undefined
      },
      ...selectableVersions
    ];
  }, [selectableVersions, selectedVersion]);

  const isSameAsInstalled = Boolean(selectedVersion && installedVersion && selectedVersion === installedVersion && hasBinary);
  const actionLabel = hasBinary ? t('settings.about.binary.actions.change') : t('settings.about.binary.actions.download');
  const selectValue = selectedVersion ?? '';

  useEffect(() => {
    let canceled = false;

    const loadVersions = async () => {
      setLoadingVersions(true);
      try {
        const data = await getWindowApi().croc.listVersions();
        if (canceled) return;
        setVersions(data);
        setSelectedVersion((current) => {
          if (current) return current;
          if (installedVersion) return installedVersion;
          const preferred = data.find((release) => !release.prerelease && !release.draft) ?? data[0];
          return preferred?.tagName;
        });
      } catch (error) {
        if (!canceled) {
          console.error('[settings] failed to load croc releases', error);
          toast.error(t('settings.about.toast.loadVersionsFailure'));
        }
      } finally {
        if (!canceled) {
          setLoadingVersions(false);
        }
      }
    };

    void loadVersions();

    return () => {
      canceled = true;
    };
  }, [installedVersion, t]);

  const handleRefreshVersion = async () => {
    try {
      const version = await getWindowApi().croc.getVersion();
      useSettingsStore.setState((state) => {
        if (!state.settings || !state.draft) return state;
        const nextSettings = {
          ...state.settings,
          binary: {
            ...state.settings.binary,
            crocVersion: version
          }
        };
        const nextDraft = {
          ...state.draft,
          binary: {
            ...state.draft.binary,
            crocVersion: version
          }
        };
        return { ...state, settings: nextSettings, draft: nextDraft, status: 'ready' };
      });
      setSelectedVersion((current) => current ?? (version.startsWith('v') ? version : current));
    } catch (error) {
      console.error('[settings] failed to refresh croc version', error);
      toast.error(t('settings.about.toast.checkVersionFailure'));
    }
  };

  const handleInstallVersion = async () => {
    if (!selectedVersion) return;
    setInstalling(true);
    try {
      const result = await getWindowApi().croc.installVersion(selectedVersion);
      useSettingsStore.setState({ settings: result.settings, draft: result.settings, status: 'ready' });
      setSelectedVersion(result.version);
      toast.success(t('settings.about.toast.installSuccess', { version: result.version }));
    } catch (error) {
      console.error('[settings] failed to install croc', error);
      toast.error(t('settings.about.toast.installFailure'));
    } finally {
      setInstalling(false);
    }
  };

  const handleOpenBinaryFolder = async () => {
    if (settings.binary.crocPath) {
      await getWindowApi().app.openPath(settings.binary.crocPath);
    }
  };

  const handleSelectVersion = (value: string) => {
    setSelectedVersion(value === '__empty' ? undefined : value);
  };

  return (
    <div className="space-y-8 text-sm">
      <div className="space-y-4">
        <SectionHeading icon={Info} title={t('settings.about.app.title')} description={t('settings.about.app.description')} />
        <p>{t('settings.about.app.uiVersion', { version: '0.1.0' })}</p>
        <p>
          <Trans
            t={t}
            i18nKey="settings.about.app.basedOn"
            components={{
              crocLink: (
                <a className="underline" href="https://github.com/schollz/croc" target="_blank" rel="noreferrer">
                  croc
                </a>
              ),
              repoLink: (
                <a className="underline" href="https://github.com/your-org/crock-ui" target="_blank" rel="noreferrer">
                  GitHub
                </a>
              )
            }}
          />
        </p>
        <p>
          <Trans
            t={t}
            i18nKey="settings.about.app.feedback"
            components={{
              repoLink: (
                <a className="underline" href="https://github.com/your-org/crock-ui" target="_blank" rel="noreferrer">
                  GitHub
                </a>
              )
            }}
          />
        </p>
      </div>

      <div className="space-y-6">
        <SectionHeading icon={FileCode2} title={t('settings.about.binary.title')} description={t('settings.about.binary.description')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('settings.about.binary.fields.version')}>
            <Select value={selectValue} onValueChange={handleSelectVersion} disabled={loadingVersions || installing}>
              <SelectTrigger className="w-full" aria-label={t('settings.about.binary.fields.versionAria')}>
                <SelectValue placeholder={loadingVersions ? t('common.loadingShort') : t('settings.about.binary.fields.versionPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {versionItems.length === 0 ? (
                  <SelectItem value="__empty" disabled>
                    {loadingVersions ? t('common.loadingShort') : t('settings.about.binary.fields.versionEmpty')}
                  </SelectItem>
                ) : (
                  versionItems.map((release) => {
                    const statusLabels: string[] = [];
                    if (release.prerelease) statusLabels.push(t('settings.about.binary.labels.preRelease'));
                    if (release.immutable) statusLabels.push(t('settings.about.binary.labels.immutable'));
                    const statusSuffix = statusLabels.length > 0 ? ` (${statusLabels.join(' • ')})` : '';

                    return (
                      <SelectItem key={release.tagName} value={release.tagName} className="flex flex-col items-start text-left">
                        <span className="text-sm font-medium">
                          {t('settings.about.binary.labels.releaseTitle', {
                            version: release.tagName,
                            status: statusSuffix
                          })}
                        </span>
                        {release.publishedAt ? <span className="text-xs text-muted-foreground">{t('settings.about.binary.labels.publishedAt', { date: new Date(release.publishedAt).toLocaleDateString() })}</span> : null}
                      </SelectItem>
                    );
                  })
                )}
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">{t('settings.about.binary.current', { version: settings.binary.crocVersion ?? t('settings.about.binary.labels.notInstalled') })}</p>
          </Field>
          <Field label={t('settings.about.binary.fields.path')}>
            <Input value={settings.binary.crocPath ?? ''} readOnly className="font-mono" />
          </Field>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => void handleInstallVersion()} disabled={!selectedVersion || installing || loadingVersions || isSameAsInstalled}>
            {installing ? <Spinner className="mr-2 size-4 animate-spin" aria-hidden /> : <Download className="mr-2 size-4" aria-hidden />}
            {installing ? t('settings.about.binary.actions.installing') : actionLabel}
          </Button>
          <Button variant="outline" size="sm" onClick={() => void handleRefreshVersion()} disabled={installing}>
            <RefreshCw className="mr-2 size-4" aria-hidden /> {t('settings.about.binary.actions.checkVersion')}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => void handleOpenBinaryFolder()} disabled={!settings.binary.crocPath}>
            <FolderOpen className="mr-2 size-4" aria-hidden /> {t('settings.about.binary.actions.openFolder')}
          </Button>
        </div>
        {isSameAsInstalled ? <AlertNote icon={ShieldCheck} text={t('settings.about.binary.notes.current')} /> : null}
        <AlertNote icon={AlertTriangle} text={t('settings.about.binary.notes.manualUpdate')} />
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="text-xs font-medium uppercase text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function ToggleField({ label, description, checked, onCheckedChange }: { label: string; description?: string; checked: boolean; onCheckedChange: (checked: boolean) => void }) {
  return (
    <div className="flex items-start justify-between rounded-lg border border-border/60 bg-background/40 p-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={label} />
    </div>
  );
}

function SectionHeading({ icon: Icon, title, description }: { icon: ComponentType<{ className?: string }>; title: string; description?: string }) {
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

function InfoCard({ title, description, status }: { title: string; description: string; status: 'online' | 'offline' }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-lg border border-border/60 bg-background/40 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{title}</p>
        <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold', status === 'online' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500')}>
          {status === 'online' ? t('common.status.online') : t('common.status.offline')}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

function AlertNote({ icon: Icon, text }: { icon: ComponentType<{ className?: string }>; text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-dashed border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
      <Icon className="mt-0.5 size-4" aria-hidden />
      <span>{text}</span>
    </div>
  );
}

function SettingsIcon() {
  return <Waypoints className="size-5 text-primary" aria-hidden />;
}
