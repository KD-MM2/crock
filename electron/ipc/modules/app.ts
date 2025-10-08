import { app, clipboard, dialog, ipcMain, shell } from 'electron';
import fs from 'node:fs';
import type { AppIpcContext } from '../context';

export function registerAppHandlers(_context: AppIpcContext) {
  void _context;
  ipcMain.handle('app:selectFiles', async (_event, options?: { allowFolders?: boolean; multiple?: boolean }) => {
    const properties: Array<'openFile' | 'openDirectory' | 'multiSelections'> = ['openFile'];
    if (options?.allowFolders) {
      properties.push('openDirectory');
    }
    if (options?.multiple) {
      properties.push('multiSelections');
    }

    const result = await dialog.showOpenDialog({
      properties,
      defaultPath: app.getPath('downloads')
    });
    if (result.canceled) return [];
    return result.filePaths;
  });

  ipcMain.handle('app:selectFolder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      defaultPath: app.getPath('downloads')
    });
    if (result.canceled) return null;
    return result.filePaths[0] ?? null;
  });

  ipcMain.handle('app:clipboardRead', async () => clipboard.readText());

  ipcMain.handle('app:clipboardWrite', async (_event, text: string) => {
    clipboard.writeText(text ?? '');
  });

  ipcMain.handle('app:openPath', async (_event, targetPath: string) => {
    if (!targetPath) return;
    const stat = await fs.promises.stat(targetPath).catch(() => null);
    if (!stat) return;
    if (stat.isFile()) {
      shell.showItemInFolder(targetPath);
    } else {
      await shell.openPath(targetPath);
    }
  });
}
