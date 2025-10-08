import { BrowserWindow } from 'electron';
import net from 'node:net';
import { performance } from 'node:perf_hooks';
import { parseHostPort, isIpv6 } from '../utils/network';
import { SettingsStore } from './SettingsStore';

const DEFAULT_INTERVAL_MS = 15000;
const RELAY_TIMEOUT_MS = 2000;

async function pingRelay(host: string, port: number): Promise<{ online: boolean; latency?: number }> {
  return new Promise((resolve) => {
    const start = performance.now();
    const socket = net.createConnection({ host, port });
    let resolved = false;

    const finalize = (online: boolean) => {
      if (resolved) return;
      resolved = true;
      socket.removeAllListeners();
      socket.destroy();
      const latency = performance.now() - start;
      resolve({ online, latency });
    };

    socket.once('connect', () => finalize(true));
    socket.once('error', () => finalize(false));
    socket.setTimeout(RELAY_TIMEOUT_MS, () => finalize(false));
  });
}

export class RelayStatusMonitor {
  private interval: NodeJS.Timeout | null = null;

  constructor(private readonly window: BrowserWindow, private readonly settingsStore: SettingsStore, private readonly intervalMs: number = DEFAULT_INTERVAL_MS) {}

  start() {
    this.stop();
    void this.emitStatus();
    this.interval = setInterval(() => {
      void this.emitStatus();
    }, this.intervalMs);
    this.interval.unref();
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  async emitStatus() {
    const settings = this.settingsStore.get();
    const relay = settings.relayProxy.defaultRelay;
    const parsed = parseHostPort(relay.host ?? '');
    if (!parsed) return;
    const result = await pingRelay(parsed.host, parsed.port);
    if (this.window.isDestroyed()) return;
    this.window.webContents.send('relay:status', {
      relay: relay.host,
      online: result.online,
      latencyMs: result.online ? Math.round(result.latency ?? 0) : undefined,
      checkedAt: Date.now(),
      ipv6: isIpv6(parsed.host),
      port: parsed.port
    });
  }
}
