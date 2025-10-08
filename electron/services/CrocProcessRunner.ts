import { BrowserWindow } from 'electron';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { EventEmitter } from 'node:events';
import type { ReceiveOptions, SendOptions, TransferDonePayload, TransferProgress, TransferType } from '../types/croc';
import type { CrocCommandBuilder } from './CrocCommandBuilder';

const PROGRESS_REGEX = /(\d+)%\s*\|\s*([\w.\s/]+)\s*\|\s*([\w:]+)/i;
const CODE_REGEX = /(code|code-phrase|receive code)[^a-z0-9-]*([a-z0-9-]{6,})/i;
const FILE_REGEX = /sending\s+([^\s]+)\s+\(([^)]+)\)/i;

export interface RunnerSession {
  id: string;
  type: TransferType;
  process: ChildProcessWithoutNullStreams;
  startedAt: number;
  canceled?: boolean;
  code?: string;
  bytesTransferred?: number;
  fileName?: string;
}

export interface RunnerEnv {
  args: string[];
  env?: Record<string, string>;
}

export class CrocProcessRunner extends EventEmitter {
  private readonly sessions = new Map<string, RunnerSession>();

  constructor(private readonly binaryPath: string, private readonly window: BrowserWindow, private readonly commandBuilder: CrocCommandBuilder) {
    super();
  }

  runSend(id: string, options: SendOptions): ChildProcessWithoutNullStreams {
    const args = this.commandBuilder.buildSendArgs(options);
    return this.spawnProcess(id, 'send', args, {});
  }

  runReceive(id: string, options: ReceiveOptions): ChildProcessWithoutNullStreams {
    const { args, env } = this.commandBuilder.buildReceiveArgs(options);
    return this.spawnProcess(id, 'receive', args, env);
  }

  stop(id: string) {
    const session = this.sessions.get(id);
    if (!session) return;
    session.canceled = true;
    session.process.kill('SIGINT');
    const timeout = setTimeout(() => {
      if (!session.process.killed) {
        session.process.kill('SIGKILL');
      }
    }, 2000);
    timeout.unref();
  }

  stopAll() {
    for (const id of this.sessions.keys()) {
      this.stop(id);
    }
  }

  private spawnProcess(id: string, type: TransferType, args: string[], extraEnv?: Record<string, string>): ChildProcessWithoutNullStreams {
    const env = { ...process.env, ...extraEnv };
    const child = spawn(this.binaryPath, args, {
      env,
      stdio: 'pipe'
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

    child.stdout.on('data', (chunk) => {
      stdoutBuffer = this.consumeBuffer(session, stdoutBuffer + chunk.toString());
    });

    child.stderr.on('data', (chunk) => {
      stderrBuffer = this.consumeBuffer(session, stderrBuffer + chunk.toString());
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

  private consumeBuffer(session: RunnerSession, buffer: string): string {
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

      const payload: TransferProgress = {
        ...basePayload,
        raw: line
      };

      if (CODE_REGEX.test(line)) {
        const match = line.match(CODE_REGEX);
        if (match) {
          session.code = match[2];
          payload.code = match[2];
        }
      }

      const progressMatch = line.match(PROGRESS_REGEX);
      if (progressMatch) {
        payload.phase = session.type === 'send' ? 'sending' : 'receiving';
        payload.percent = Number.parseInt(progressMatch[1], 10);
        payload.speed = progressMatch[2].trim();
        payload.eta = progressMatch[3].trim();
      } else if (/connect|establish/i.test(line)) {
        payload.phase = 'connecting';
        payload.message = line;
      } else if (/sending/i.test(line) && session.type === 'send') {
        payload.phase = 'sending';
        payload.message = line;
        const fileMatch = line.match(FILE_REGEX);
        if (fileMatch) {
          session.fileName = fileMatch[1];
          payload.fileName = fileMatch[1];
        }
      } else if (/receiving/i.test(line) && session.type === 'receive') {
        payload.phase = 'receiving';
        payload.message = line;
      } else if (/done|complete/i.test(line)) {
        payload.phase = 'done';
        payload.message = line;
      } else if (/error|failed|timeout/i.test(line)) {
        payload.phase = 'failed';
        payload.message = line;
      } else {
        payload.phase = session.type === 'send' ? 'sending' : 'receiving';
        payload.message = line;
      }

      this.emitProgress(payload);
    }

    return remainder;
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
