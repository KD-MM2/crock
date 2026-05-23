## Why

Users sharing croc codes want a one-click experience: clicking a `croc://receive?code=...` link should open Crock UI and auto-fill the receive form. Deep link support makes the app a true protocol handler for the `croc://` scheme.

## What Changes

- **DeepLinkManager** parses `croc://` URLs, validates parameters, and forwards structured data to the renderer
- **Protocol registration** via `app.setAsDefaultProtocolClient('croc')` on all platforms
- **Second-instance handling** on Windows/Linux passing command-line URLs to the existing instance
- **`open-url` event** on macOS for dock-click and cold-launch URLs
- **Renderer integration** via `deep-link:receive` IPC event flowing through the UI store to the receive panel

## Capabilities

### New Capabilities
- `deep-link-parsing`: Parse and validate `croc://` URLs into structured `DeepLinkData`
- `deep-link-routing`: Route deep link data from main process to receive panel via IPC and UI store

### Modified Capabilities
<!-- No existing specs to modify. -->

## Impact

- `electron/services/DeepLinkManager.ts` — URL parsing, validation, window targeting
- `electron/main.ts` — protocol registration, second-instance, open-url, command-line URL detection
- `src/components/transfer/transfer-view.tsx` — listen for `deep-link:receive` events
- `src/stores/ui.ts` — `pendingDeepLink` state
- `src/components/transfer/receive-panel/index.tsx` — consume and clear pending deep link
