import { useEffect, useMemo, useState } from 'react';
import { ClipboardPaste, DownloadCloud, FolderOpen, RefreshCw, Settings2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useSettingsStore, type SettingsStoreState } from '@/stores/settings';
import { useTransferStore, type TransferStoreState } from '@/stores/transfer';
import { useUiStore, type UiStore } from '@/stores/ui';
import type { ReceiveFormState } from '@/types/transfer-ui';
import type { SettingsState, CurveName } from '@/types/settings';
import { getWindowApi } from '@/lib/window-api';

const selectSettings = (state: SettingsStoreState) => ({
  settings: state.settings,
  load: state.load,
  status: state.status
});

const selectUpsertSession = (state: TransferStoreState) => state.upsertSession;

const selectOpenSettings = (state: UiStore) => state.openSettings;

export function ReceivePanel() {
  const { settings, load, status } = useSettingsStore(selectSettings);
  const upsertSession = useTransferStore(selectUpsertSession);
  const openSettings = useUiStore(selectOpenSettings);

  const [form, setForm] = useState<ReceiveFormState>(() => buildInitialReceiveForm(settings));
  const [isReceiving, setIsReceiving] = useState(false);

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
    const relayHost = resolveDefaultRelay(settings);
    if (relayHost) {
      parts.push('--relay', relayHost);
    }
    const relayPass = resolveDefaultRelayPass(settings);
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
    if (curve) {
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
  }, [form.code, form.options.autoConfirm, form.options.overwrite, settings]);

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
      toast.error('Không thể đọc clipboard.');
    }
  };

  const handleReceive = async () => {
    if (!settings) {
      toast.error('Chưa tải xong thiết lập.');
      return;
    }

    const trimmedCode = form.code.trim();
    if (!trimmedCode) {
      toast.error('Nhập mã code-phrase để nhận.');
      return;
    }

    const api = getWindowApi();
    setIsReceiving(true);

    try {
      const result = await api.croc.startReceive({
        code: trimmedCode,
        relay: resolveDefaultRelay(settings),
        pass: resolveDefaultRelayPass(settings),
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

      toast.success('Đang chờ nhận file…');
    } catch (error) {
      console.error('[ReceivePanel] start receive failed', error);
      toast.error('Không thể bắt đầu nhận.');
    } finally {
      setIsReceiving(false);
    }
  };

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border/80 bg-background/80 p-5 shadow-sm">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Nhận (Receive)</h2>
          <p className="text-sm text-muted-foreground">Nhập mã đã nhận từ người gửi để tải xuống.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={openSettings} className="gap-2">
          <Settings2 className="size-4" aria-hidden /> Thiết lập nhận…
        </Button>
      </header>

      <div className="space-y-2">
        <label className="text-xs font-medium uppercase text-muted-foreground" htmlFor="receive-code">
          Mã code-phrase
        </label>
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
          placeholder="Ví dụ: downtown-almond-dynamo"
          className="font-mono"
          aria-label="Code phrase để nhận file"
        />
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Switch id="auto-paste" checked={form.autoPaste} onCheckedChange={(checked) => setForm((prev) => ({ ...prev, autoPaste: checked }))} />
            <label htmlFor="auto-paste" className="cursor-pointer select-none">
              Tự dán khi mở màn hình
            </label>
          </div>
          <Button variant="ghost" size="sm" onClick={() => void handlePaste()}>
            <ClipboardPaste className="mr-2 size-4" aria-hidden /> Dán từ clipboard
          </Button>
        </div>
      </div>

      <Separator />

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <DownloadCloud className="size-4" aria-hidden /> Lưu vào thư mục:
            <span className="font-medium text-foreground">{downloadDir}</span>
          </p>
          <p className="text-xs text-muted-foreground">Thay đổi trong phần General &rarr; Default download folder.</p>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm">
            <span>Ghi đè nếu tồn tại</span>
            <Switch
              checked={form.options.overwrite}
              onCheckedChange={(checked) =>
                setForm((prev) => ({
                  ...prev,
                  options: { ...prev.options, overwrite: checked }
                }))
              }
            />
          </div>
          <div className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm">
            <span>Tự xác nhận (--yes)</span>
            <Switch
              checked={form.options.autoConfirm}
              onCheckedChange={(checked) =>
                setForm((prev) => ({
                  ...prev,
                  options: { ...prev.options, autoConfirm: checked }
                }))
              }
            />
          </div>
        </div>
      </div>

      <Separator />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">
          CLI tương đương: <span className="font-mono">{receiveCli}</span>
        </div>
        <Button size="sm" onClick={() => void handleReceive()} disabled={!canReceive}>
          {isReceiving ? <RefreshCw className="mr-2 size-4 animate-spin" aria-hidden /> : <FolderOpen className="mr-2 size-4" aria-hidden />}
          {isReceiving ? 'Đang chuẩn bị…' : 'Nhận file'}
        </Button>
      </div>
    </section>
  );
}

function buildInitialReceiveForm(settings?: SettingsState | null): ReceiveFormState {
  return {
    code: '',
    autoPaste: false,
    options: {
      overwrite: settings?.transferDefaults.receive.overwrite ?? false,
      autoConfirm: settings?.transferDefaults.receive.yes ?? false
    }
  };
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
