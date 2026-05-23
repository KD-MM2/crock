## Context

Settings are persisted via `electron-store` in the main process and synchronized to the renderer via IPC. The renderer maintains a draft copy that can be discarded (reset) or saved (validated then persisted). Tabbed navigation organizes settings into logical groups.

## Goals / Non-Goals

**Goals:**
- Multi-tab settings (General, Advanced, Network, Security, About)
- Draft/save/reset lifecycle with Zod validation
- Real-time relay status display
- Connection diagnostics (relay ping, proxy status, croc binary)

**Non-Goals:**
- Settings export/import
- Per-transfer type settings (send vs receive already handled by transfer defaults)

## Decisions

1. **Draft pattern over direct mutation** — Settings changes are staged in a draft, validated on save, and only persisted if validation passes. Reset discards the draft.

2. **electron-store over JSON files** — Provides atomic writes, schema migration, and OS-appropriate storage paths.

3. **Tab navigation via Radix Tabs** — Consistent with the transfer tabs, provides keyboard navigation.

4. **Connection diagnostics on settings open** — Relay status is polled on dialog open and updated live via streaming events.
