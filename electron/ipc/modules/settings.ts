import { ipcMain } from 'electron';
import type { Settings } from '../../types/settings';
import type { AppIpcContext } from '../context';

function applyHistoryConfig(context: AppIpcContext, settings: Settings) {
  const maxLogLines = settings.advanced?.logTailLines;
  const retentionDays = settings.advanced?.historyRetentionDays;
  context.historyStore.configure({ maxLogLines, retentionDays });
}

export function registerSettingsHandlers(context: AppIpcContext) {
  ipcMain.handle('settings:get', async () => context.settingsStore.get());

  ipcMain.handle('settings:set', async (_event, patch: Partial<Settings>) => {
    const next = context.settingsStore.set(patch);
    applyHistoryConfig(context, next);
    context.relayMonitor.start();
    return next;
  });

  ipcMain.handle('settings:validate', async (_event, payload: Settings) => context.settingsStore.validate(payload));

  ipcMain.handle('settings:connectionStatus', async () => context.diagnostics.run());
}
