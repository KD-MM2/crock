import { dialog, ipcMain } from 'electron';
import { writeFile } from 'node:fs/promises';
import type { HistoryRecord } from '../../types/history';
import type { AppIpcContext } from '../context';

function maskRecord(record: HistoryRecord): HistoryRecord {
  if (!record.code) return record;
  return { ...record, code: '***' };
}

export function registerHistoryHandlers(context: AppIpcContext) {
  ipcMain.handle('history:list', async () => context.historyStore.list());

  ipcMain.handle('history:detail', async (_event, id: string) => context.historyStore.get(id) ?? null);

  ipcMain.handle('history:clear', async () => {
    context.historyStore.clear();
  });

  ipcMain.handle('history:export', async () => {
    const records = context.historyStore.list().map(maskRecord);
    return records;
  });

  ipcMain.handle('history:saveExport', async () => {
    const records = context.historyStore.list().map(maskRecord);
    const json = JSON.stringify(records, null, 2);
    const result = await dialog.showSaveDialog({
      defaultPath: `crock-history-${Date.now()}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });
    if (result.canceled || !result.filePath) return null;
    await writeFile(result.filePath, json, 'utf-8');
    return result.filePath;
  });
}
