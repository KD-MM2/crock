## Why

Crock UI needs a secure, type-safe Electron desktop shell to wrap the croc CLI. The architecture must isolate the renderer from Node.js via context isolation, provide a structured IPC bridge for all main-process operations, and establish the state management and routing foundation that all feature panels depend on.

## What Changes

- **Electron main process** with hardened BrowserWindow defaults (contextIsolation, sandbox, no nodeIntegration), single-instance lock, and external link handling
- **Preload bridge** exposing a typed, whitelisted `window.api` to the renderer via `contextBridge.exposeInMainWorld`
- **IPC handler registry** (`electron/ipc/`) organizing handlers by domain: app, croc, history, settings
- **Zustand stores** for UI state, transfer sessions, settings (with draft/save/reset), and history (with filtering)
- **Vite + electron-builder toolchain** with `vite-plugin-electron` for dev hot-reload and production bundling
- **Browser mock API** (`getWindowApi()`) that provides safe stubs when running outside Electron, keeping the renderer functional for design previews
- **App shell** (`App.tsx`) with lazy-loaded panels (TransferView, HistoryDialog, SettingsDialog), theme provider, and toast notifications

## Capabilities

### New Capabilities
- `app-shell`: BrowserWindow lifecycle, single-instance lock, external link policy, window show/hide behavior
- `ipc-bridge`: Typed preload API surface, context-isolated event bus, domain-grouped IPC handler modules
- `state-management`: Zustand stores for UI, transfer, settings, and history with typed actions and selectors
- `build-toolchain`: Vite + electron-builder pipeline with hot-reload, type-checking, and platform-specific packaging
- `browser-mock`: Safe `window.api` stub for non-Electron renderer contexts

### Modified Capabilities
<!-- No existing specs to modify — this is the baseline. -->

## Impact

- `electron/main.ts` — BrowserWindow creation, app lifecycle, service bootstrap
- `electron/preload.ts` — contextBridge API surface
- `electron/ipc/` — handler modules (app, croc, history, settings)
- `src/App.tsx` — root component with lazy loading, theme, toasts
- `src/stores/` — ui, transfer, settings, history Zustand stores
- `src/lib/window-api.ts` — typed API accessor with browser mock fallback
- `src/types/` — shared TypeScript interfaces (ipc, settings, history, transfer, ui, theme)
- `package.json` — scripts, dependencies, electron-builder metadata
