import type { BrowserWindow } from 'electron';
import type { ConnectionDiagnostics } from '../services/ConnectionDiagnostics';
import type { CrocBinaryManager } from '../services/CrocBinaryManager';
import type { CrocCommandBuilder } from '../services/CrocCommandBuilder';
import type { CrocProcessRunner } from '../services/CrocProcessRunner';
import type { HistoryStore } from '../services/HistoryStore';
import type { RelayStatusMonitor } from '../services/RelayStatusMonitor';
import type { SettingsStore } from '../services/SettingsStore';

export interface AppIpcContext {
  window: BrowserWindow;
  binaryPath: string;
  binaryManager: CrocBinaryManager;
  commandBuilder: CrocCommandBuilder;
  processRunner: CrocProcessRunner;
  historyStore: HistoryStore;
  settingsStore: SettingsStore;
  relayMonitor: RelayStatusMonitor;
  diagnostics: ConnectionDiagnostics;
}
