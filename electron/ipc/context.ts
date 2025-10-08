import type { BrowserWindow } from 'electron';
import type { CrocBinaryManager } from '../services/CrocBinaryManager';
import type { CrocCommandBuilder } from '../services/CrocCommandBuilder';
import type { CrocProcessRunner } from '../services/CrocProcessRunner';
import type { HistoryStore } from '../services/HistoryStore';
import type { SettingsStore } from '../services/SettingsStore';
import type { CapabilityDetector } from '../services/CapabilityDetector';
import type { RelayStatusMonitor } from '../services/RelayStatusMonitor';
import type { ConnectionDiagnostics } from '../services/ConnectionDiagnostics';

export interface AppIpcContext {
  window: BrowserWindow;
  binaryPath: string;
  binaryManager: CrocBinaryManager;
  commandBuilder: CrocCommandBuilder;
  processRunner: CrocProcessRunner;
  historyStore: HistoryStore;
  settingsStore: SettingsStore;
  capabilityDetector: CapabilityDetector;
  relayMonitor: RelayStatusMonitor;
  diagnostics: ConnectionDiagnostics;
}
