## ADDED Requirements

### Requirement: Typed preload API surface
The preload script SHALL use `contextBridge.exposeInMainWorld` to expose a single `window.api` object with namespaced methods for app, croc, settings, and history operations. The API surface SHALL be declared in `electron/preload/api.d.ts`.

#### Scenario: Renderer calls IPC method
- **WHEN** the renderer calls `window.api.settings.get()`
- **THEN** the preload script invokes `ipcRenderer.invoke('settings:get')` and returns the result

### Requirement: Event bus for main-to-renderer streaming
The preload SHALL expose an `events.on` method that wraps `ipcRenderer.on` and returns an unsubscribe function. Events SHALL include `relay:status` and `deep-link:receive`.

#### Scenario: Relay status event received
- **WHEN** the main process emits a `relay:status` event
- **THEN** renderer listeners registered via `window.api.events.on('relay:status', callback)` receive the payload

### Requirement: Whitelist-only channel access
The preload SHALL only expose explicitly listed IPC channels. Any attempt to invoke or listen on unlisted channels SHALL have no effect.

#### Scenario: Unlisted channel invoked
- **WHEN** the renderer attempts `ipcRenderer.invoke('unlisted:channel')`
- **THEN** no handler is invoked and the call returns undefined

### Requirement: Domain-grouped IPC handler modules
Each IPC domain (app, croc, history, settings) SHALL have its own handler module in `electron/ipc/modules/`. Modules SHALL receive an `AppIpcContext` object containing service references.

#### Scenario: Handler module registration
- **WHEN** `setupIpcHandlers(context)` is called
- **THEN** all handler modules register their `ipcMain.handle` and `ipcMain.on` listeners
