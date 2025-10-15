import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ClipboardPaste,
  Copy,
  File as FileIcon,
  FileText,
  Folder,
  FolderPlus,
  QrCode,
  RefreshCw,
  RotateCcw,
  Save,
  Settings2,
  Trash2
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSettingsStore } from '@/stores/settings';
import { useTransferStore } from '@/stores/transfer';
import { useUiStore, type UiStore } from '@/stores/ui';
import type { SendFormState, SelectedPathItem, SendMode } from '@/types/transfer-ui';
import type { TransferSession } from '@/types/transfer';
import type { HistoryRecord } from '@/types/history';
import { getWindowApi } from '@/lib/window-api';
import { generateCodePhrase } from '@/lib/code';
import { createLocalId } from '@/lib/id';
import { formatBytes } from '@/lib/format';
import { cn } from '@/lib/utils';
import { resolveRelay, resolveRelayPass } from '../receive-panel/utils';
import {
  buildInitialForm,
  addItems,
  copyToClipboard,
  buildSendCliCommand,
  isPlainObject,
  pickFirstOption,
  isString,
  isSendMode,
  isStringArray,
  isBoolean,
  hasSessionOverrides,
  buildItemsFromHistory,
  resolveExcludePatterns
} from './utils';
import { FINAL_SEND_PHASES, MAX_TEXT_LENGTH, MODE_OPTIONS } from './const';

