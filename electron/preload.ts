import { contextBridge, ipcRenderer } from 'electron';
import type { Settings } from './types/settings';
import type { EventPayloadMap, IpcEventName, ReceiveRequest, SelectFilesOptions, SendRequest, WindowApi } from './preload/api';

const api: WindowApi = {
  app: {
    selectFiles: (options?: SelectFilesOptions) => ipcRenderer.invoke('app:selectFiles', options),
    selectFolder: () => ipcRenderer.invoke('app:selectFolder'),
    clipboardRead: () => ipcRenderer.invoke('app:clipboardRead'),
    clipboardWrite: (text: string) => ipcRenderer.invoke('app:clipboardWrite', text),
    openPath: (target: string) => ipcRenderer.invoke('app:openPath', target),
    getPathStats: (paths: string[]) => ipcRenderer.invoke('app:getPathStats', paths)
  },
  window: {
    minimize: () => ipcRenderer.invoke('app:window:minimize'),
    toggleMaximize: () => ipcRenderer.invoke('app:window:toggleMaximize'),
    close: () => ipcRenderer.invoke('app:window:close')
  },
  croc: {
    getVersion: () => ipcRenderer.invoke('croc:getVersion'),
    listVersions: () => ipcRenderer.invoke('croc:listVersions'),
    installVersion: (version: string) => ipcRenderer.invoke('croc:installVersion', version),
    startSend: (options: SendRequest) => ipcRenderer.invoke('croc:startSend', options),
    startReceive: (options: ReceiveRequest) => ipcRenderer.invoke('croc:startReceive', options),
    stop: (id: string) => ipcRenderer.invoke('croc:stop', id)
  },
  history: {
    list: () => ipcRenderer.invoke('history:list'),
    detail: (id: string) => ipcRenderer.invoke('history:detail', id),
    clear: () => ipcRenderer.invoke('history:clear'),
    export: () => ipcRenderer.invoke('history:export'),
    saveExport: () => ipcRenderer.invoke('history:saveExport')
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (patch: Partial<Settings>) => ipcRenderer.invoke('settings:set', patch),
    validate: (settings) => ipcRenderer.invoke('settings:validate', settings),
    connectionStatus: () => ipcRenderer.invoke('settings:connectionStatus')
  },
  events: {
    on: <T extends IpcEventName>(event: T, handler: (payload: EventPayloadMap[T]) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, payload: EventPayloadMap[T]) => handler(payload);
      ipcRenderer.on(event, listener);
      return () => {
        ipcRenderer.removeListener(event, listener);
      };
    }
  }
};

contextBridge.exposeInMainWorld('api', api);
