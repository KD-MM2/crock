## 1. CrocProcessRunner

- [x] 1.1 Spawn croc child process with command from CrocCommandBuilder
- [x] 1.2 Parse stdout line-by-line with regex patterns for percent, speed, ETA, file info
- [x] 1.3 Detect transfer phase (hashing, waiting, transferring, done) from output patterns
- [x] 1.4 Emit structured progress events via ipcMain
- [x] 1.5 Emit done events on process exit with success/failure status
- [x] 1.6 Implement stopAll() for cleanup on app quit

## 2. Progress Normalization

- [x] 2.1 Create `normalizeProgress()` to convert raw IPC payload to typed TransferProgress
- [x] 2.2 Create `normalizeDone()` to convert raw IPC payload to typed done data
- [x] 2.3 Create `createLogEntry()` for structured log entries
- [x] 2.4 Parse file names, sizes, and transfer direction from output

## 3. Transfer Store

- [x] 3.1 Implement `updateProgress()` with session create-or-update logic
- [x] 3.2 Implement `finalizeSession()` with phase, error, and timestamp
- [x] 3.3 Implement `appendLog()` with 200-line cap
- [x] 3.4 Implement `removeSession()` and `reset()`

## 4. Transfer Progress Panel

- [x] 4.1 Subscribe to progress and done IPC events via window.api.events
- [x] 4.2 Render progress bar with percentage and color by phase
- [x] 4.3 Display phase label, speed, ETA, file info
- [x] 4.4 Show stop button for active transfers with confirmation dialog
- [x] 4.5 Render scrollable log tail when enabled in settings
- [x] 4.6 Update history store on transfer completion

## 5. IPC Integration

- [x] 5.1 Wire `croc:progress` event from main to renderer
- [x] 5.2 Wire `croc:done` event from main to renderer
- [x] 5.3 Implement `croc:stop` IPC handler
