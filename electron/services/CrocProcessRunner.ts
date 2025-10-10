import { BrowserWindow } from 'electron';
import { ChildProcess, spawn } from 'child_process';

import { EventEmitter } from 'node:events';
import type { ReceiveOptions, SendOptions, TransferDonePayload, TransferProgress, TransferType } from '../types/croc';
import type { CrocCommandBuilder } from './CrocCommandBuilder';

const CODE_REGEX = /(?<=Code is: )[a-zA-Z0-9-]+/i;
const FILE_REGEX = /^\s*(?:sending|receiving)\s+['"]?(.+?)['"]?\s+\([^)]+\)/i;
const TARGET_REGEX = /(?:sending|receiving)\s+\((?:->|<-)\s*([^)]+)\)/i;
const PERCENT_REGEX = /(\d{1,3})%\s*\|/;
const PARENTHETICAL_REGEX = /\(([^()]+)\)/g;
const BYTE_UNIT_FRAGMENT = '(?:[kmgtpe]i?b)';
const SPEED_TOKEN_REGEX = new RegExp(`\\b\\d+(?:\\.\\d+)?\\s*${BYTE_UNIT_FRAGMENT}\\s*/\\s*s\\b`, 'i');
const SIZE_VALUE_REGEX = new RegExp(`\\b\\d+(?:\\.\\d+)?\\s*${BYTE_UNIT_FRAGMENT}\\b`, 'i');
const SIZE_PAIR_REGEX = new RegExp(`^\\s*(\\d+(?:\\.\\d+)?(?:\\s*${BYTE_UNIT_FRAGMENT})?)\\s*/\\s*(\\d+(?:\\.\\d+)?\\s*${BYTE_UNIT_FRAGMENT})\\s*$`, 'i');
const HASHING_REGEX = /\bhash(?:ing|ed)?\b/i;
const WAITING_REGEX = /\bwait(?:ing)?\b/i;
const WAITING_CONTEXT_REGEX = /\b(receiver|client|peer|other side|connection|connect|listener)\b/i;
const WAITING_PROMPT_PATTERNS = [/sending\s+0\s+files/i, /sending\s+['"][^'"()]+['"]\s+\([^)]*\)/i, /code\s+is:/i, /on\s+the\s+other\s+computer\s+run/i, /code\s+copied\s+to\s+clipboard/i];
const TRANSFER_PROGRESS_REGEX = /^.+?\b\d{1,3}%\s*\|/i;
const PROGRESS_FILENAME_REGEX = /^(.+?)\s+\d{1,3}%\s*\|/;

const BYTE_MULTIPLIERS: Record<string, number> = {
  b: 1,
  kb: 1024,
  mb: 1024 ** 2,
  gb: 1024 ** 3,
  tb: 1024 ** 4,
  pb: 1024 ** 5,
  eb: 1024 ** 6
};

function parseHumanReadableBytes(value: string): number | undefined {
  const match = value.trim().match(/^([0-9]+(?:\.[0-9]+)?)\s*([kmgtpe]?)(?:i)?b$/i);
  if (!match) return undefined;
  const quantity = Number.parseFloat(match[1]);
  if (!Number.isFinite(quantity)) return undefined;
  const unit = (match[2] ?? '').toLowerCase();
  const multiplier = BYTE_MULTIPLIERS[`${unit}b` as keyof typeof BYTE_MULTIPLIERS] ?? BYTE_MULTIPLIERS[unit as keyof typeof BYTE_MULTIPLIERS];
  if (!multiplier) return undefined;
  return Math.round(quantity * multiplier);
}

export interface RunnerSession {
  id: string;
  type: TransferType;
  process: ChildProcess | null;
  startedAt: number;
  phase?: TransferProgress['phase'];
  canceled?: boolean;
  code?: string;
  bytesTransferred?: number;
  bytesTotal?: number;
  percent?: number;
  targetAddress?: string;
  sizeTransferred?: string;
  sizeTotal?: string;
  speed?: string;
  eta?: string;
  fileName?: string;
}

export interface RunnerEnv {
  args: string[];
  env?: Record<string, string>;
}

export class CrocProcessRunner extends EventEmitter {
  private readonly sessions = new Map<string, RunnerSession>();

