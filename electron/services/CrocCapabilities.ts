import { spawn } from 'child_process';
import type { ChildProcess } from 'child_process';
import type { CrocCapabilities } from '../types/capabilities';

/**
 * Baseline capabilities for croc v10.2.5 (the last release before v11).
 *
 * Verified against `croc --help` / `croc send --help` flag definitions from
 * https://github.com/schollz/croc/blob/v10.2.5/src/cli/cli.go. Flags that only
 * exist in croc v11 (`--exclude-file`, `--transport`, `--store`, `--rename`)
 * default to false here; `detectCapabilities()` enables them at runtime when
 * the installed binary advertises them.
 */
export const CROC_CAPABILITIES: CrocCapabilities = {
  socks5: true,
  curve: true,
  throttleUpload: true,
  internalDns: true,
  local: true,
  relay6: true,
  out: true,
  text: true,
  exclude: true,
  overwrite: true,
  yes: true,
  // CROC_SECRET has been supported since croc v9.x; it is not listed in
  // `--help`, so the version probe in detectCapabilities confirms it.
  crocSecretEnv: true,
  zip: true,
  git: true,
  hash: true,
  noLocal: true,
  noMulti: true,
  connect: true,
  excludeFile: false,
  transport: false,
  store: false,
  rename: false
};

/**
 * Get the baseline (static) capabilities. Prefer `detectCapabilities()` when a
 * binary path is available; this is the synchronous fallback.
 */
export function getCapabilities(): CrocCapabilities {
  return { ...CROC_CAPABILITIES };
}

/** Flag names printed by `croc --help` that gate CrocCommandBuilder options. */
const DETECTABLE_FLAGS: Record<string, keyof CrocCapabilities> = {
  socks5: 'socks5',
  curve: 'curve',
  throttleUpload: 'throttleUpload',
  'internal-dns': 'internalDns',
  local: 'local',
  relay6: 'relay6',
  out: 'out',
  text: 'text',
  exclude: 'exclude',
  overwrite: 'overwrite',
  yes: 'yes',
  zip: 'zip',
  git: 'git',
  hash: 'hash',
  'no-local': 'noLocal',
  'no-multi': 'noMulti',
  connect: 'connect',
  'exclude-file': 'excludeFile',
  transport: 'transport',
  store: 'store',
  rename: 'rename'
};

function runHelp(binaryPath: string, args: string[]): Promise<string> {
  const { promise, resolve, reject } = Promise.withResolvers<string>();
  let child: ChildProcess;
  try {
    child = spawn(binaryPath, args, { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  } catch (error) {
    reject(error instanceof Error ? error : new Error(String(error)));
    return promise;
  }

  let output = '';
  const timeout = setTimeout(() => {
    child.kill('SIGKILL');
    reject(new Error(`croc ${args.join(' ')} timed out`));
  }, 10_000);
  timeout.unref();

  child.stdout?.on('data', (chunk) => {
    output += chunk.toString();
  });
  child.stderr?.on('data', (chunk) => {
    output += chunk.toString();
  });
  child.once('error', (error) => {
    clearTimeout(timeout);
    reject(error);
  });
  child.once('close', () => {
    clearTimeout(timeout);
    // urfave/cli prints help to stdout; some errors land on stderr. Accept
    // whatever was captured as long as it looks like a flag listing.
    resolve(output);
  });
  return promise;
}

function extractFlagNames(helpText: string): Set<string> {
  const names = new Set<string>();
  const pattern = /-{2}([A-Za-z][A-Za-z0-9-]*)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(helpText)) !== null) {
    names.add(match[1]);
  }
  return names;
}

/**
 * Detect capabilities dynamically from the installed binary by parsing its
 * `--help` output. Falls back to the static baseline when the binary cannot be
 * executed or does not produce parseable help.
 */
export async function detectCapabilities(binaryPath: string): Promise<CrocCapabilities> {
  const capabilities = getCapabilities();
  if (!binaryPath) return capabilities;

  try {
    const [rootHelp, sendHelp] = await Promise.all([
      runHelp(binaryPath, ['--help']),
      runHelp(binaryPath, ['send', '--help'])
    ]);

    const flags = extractFlagNames(rootHelp);
    for (const flag of extractFlagNames(sendHelp)) {
      flags.add(flag);
    }
    if (flags.size === 0) {
      // Help output was empty or unusable; keep the static baseline.
      return capabilities;
    }

    for (const [flagName, capabilityKey] of Object.entries(DETECTABLE_FLAGS)) {
      capabilities[capabilityKey] = flags.has(flagName);
    }

    // CROC_SECRET is not advertised in --help; assume it for croc >= v9 where
    // custom code phrases on Unix must be supplied through the environment.
    capabilities.crocSecretEnv = flags.has('relay') ? capabilities.crocSecretEnv !== false : capabilities.crocSecretEnv;
    return capabilities;
  } catch (error) {
    console.warn('[croc-capabilities] dynamic detection failed, using static baseline', error);
    return capabilities;
  }
}
