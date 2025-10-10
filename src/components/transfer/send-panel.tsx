import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ClipboardPaste, Copy, File as FileIcon, FileText, FolderPlus, QrCode, RefreshCw, Save, Settings2, Trash2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import i18next from 'i18next';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Dropzone } from '@/components/ui/dropzone';
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSettingsStore } from '@/stores/settings';
import { useTransferStore } from '@/stores/transfer';
import { useUiStore, type UiStore } from '@/stores/ui';
import type { SettingsState, CurveName } from '@/types/settings';
import type { SendFormState, SelectedPathItem, SendMode } from '@/types/transfer-ui';
import type { TransferSession } from '@/types/transfer';
import type { HistoryRecord } from '@/types/history';
import { getWindowApi } from '@/lib/window-api';
import { generateCodePhrase } from '@/lib/code';
import { createLocalId } from '@/lib/id';
import { formatBytes } from '@/lib/format';
import { cn } from '@/lib/utils';
import { DEFAULT_CURVE, DEFAULT_RELAY_HOST, normalizeRelayHost } from '@/lib/croc';

type ElectronFile = File & { path?: string };

const MODE_OPTIONS: Array<{ value: SendMode; labelKey: string; descriptionKey: string }> = [
  { value: 'files', labelKey: 'transfer.send.modes.files.label', descriptionKey: 'transfer.send.modes.files.description' },
  { value: 'text', labelKey: 'transfer.send.modes.text.label', descriptionKey: 'transfer.send.modes.text.description' }
];

const MAX_TEXT_LENGTH = 1_000;

