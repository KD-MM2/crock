import net from 'node:net';
import { performance } from 'node:perf_hooks';
import type { ConnectionStatus } from '../types/settings';
import { isIpv6, parseHostPort, parseProxyUrl } from '../utils/network';
import { CrocBinaryManager } from './CrocBinaryManager';
import { SettingsStore } from './SettingsStore';

const RELAY_TIMEOUT_MS = 2000;

async function checkRelay(host: string, port: number): Promise<{ online: boolean; latency?: number }> {
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
    socket.once('timeout', () => finalize(false));
    socket.once('error', () => finalize(false));
    socket.setTimeout(RELAY_TIMEOUT_MS, () => finalize(false));
  });
}

async function checkProxy(url: string): Promise<{ ok: boolean; latencyMs?: number }> {
  const addr = parseProxyUrl(url);
  if (!addr) return { ok: false };

  return new Promise((resolve) => {
    const start = performance.now();
    const socket = net.createConnection({ host: addr.host, port: addr.port });
    let resolved = false;

    const finalize = (ok: boolean) => {
      if (resolved) return;
      resolved = true;
      socket.removeAllListeners();
      socket.destroy();
      const latencyMs = ok ? Math.round(performance.now() - start) : undefined;
      resolve({ ok, latencyMs });
    };

    socket.once('connect', () => finalize(true));
    socket.once('timeout', () => finalize(false));
    socket.once('error', () => finalize(false));
    socket.setTimeout(RELAY_TIMEOUT_MS, () => finalize(false));
  });
}

export class ConnectionDiagnostics {
  constructor(
    private readonly binaryManager: CrocBinaryManager,
    private readonly settingsStore: SettingsStore
  ) {}

  async run(): Promise<ConnectionStatus> {
    const settings = this.settingsStore.get();
    const relayInfo = settings.relayProxy.defaultRelay;
    const relayAddress = parseHostPort(relayInfo.host ?? '');

    let relayStatus: ConnectionStatus['relay'];
    if (relayAddress) {
      const result = await checkRelay(relayAddress.host, relayAddress.port);
      relayStatus = {
        host: relayInfo.host,
        online: result.online,
        latencyMs: result.online ? Math.round(result.latency ?? 0) : undefined,
        checkedAt: Date.now(),
        ipv6: isIpv6(relayAddress.host)
      };
    } else {
      relayStatus = {
        host: relayInfo.host,
        online: false,
        checkedAt: Date.now(),
        ipv6: false
      };
    }

    const proxyStatus: ConnectionStatus['proxy'] = {};
    const proxy = settings.relayProxy.proxy ?? {};

    const proxyResults = await Promise.all([
      proxy.http ? checkProxy(proxy.http).then((r) => ({ key: 'http' as const, ...r })) : null,
      proxy.https ? checkProxy(proxy.https).then((r) => ({ key: 'https' as const, ...r })) : null,
      proxy.socks5 ? checkProxy(proxy.socks5).then((r) => ({ key: 'socks5' as const, ...r })) : null
    ]);

    for (const result of proxyResults) {
      if (!result) continue;
      proxyStatus[result.key] = { set: true, ok: result.ok, latencyMs: result.latencyMs };
    }

    let crocStatus: ConnectionStatus['croc'] = { installed: false };
    try {
      const binaryPath = await this.binaryManager.ensure();
      const version = await this.binaryManager.getVersion(binaryPath);
      crocStatus = { installed: true, path: binaryPath, version };
    } catch {
      crocStatus = { installed: false, path: undefined, version: undefined };
    }

    return {
      relay: relayStatus,
      proxy: proxyStatus,
      croc: crocStatus
    };
  }
}
