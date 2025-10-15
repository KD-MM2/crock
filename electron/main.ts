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
import { DeepLinkManager } from './services/DeepLinkManager';
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

let deepLinkManager: DeepLinkManager | null = null;

const singleInstanceLock = app.requestSingleInstanceLock();
if (!singleInstanceLock) {
  app.quit();
}

app.on('second-instance', (_event, commandLine) => {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();

  // Handle deep link from second instance (Windows/Linux)
  if (deepLinkManager && process.platform === 'win32') {
    // On Windows, the deep link URL is passed as a command line argument
    const url = commandLine.find((arg) => arg.startsWith('croc://'));
    if (url) {
      deepLinkManager.handleUrl(url);
    }
  }
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
    icon: path.join(process.env.VITE_PUBLIC as string, 'crock.svg'),
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
  // Register protocol handler before app is ready
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient('croc', process.execPath, [path.resolve(process.argv[1])]);
    }
  } else {
    app.setAsDefaultProtocolClient('croc');
  }

  await app.whenReady();

  const window = await createMainWindow();
  const binaryManager = new CrocBinaryManager();
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
  const initialSettings = settingsStore.get();
  const historyStore = new HistoryStore({
    maxLogLines: initialSettings.advanced?.logTailLines,
    retentionDays: initialSettings.advanced?.historyRetentionDays
  });

  let binaryPath: string;
  const preferredVersion = initialSettings.binary?.crocVersion;
  try {
    binaryPath = await binaryManager.ensure({
      version: preferredVersion && preferredVersion.startsWith('v') ? preferredVersion : undefined
    });
  } catch (error) {
    console.warn('[bootstrap] failed to ensure preferred croc version, falling back', error);
    binaryPath = await binaryManager.ensure();
  }

  let detectedVersion = 'not-installed';
  try {
    detectedVersion = await binaryManager.getVersion(binaryPath);
  } catch (error) {
    console.warn('[bootstrap] failed to detect croc version', error);
  }

  settingsStore.set({
    binary: {
      crocVersion: detectedVersion,
      crocPath: binaryPath
    }
  });

  const capabilities = getCapabilities();
  const commandBuilder = new CrocCommandBuilder(capabilities, process.platform);
  const processRunner = new CrocProcessRunner(binaryPath, window, commandBuilder);
  const relayMonitor = new RelayStatusMonitor(window, settingsStore);
  const diagnostics = new ConnectionDiagnostics(binaryManager, settingsStore);

  settingsStore.applyCapabilities(capabilities);

  // Initialize deep link manager
  deepLinkManager = new DeepLinkManager(settingsStore);
  deepLinkManager.setWindow(window);

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

  setupIpcHandlers(appContext);
  await loadMainWindow(window);
  relayMonitor.start();

  // Handle deep links on macOS
  app.on('open-url', (event, url) => {
    event.preventDefault();
    if (deepLinkManager) {
      deepLinkManager.handleUrl(url);
    }
  });

  // Handle deep links on Windows/Linux from command line
  if (process.platform === 'win32') {
    // Check if app was launched with a deep link URL
    const url = process.argv.find((arg) => arg.startsWith('croc://'));
    if (url && deepLinkManager) {
      // Delay handling to ensure window is fully loaded
      setTimeout(() => {
        if (deepLinkManager) {
          deepLinkManager.handleUrl(url);
        }
      }, 1000);
    }
  }

  window.on('close', () => {
    relayMonitor.stop();
  });

  app.on('before-quit', () => {
    processRunner.stopAll();
  });
}

void bootstrap();
