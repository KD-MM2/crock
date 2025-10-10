import path from 'node:path';
import type { CrocCapabilities } from '../types/capabilities';
import type { ReceiveOptions, SendOptions } from '../types/croc';

const SHELL_SAFE_SPLIT = /\s+(?![^"']*["'][^"']*["'])/g;

function normalizePathSegments(paths?: string[]): string[] {
  if (!paths) return [];
  return paths.map((p) => (p ? path.resolve(p) : p)).filter((p): p is string => Boolean(p));
}

function parseExtraFlags(extraFlags?: string): string[] {
  if (!extraFlags) return [];
  const trimmed = extraFlags.trim();
  if (!trimmed) return [];
  return trimmed
    .split(SHELL_SAFE_SPLIT)
    .map((part) => part.trim())
    .filter(Boolean);
}

function maybeApplyFlag(list: string[], flag: keyof CrocCapabilities, capabilities: CrocCapabilities | undefined, build: () => string | string[] | undefined) {
  if (capabilities && flag in capabilities && capabilities[flag] === false) return;
  const value = build();
  if (!value) return;
  if (Array.isArray(value)) {
    list.push(...value);
  } else {
    list.push(value);
  }
}

export class CrocCommandBuilder {
  private readonly platform: NodeJS.Platform;

  constructor(
    private capabilities: CrocCapabilities = {},
    platform: NodeJS.Platform = process.platform
  ) {
    this.platform = platform;
  }

  setCapabilities(next: CrocCapabilities) {
    this.capabilities = next;
  }

  buildSendArgs(options: SendOptions): string[] {
    const args: string[] = [];
    this.applyCommonNetworkFlags(args, options);

    args.push('send');

    if (options.code) {
      args.push('--code', options.code);
    }

    if (options.noCompress) {
      args.push('--no-compress');
    }

    maybeApplyFlag(args, 'exclude', this.capabilities, () => {
      if (!options.exclude?.length) return undefined;
      return ['--exclude', options.exclude.join(',')];
    });

    maybeApplyFlag(args, 'throttleUpload', this.capabilities, () => {
      if (!options.throttleUpload) return undefined;
      return ['--throttleUpload', options.throttleUpload];
    });

    maybeApplyFlag(args, 'yes', this.capabilities, () => {
      if (!options.yes) return undefined;
      return ['--yes'];
    });

    if (options.mode === 'text') {
      maybeApplyFlag(args, 'text', this.capabilities, () => {
        if (options.text == null) return undefined;
        return ['--text', options.text];
      });
    } else {
      const normalized = normalizePathSegments(options.paths);
      args.push(...normalized);
    }

    args.push(...parseExtraFlags(options.extraFlags));

    return args;
  }

  buildReceiveArgs(options: ReceiveOptions): { args: string[]; env?: Record<string, string> } {
    const args: string[] = [];
    const env: Record<string, string> = {};

    this.applyCommonNetworkFlags(args, options);

    maybeApplyFlag(args, 'overwrite', this.capabilities, () => (options.overwrite ? ['--overwrite'] : undefined));
    maybeApplyFlag(args, 'yes', this.capabilities, () => (options.yes ? ['--yes'] : undefined));
    maybeApplyFlag(args, 'out', this.capabilities, () => (options.outDir ? ['--out', options.outDir] : undefined));
    maybeApplyFlag(args, 'curve', this.capabilities, () => (options.curve ? ['--curve', options.curve] : undefined));

    args.push(...parseExtraFlags(options.extraFlags));

    if (this.platform !== 'win32' && options.code) {
      if (this.capabilities.crocSecretEnv !== false) {
        env.CROC_SECRET = options.code;
      } else {
        args.push(options.code);
      }
    } else {
      args.push(options.code);
    }

    return { args, env: Object.keys(env).length ? env : undefined };
  }

  private applyCommonNetworkFlags(args: string[], options: Partial<SendOptions & ReceiveOptions>) {
    if (options.relay) {
      args.push('--relay', options.relay);
    }
    maybeApplyFlag(args, 'relay6', this.capabilities, () => (options.relay6 ? ['--relay6', options.relay6] : undefined));
    if (options.pass) {
      args.push('--pass', options.pass);
    }
    maybeApplyFlag(args, 'socks5', this.capabilities, () => (options.socks5 ? ['--socks5', options.socks5] : undefined));
    maybeApplyFlag(args, 'local', this.capabilities, () => (options.local ? ['--local'] : undefined));
    maybeApplyFlag(args, 'internalDns', this.capabilities, () => (options.internalDns ? ['--internal-dns'] : undefined));
  }
}
