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
import { getWindowApi } from '@/lib/window-api';
import { cn } from '@/lib/utils';

const TAB_ITEMS = [
  { value: 'general', label: 'General', icon: Info },
  { value: 'transfer', label: 'Transfer Defaults', icon: Download },
  { value: 'relay', label: 'Relay & Proxy', icon: Globe },
  { value: 'security', label: 'Security', icon: ShieldCheck },
  { value: 'connection', label: 'Connection', icon: Network },
  { value: 'binary', label: 'Croc Binary', icon: FileCode2 },
  { value: 'advanced', label: 'Advanced', icon: Cpu },
  { value: 'about', label: 'About', icon: Info }
] as const;

type UpdateDraft = (updater: (draft: SettingsState) => void) => void;

type SettingsDialogSelectors = Pick<SettingsStoreState, 'status' | 'draft' | 'settings' | 'setDraft' | 'save' | 'resetDraft' | 'refreshConnectionStatus' | 'connectionStatus' | 'loadingConnection' | 'load' | 'updateRelayStatus'>;

const selectSettingsStore = (state: SettingsStoreState): SettingsDialogSelectors => ({
  status: state.status,
  draft: state.draft,
  settings: state.settings,
  setDraft: state.setDraft,
  save: state.save,
  resetDraft: state.resetDraft,
  refreshConnectionStatus: state.refreshConnectionStatus,
  connectionStatus: state.connectionStatus,
  loadingConnection: state.loadingConnection,
  load: state.load,
  updateRelayStatus: state.updateRelayStatus
});

export function SettingsDialog() {
  const open = useUiStore((state: UiStore) => state.dialogs.settingsOpen);
  const closeSettings = useUiStore((state: UiStore) => state.closeSettings);
  const { status, draft, settings, setDraft, save, resetDraft, refreshConnectionStatus, connectionStatus, loadingConnection, load, updateRelayStatus } = useSettingsStore(selectSettingsStore);

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
            <SettingsIcon /> Cài đặt
          </DialogTitle>
          <DialogDescription>Tùy chỉnh hành vi ứng dụng, mặc định truyền tải và cấu hình kết nối cho croc.</DialogDescription>
        </DialogHeader>

        {!draft ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Đang tải thiết lập...</div>
        ) : (
          <div className="flex flex-1 flex-col gap-4 overflow-hidden">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)} className="flex flex-1 flex-col overflow-hidden">
              <TabsList className="sticky top-0 z-10 flex flex-wrap items-center justify-start gap-2 bg-background/80 p-1 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                {TAB_ITEMS.map(({ value, label, icon: Icon }) => (
                  <TabsTrigger key={value} value={value} className="gap-2">
                    <Icon className="size-4" aria-hidden />
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>
              <div className="flex-1 overflow-y-auto px-1">
                <TabsContent value="general" className="pb-16">
                  <GeneralTab settings={draft} updateDraft={updateDraft} />
                </TabsContent>
                <TabsContent value="transfer" className="pb-16">
                  <TransferTab settings={draft} updateDraft={updateDraft} />
                </TabsContent>
                <TabsContent value="relay" className="pb-16">
                  <RelayTab settings={draft} updateDraft={updateDraft} connectionStatus={connectionStatus} loadingConnection={loadingConnection} onTestRelay={() => refreshConnectionStatus()} onTestProxy={() => refreshConnectionStatus()} />
                </TabsContent>
                <TabsContent value="security" className="pb-16">
                  <SecurityTab settings={draft} updateDraft={updateDraft} />
                </TabsContent>
                <TabsContent value="connection" className="pb-16">
                  <ConnectionTab connectionStatus={connectionStatus} loading={loadingConnection} onRefresh={() => refreshConnectionStatus()} />
                </TabsContent>
                <TabsContent value="binary" className="pb-16">
                  <BinaryTab settings={draft} updateDraft={updateDraft} />
                </TabsContent>
                <TabsContent value="advanced" className="pb-16">
                  <AdvancedTab settings={draft} updateDraft={updateDraft} />
                </TabsContent>
                <TabsContent value="about" className="pb-16">
                  <AboutTab />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        )}

        <DialogFooter className="mt-4 flex-col gap-2 border-t border-border/60 pt-4 sm:flex-row sm:justify-between">
          <div className="text-xs text-muted-foreground">Thay đổi được lưu cục bộ và đồng bộ với tiến trình chính thông qua IPC.</div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button variant="ghost" size="sm" onClick={() => resetDraft()} disabled={!isDirty || isSaving}>
              Khôi phục
            </Button>
            <Button size="sm" onClick={() => void save()} disabled={!isDirty || isSaving}>
              <Save className="mr-2 size-4" aria-hidden /> Lưu thay đổi
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function GeneralTab({ settings, updateDraft }: { settings: SettingsState; updateDraft: UpdateDraft }) {
  const api = getWindowApi();

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
    <div className="space-y-6">
      <SectionHeading icon={FolderOpen} title="Thư mục tải về mặc định" description="Chọn thư mục lưu khi nhận file." />
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
        <Input value={settings.general.downloadDir} readOnly className="font-mono" />
        <Button variant="outline" size="sm" onClick={() => void handleSelectFolder()}>
          <FolderOpen className="mr-2 size-4" aria-hidden /> Chọn…
        </Button>
        <Button variant="ghost" size="sm" onClick={() => void handleCopyDownloadPath()}>
          <ClipboardCopy className="mr-2 size-4" aria-hidden /> Sao chép
        </Button>
      </div>

      <SectionHeading icon={Waypoints} title="Hành vi nhận/gửi" description="Tự động hóa khi hoàn tất phiên." />
      <div className="grid gap-4 sm:grid-cols-2">
        <ToggleField
          label="Tự động mở thư mục khi nhận xong"
          description="Áp dụng cho phiên Receive."
          checked={settings.general.autoOpenOnDone}
          onCheckedChange={(checked) =>
            updateDraft((draft) => {
              draft.general.autoOpenOnDone = checked;
            })
          }
        />
        <ToggleField
          label="Tự động copy code-phrase"
          description="Copy vào clipboard khi bắt đầu gửi."
          checked={settings.general.autoCopyCodeOnSend}
          onCheckedChange={(checked) =>
            updateDraft((draft) => {
              draft.general.autoCopyCodeOnSend = checked;
            })
          }
        />
      </div>
    </div>
  );
}