export default function SendPanel() {
  const { t } = useTranslation();
  const settings = useSettingsStore((state) => state.settings);
  const load = useSettingsStore((state) => state.load);
  const status = useSettingsStore((state) => state.status);
  const openSettings = useUiStore((state: UiStore) => state.openSettings);
  const upsertSession = useTransferStore((state) => state.upsertSession);
  const sessions = useTransferStore((state) => state.sessions);
  const removeSession = useTransferStore((state) => state.removeSession);

  const [form, setForm] = useState<SendFormState>(() => buildInitialForm(settings));
  const [isSending, setIsSending] = useState(false);
  const [overridesOpen, setOverridesOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const lastCopiedCode = useRef<string | null>(null);
  const qrCodeRef = useRef<HTMLDivElement | null>(null);
  const originalCodeForCli = useRef<string | undefined>(undefined);
  const lastAutoResetRef = useRef<string | null>(null);

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

  const autoResetOnSuccess = settings?.general.autoResetOnSendSuccess ?? false;
  const autoResetOnFailure = settings?.general.autoResetOnSendFailure ?? false;

  const removeSendSessions = useCallback(
    (predicate?: (session: TransferSession) => boolean) => {
      const allSessions = Object.values(sessions) as TransferSession[];
      for (const session of allSessions) {
        if (session.type !== 'send') continue;
        if (predicate && !predicate(session)) continue;
        removeSession(session.id);
      }
    },
    [sessions, removeSession]
  );

  const resetFormState = useCallback(() => {
    originalCodeForCli.current = undefined;
    lastCopiedCode.current = null;
    setForm((prev) => {
      const base = buildInitialForm(settings);
      return {
        ...base,
        mode: prev.mode,
        options: base.options
      };
    });
    setIsSending(false);
    setOverridesOpen(false);
    setQrDialogOpen(false);
  }, [settings]);

  const handleReset = useCallback(() => {
    if (isSending) {
      toast.warning(t('transfer.send.toast.resetBlockedActive'));
      return;
    }

    const sendSessions = Object.values(sessions) as TransferSession[];
    const hasActiveSend = sendSessions.some((session) => session.type === 'send' && !FINAL_SEND_PHASES.includes(session.phase));
    if (hasActiveSend) {
      toast.warning(t('transfer.send.toast.resetBlockedActive'));
      return;
    }

    removeSendSessions();
    resetFormState();
    toast.success(t('transfer.send.toast.resetCompleted'));
  }, [isSending, sessions, removeSendSessions, resetFormState, t]);

  const handleModeChange = (mode: SendMode) => {
    setForm((prev) => ({
      ...prev,
      mode
    }));
  };

  const handleBrowseFiles = useCallback(async () => {
    try {
      const api = getWindowApi();
      const paths = await api.app.selectFiles({ allowFolders: false, multiple: true });

      if (paths && paths.length > 0) {
        // Fetch file stats to get sizes
        const stats = await api.app.getPathStats(paths);
        const items: SelectedPathItem[] = stats.map((stat) => ({
          id: createLocalId('path'),
          name: stat.path.split(/[/\\]/).pop() || stat.path,
          path: stat.path,
          size: stat.size,
          kind: 'file'
        }));

        setForm((prev) => {
          const result = addItems(prev, items);
          if (!result) {
            toast.error(t('transfer.send.toast.mixedItemsNotAllowed'));
            return prev;
          }
          return result;
        });
      }
    } catch (error) {
      console.error('[handleBrowseFiles] Failed to select files:', error);
      toast.error(t('transfer.send.toast.fileProcessError'));
    }
  }, [t]);

  const handleBrowseFolder = useCallback(async () => {
    try {
      const api = getWindowApi();
      const paths = await api.app.selectFiles({ allowFolders: true, multiple: false });

      if (paths && paths.length > 0) {
        // Fetch path stats to determine if it's a folder
        const stats = await api.app.getPathStats(paths);
        const items: SelectedPathItem[] = stats.map((stat) => ({
          id: createLocalId('path'),
          name: stat.path.split(/[/\\]/).pop() || stat.path,
          path: stat.path,
          size: stat.size, // undefined for folders
          kind: stat.isDirectory ? 'folder' : 'file'
        }));

        setForm((prev) => {
          const result = addItems(prev, items);
          if (!result) {
            toast.error(t('transfer.send.toast.mixedItemsNotAllowed'));
            return prev;
          }
          return result;
        });
      }
    } catch (error) {
      console.error('[handleBrowseFolder] Failed to select folder:', error);
      toast.error(t('transfer.send.toast.fileProcessError'));
    }
  }, [t]);
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
    } catch {
      toast.error(t('transfer.common.toast.clipboardReadFailed'));
    }
  };

  const handleRandomCode = () => {
    originalCodeForCli.current = undefined;
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
      // Store the original code for CLI display
      originalCodeForCli.current = codeToUse;

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
        settings,
        originalCode: originalCodeForCli.current
      }),
    [form, settings]
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
    if (!activeSendSession) {
      lastAutoResetRef.current = null;
      return;
    }

    const { id, phase } = activeSendSession;
    const key = `${id}:${phase}`;

    if (phase === 'done' && autoResetOnSuccess) {
      if (lastAutoResetRef.current === key) return;
      lastAutoResetRef.current = key;
      removeSendSessions((session) => FINAL_SEND_PHASES.includes(session.phase));
      resetFormState();
      return;
    }

    if ((phase === 'failed' || phase === 'canceled') && autoResetOnFailure) {
      if (lastAutoResetRef.current === key) return;
      lastAutoResetRef.current = key;
      removeSendSessions((session) => FINAL_SEND_PHASES.includes(session.phase));
      resetFormState();
    }
  }, [activeSendSession, autoResetOnSuccess, autoResetOnFailure, removeSendSessions, resetFormState]);

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

  // Update form.code when croc generates a code
  useEffect(() => {
    if (!activeSendSession?.code) return;

    const sessionCode = activeSendSession.code;
    originalCodeForCli.current = sessionCode;

    setForm((prev) => {
      if (prev.code === sessionCode && prev.resolvedCode === sessionCode) {
        return prev;
      }

      return {
        ...prev,
        code: sessionCode,
        resolvedCode: sessionCode
      };
    });
  }, [activeSendSession?.code]);

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
            className={cn(
              'rounded-full border px-3 py-1 text-sm transition-colors',
              form.mode === option.value ? 'border-primary bg-primary/10 text-primary' : 'border-border/70 text-muted-foreground hover:bg-muted/40'
            )}
            onClick={() => handleModeChange(option.value)}
          >
            {t(option.labelKey)}
          </button>
        ))}
      </div>
      {/* <p className="text-xs text-muted-foreground">{MODE_OPTIONS.find((option) => option.value === form.mode)?.description}</p> */}

      {form.mode === 'files' ? (
        <div className="space-y-3">
          <div className="relative flex h-auto w-full flex-col overflow-hidden rounded-lg border-2 border-dashed border-border/60 bg-muted/20 p-4 text-muted-foreground sm:p-6">
            <div className="flex flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
              <FolderPlus className="size-8 text-primary" aria-hidden />
              <p className="text-center text-sm font-medium text-foreground sm:text-base">{t('transfer.send.dropzone.title')}</p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button variant="outline" size="sm" onClick={handleBrowseFiles} disabled={isSending} className="gap-2">
                  <FileIcon className="size-4" aria-hidden />
                  {t('transfer.send.dropzone.selectFiles')}
                </Button>
                <Button variant="outline" size="sm" onClick={handleBrowseFolder} disabled={isSending} className="gap-2">
                  <FolderPlus className="size-4" aria-hidden />
                  {t('transfer.send.dropzone.selectFolder')}
                </Button>
              </div>
              <p className="text-center text-xs text-muted-foreground">{t('transfer.send.dropzone.description')}</p>
            </div>
          </div>
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
                      {item.kind === 'folder' ? (
                        <Folder className="size-4 text-muted-foreground" aria-hidden />
                      ) : (
                        <FileIcon className="size-4 text-muted-foreground" aria-hidden />
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium" title={item.path ?? item.name}>
                          {item.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.kind === 'folder' ? t('transfer.send.items.folder') : formatBytes(item.size)}
                        </p>
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
          <Textarea
            value={form.text}
            onChange={(event) => setForm((prev) => ({ ...prev, text: event.target.value.slice(0, MAX_TEXT_LENGTH) }))}
            placeholder={t('transfer.send.textMode.placeholder')}
            rows={6}
          />
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
            <Input
              value={form.code}
              maxLength={64}
              onChange={(event) => {
                const value = event.target.value;
                originalCodeForCli.current = value.trim() || undefined;
                setForm((prev) => ({
                  ...prev,
                  code: value,
                  resolvedCode: undefined
                }));
              }}
              placeholder={t('transfer.send.code.placeholder')}
              className="font-mono pr-32"
            />
            <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="pointer-events-auto size-8 rounded-full text-muted-foreground hover:text-foreground"
                onClick={handleRandomCode}
                aria-label={t('transfer.send.code.randomAria')}
              >
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
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <RotateCcw className="mr-2 size-4" aria-hidden /> {t('transfer.send.actions.reset')}
          </Button>
          <Button size="sm" onClick={() => void handleSend()} disabled={!canSend}>
            {isSending ? <RefreshCw className="mr-2 size-4 animate-spin" aria-hidden /> : <FileText className="mr-2 size-4" aria-hidden />}{' '}
            {t('transfer.send.actions.start')}
          </Button>
        </div>
      </div>
    </section>
  );
}
