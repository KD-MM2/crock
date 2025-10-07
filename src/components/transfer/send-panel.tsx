import { type DragEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ClipboardPaste, Copy, File as FileIcon, FileText, FolderPlus, QrCode, RefreshCw, Settings2, Trash2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useSettingsStore, type SettingsStoreState } from '@/stores/settings';
import { useTransferStore, type TransferStoreState } from '@/stores/transfer';
import { useUiStore, type UiStore } from '@/stores/ui';
import type { SettingsState } from '@/types/settings';
import type { SendFormState, SelectedPathItem, SendMode } from '@/types/transfer-ui';
import type { TransferSession } from '@/types/transfer';
import { getWindowApi } from '@/lib/window-api';
import { generateCodePhrase } from '@/lib/code';
import { createLocalId } from '@/lib/id';
import { formatBytes } from '@/lib/format';
import { cn } from '@/lib/utils';

const selectSettings = (state: SettingsStoreState) => ({
  settings: state.settings,
  load: state.load,
  status: state.status
});

type ElectronFile = File & { path?: string };

const MODE_OPTIONS: Array<{ value: SendMode; label: string; description: string }> = [
  { value: 'files', label: 'Tệp / Thư mục', description: 'Kéo thả hoặc chọn tệp cần gửi.' },
  { value: 'text', label: 'Văn bản nhanh', description: 'Gửi đoạn text ngắn qua croc --text.' }
];

const MAX_TEXT_LENGTH = 10_000;