export function SendPanel() {
  const { t } = useTranslation();
  const settings = useSettingsStore((state) => state.settings);
  const load = useSettingsStore((state) => state.load);
  const status = useSettingsStore((state) => state.status);
  const openSettings = useUiStore((state: UiStore) => state.openSettings);
  const upsertSession = useTransferStore((state) => state.upsertSession);
  const sessions = useTransferStore((state) => state.sessions);

  const [form, setForm] = useState<SendFormState>(() => buildInitialForm(settings));
  const [isSending, setIsSending] = useState(false);
  const [overridesOpen, setOverridesOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const lastCopiedCode = useRef<string | null>(null);
  const qrCodeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (status === 'idle') {
      void load();
    }
  }, [status, load]);

  useEffect(() => {
    if (settings) {
      setForm((prev) => ({
        ...prev,
        options: {
          ...prev.options,
          noCompress: settings.transferDefaults.send.noCompress
        }
      }));
    }
  }, [settings]);

  const totalSize = useMemo(() => form.items.reduce((sum, item) => sum + (item.size ?? 0), 0), [form.items]);

  const activeSendSession = useMemo<TransferSession | undefined>(() => {
    const allSessions = Object.values(sessions) as TransferSession[];
    return allSessions
      .slice()
      .sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0))
      .find((session) => session.type === 'send');
  }, [sessions]);

  const handleModeChange = (mode: SendMode) => {
    setForm((prev) => ({
      ...prev,
      mode
    }));
  };

  const handleDropzoneFiles = useCallback((acceptedFiles: File[]) => {
    if (!acceptedFiles || acceptedFiles.length === 0) return;
    const items: SelectedPathItem[] = acceptedFiles.map((file) => createItemFromFile(file));
    setForm((prev) => addItems(prev, items));
  }, []);

  const handleRemoveItem = (id: string) => {
    setForm((prev) => ({ ...prev, items: prev.items.filter((item) => item.id !== id) }));
  };

  const handleClearItems = () => {
    setForm((prev) => ({ ...prev, items: [] }));
  };

  const handlePasteText = async () => {
    try {
      const api = getWindowApi();
      const text = await api.app.clipboardRead();
      if (text) {
        setForm((prev) => ({ ...prev, text: text.slice(0, MAX_TEXT_LENGTH) }));
      }
    } catch (error) {
      toast.error(t('transfer.common.toast.clipboardReadFailed'));
    }
  };

  const handleRandomCode = () => {
    setForm((prev) => ({ ...prev, code: generateCodePhrase(), resolvedCode: undefined }));
  };

  const handleSend = async () => {
    if (!settings) {
      toast.error(t('transfer.common.toast.settingsNotLoaded'));
      return;
    }

    if (form.mode === 'files' && form.items.length === 0) {
      toast.error(t('transfer.send.toast.noItems'));
      return;
    }

    if (form.mode === 'text' && form.text.trim().length === 0) {
      toast.error(t('transfer.send.toast.noText'));
      return;
    }

    if (form.mode === 'files' && form.items.some((item) => !item.path)) {
      toast.error(t('transfer.send.toast.missingPaths'));
      return;
    }

    const api = getWindowApi();
    setIsSending(true);

    try {
      const codeToUse = form.code.trim() || undefined;
      const payload = await api.croc.startSend({
        code: codeToUse,
        paths: form.mode === 'files' ? form.items.map((item) => item.path!).filter(Boolean) : undefined,
        text: form.mode === 'text' ? form.text : undefined,
        noCompress: form.options.noCompress,
        relay: resolveRelay(form.sessionOverrides, settings),
        pass: resolveRelayPass(form.sessionOverrides, settings),
        exclude: resolveExcludePatterns(form.sessionOverrides, settings),
        yes: form.sessionOverrides.autoConfirm,
        extraFlags: settings.advanced.extraFlags
      });

      upsertSession({
        id: payload.id,
        type: 'send',
        mode: form.mode,
        phase: 'connecting',
        percent: 0,
        speed: undefined,
        eta: undefined,
        code: codeToUse,
        startedAt: Date.now(),
        logTail: []
      });

      setForm((prev) => ({
        ...prev,
        resolvedCode: codeToUse,
        items: prev.mode === 'files' ? prev.items : [],
        text: prev.mode === 'text' ? '' : prev.text
      }));
      toast.success(t('transfer.send.toast.started'));
    } catch (error) {
      console.error('[SendPanel] start send failed', error);
      toast.error(t('transfer.send.toast.startFailed'));
    } finally {
      setIsSending(false);
    }
  };

  const canSend = useMemo(() => {
    if (isSending) return false;
    if (form.mode === 'files') return form.items.length > 0;
    return form.text.trim().length > 0;
  }, [form, isSending]);

  const finalCode = form.resolvedCode ?? activeSendSession?.code ?? form.code;
  const handleCopyCode = useCallback(() => {
    const value = form.code.trim() || finalCode?.trim();
    if (!value) {
      toast.error(t('transfer.send.code.noCode'));
      return;
    }
    void copyToClipboard(value);
  }, [form.code, finalCode, t]);
  const autoCopyEnabled = settings?.general.autoCopyCodeOnSend ?? false;

  const cliCommand = useMemo(
    () =>
      buildSendCliCommand({
        form,
        finalCode,
        settings
      }),
    [form, finalCode, settings]
  );

  const handleSaveQr = useCallback(() => {
    if (!finalCode) {
      toast.error(t('transfer.send.toast.noCodeToSave'));
      return;
    }

    if (typeof window === 'undefined') {
      toast.error(t('transfer.send.toast.qrNoBrowser'));
      return;
    }

    const container = qrCodeRef.current;
    const svgElement = container?.querySelector('svg');
    if (!svgElement) {
      toast.error(t('transfer.send.toast.qrNotFound'));
      return;
    }

    const clone = svgElement.cloneNode(true) as SVGSVGElement;
    if (!clone.getAttribute('xmlns')) {
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    }

    const serializer = new XMLSerializer();
    let downloadUrl: string | null = null;

    try {
      const svgData = serializer.serializeToString(clone);
      const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      const safeCode = finalCode.replace(/[^a-z0-9-]/gi, '_');
      anchor.href = downloadUrl;
      anchor.download = `croc-code-${safeCode || 'code'}.svg`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      toast.success(t('transfer.send.toast.qrSaved'));
    } catch (error) {
      console.error('[SendPanel] save QR failed', error);
      toast.error(t('transfer.send.toast.qrSaveFailed'));
    } finally {
      if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl);
      }
    }
  }, [finalCode, t]);

  useEffect(() => {
    if (!autoCopyEnabled) {
      lastCopiedCode.current = null;
    }
  }, [autoCopyEnabled]);

  useEffect(() => {
    if (!autoCopyEnabled) return;
    if (!activeSendSession?.code) return;
    const identifier = `${activeSendSession.id}:${activeSendSession.code}`;
    if (lastCopiedCode.current === identifier) return;
    lastCopiedCode.current = identifier;

    void (async () => {
      const success = await copyToClipboard(activeSendSession.code!, { silent: true });
      if (success) {
        toast.success(t('transfer.send.toast.autoCopySuccess'));
      }
    })();
  }, [autoCopyEnabled, activeSendSession, t]);

  useEffect(() => {
    if (!finalCode) {
      setQrDialogOpen(false);
    }
  }, [finalCode]);

  useEffect(() => {
    const handleHistoryResend = (event: Event) => {
      const customEvent = event as CustomEvent<HistoryRecord | undefined>;
      const record = customEvent.detail;
      if (!record) return;

      if (record.type !== 'send') {
        toast.info(t('transfer.send.history.wrongType'));
        return;
      }

      const options = isPlainObject(record.options) ? (record.options as Record<string, unknown>) : undefined;
      const overrideSources: Array<Record<string, unknown> | undefined> = [
        options && isPlainObject(options['overrides']) ? (options['overrides'] as Record<string, unknown>) : undefined,
        options && isPlainObject(options['sessionOverrides']) ? (options['sessionOverrides'] as Record<string, unknown>) : undefined,
        options
      ];

      const textOption = pickFirstOption<string>([options], ['text', 'message'], isString);
      const modeOption = pickFirstOption<SendMode>([options], ['mode'], isSendMode);
      const fallbackPaths = pickFirstOption<string[]>([options], ['paths', 'items', 'sourcePaths'], isStringArray);
      const noCompressOption = pickFirstOption<boolean>([options], ['noCompress', 'no-compress'], isBoolean);
      const relayOverride = pickFirstOption<string>(overrideSources, ['relay', 'relayHost'], isString) ?? record.relay;
      const passOverride = pickFirstOption<string>(overrideSources, ['pass', 'relayPass'], isString);
      const excludeOverride = pickFirstOption<string[]>(overrideSources, ['exclude', 'excludes'], isStringArray);
      const autoConfirmOverride = pickFirstOption<boolean>(overrideSources, ['autoConfirm', 'yes'], isBoolean);

      const overrides: SendFormState['sessionOverrides'] = {};
      if (relayOverride) overrides.relay = relayOverride;
      if (passOverride) overrides.pass = passOverride;
      if (excludeOverride && excludeOverride.length > 0) overrides.exclude = excludeOverride;
      if (autoConfirmOverride) overrides.autoConfirm = true;

      const hasOverride = hasSessionOverrides(overrides);

      const selectedMode: SendMode = modeOption ?? (textOption ? 'text' : 'files');
      const itemsFromHistory = selectedMode === 'files' ? buildItemsFromHistory(record.files, fallbackPaths) : [];
      const textFromHistory = selectedMode === 'text' ? (textOption ?? '') : '';

      setForm((prev) => ({
        ...prev,
        mode: selectedMode,
        items: itemsFromHistory,
        text: textFromHistory,
        code: record.code ?? '',
        resolvedCode: undefined,
        options: {
          ...prev.options,
          noCompress: typeof noCompressOption === 'boolean' ? noCompressOption : prev.options.noCompress
        },
        sessionOverrides: overrides
      }));

      setOverridesOpen(hasOverride);

      toast.success(t('transfer.send.history.loaded'));

      if (selectedMode === 'files' && itemsFromHistory.length === 0) {
        toast.info(t('transfer.send.history.missingFiles'));
      }
    };

    window.addEventListener('history:resend', handleHistoryResend as EventListener);
    return () => {
      window.removeEventListener('history:resend', handleHistoryResend as EventListener);
    };
  }, [t]);

  return (
    <section className="relative flex flex-col gap-4 rounded-xl border border-border/80 bg-background/80 p-5 shadow-sm">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">{t('transfer.send.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('transfer.send.subtitle')}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={openSettings} className="gap-2">
          <Settings2 className="size-4" aria-hidden /> {t('transfer.send.openAdvanced')}
        </Button>
      </header>
      <div className="flex flex-wrap gap-2">
        {MODE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={cn('rounded-full border px-3 py-1 text-sm transition-colors', form.mode === option.value ? 'border-primary bg-primary/10 text-primary' : 'border-border/70 text-muted-foreground hover:bg-muted/40')}
            onClick={() => handleModeChange(option.value)}
          >
            {t(option.labelKey)}
          </button>
        ))}
      </div>
      {/* <p className="text-xs text-muted-foreground">{MODE_OPTIONS.find((option) => option.value === form.mode)?.description}</p> */}

      {form.mode === 'files' ? (
        <div className="space-y-3">
          <Dropzone multiple maxFiles={0} disabled={isSending} onDrop={handleDropzoneFiles} onError={(error) => toast.error(error.message ?? t('transfer.send.dropzone.error'))} className="p-4 sm:p-6">
            <div className="flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
              <FolderPlus className="size-8 text-primary" aria-hidden />
              <p className="text-center text-sm font-medium text-foreground sm:text-base">{t('transfer.send.dropzone.title')}</p>
              <p className="text-center text-xs text-muted-foreground">{t('transfer.send.dropzone.description')}</p>
            </div>
          </Dropzone>
          {form.items.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
                <span>{t('transfer.send.items.count', { count: form.items.length })}</span>
                <span>{t('transfer.send.items.total', { size: formatBytes(totalSize) })}</span>
              </div>
              <div className="max-h-48 space-y-2 overflow-y-auto">
                {form.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/70 p-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <FileIcon className="size-4 text-muted-foreground" aria-hidden />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium" title={item.path ?? item.name}>
                          {item.name}
                        </p>
                        <p className="text-xs text-muted-foreground">{formatBytes(item.size)}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="size-7" onClick={() => handleRemoveItem(item.id)}>
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  </div>
                ))}
              </div>
              <Button variant="ghost" size="sm" onClick={handleClearItems} className="self-end">
                {t('transfer.send.items.clear')}
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <Textarea value={form.text} onChange={(event) => setForm((prev) => ({ ...prev, text: event.target.value.slice(0, MAX_TEXT_LENGTH) }))} placeholder={t('transfer.send.textMode.placeholder')} rows={6} />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{t('transfer.send.textMode.counter', { current: form.text.length.toLocaleString(), max: MAX_TEXT_LENGTH.toLocaleString() })}</span>
            <Button variant="ghost" size="sm" onClick={() => void handlePasteText()}>
              <ClipboardPaste className="mr-2 size-4" aria-hidden /> {t('transfer.send.textMode.paste')}
            </Button>
          </div>
        </div>
      )}

      <Separator className="my-2" />

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="space-y-2">
          <label className="text-xs font-medium uppercase text-muted-foreground">{t('transfer.send.code.label')}</label>
          <div className="relative">
            <Input value={form.code} maxLength={64} onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))} placeholder={t('transfer.send.code.placeholder')} className="font-mono pr-32" />
            <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center gap-1">
              <Button type="button" variant="ghost" size="icon" className="pointer-events-auto size-8 rounded-full text-muted-foreground hover:text-foreground" onClick={handleRandomCode} aria-label={t('transfer.send.code.randomAria')}>
                <RefreshCw className="size-4" aria-hidden />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="pointer-events-auto size-8 rounded-full text-muted-foreground hover:text-foreground"
                onClick={handleCopyCode}
                disabled={!form.code.trim() && !finalCode?.trim()}
                aria-label={t('transfer.send.code.copyAria')}
              >
                <Copy className="size-4" aria-hidden />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="pointer-events-auto size-8 rounded-full text-muted-foreground hover:text-foreground"
                onClick={() => {
                  const code = finalCode?.trim();
                  if (!code) {
                    toast.error(t('transfer.send.code.noCodeForQr'));
                    return;
                  }
                  setQrDialogOpen(true);
                }}
                disabled={!finalCode?.trim()}
                aria-label={t('transfer.send.code.qrAria')}
              >
                <QrCode className="size-4" aria-hidden />
              </Button>
            </div>
          </div>
        </div>
        <Button variant="outline" onClick={() => setOverridesOpen((prev) => !prev)}>
          {overridesOpen ? t('transfer.common.sessionOptions.hide') : t('transfer.common.sessionOptions.show')}
        </Button>
      </div>

      <div>
        {overridesOpen && (
          <div className="mt-3 space-y-4 rounded-lg border border-border/70 bg-muted/10 p-4">
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
            <label className="grid gap-1 text-xs font-medium uppercase text-muted-foreground">
              <span>{t('transfer.common.sessionOptions.exclude.label')}</span>
              <Textarea
                rows={3}
                value={form.sessionOverrides.exclude?.join('\n') ?? ''}
                onChange={(event) => {
                  const patterns = event.target.value
                    .split('\n')
                    .map((line) => line.trim())
                    .filter((line) => line.length > 0);
                  setForm((prev) => ({
                    ...prev,
                    sessionOverrides: {
                      ...prev.sessionOverrides,
                      exclude: patterns.length > 0 ? patterns : undefined
                    }
                  }));
                }}
                placeholder={t('transfer.common.sessionOptions.exclude.placeholder')}
              />
              <span className="text-[10px] text-muted-foreground">{t('transfer.common.sessionOptions.exclude.help')}</span>
            </label>
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/70 px-3 py-2 text-sm">
              <div>
                <p className="font-medium">{t('transfer.common.sessionOptions.autoConfirm.label')}</p>
                <p className="text-xs text-muted-foreground">{t('transfer.send.sessionOptions.autoConfirmDescription')}</p>
              </div>
              <Switch
                checked={Boolean(form.sessionOverrides.autoConfirm)}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({
                    ...prev,
                    sessionOverrides: {
                      ...prev.sessionOverrides,
                      autoConfirm: checked || undefined
                    }
                  }))
                }
              />
            </div>
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    sessionOverrides: {}
                  }))
                }
              >
                {t('transfer.common.sessionOptions.reset')}
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('transfer.send.code.dialog.title')}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-2">
              <QrCode className="size-5 text-primary" aria-hidden />
              <p className="font-mono text-base font-medium">{finalCode}</p>
            </div>
            <div ref={qrCodeRef} className="rounded-lg border border-border/70 bg-background/80 p-4">
              {finalCode ? <QRCodeSVG value={finalCode} size={160} /> : null}
            </div>
          </div>
          <DialogFooter className="sm:justify-between">
            <div className="flex flex-1 flex-wrap items-center gap-2 sm:justify-start">
              <Button type="button" variant="outline" size="sm" onClick={handleCopyCode} disabled={!finalCode?.trim()} className="gap-2">
                <Copy className="size-4" aria-hidden /> {t('transfer.send.code.dialog.copy')}
              </Button>
              <Button type="button" size="sm" onClick={() => handleSaveQr()} disabled={!finalCode?.trim()} className="gap-2">
                <Save className="size-4" aria-hidden /> {t('transfer.send.code.dialog.save')}
              </Button>
            </div>
            <DialogClose asChild>
              <Button type="button" variant="ghost" size="sm">
                {t('transfer.common.dialogs.close')}
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">
          {t('transfer.common.cliEquivalent')} <span className="font-mono">{cliCommand ?? t('transfer.send.cliPlaceholder')}</span>
        </div>
        <Button size="sm" onClick={() => void handleSend()} disabled={!canSend}>
          {isSending ? <RefreshCw className="mr-2 size-4 animate-spin" aria-hidden /> : <FileText className="mr-2 size-4" aria-hidden />} {t('transfer.send.actions.start')}
        </Button>
      </div>
    </section>
  );
}