function TransferTab({ settings, updateDraft }: { settings: SettingsState; updateDraft: UpdateDraft }) {
  const excludeText = settings.transferDefaults.send.exclude.join('\n');

  return (
    <div className="space-y-8">
      <SectionHeading icon={Download} title="Defaults khi Gửi" description="Thiết lập mặc định cho croc send." />
      <div className="grid gap-4 sm:grid-cols-2">
        <ToggleField
          label="Không nén (no-compress)"
          description="Giữ nguyên kích thước gốc khi gửi."
          checked={settings.transferDefaults.send.noCompress}
          onCheckedChange={(checked) =>
            updateDraft((draft) => {
              draft.transferDefaults.send.noCompress = checked;
            })
          }
        />
      </div>
      <Field label="Exclude patterns">
        <Textarea
          value={excludeText}
          placeholder="Ví dụ: *.tmp\nThumbs.db"
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
        <p className="mt-1 text-xs text-muted-foreground">Mỗi dòng tương ứng một --exclude.</p>
      </Field>

      <SectionHeading icon={Download} title="Defaults khi Nhận" description="Áp dụng cho croc receive." />
      <div className="grid gap-4 sm:grid-cols-2">
        <ToggleField
          label="Ghi đè tệp (overwrite)"
          description="Tự động ghi đè tệp trùng tên."
          checked={settings.transferDefaults.receive.overwrite}
          onCheckedChange={(checked) =>
            updateDraft((draft) => {
              draft.transferDefaults.receive.overwrite = checked;
            })
          }
        />
        <ToggleField
          label="Tự xác nhận (yes)"
          description="Bỏ qua bước xác nhận khi nhận."
          checked={settings.transferDefaults.receive.yes}
          onCheckedChange={(checked) =>
            updateDraft((draft) => {
              draft.transferDefaults.receive.yes = checked;
            })
          }
        />
        <Field label="Thư mục mặc định">
          <Input value={settings.general.downloadDir} readOnly className="font-mono" />
        </Field>
      </div>
    </div>
  );
}

