import { spawn } from 'node:child_process';
import type { CrocCapabilities } from '../types/capabilities';

const FLAG_PATTERNS: Array<[keyof CrocCapabilities, RegExp]> = [
  ['socks5', /--socks5/],
  ['hash', /--hash/],
  ['curve', /--curve/],
  ['throttleUpload', /--throttleUpload/],
  ['internalDns', /--internal-dns/],
  ['local', /--local/],
  ['relay6', /--relay6/],
  ['out', /--out/],
  ['text', /--text/],
  ['exclude', /--exclude/],
  ['overwrite', /--overwrite/],
  ['yes', /--yes/],
  ['connections', /--connections/],
  ['transfers', /--transfers/],
  ['forceLocal', /--force-local/],
  ['disableLocal', /--disable-local/],
  ['protocol', /--protocol/]
];

export class CapabilityDetector {
  private cache: CrocCapabilities | null = null;
  private loading: Promise<CrocCapabilities> | null = null;

  constructor(private readonly binaryPath: string) {}

  async getCapabilities(): Promise<CrocCapabilities> {
    if (this.cache) return this.cache;
    if (!this.loading) {
      this.loading = this.detect().finally(() => {
        this.loading = null;
      });
    }
    const capabilities = await this.loading;
    this.cache = capabilities;
    return capabilities;
  }

  private async detect(): Promise<CrocCapabilities> {
    const helpOutput = await this.collectHelpOutput();
    const capabilities: CrocCapabilities = { crocSecretEnv: true };

    for (const [key, pattern] of FLAG_PATTERNS) {
      capabilities[key] = pattern.test(helpOutput);
    }

    // Some older croc versions don't support curve selection; ensure boolean
    if (!capabilities.curve) {
      capabilities.curve = /curve/i.test(helpOutput);
    }

    // Determine whether CROC_SECRET is supported (assume true unless explicitly mentioned otherwise)
    if (/CROC_SECRET/i.test(helpOutput) === false) {
      capabilities.crocSecretEnv = undefined;
    }

    return capabilities;
  }

  private async collectHelpOutput(): Promise<string> {
    const outputs: string[] = [];
    const commands: Array<string[]> = [['--help'], ['send', '--help'], ['receive', '--help'], ['recv', '--help']];

    for (const args of commands) {
      const output = await this.runHelp(args).catch(() => '');
      if (output) {
        outputs.push(output);
      }
    }

    return outputs.join('\n');
  }

  private runHelp(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const process = spawn(this.binaryPath, args);
      let output = '';
      let errorOutput = '';

      process.stdout.on('data', (chunk) => {
        output += chunk.toString();
      });

      process.stderr.on('data', (chunk) => {
        errorOutput += chunk.toString();
      });

      process.once('close', (code) => {
        if (code !== 0) {
          reject(new Error(errorOutput || `croc --help exited with code ${code}`));
          return;
        }
        resolve(`${output}\n${errorOutput}`);
      });

      process.once('error', (error) => reject(error));
    });
  }
}
