## Context

Croc CLI outputs progress information as unstructured text on stdout. Crock UI must parse this text into structured data, stream it to the renderer, and display it meaningfully. The main process spawns croc as a child process, parses each line with regex, and emits IPC events. The renderer listens via the event bus and updates the Zustand transfer store.

## Goals / Non-Goals

**Goals:**
- Parse croc stdout for percent, speed, ETA, file names, file sizes, target address, and phase
- Stream structured progress to renderer via IPC events
- Display active transfer with live-updating progress bar and metadata
- Collect structured log tail (last 200 lines)
- Support stop/cancel of in-flight transfers
- Finalize sessions to history on completion/failure/cancellation

**Non-Goals:**
- Resume interrupted transfers
- Transfer queue or scheduling
- Bandwidth throttling UI

## Decisions

1. **Regex parsing over structured output mode** — Croc has no `--json` flag. All progress data is extracted from human-readable text via layered regex patterns (percent, file names, sizes, speed, ETA, phase detection).

2. **Event-based progress over polling** — The child process's stdout is read line-by-line. Each line is parsed and emitted as an event via `ipcMain` to the renderer's `ipcRenderer` listener. No polling of a status file.

3. **Transfer store as single source of truth** — Both progress events and UI state flow through the Zustand transfer store. The `TransferProgressPanel` is a pure view over the store.

4. **Log tail capped at 200 lines** — Stored in-memory per session. Full logs are not persisted beyond what's recorded in history.

## Risks / Trade-offs

- **Regex fragility** — If croc changes its output format, parsing may break. Mitigation: `normalizeProgress()` and `normalizeDone()` return null on parse failure, which is silently ignored.
- **Child process zombies** — If the main process crashes during a transfer, the croc child may become orphaned. Mitigation: `app.on('before-quit')` stops all runners.
