## Context

Crock UI is an Electron + React desktop app that wraps the croc CLI. The renderer (React) must never have direct access to Node.js APIs. Instead, all main-process operations flow through a context-isolated preload bridge. The main process manages the BrowserWindow lifecycle, spawns croc processes, persists settings/history via electron-store, and streams events (relay status, transfer progress) to the renderer.

## Goals / Non-Goals

**Goals:**
- Hardened BrowserWindow with contextIsolation, sandbox, no nodeIntegration
- Single-instance lock so only one Crock UI window runs at a time
- Typed IPC surface via a preload script that exposes `window.api`
- Domain-grouped IPC handler modules that wrap services
- Zustand stores that synchronize with main-process state via IPC
- Vite + electron-builder toolchain with hot-reload for all three layers
- Safe browser mock so the renderer can render without Electron

**Non-Goals:**
- Multiple windows or multi-monitor support
- Custom Node.js module loading in the renderer
- Framework-agnostic state management (Zustand is the standard)

## Decisions

1. **Context isolation + preload bridge over nodeIntegration** — Electron security best practices. The preload script selectively exposes only needed APIs via `contextBridge.exposeInMainWorld`, preventing the renderer from accessing Node.js directly.

2. **Zustand over Redux or Context** — Minimal boilerplate, built-in selectors, no provider wrapping needed. Each domain (ui, transfer, settings, history) has its own store for separation of concerns.

3. **Domain-grouped IPC modules over flat handlers** — `electron/ipc/modules/` groups handlers by domain (app, croc, history, settings). Each module registers its own `ipcMain.handle` / `ipcMain.on` calls. An `AppIpcContext` object carries service references to avoid singletons.

4. **`vite-plugin-electron` over manual electron-rebuild** — Provides seamless hot-reload for main, preload, and renderer during development. Production builds emit to `dist/` and `dist-electron/`.

5. **`electron-store` over raw JSON files** — Provides atomic reads/writes, schema validation, and platform-appropriate storage paths automatically.

6. **Mock `window.api` via `getWindowApi()` over conditional imports** — A single accessor function detects whether `window.api` exists and falls back to no-op stubs. This keeps the renderer previewable in plain Vite without Electron.

## Risks / Trade-offs

- **Single-instance lock may miss edge cases on Linux** — Some Linux DEs don't enforce the lock correctly. Mitigation: `app.requestSingleInstanceLock()` is the standard approach; the second-instance event handles the rest.
- **`electron-store` is synchronous for reads** — Large history datasets could block the main process. Mitigation: history is trimmed to a configurable tail length (default 200 lines per session).
- **Preload bridge is a maintenance surface** — Every new main-process feature needs a corresponding preload method. Mitigation: the typed `api.d.ts` declaration file serves as the contract.
