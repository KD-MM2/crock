## Why

Users need real-time visibility into croc transfer progress — percentage, speed, ETA, phase, and raw log output. The CLI streams this to stdout, but Crock UI must parse that stream, normalize it, and push structured updates to the renderer for display.

## What Changes

- **CrocProcessRunner** spawns croc as a child process, parses stdout/stderr with regex patterns, and emits structured progress/done events
- **Progress normalization** converts raw croc output into typed `TransferProgress` and `TransferDonePayload` objects
- **Transfer store** receives progress events via IPC, updates session state (phase, percent, speed, ETA, file info)
- **TransferProgressPanel** renders active transfers with phase-colored status, progress bar, file details, and a scrollable log tail
- **Stop/cancel** support via IPC, sending SIGTERM to the child process
- **History sync** — completed transfers are persisted to the history store

## Capabilities

### New Capabilities
- `progress-parsing`: Regex-based parsing of croc stdout into structured progress data (percent, speed, ETA, file names, target address)
- `transfer-ui`: Transfer progress panel with real-time status, progress bar, file list, and log tail viewer

### Modified Capabilities
<!-- No existing specs to modify. -->

## Impact

- `electron/services/CrocProcessRunner.ts` — child process management, stdout parsing, event emission
- `src/components/transfer/transfer-progress/index.tsx` — progress panel UI
- `src/components/transfer/transfer-progress/const.tsx` — phase colors, icons, label keys
- `src/components/transfer/transfer-progress/utils.ts` — progress/done normalization
- `src/stores/transfer.ts` — session state management, progress updates, log append
- `electron/ipc/modules/croc.ts` — `croc:stop` handler
