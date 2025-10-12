import { app, BrowserWindow, shell } from 'electron';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { CrocBinaryManager } from './services/CrocBinaryManager';
import { SettingsStore } from './services/SettingsStore';
import { HistoryStore } from './services/HistoryStore';
import { CrocCommandBuilder } from './services/CrocCommandBuilder';
import { getCapabilities } from './services/CrocCapabilities';
import { CrocProcessRunner } from './services/CrocProcessRunner';
import { RelayStatusMonitor } from './services/RelayStatusMonitor';
import { ConnectionDiagnostics } from './services/ConnectionDiagnostics';
import { setupIpcHandlers } from './ipc/index.js';
import type { AppIpcContext } from './ipc/context.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.APP_ROOT = path.join(__dirname, '..');

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron');
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist');

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST;

let mainWindow: BrowserWindow | null = null;
let appContext: AppIpcContext | null = null;

const singleInstanceLock = app.requestSingleInstanceLock();
if (!singleInstanceLock) {
  app.quit();
}

app.on('second-instance', () => {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
});

app.on('web-contents-created', (_event, contents) => {
  contents.on('will-navigate', (event, url) => {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      if (url !== contents.getURL()) {
        event.preventDefault();
      }
    }
  });

  contents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0 && appContext) {
    void (async () => {
      const window = await createMainWindow();
      appContext.window = window;
      await loadMainWindow(window);
    })();
  }
});

async function createMainWindow(): Promise<BrowserWindow> {
  if (mainWindow) return mainWindow;

  const window = new BrowserWindow({
    title: 'Crock',
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    frame: process.platform === 'linux' ? true : false,
    icon: path.join(process.env.VITE_PUBLIC as string, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      spellcheck: false,
      devTools: true
    }
  });

  window.once('ready-to-show', () => window.show());
  window.on('closed', () => {
    mainWindow = null;
  });

  mainWindow = window;
  return window;
}

async function loadMainWindow(window: BrowserWindow) {
  if (VITE_DEV_SERVER_URL) {
    await window.loadURL(VITE_DEV_SERVER_URL);
  } else {
    await window.loadFile(path.join(RENDERER_DIST, 'index.html'));
  }
}

async function bootstrap() {
  await app.whenReady();

  const window = await createMainWindow();
  // await loadMainWindow(window);
  console.log('main window created');
  const binaryManager = new CrocBinaryManager();
  console.log('binary manager initialized');
  const settingsStore = new SettingsStore({
    general: {
      downloadDir: app.getPath('downloads'),
      autoOpenOnDone: true,
      autoCopyCodeOnSend: true,
      autoResetOnSendSuccess: false,
      autoResetOnSendFailure: false,
      language: 'vi',
      theme: 'system'
    }
  });
  console.log('settings store initialized');
  const initialSettings = settingsStore.get();
  console.log('initial settings loaded', initialSettings);
  const historyStore = new HistoryStore({
    maxLogLines: initialSettings.advanced?.logTailLines,
    retentionDays: initialSettings.advanced?.historyRetentionDays
  });
  console.log('history store initialized');

  let binaryPath: string;
  const preferredVersion = initialSettings.binary?.crocVersion;
  console.log('ensuring croc binary, preferred version:', preferredVersion);
  try {
    binaryPath = await binaryManager.ensure({
      version: preferredVersion && preferredVersion.startsWith('v') ? preferredVersion : undefined
    });
    console.log('croc binary ensured at path:', binaryPath);
  } catch (error) {
    console.warn('[bootstrap] failed to ensure preferred croc version, falling back', error);
    binaryPath = await binaryManager.ensure();
    console.log('croc binary ensured at path:', binaryPath);
  }

  let detectedVersion = 'not-installed';
  try {
    detectedVersion = await binaryManager.getVersion(binaryPath);
    console.log('detected croc version:', detectedVersion);
  } catch (error) {
    console.warn('[bootstrap] failed to detect croc version', error);
    console.log('falling back to default croc version');
  }
  console.log('updating settings store with binary info');

  settingsStore.set({
    binary: {
      crocVersion: detectedVersion,
      crocPath: binaryPath
    }
  });
  console.log('settings store updated with binary info');

  console.log('loading hard-coded croc capabilities');
  const capabilities = getCapabilities();
  console.log('croc capabilities loaded:', capabilities);
  const commandBuilder = new CrocCommandBuilder(capabilities, process.platform);
  console.log('command builder initialized with capabilities');
  const processRunner = new CrocProcessRunner(binaryPath, window, commandBuilder);
  console.log('process runner initialized');
  const relayMonitor = new RelayStatusMonitor(window, settingsStore);
  console.log('relay monitor initialized');
  const diagnostics = new ConnectionDiagnostics(binaryManager, settingsStore);
  console.log('connection diagnostics initialized');

  settingsStore.applyCapabilities(capabilities);
  console.log('settings store updated with capabilities');

  appContext = {
    window,
    binaryPath,
    binaryManager,
    settingsStore,
    historyStore,
    commandBuilder,
    processRunner,
    relayMonitor,
    diagnostics
  };
  console.log('app context initialized');

  setupIpcHandlers(appContext);
  console.log('ipc handlers set up');
  await loadMainWindow(window);
  console.log('main window loaded');
  relayMonitor.start();
  console.log('relay monitor started');

  window.on('close', () => {
    relayMonitor.stop();
  });

  app.on('before-quit', () => {
    processRunner.stopAll();
  });
}

void bootstrap();