export function SendPanel() {
  const { settings, load, status } = useSettingsStore(selectSettings);
  const openSettings = useUiStore((state: UiStore) => state.openSettings);
  const upsertSession = useTransferStore((state: TransferStoreState) => state.upsertSession);
  const sessions = useTransferStore((state: TransferStoreState) => state.sessions);

  const [form, setForm] = useState<SendFormState>(() => buildInitialForm(settings));
  const [dragActive, setDragActive] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const lastCopiedCode = useRef<string | null>(null);

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

  const handleFileSelect = async () => {
    const api = getWindowApi();
    try {
      const paths = await api.app.selectFiles({ allowFolders: true, multiple: true });
      if (!paths || paths.length === 0) {
        toast.info('Không có mục nào được chọn.');
        return;
      }
      const items = paths.map((path) => createItemFromPath(path));
      setForm((prev) => addItems(prev, items));
    } catch (error) {
      console.error('[SendPanel] select files failed', error);
      toast.error('Không thể chọn file/folder.');
    }
  };

  const handleDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    const files = Array.from(event.dataTransfer.files ?? []);
    if (files.length === 0) return;
    const items: SelectedPathItem[] = files.map((file) => ({
      id: createLocalId('file'),
      name: file.name,
      path: (file as ElectronFile).path,
      size: file.size,
      kind: 'file'
    }));
    setForm((prev) => addItems(prev, items));
  }, []);

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
  };

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
      toast.error('Không thể đọc clipboard.');
    }
  };

  const handleRandomCode = () => {
    setForm((prev) => ({ ...prev, code: generateCodePhrase(), resolvedCode: undefined }));
  };

  const handleSend = async () => {
    if (!settings) {
      toast.error('Chưa tải xong thiết lập.');
      return;
    }

    if (form.mode === 'files' && form.items.length === 0) {
      toast.error('Hãy chọn ít nhất một tệp hoặc thư mục.');
      return;
    }

    if (form.mode === 'text' && form.text.trim().length === 0) {
      toast.error('Nhập nội dung văn bản để gửi.');
      return;
    }

    if (form.mode === 'files' && form.items.some((item) => !item.path)) {
      toast.error('Một số mục thiếu đường dẫn thực. Chọn lại bằng nút "Chọn…" trong Electron.');
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
        relay: settings.relayProxy.defaultRelay.host,
        pass: settings.relayProxy.defaultRelay.pass,
        exclude: settings.transferDefaults.send.exclude,
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
      toast.success('Đã bắt đầu phiên gửi.');
    } catch (error) {
      console.error('[SendPanel] start send failed', error);
      toast.error('Không thể bắt đầu gửi.');
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
  const autoCopyEnabled = settings?.general.autoCopyCodeOnSend ?? false;

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
        toast.success('Đã copy code vào clipboard.');
      }
    })();
  }, [autoCopyEnabled, activeSendSession]);

  return (
    <section className="relative flex flex-col gap-4 rounded-xl border border-border/80 bg-background/80 p-5 shadow-sm">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Gửi (Send)</h2>
          <p className="text-sm text-muted-foreground">Chọn tệp hoặc nhập văn bản để gửi qua croc.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={openSettings} className="gap-2">
          <Settings2 className="size-4" aria-hidden /> Mở cài đặt nâng cao…
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
            {option.label}
          </button>
        ))}
      </div>
      {/* <p className="text-xs text-muted-foreground">{MODE_OPTIONS.find((option) => option.value === form.mode)?.description}</p> */}

      {form.mode === 'files' ? (
        <div
          className={cn('flex flex-col gap-3 rounded-lg border-2 border-dashed border-border/60 bg-muted/20 p-4 transition-colors', dragActive && 'border-primary/70 bg-primary/5')}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className="flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
            <FolderPlus className="size-8 text-primary" aria-hidden />
            <div className="flex flex-row items-center gap-2">
              <span>Kéo thả file/folder vào đây hoặc</span>
              <Button variant="outline" size="sm" onClick={() => void handleFileSelect()}>
                Chọn file/folder…
              </Button>
            </div>
          </div>
          {form.items.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
                <span>{form.items.length} mục</span>
                <span>Tổng dung lượng: {formatBytes(totalSize)}</span>
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
                Xóa danh sách
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <Textarea value={form.text} onChange={(event) => setForm((prev) => ({ ...prev, text: event.target.value.slice(0, MAX_TEXT_LENGTH) }))} placeholder="Dán hoặc nhập nội dung cần gửi" rows={6} />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {form.text.length.toLocaleString()} / {MAX_TEXT_LENGTH} ký tự
            </span>
            <Button variant="ghost" size="sm" onClick={() => void handlePasteText()}>
              <ClipboardPaste className="mr-2 size-4" aria-hidden /> Dán từ clipboard
            </Button>
          </div>
        </div>
      )}

      <Separator className="my-2" />

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="space-y-2">
          <label className="text-xs font-medium uppercase text-muted-foreground">Mã code-phrase</label>
          <div className="flex flex-row items-center gap-2">
            <Input value={form.code} onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))} placeholder="Để trống để croc tự sinh" className="font-mono" />
            <Button variant="outline" onClick={handleRandomCode}>
              Random
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm">
            <span>Không nén (no-compress)</span>
            <Switch
              checked={form.options.noCompress}
              onCheckedChange={(checked) =>
                setForm((prev) => ({
                  ...prev,
                  options: { ...prev.options, noCompress: checked }
                }))
              }
            />
          </div>
        </div>
      </div>

      {finalCode && (
        <div className="flex flex-wrap items-center gap-4 rounded-lg border border-primary/40 bg-primary/5 p-4">
          <div className="flex items-center gap-3">
            <QrCode className="size-5 text-primary" aria-hidden />
            <div className="flex items-center gap-2">
              <div>
                <p className="text-sm font-medium">Code hiện tại</p>
                <p className="font-mono text-lg">{finalCode}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => void copyToClipboard(finalCode)} aria-label="Copy code">
                <Copy className="size-4" aria-hidden />
              </Button>
            </div>
          </div>
          <QRCodeSVG value={finalCode} size={80} />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">
          CLI tương đương: <span className="font-mono">croc send {form.mode === 'text' ? '--text "..."' : '<paths>'}</span>
        </div>
        <Button size="sm" onClick={() => void handleSend()} disabled={!canSend}>
          {isSending ? <RefreshCw className="mr-2 size-4 animate-spin" aria-hidden /> : <FileText className="mr-2 size-4" aria-hidden />} Bắt đầu gửi
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

async function copyToClipboard(text: string, options?: { silent?: boolean }): Promise<boolean> {
  try {
    const api = getWindowApi();
    await api.app.clipboardWrite(text);
    if (!options?.silent) {
      toast.success('Đã copy code.');
    }
    return true;
  } catch (error) {
    console.error('[SendPanel] copy failed', error);
    toast.error('Không thể copy code.');
    return false;
  }
}