function RelayTab({
  settings,
  updateDraft,
  connectionStatus,
  loadingConnection,
  onTestRelay,
  onTestProxy
}: {
  settings: SettingsState;
  updateDraft: UpdateDraft;
  connectionStatus: SettingsDialogSelectors['connectionStatus'];
  loadingConnection: boolean;
  onTestRelay: () => Promise<ConnectionStatus | null>;
  onTestProxy: () => Promise<ConnectionStatus | null>;
}) {
  const [newRelayHost, setNewRelayHost] = useState('');
  const [newRelayPass, setNewRelayPass] = useState('');

  const addRelay = () => {
    if (!newRelayHost.trim()) return;
    updateDraft((draft) => {
      draft.relayProxy.favorites.push({ host: newRelayHost.trim(), pass: newRelayPass.trim() || undefined });
    });
    setNewRelayHost('');
    setNewRelayPass('');
  };

  const handleTestRelay = async () => {
    const status = await onTestRelay();
    if (!status?.relay) {
      toast.error('Không thể kiểm tra relay.');
      return;
    }

    const hostLabel = status.relay.host ?? 'Relay';
    if (status.relay.online) {
      toast.success(`${hostLabel} hoạt động (latency ${status.relay.latencyMs ?? '—'} ms).`);
    } else {
      toast.warning(`${hostLabel} không phản hồi hoặc ngoại tuyến.`);
    }
  };

  const handleTestProxy = async () => {
    const status = await onTestProxy();
    if (!status) {
      toast.error('Không thể kiểm tra proxy.');
      return;
    }

    const proxy = status.proxy;
    if (proxy?.http || proxy?.https) {
      toast.success(`Proxy hoạt động (HTTP ${proxy.http ? 'ON' : 'OFF'} • HTTPS ${proxy.https ? 'ON' : 'OFF'}).`);
    } else {
      toast.warning('Proxy chưa bật hoặc không phản hồi.');
    }
  };

  return (
    <div className="space-y-8">
      <SectionHeading icon={Link2} title="Relay mặc định" description="Host:Port và mật khẩu cho relay ưu tiên." />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Host:Port">
          <Input
            value={settings.relayProxy.defaultRelay.host}
            onChange={(event) =>
              updateDraft((draft) => {
                draft.relayProxy.defaultRelay.host = event.target.value;
              })
            }
            placeholder="croc.schollz.com:9009"
          />
        </Field>
        <Field label="Mật khẩu">
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
          <RefreshCw className={cn('mr-2 size-4', loadingConnection && 'animate-spin')} aria-hidden /> Kiểm tra relay
        </Button>
        <Button variant="outline" size="sm" onClick={() => void handleTestProxy()} disabled={loadingConnection}>
          <RefreshCw className={cn('mr-2 size-4', loadingConnection && 'animate-spin')} aria-hidden /> Kiểm tra proxy
        </Button>
      </div>

      {connectionStatus?.relay && (
        <InfoCard
          title={`Relay: ${connectionStatus.relay.host ?? 'N/A'}`}
          status={connectionStatus.relay.online ? 'online' : 'offline'}
          description={`Latency ${connectionStatus.relay.latencyMs ?? '—'} ms • ${connectionStatus.relay.checkedAt ? new Date(connectionStatus.relay.checkedAt).toLocaleTimeString() : '-'}`}
        />
      )}

      <SectionHeading icon={Link2} title="Danh sách relay ưa thích" description="Lưu nhiều relay để chuyển đổi nhanh." />
      <div className="space-y-3">
        {settings.relayProxy.favorites.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có relay ưa thích.</p>
        ) : (
          <div className="space-y-2">
            {settings.relayProxy.favorites.map((relay, index) => (
              <div key={`${relay.host}-${index}`} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 p-3">
                <div>
                  <p className="font-medium">{relay.host}</p>
                  <p className="text-xs text-muted-foreground">Pass: {relay.pass ? '••••••' : 'Không'}</p>
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
                    Đặt mặc định
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
                    Xóa
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="grid gap-3 rounded-lg border border-dashed border-border/60 p-3">
          <Field label="Host:Port">
            <Input value={newRelayHost} onChange={(event) => setNewRelayHost(event.target.value)} placeholder="relay.example.com:9009" />
          </Field>
          <Field label="Pass">
            <Input value={newRelayPass} onChange={(event) => setNewRelayPass(event.target.value)} placeholder="Tùy chọn" />
          </Field>
          <Button variant="secondary" size="sm" onClick={addRelay}>
            Thêm relay
          </Button>
        </div>
      </div>

      <SectionHeading icon={Globe} title="Proxy" description="Cấu hình HTTP(S) proxy cho phiên gửi/nhận." />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="HTTP Proxy">
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
            placeholder="http://127.0.0.1:8080"
          />
        </Field>
        <Field label="HTTPS Proxy">
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
            placeholder="https://127.0.0.1:8080"
          />
        </Field>
      </div>
      {connectionStatus?.proxy && (
        <div className="grid gap-2">
          <InfoCard
            title="Proxy trạng thái"
            status={connectionStatus.proxy.http || connectionStatus.proxy.https ? 'online' : 'offline'}
            description={`HTTP: ${connectionStatus.proxy.http ? 'On' : 'Off'} • HTTPS: ${connectionStatus.proxy.https ? 'On' : 'Off'}`}
          />
        </div>
      )}
    </div>
  );
}

function SecurityTab({ settings, updateDraft }: { settings: SettingsState; updateDraft: UpdateDraft }) {
  return (
    <div className="space-y-6">
      <SectionHeading icon={ShieldCheck} title="Thuật toán" description="Lựa chọn curve phù hợp với relay." />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Curve">
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
      <AlertNote icon={ShieldQuestion} text="Các lựa chọn phụ thuộc phiên bản croc hiện tại." />
    </div>
  );
}

function ConnectionTab({ connectionStatus, loading, onRefresh }: { connectionStatus: SettingsDialogSelectors['connectionStatus']; loading: boolean; onRefresh: () => void }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <SectionHeading icon={Network} title="Trạng thái kết nối" description="Kiểm tra relay, proxy và phiên bản croc." />
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
          <RefreshCw className={cn('mr-2 size-4', loading && 'animate-spin')} aria-hidden /> Làm mới
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <InfoCard title={`Relay: ${connectionStatus?.relay?.host ?? 'Không thiết lập'}`} status={connectionStatus?.relay?.online ? 'online' : 'offline'} description={`Latency: ${connectionStatus?.relay?.latencyMs ?? '—'}ms`} />
        <InfoCard
          title="Proxy"
          status={connectionStatus?.proxy?.http || connectionStatus?.proxy?.https ? 'online' : 'offline'}
          description={`HTTP ${connectionStatus?.proxy?.http ? 'ON' : 'OFF'} • HTTPS ${connectionStatus?.proxy?.https ? 'ON' : 'OFF'}`}
        />
        <InfoCard title="Croc" status={connectionStatus?.croc?.installed ? 'online' : 'offline'} description={`Version: ${connectionStatus?.croc?.version ?? 'unknown'}`} />
      </div>
    </div>
  );
}

function BinaryTab({ settings, updateDraft }: { settings: SettingsState; updateDraft: UpdateDraft }) {
  const api = getWindowApi();

  const handleRefreshVersion = async () => {
    const version = await api.croc.getVersion();
    updateDraft((draft) => {
      draft.binary.crocVersion = version;
    });
  };

  const handleOpenBinaryFolder = async () => {
    if (settings.binary.crocPath) {
      await api.app.openPath(settings.binary.crocPath);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeading icon={FileCode2} title="Croc binary" description="Thông tin phiên bản và vị trí binary." />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Phiên bản">
          <Input value={settings.binary.crocVersion ?? 'not-installed'} readOnly />
        </Field>
        <Field label="Đường dẫn">
          <Input value={settings.binary.crocPath ?? ''} readOnly className="font-mono" />
        </Field>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => void handleRefreshVersion()}>
          <RefreshCw className="mr-2 size-4" aria-hidden /> Kiểm tra phiên bản
        </Button>
        <Button variant="ghost" size="sm" onClick={() => void handleOpenBinaryFolder()} disabled={!settings.binary.crocPath}>
          <FolderOpen className="mr-2 size-4" aria-hidden /> Mở thư mục chứa
        </Button>
      </div>
      <AlertNote icon={AlertTriangle} text="Kiểm tra cập nhật croc bằng tay hoặc script tự động." />
    </div>
  );
}

function AdvancedTab({ settings, updateDraft }: { settings: SettingsState; updateDraft: UpdateDraft }) {
  return (
    <div className="space-y-8">
      <SectionHeading icon={Cpu} title="Logging & History" description="Điều chỉnh log tail và giữ lịch sử." />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Số dòng log tail">
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
        <Field label="Giữ lịch sử (ngày)">
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
      </div>

      <SectionHeading icon={ShieldAlert} title="Tùy chọn bảo mật" description="Điều chỉnh xác thực code và flags." />
      <div className="grid gap-4 sm:grid-cols-2">
        <ToggleField
          label="Bật deep links"
          description="Cho phép croc-ui://receive?code=…"
          checked={settings.advanced.deepLink ?? false}
          onCheckedChange={(checked) =>
            updateDraft((draft) => {
              draft.advanced.deepLink = checked;
            })
          }
        />
        <ToggleField
          label="Verbose logs"
          description="Ghi thêm stderr/stdout"
          checked={settings.advanced.verboseLogs ?? false}
          onCheckedChange={(checked) =>
            updateDraft((draft) => {
              draft.advanced.verboseLogs = checked;
            })
          }
        />
        <ToggleField
          label="Validate code-phrase"
          description="Kiểm tra định dạng trước khi chạy"
          checked={settings.advanced.allowCodeFormatValidation ?? false}
          onCheckedChange={(checked) =>
            updateDraft((draft) => {
              draft.advanced.allowCodeFormatValidation = checked;
            })
          }
        />
      </div>

      <Field label="Extra flags">
        <Textarea
          rows={4}
          placeholder="Ví dụ: --max-retries 3"
          value={settings.advanced.extraFlags ?? ''}
          onChange={(event) =>
            updateDraft((draft) => {
              draft.advanced.extraFlags = event.target.value || undefined;
            })
          }
        />
        <p className="mt-1 text-xs text-muted-foreground">Các cờ bổ sung sẽ được nối vào lệnh croc. Hãy cẩn trọng!</p>
      </Field>
    </div>
  );
}

function AboutTab() {
  return (
    <div className="space-y-4 text-sm">
      <SectionHeading icon={Info} title="crock UI" description="Giao diện croc dành cho desktop." />
      <p>
        Phiên bản UI: <span className="font-medium">0.1.0</span>
      </p>
      <p>
        Dựa trên{' '}
        <a className="underline" href="https://github.com/schollz/croc" target="_blank" rel="noreferrer">
          croc
        </a>{' '}
        (MIT). Mã nguồn:{' '}
        <a className="underline" href="https://github.com/your-org/crock-ui" target="_blank" rel="noreferrer">
          GitHub
        </a>
        .
      </p>
      <p>Feedback & issues: vui lòng mở issue trên repository.</p>
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
  return (
    <div className="rounded-lg border border-border/60 bg-background/40 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{title}</p>
        <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold', status === 'online' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500')}>{status === 'online' ? 'Online' : 'Offline'}</span>
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
