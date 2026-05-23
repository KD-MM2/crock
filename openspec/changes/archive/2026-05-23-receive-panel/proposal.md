## Why

Receiving files via croc CLI requires remembering the exact `croc <code>` command. Crock UI must provide a simple, paste-friendly receive interface that accepts a code phrase, validates it, exposes session overrides, and kicks off the receive — all without touching the terminal.

## What Changes

- **Receive panel UI** with code phrase input, paste-from-clipboard button, and Enter-to-submit
- **Session overrides** for relay host, relay password, auto-confirm, overwrite, and auto-paste toggle
- **Deep link integration** — auto-fills code and relay from `croc://receive?code=...` URLs via pending deep link state
- **CLI command preview** showing the equivalent `croc` receive command
- **Receive initiation** via IPC to main process, creating a transfer session in the store

## Capabilities

### New Capabilities
- `receive-form`: Code phrase input with Enter-to-submit, session overrides, and auto-paste toggle
- `deep-link-receive`: Auto-fill code, relay, and password from `croc://receive` deep links

### Modified Capabilities
<!-- No existing specs to modify. -->

## Impact

- `src/components/transfer/receive-panel/index.tsx` — main receive panel component
- `src/components/transfer/receive-panel/utils.ts` — form initialization, relay resolution, CLI arg quoting
- `src/lib/croc.ts` — default relay host and curve constants, relay host normalization
- `electron/ipc/modules/croc.ts` — `croc:start-receive` IPC handler
- `src/stores/ui.ts` — `pendingDeepLink` state and `clearPendingDeepLink` action
