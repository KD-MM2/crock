export type HostPort = { host: string; port: number };

export function parseHostPort(input: string | undefined, fallbackPort = 9009): HostPort | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('[')) {
    const idx = trimmed.indexOf(']');
    if (idx === -1) return null;
    const host = trimmed.slice(1, idx);
    const portPart = trimmed.slice(idx + 1).replace(/^:/, '');
    const port = Number.parseInt(portPart, 10) || fallbackPort;
    return { host, port };
  }
  const parts = trimmed.split(':');
  if (parts.length <= 1) {
    return { host: trimmed, port: fallbackPort };
  }
  const port = Number.parseInt(parts.pop() ?? String(fallbackPort), 10) || fallbackPort;
  const host = parts.join(':');
  return { host, port };
}

export function isIpv6(host: string | undefined): boolean {
  return Boolean(host && host.includes(':'));
}