function buildInitialForm(settings?: SettingsState | null): SendFormState {
  return {
    mode: 'files',
    items: [],
    text: '',
    code: '',
    resolvedCode: undefined,
    options: {
      noCompress: settings?.transferDefaults.send.noCompress ?? false
    },
    sessionOverrides: {}
  };
}

function createItemFromFile(file: File): SelectedPathItem {
  const electronFile = file as ElectronFile;
  return {
    id: createLocalId('file'),
    name: file.name,
    path: electronFile.path ?? file.name,
    size: file.size,
    kind: 'file'
  };
}

function createItemFromPath(path: string): SelectedPathItem {
  const segments = path.split(/[/\\]/);
  const name = segments[segments.length - 1] || path;
  return {
    id: createLocalId('path'),
    name,
    path,
    size: undefined,
    kind: 'file'
  };
}

function addItems(form: SendFormState, items: SelectedPathItem[]): SendFormState {
  const existingPaths = new Set(form.items.map((item) => item.path ?? item.name));
  const merged = [...form.items];
  for (const item of items) {
    const key = item.path ?? item.name;
    if (!existingPaths.has(key)) {
      merged.push(item);
      existingPaths.add(key);
    }
  }
  return { ...form, items: merged };
}

function buildItemsFromHistory(files?: HistoryRecord['files'], fallbackPaths?: string[]): SelectedPathItem[] {
  if (files && files.length > 0) {
    return files.map((file) => ({
      id: createLocalId('history'),
      name: file.name,
      path: file.path,
      size: file.size,
      kind: file.kind ?? 'file'
    }));
  }

  if (fallbackPaths && fallbackPaths.length > 0) {
    return fallbackPaths.map((path) => createItemFromPath(path));
  }

  return [];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isSendMode(value: unknown): value is SendMode {
  return value === 'files' || value === 'text';
}

function pickFirstOption<T>(sources: Array<Record<string, unknown> | undefined>, keys: string[], predicate: (value: unknown) => value is T): T | undefined {
  for (const source of sources) {
    if (!source) continue;
    for (const key of keys) {
      const value = source[key];
      if (predicate(value)) {
        return value;
      }
    }
  }
  return undefined;
}

function hasSessionOverrides(overrides: SendFormState['sessionOverrides']): boolean {
  return Boolean(overrides.relay || overrides.pass || (overrides.exclude && overrides.exclude.length > 0) || overrides.autoConfirm);
}

async function copyToClipboard(text: string, options?: { silent?: boolean }): Promise<boolean> {
  try {
    const api = getWindowApi();
    await api.app.clipboardWrite(text);
    if (!options?.silent) {
      toast.success(i18next.t('transfer.common.toast.copySuccess'));
    }
    return true;
  } catch (error) {
    console.error('[SendPanel] copy failed', error);
    toast.error(i18next.t('transfer.common.toast.copyFailure'));
    return false;
  }
}

function buildSendCliCommand({ form, finalCode, settings }: { form: SendFormState; finalCode?: string; settings?: SettingsState | null }): string | null {
  const parts: string[] = ['croc', 'send'];

  const codeToShow = finalCode?.trim() || form.code.trim();
  if (codeToShow) {
    parts.push('--code', codeToShow);
  }

  if (form.options.noCompress) {
    parts.push('--no-compress');
  }

  const overrides = form.sessionOverrides;
  const relayHost = resolveRelay(overrides, settings);
  if (relayHost && normalizeRelayHost(relayHost) !== normalizeRelayHost(DEFAULT_RELAY_HOST)) {
    parts.push('--relay', relayHost);
  }
  const relayPass = resolveRelayPass(overrides, settings);
  if (relayPass) {
    parts.push('--pass', relayPass);
  }

  const excludes = resolveExcludePatterns(overrides, settings) ?? [];
  for (const pattern of excludes) {
    parts.push('--exclude', pattern);
  }

  if (overrides.autoConfirm) {
    parts.push('--yes');
  }

  const curve = resolveCurve(settings);
  if (curve && curve !== DEFAULT_CURVE) {
    parts.push('--curve', curve);
  }

  const extraFlags = settings?.advanced.extraFlags?.trim();
  if (extraFlags) {
    const tokens = extraFlags.match(/(?:[^\s"]+|"[^"]*")+/g) ?? [];
    parts.push(...tokens);
  }

  if (form.mode === 'text') {
    parts.push('--text', formatCliText(form.text));
  }

  if (form.mode === 'files') {
    const fileArgs = form.items.length > 0 ? form.items.map((item) => item.path ?? item.name) : ['<paths>'];
    parts.push(...fileArgs);
  }

  const formatted = parts
    .map((part, index) => {
      if (index === 0 || part === 'send' || part.startsWith('--')) {
        return part;
      }
      return quoteCliArg(part);
    })
    .join(' ')
    .trim();

  return formatted.length > 0 ? formatted : null;
}

function quoteCliArg(value: string): string {
  const sanitized = value.replace(/\s+/g, ' ');
  if (!sanitized.includes(' ') && !sanitized.includes('"')) {
    return sanitized;
  }
  return `"${sanitized.replace(/"/g, '\\"')}"`;
}

function formatCliText(text: string): string {
  const normalized = text.trim().replace(/\s+/g, ' ');
  if (!normalized) return '<message>';
  return normalized.length > 40 ? `${normalized.slice(0, 37)}…` : normalized;
}

function resolveRelay(overrides: SendFormState['sessionOverrides'], settings?: SettingsState | null): string | undefined {
  const overrideRelay = overrides.relay?.trim();
  if (overrideRelay) return overrideRelay;
  const defaultRelay = settings?.relayProxy?.defaultRelay?.host?.trim();
  return defaultRelay && defaultRelay.length > 0 ? defaultRelay : undefined;
}

function resolveRelayPass(overrides: SendFormState['sessionOverrides'], settings?: SettingsState | null): string | undefined {
  if (overrides.pass !== undefined) {
    const trimmed = overrides.pass.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  const defaultPass = settings?.relayProxy?.defaultRelay?.pass?.trim();
  return defaultPass && defaultPass.length > 0 ? defaultPass : undefined;
}

function resolveExcludePatterns(overrides: SendFormState['sessionOverrides'], settings?: SettingsState | null): string[] | undefined {
  if (overrides.exclude && overrides.exclude.length > 0) {
    return overrides.exclude;
  }
  const defaults = settings?.transferDefaults.send.exclude ?? [];
  return defaults.length > 0 ? defaults : undefined;
}

function resolveCurve(settings?: SettingsState | null): CurveName | undefined {
  return settings?.security.curve;
}
