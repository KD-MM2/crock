## 1. Main Process Scaffolding

- [x] 1.1 Create BrowserWindow with security defaults (contextIsolation, sandbox, no nodeIntegration)
- [x] 1.2 Implement single-instance lock with `app.requestSingleInstanceLock()`
- [x] 1.3 Add external link handling via `shell.openExternal`
- [x] 1.4 Configure window lifecycle (close behavior, platform conventions)
- [x] 1.5 Set up `croc://` protocol registration via `app.setAsDefaultProtocolClient`

## 2. Preload Bridge

- [x] 2.1 Create preload script with `contextBridge.exposeInMainWorld`
- [x] 2.2 Expose namespaced API: app, croc, settings, history methods
- [x] 2.3 Add event bus (`events.on`) with unsubscribe pattern
- [x] 2.4 Declare TypeScript API surface in `electron/preload/api.d.ts`

## 3. IPC Handler Registry

- [x] 3.1 Create `AppIpcContext` type carrying service references
- [x] 3.2 Implement `setupIpcHandlers` aggregating all domain modules
- [x] 3.3 Create app IPC module (window controls, version queries)
- [x] 3.4 Create croc IPC module (send, receive, stop, binary management)
- [x] 3.5 Create settings IPC module (get, set, validate, connection status)
- [x] 3.6 Create history IPC module (list, clear, export)

## 4. Zustand Stores

- [x] 4.1 Implement UI store (dialogs, theme, active tab, deep link state)
- [x] 4.2 Implement transfer store (session map, progress updates, log tails)
- [x] 4.3 Implement settings store (load, draft, save, validate, relay status)
- [x] 4.4 Implement history store (records, filters, select, clear, export)

## 5. TypeScript Types

- [x] 5.1 Define shared IPC types (`src/types/ipc.ts`)
- [x] 5.2 Define settings types (`src/types/settings.ts`, `electron/types/settings.ts`)
- [x] 5.3 Define history types (`src/types/history.ts`, `electron/types/history.ts`)
- [x] 5.4 Define transfer types (`src/types/transfer.ts`, `electron/types/croc.ts`)
- [x] 5.5 Define UI/theme types (`src/types/ui.ts`, `src/types/theme.ts`)

## 6. App Shell Component

- [x] 6.1 Create root `App.tsx` with lazy-loaded panels
- [x] 6.2 Wrap app in ThemeProvider
- [x] 6.3 Add Suspense with loading fallback
- [x] 6.4 Add Toast notifications (sonner)
- [x] 6.5 Create AppShellTopbar with action buttons

## 7. Build Toolchain

- [x] 7.1 Configure Vite with `vite-plugin-electron` for main/preload/renderer
- [x] 7.2 Set up `electron-builder.json5` for platform-specific packaging
- [x] 7.3 Configure dev scripts (`pnpm dev`) with hot-reload
- [x] 7.4 Configure production build scripts with type-checking
- [x] 7.5 Set up lint and format scripts

## 8. Window API Accessor

- [x] 8.1 Implement `getWindowApi()` with caching and error-throwing fallback
- [x] 8.2 Export static `api` reference as partial `WindowApi` fallback
