import { cn } from '@/lib/utils';
import { SettingsState, ConnectionStatus, CurveName } from '@/types/settings';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link2, RefreshCw, Globe, ShieldCheck, ShieldQuestion, Network } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import AlertNote from './alert-note';
import Field from './field';
import InfoCard from './info-card';
import SectionHeading from './section-heading';
import { UpdateDraft, SettingsDialogSelectors } from './types';

export default function AdvancedTab({
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
        <SectionHeading
          icon={Link2}
          title={t('settings.advanced.defaultRelay.title')}
          description={t('settings.advanced.defaultRelay.description')}
        />
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
            <RefreshCw className={cn('mr-2 size-4', loadingConnection && 'animate-spin')} aria-hidden />{' '}
            {t('settings.advanced.defaultRelay.actions.testRelay')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => void handleTestProxy()} disabled={loadingConnection}>
            <RefreshCw className={cn('mr-2 size-4', loadingConnection && 'animate-spin')} aria-hidden />{' '}
            {t('settings.advanced.defaultRelay.actions.testProxy')}
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
              checkedAt: connectionStatus.relay.checkedAt
                ? new Date(connectionStatus.relay.checkedAt).toLocaleTimeString()
                : t('common.status.unknown')
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
              <div
                key={`${relay.host}-${index}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 p-3"
              >
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
            <Input
              value={newRelayHost}
              onChange={(event) => setNewRelayHost(event.target.value)}
              placeholder={t('settings.advanced.favorites.add.fields.hostPlaceholder')}
            />
          </Field>
          <Field label={t('settings.advanced.favorites.add.fields.pass')}>
            <Input
              value={newRelayPass}
              onChange={(event) => setNewRelayPass(event.target.value)}
              placeholder={t('settings.advanced.favorites.add.fields.passPlaceholder')}
            />
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
          <SectionHeading
            icon={Network}
            title={t('settings.advanced.connectionStatus.title')}
            description={t('settings.advanced.connectionStatus.description')}
          />
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
