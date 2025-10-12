import net from 'node:net';
import { performance } from 'node:perf_hooks';
import type { ConnectionStatus } from '../types/settings';
import { parseHostPort, isIpv6 } from '../utils/network';
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
    if (proxy.http) proxyStatus.http = { set: true };
    if (proxy.https) proxyStatus.https = { set: true };
    if (proxy.socks5) proxyStatus.socks5 = { set: true };

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
