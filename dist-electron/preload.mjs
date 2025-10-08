"use strict";
const electron = require("electron");
const api = {
  app: {
    selectFiles: (options) => electron.ipcRenderer.invoke("app:selectFiles", options),
    selectFolder: () => electron.ipcRenderer.invoke("app:selectFolder"),
    clipboardRead: () => electron.ipcRenderer.invoke("app:clipboardRead"),
    clipboardWrite: (text) => electron.ipcRenderer.invoke("app:clipboardWrite", text),
    openPath: (target) => electron.ipcRenderer.invoke("app:openPath", target)
  },
  croc: {
    getVersion: () => electron.ipcRenderer.invoke("croc:getVersion"),
    startSend: (options) => electron.ipcRenderer.invoke("croc:startSend", options),
    startReceive: (options) => electron.ipcRenderer.invoke("croc:startReceive", options),
    stop: (id) => electron.ipcRenderer.invoke("croc:stop", id)
  },
  history: {
    list: () => electron.ipcRenderer.invoke("history:list"),
    detail: (id) => electron.ipcRenderer.invoke("history:detail", id),
    clear: () => electron.ipcRenderer.invoke("history:clear"),
    export: () => electron.ipcRenderer.invoke("history:export"),
    saveExport: () => electron.ipcRenderer.invoke("history:saveExport")
  },
  settings: {
    get: () => electron.ipcRenderer.invoke("settings:get"),
    set: (patch) => electron.ipcRenderer.invoke("settings:set", patch),
    validate: (settings) => electron.ipcRenderer.invoke("settings:validate", settings),
    connectionStatus: () => electron.ipcRenderer.invoke("settings:connectionStatus")
  },
  events: {
    on: (event, handler) => {
      const listener = (_event, payload) => handler(payload);
      electron.ipcRenderer.on(event, listener);
      return () => {
        electron.ipcRenderer.removeListener(event, listener);
      };
    }
  }
};
electron.contextBridge.exposeInMainWorld("api", api);
