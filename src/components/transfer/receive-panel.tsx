import { useEffect, useMemo, useState } from 'react';
import { ClipboardPaste, FolderOpen, RefreshCw, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { useSettingsStore } from '@/stores/settings';
import { useTransferStore } from '@/stores/transfer';
import { useUiStore } from '@/stores/ui';
import type { ReceiveFormState } from '@/types/transfer-ui';
import type { SettingsState, CurveName } from '@/types/settings';
import { getWindowApi } from '@/lib/window-api';
import { DEFAULT_CURVE, DEFAULT_RELAY_HOST, normalizeRelayHost } from '@/lib/croc';

export function ReceivePanel() {
  const { t } = useTranslation();
  const settings = useSettingsStore((state) => state.settings);
  const load = useSettingsStore((state) => state.load);
  const status = useSettingsStore((state) => state.status);
  const upsertSession = useTransferStore((state) => state.upsertSession);
  const openSettings = useUiStore((state) => state.openSettings);

  const [form, setForm] = useState<ReceiveFormState>(() => buildInitialReceiveForm(settings));
  const [isReceiving, setIsReceiving] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);

  useEffect(() => {
    if (status === 'idle') {
      void load();
    }
  }, [status, load]);

  useEffect(() => {
    if (!settings) return;
    setForm((prev) => ({
      ...prev,
      options: {
        overwrite: settings.transferDefaults.receive.overwrite,
        autoConfirm: settings.transferDefaults.receive.yes
      }
    }));
  }, [settings]);

  useEffect(() => {
    if (!form.autoPaste) return;

    let canceled = false;
    const paste = async () => {
      try {
        const api = getWindowApi();
        const value = await api.app.clipboardRead();
        if (!canceled && value) {
          setForm((prev) => ({ ...prev, code: value.trim() }));
        }
      } catch (error) {
        console.error('[ReceivePanel] auto paste failed', error);
      }
    };
    void paste();

    return () => {
      canceled = true;
    };
  }, [form.autoPaste]);

  const downloadDir = settings?.general.downloadDir ?? 'Downloads';

  const receiveCli = useMemo(() => {
    const parts: string[] = ['croc'];
    const relayHost = resolveRelay(form.sessionOverrides, settings);
    const hasRelayOverride = Boolean(form.sessionOverrides.relay?.trim());
    if (relayHost && (hasRelayOverride || normalizeRelayHost(relayHost) !== normalizeRelayHost(DEFAULT_RELAY_HOST))) {
      parts.push('--relay', relayHost);
    }
    const relayPass = resolveRelayPass(form.sessionOverrides, settings);
    if (relayPass) {
      parts.push('--pass', relayPass);
    }
    if (form.options.autoConfirm) {
      parts.push('--yes');
    }
    if (form.options.overwrite) {
      parts.push('--overwrite');
    }
    const curve = resolveSecurityCurve(settings);
    if (curve && curve !== DEFAULT_CURVE) {
      parts.push('--curve', curve);
    }
    const extraFlags = settings?.advanced.extraFlags?.trim();
    if (extraFlags) {
      const tokens = extraFlags.match(/(?:[^\s"]+|"[^"]*")+/g) ?? [];
      parts.push(...tokens);
    }
    parts.push(form.code.trim() || '<code>');
    return parts
      .map((part, index) => {
        if (index === 0 || part.startsWith('--')) {
          return part;
        }
        return quoteCliArg(part);
      })
      .join(' ')
      .trim();
  }, [form.code, form.options.autoConfirm, form.options.overwrite, form.sessionOverrides, settings]);

  const canReceive = useMemo(() => {
    if (isReceiving) return false;
    return form.code.trim().length > 0;
  }, [form.code, isReceiving]);

  const handlePaste = async () => {
    try {
      const api = getWindowApi();
      const text = await api.app.clipboardRead();
      if (text) {
        setForm((prev) => ({ ...prev, code: text.trim() }));
      }
    } catch (error) {
      toast.error(t('transfer.common.toast.clipboardReadFailed'));
    }
  };

  const handleReceive = async () => {
    if (!settings) {
      toast.error(t('transfer.common.toast.settingsNotLoaded'));
      return;
    }

    const trimmedCode = form.code.trim();
    if (!trimmedCode) {
      toast.error(t('transfer.receive.toast.missingCode'));
      return;
    }

    const api = getWindowApi();
    setIsReceiving(true);

    try {
      const result = await api.croc.startReceive({
        code: trimmedCode,
        relay: resolveRelay(form.sessionOverrides, settings),
        pass: resolveRelayPass(form.sessionOverrides, settings),
        overwrite: form.options.overwrite,
        yes: form.options.autoConfirm,
        outDir: downloadDir,
        curve: resolveSecurityCurve(settings),
        extraFlags: settings.advanced.extraFlags
      });

      upsertSession({
        id: result.id,
        type: 'receive',
        phase: 'connecting',
        percent: 0,
        startedAt: Date.now(),
        logTail: [],
        code: trimmedCode
      });

      toast.success(t('transfer.receive.toast.started'));
    } catch (error) {
      console.error('[ReceivePanel] start receive failed', error);
      toast.error(t('transfer.receive.toast.startFailed'));
    } finally {
      setIsReceiving(false);
    }
  };

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border/80 bg-background/80 p-5 shadow-sm">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">{t('transfer.receive.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('transfer.receive.subtitle')}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={openSettings} className="gap-2">
          <Settings2 className="size-4" aria-hidden /> {t('transfer.receive.openSettings')}
        </Button>
      </header>

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="space-y-2">
          <label className="text-xs font-medium uppercase text-muted-foreground" htmlFor="receive-code">
            {t('transfer.receive.code.label')}
          </label>
          <div className="relative">
            <Input
              id="receive-code"
              value={form.code}
              onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && canReceive) {
                  event.preventDefault();
                  void handleReceive();
                }
              }}
              maxLength={64}
              placeholder={t('transfer.receive.code.placeholder')}
              className="font-mono"
              aria-label={t('transfer.receive.code.ariaLabel')}
            />
            <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center gap-1">
              <Button
                variant="ghost"
                className="pointer-events-auto size-8 rounded-full text-muted-foreground hover:text-foreground"
                onClick={() => void handlePaste()}
                aria-label={t('transfer.receive.actions.paste')}
                title={t('transfer.receive.actions.paste')}
              >
                <ClipboardPaste className="size-4" aria-hidden />
              </Button>
            </div>
          </div>
        </div>
        <Button variant="outline" onClick={() => setOptionsOpen((prev) => !prev)}>
          {optionsOpen ? t('transfer.common.sessionOptions.hide') : t('transfer.common.sessionOptions.show')}
        </Button>
      </div>

      {optionsOpen && (
        <div className="space-y-3 rounded-lg border border-border/70 bg-muted/10 p-4 text-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-xs font-medium uppercase text-muted-foreground">
              <span>{t('transfer.common.sessionOptions.relay.label')}</span>
              <Input
                value={form.sessionOverrides.relay ?? ''}
                onChange={(event) => {
                  const value = event.target.value;
                  setForm((prev) => ({
                    ...prev,
                    sessionOverrides: {
                      ...prev.sessionOverrides,
                      relay: value ? value : undefined
                    }
                  }));
                }}
                placeholder={t('transfer.common.sessionOptions.relay.placeholder')}
              />
            </label>
            <label className="grid gap-1 text-xs font-medium uppercase text-muted-foreground">
              <span>{t('transfer.common.sessionOptions.pass.label')}</span>
              <Input
                type="text"
                value={form.sessionOverrides.pass ?? ''}
                onChange={(event) => {
                  const value = event.target.value;
                  setForm((prev) => ({
                    ...prev,
                    sessionOverrides: {
                      ...prev.sessionOverrides,
                      pass: value ? value : undefined
                    }
                  }));
                }}
                placeholder={t('transfer.common.sessionOptions.pass.placeholder')}
              />
            </label>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/70 px-3 py-2">
            <div>
              <p className="font-medium">{t('transfer.receive.sessionOptions.autoPaste.label')}</p>
              <p className="text-xs text-muted-foreground">{t('transfer.receive.sessionOptions.autoPaste.description')}</p>
            </div>
            <Switch checked={form.autoPaste} onCheckedChange={(checked) => setForm((prev) => ({ ...prev, autoPaste: checked }))} />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/70 px-3 py-2">
            <div>
              <p className="font-medium">{t('transfer.common.sessionOptions.autoConfirm.label')}</p>
              <p className="text-xs text-muted-foreground">{t('transfer.receive.sessionOptions.autoConfirmDescription')}</p>
            </div>
            <Switch
              checked={form.options.autoConfirm}
              onCheckedChange={(checked) =>
                setForm((prev) => ({
                  ...prev,
                  options: {
                    ...prev.options,
                    autoConfirm: checked
                  }
                }))
              }
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/70 px-3 py-2">
            <div>
              <p className="font-medium">{t('transfer.receive.sessionOptions.overwrite.label')}</p>
              <p className="text-xs text-muted-foreground">{t('transfer.receive.sessionOptions.overwrite.description')}</p>
            </div>
            <Switch
              checked={form.options.overwrite}
              onCheckedChange={(checked) =>
                setForm((prev) => ({
                  ...prev,
                  options: {
                    ...prev.options,
                    overwrite: checked
                  }
                }))
              }
            />
          </div>
        </div>
      )}

      <Separator />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">
          {t('transfer.common.cliEquivalent')} <span className="font-mono">{receiveCli || t('transfer.receive.cliPlaceholder')}</span>
        </div>
        <Button size="sm" onClick={() => void handleReceive()} disabled={!canReceive}>
          {isReceiving ? <RefreshCw className="mr-2 size-4 animate-spin" aria-hidden /> : <FolderOpen className="mr-2 size-4" aria-hidden />}
          {isReceiving ? t('transfer.receive.actions.receiving') : t('transfer.receive.actions.receive')}
        </Button>
      </div>
    </section>
  );
}

