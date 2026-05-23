## Why

Crock UI users need to configure defaults for transfers (download directory, auto-copy, auto-reset), relay/proxy settings, security curves, theme, language, and binary version preferences. A settings dialog with tabbed navigation and Zod validation provides a centralized, validated configuration surface.

## What Changes

- **Settings dialog** with tabs: General, Advanced, Network, Security, About
- **Zustand settings store** with load/save/draft/reset/validate lifecycle
- **electron-store** persistence in the main process, exposed via IPC
- **Connection diagnostics** for relay, proxy, and croc binary status
- **Zod validation** of settings payload before persistence
- **Relay status streaming** via `relay:status` events updating connection state in real time
- **Capability-aware defaults** applied at bootstrap

## Capabilities

### New Capabilities
- `settings-dialog`: Multi-tab settings UI with draft/save/reset lifecycle
- `settings-persistence`: electron-store backed settings with Zod validation and IPC transport
- `connection-diagnostics`: Relay ping, proxy check, and croc binary status reporting

### Modified Capabilities
<!-- No existing specs to modify. -->

## Impact

- `src/components/settings/settings-dialog.tsx` — dialog shell with tab navigation
- `src/components/settings/{general,advanced,network,security,about}-tab.tsx` — per-tab content
- `src/stores/settings.ts` — Zustand store with load/save/draft/patch
- `electron/services/SettingsStore.ts` — electron-store wrapper with validation
- `electron/services/ConnectionDiagnostics.ts` — relay/proxy/croc status checks
- `electron/services/RelayStatusMonitor.ts` — periodic relay ping + event emission