  constructor(
    private binaryPath: string,
    private readonly window: BrowserWindow,
    private readonly commandBuilder: CrocCommandBuilder
  ) {
    super();
  }

  runSend(id: string, options: SendOptions): ChildProcess {
    const args = this.commandBuilder.buildSendArgs(options);
    return this.spawnProcess(id, 'send', args, {});
  }

  runReceive(id: string, options: ReceiveOptions): ChildProcess {
    const { args, env } = this.commandBuilder.buildReceiveArgs(options);
    return this.spawnProcess(id, 'receive', args, env);
  }

  stop(id: string) {
    const session = this.sessions.get(id);
    if (!session) return;
    session.canceled = true;
    session.process?.kill('SIGINT');
    const timeout = setTimeout(() => {
      if (!session.process?.killed) {
        session.process?.kill('SIGKILL');
      }
    }, 2000);
    timeout.unref();
  }

  stopAll() {
    for (const id of this.sessions.keys()) {
      this.stop(id);
    }
  }

  setBinaryPath(binaryPath: string) {
    this.binaryPath = binaryPath;
  }

  private spawnProcess(id: string, type: TransferType, args: string[], extraEnv?: Record<string, string>): ChildProcess {
    const env = { ...process.env, ...extraEnv };

    const child = spawn(this.binaryPath, args, {
      env,
      stdio: ['ignore', 'pipe', 'pipe'] // stdin must be ignored to prevent croc from waiting for input
    });

    const session: RunnerSession = {
      id,
      type,
      process: child,
      startedAt: Date.now()
    };
    this.sessions.set(id, session);

    let stdoutBuffer = '';
    let stderrBuffer = '';

    child?.stdout?.on('data', (chunk) => {
      stdoutBuffer = this.consumeBuffer(session, stdoutBuffer + chunk.toString(), 'stdout');
    });

    child?.stderr?.on('data', (chunk) => {
      stderrBuffer = this.consumeBuffer(session, stderrBuffer + chunk.toString(), 'stderr');
    });

    child.once('close', (code) => {
      this.sessions.delete(id);
      const finishedAt = Date.now();
      const success = code === 0 && !session.canceled;
      const payload: TransferDonePayload = {
        id,
        type,
        success,
        canceled: session.canceled,
        code: session.code,
        bytesTransferred: session.bytesTransferred,
        durationMs: finishedAt - session.startedAt,
        finishedAt
      };
      if (!success) {
        payload.error = `Exited with code ${code}`;
      }
      this.emitDone(payload);
    });

    child.once('error', (error) => {
      this.sessions.delete(id);
      const payload: TransferDonePayload = {
        id,
        type,
        success: false,
        error: error.message,
        finishedAt: Date.now()
      };
      this.emitDone(payload);
    });

    return child;
  }

