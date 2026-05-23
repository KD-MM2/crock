## Context

Transfer history is persisted via electron-store and loaded into a Zustand store on dialog open. Client-side filtering by type, status, and keyword search avoids IPC round-trips for filtering. Records include full transfer metadata: code, relay, files, timestamps, outcome, and options.

## Goals / Non-Goals

**Goals:**
- Filterable table with type/status dropdowns and keyword search
- Detail inspection showing files, options, log tail
- Re-send via custom event to the send panel
- Export history as JSON
- Clear all with confirmation
- Configurable retention (auto-delete old records)

**Non-Goals:**
- Server-side sync or cloud backup
- Full-text search across log tails

## Decisions

1. **Client-side filtering over server queries** — History records are loaded once into the Zustand store. Filtering is done in the `selectFilteredHistory` selector. This keeps the IPC surface simple and filtering fast.

2. **Retention via HistoryStore TTL** — Old records are pruned on load based on `retentionDays` setting. Default keeps recent history manageable.

3. **Re-send via CustomEvent over store action** — Decouples the history dialog from the send panel. The send panel listens for `history:resend` events.

4. **Detail as side panel over separate dialog** — Shows selected record details inline alongside the table.