function buildInitialReceiveForm(settings?: SettingsState | null): ReceiveFormState {
  return {
    code: '',
    autoPaste: false,
    sessionOverrides: {},
    options: {
      overwrite: settings?.transferDefaults.receive.overwrite ?? false,
      autoConfirm: settings?.transferDefaults.receive.yes ?? false
    }
  };
}

function resolveRelay(overrides: ReceiveFormState['sessionOverrides'], settings?: SettingsState | null): string | undefined {
  const overrideRelay = overrides.relay?.trim();
  if (overrideRelay) return overrideRelay;
  return resolveDefaultRelay(settings);
}

function resolveRelayPass(overrides: ReceiveFormState['sessionOverrides'], settings?: SettingsState | null): string | undefined {
  if (overrides.pass !== undefined) {
    const trimmed = overrides.pass.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  return resolveDefaultRelayPass(settings);
}

function resolveDefaultRelay(settings?: SettingsState | null): string | undefined {
  const host = settings?.relayProxy.defaultRelay.host?.trim();
  return host && host.length > 0 ? host : undefined;
}

function resolveDefaultRelayPass(settings?: SettingsState | null): string | undefined {
  const pass = settings?.relayProxy.defaultRelay.pass?.trim();
  return pass && pass.length > 0 ? pass : undefined;
}

function resolveSecurityCurve(settings?: SettingsState | null): CurveName | undefined {
  return settings?.security.curve;
}

function quoteCliArg(value: string): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized) return value;
  if (!normalized.includes(' ') && !normalized.includes('"')) {
    return normalized;
  }
  return `"${normalized.replace(/"/g, '\\"')}"`;
}