  private consumeBuffer(session: RunnerSession, buffer: string, stream: 'stdout' | 'stderr'): string {
    const sanitized = buffer.replace(/\r/g, '\n');
    const lines = sanitized.split(/\n/);
    const remainder = lines.pop() ?? '';

    const basePayload = {
      id: session.id,
      type: session.type,
      ts: Date.now()
    } as TransferProgress;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      this.logStream(session, stream, line);

      const payload: TransferProgress = {
        ...basePayload,
        raw: line
      };

      const codeMatch = /copied/i.test(line) ? undefined : line.match(CODE_REGEX)?.[0];
      if (codeMatch) {
        session.code = codeMatch;
        payload.code = codeMatch;
      }

      const targetMatch = line.match(TARGET_REGEX);
      if (targetMatch) {
        const targetAddress = targetMatch[1].trim();
        if (targetAddress) {
          session.targetAddress = targetAddress;
          payload.targetAddress = targetAddress;
        }
      }

      const percentMatch = line.match(PERCENT_REGEX);
      if (percentMatch) {
        const percentValue = Number.parseInt(percentMatch[1], 10);
        if (!Number.isNaN(percentValue)) {
          session.percent = percentValue;
          payload.percent = percentValue;
        }
      }

      const parentheticalMatches = Array.from(line.matchAll(PARENTHETICAL_REGEX));
      if (parentheticalMatches.length > 0) {
        const detail = parentheticalMatches[parentheticalMatches.length - 1][1];
        const parts = detail
          .split(',')
          .map((part) => part.trim())
          .filter(Boolean);

        for (const rawPart of parts) {
          const part = rawPart.replace(/\s+/g, ' ').trim();
          if (!part) continue;

          if (SPEED_TOKEN_REGEX.test(part)) {
            const speedValue = part.replace(/\s+/g, ' ').trim();
            session.speed = speedValue;
            payload.speed = speedValue;
            continue;
          }

          const pairMatch = part.match(SIZE_PAIR_REGEX);
          if (pairMatch) {
            const transferredRaw = pairMatch[1].trim();
            const totalRaw = pairMatch[2].trim();

            const totalNormalized = totalRaw.replace(/\s+/g, ' ').trim();
            let transferredNormalized = transferredRaw.replace(/\s+/g, ' ').trim();

            if (!/[a-z]/i.test(transferredNormalized)) {
              const unitMatch = totalNormalized.match(new RegExp(`${BYTE_UNIT_FRAGMENT}$`, 'i'));
              if (unitMatch) {
                transferredNormalized = `${transferredNormalized} ${unitMatch[0]}`.replace(/\s+/g, ' ').trim();
              }
            }

            const transferredBytes = parseHumanReadableBytes(transferredNormalized);
            const totalBytes = parseHumanReadableBytes(totalNormalized);

            if (transferredBytes !== undefined) {
              session.bytesTransferred = transferredBytes;
              payload.bytesTransferred = transferredBytes;
              session.sizeTransferred = transferredNormalized;
              payload.sizeTransferred = transferredNormalized;
            }

            if (totalBytes !== undefined) {
              session.bytesTotal = totalBytes;
              payload.bytesTotal = totalBytes;
              session.sizeTotal = totalNormalized;
              payload.sizeTotal = totalNormalized;
            }

            continue;
          }

          if (!SIZE_VALUE_REGEX.test(part)) {
            continue;
          }

          const bytesValue = parseHumanReadableBytes(part);
          if (bytesValue !== undefined) {
            const normalized = part.replace(/\s+/g, ' ').trim();
            if (!session.sizeTotal) {
              session.sizeTotal = normalized;
              payload.sizeTotal = normalized;
              session.bytesTotal = bytesValue;
              payload.bytesTotal = bytesValue;
            } else if (!session.sizeTransferred) {
              session.sizeTransferred = normalized;
              payload.sizeTransferred = normalized;
              session.bytesTransferred = bytesValue;
              payload.bytesTransferred = bytesValue;
            }
          }
        }
      }

      let etaValue: string | undefined;
      const etaStart = line.lastIndexOf('[');
      if (etaStart !== -1) {
        const etaEnd = line.indexOf(']', etaStart + 1);
        if (etaEnd !== -1 && etaEnd > etaStart + 1) {
          const etaSegment = line.slice(etaStart + 1, etaEnd).trim();
          if (etaSegment) {
            const etaParts = etaSegment
              .split(':')
              .map((segment) => segment.trim())
              .filter(Boolean);
            etaValue = etaParts.length > 0 ? etaParts[etaParts.length - 1] : etaSegment;
          }
        }
      }

      if (!etaValue) {
        const lastParenIndex = line.lastIndexOf(')');
        if (lastParenIndex !== -1 && lastParenIndex < line.length - 1) {
          const suffix = line
            .slice(lastParenIndex + 1)
            .replace(/\[|\]/g, ' ')
            .trim();
          if (suffix) {
            const suffixTokens = suffix
              .split(/\s+/)
              .map((token) => token.trim())
              .filter(Boolean);
            const colonToken = suffixTokens.find((token) => token.includes(':') && !token.includes('/'));
            if (colonToken) {
              const etaParts = colonToken
                .split(':')
                .map((segment) => segment.trim())
                .filter(Boolean);
              if (etaParts.length > 0) {
                etaValue = etaParts[etaParts.length - 1];
              } else {
                etaValue = colonToken;
              }
            }
          }
        }
      }

      if (etaValue) {
        session.eta = etaValue;
        payload.eta = etaValue;
      }

      payload.message = payload.message ?? line;

      const previousPhase = session.phase;
      let nextPhase: TransferProgress['phase'] | undefined;

      if (session.type === 'send') {
        if (HASHING_REGEX.test(line)) {
          nextPhase = 'hashing';
        } else if (WAITING_PROMPT_PATTERNS.some((pattern) => pattern.test(line))) {
          nextPhase = 'waiting';
        } else if (WAITING_REGEX.test(line) && WAITING_CONTEXT_REGEX.test(line)) {
          nextPhase = 'waiting';
        }
      }

      if (!nextPhase && TRANSFER_PROGRESS_REGEX.test(line)) {
        nextPhase = session.type === 'send' ? 'sending' : 'receiving';
      }

      if (!nextPhase) {
        if (/connect|establish/i.test(line)) {
          nextPhase = 'connecting';
        } else if (/sending/i.test(line) && session.type === 'send') {
          nextPhase = 'sending';
        } else if (/receiving/i.test(line) && session.type === 'receive') {
          nextPhase = 'receiving';
        } else if (/done|complete/i.test(line)) {
          nextPhase = 'done';
        } else if (/error|failed|timeout/i.test(line)) {
          nextPhase = 'failed';
        }
      }

      if (!nextPhase) {
        if (previousPhase && !['done', 'failed', 'canceled'].includes(previousPhase)) {
          nextPhase = previousPhase;
        } else {
          nextPhase = session.type === 'send' ? 'sending' : 'receiving';
        }
      }

      if (nextPhase === 'sending' || nextPhase === 'receiving') {
        let matchedName: string | undefined;
        const fileMatch = line.match(FILE_REGEX);
        if (fileMatch) {
          matchedName = fileMatch[1] ?? '';
        }

        if (!matchedName) {
          const progressMatch = line.match(PROGRESS_FILENAME_REGEX);
          if (progressMatch) {
            matchedName = progressMatch[1];
          }
        }

        if (matchedName) {
          const normalizedName = matchedName.replace(/^['"]|['"]$/g, '').trim();
          if (normalizedName) {
            session.fileName = normalizedName;
            payload.fileName = normalizedName;
          }
        }
      }

      const phaseChanged = previousPhase !== nextPhase;

      if (nextPhase === 'done') {
        payload.percent = 100;
        session.percent = 100;
      }

      if (phaseChanged && payload.percent === undefined) {
        const defaultPercent = nextPhase && ['done'].includes(nextPhase) ? 100 : 0;
        payload.percent = defaultPercent;
        session.percent = defaultPercent;
      }

      payload.phase = nextPhase;
      session.phase = nextPhase;
      payload.message = line;

      if (payload.percent === undefined) {
        if (typeof session.percent === 'number') {
          payload.percent = session.percent;
        } else {
          payload.percent = payload.phase === 'done' ? 100 : 0;
          session.percent = payload.percent;
        }
      }

      if (!payload.speed && session.speed) {
        payload.speed = session.speed;
      }

      if (!payload.eta && session.eta) {
        payload.eta = session.eta;
      }

      if (!payload.targetAddress && session.targetAddress) {
        payload.targetAddress = session.targetAddress;
      }

      if (!payload.sizeTransferred && session.sizeTransferred) {
        payload.sizeTransferred = session.sizeTransferred;
      }

      if (!payload.sizeTotal && session.sizeTotal) {
        payload.sizeTotal = session.sizeTotal;
      }

      if (payload.bytesTransferred === undefined && session.bytesTransferred !== undefined) {
        payload.bytesTransferred = session.bytesTransferred;
      }

      if (payload.bytesTotal === undefined && session.bytesTotal !== undefined) {
        payload.bytesTotal = session.bytesTotal;
      }

      this.emitProgress(payload);
    }

    return remainder;
  }

  private logStream(session: RunnerSession, stream: 'stdout' | 'stderr', message: string) {
    const prefix = `[croc ${session.type} ${session.id} ${stream}]`;
    if (stream === 'stderr') {
      console.error(prefix, message);
    } else {
      console.info(prefix, message);
    }
  }

  private emitProgress(payload: TransferProgress) {
    if (!this.window.isDestroyed()) {
      this.window.webContents.send('transfer:progress', payload);
    }
    this.emit('progress', payload);
  }

  private emitDone(payload: TransferDonePayload) {
    if (!this.window.isDestroyed()) {
      this.window.webContents.send('transfer:done', payload);
    }
    this.emit('done', payload);
  }
}
