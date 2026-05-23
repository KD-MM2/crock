## Why

Users need to review past transfer sessions — what was sent/received, to whom, when, and with what outcome. A searchable, filterable history viewer with detail inspection and re-send capability makes the app auditable and enables quick re-transfer of previous items.

## What Changes

- **History dialog** with filterable table (type, status, keyword search)
- **HistoryStore** (electron-store) persisting transfer records with configurable retention
- **Detail view** showing full metadata, file list, options, and log tail
- **Re-send** via custom DOM event dispatched to the send panel
- **Export** of history records
- **Clear all** with confirmation dialog

## Capabilities

### New Capabilities
- `history-viewer`: Filterable history table with detail inspection, re-send, and export
- `history-persistence`: electron-store backed history with retention policy and IPC transport

### Modified Capabilities
<!-- No existing specs to modify. -->

## Impact

- `src/components/history/history-dialog.tsx` — dialog with filter controls and table
- `src/components/history/history-detail.tsx` — detail panel for selected record
- `src/components/history/const.ts` — label keys for types and statuses
- `src/stores/history.ts` — Zustand store with filtering, select, clear, export
- `electron/services/HistoryStore.ts` — electron-store persistence with TTL
- `electron/ipc/modules/history.ts` — IPC handlers for list/clear/export
