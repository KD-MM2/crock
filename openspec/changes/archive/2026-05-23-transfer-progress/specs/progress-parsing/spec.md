## ADDED Requirements

### Requirement: Parse transfer progress from croc stdout
The CrocProcessRunner SHALL parse each stdout line against regex patterns to extract percent, file name, speed, ETA, file sizes, and transfer phase. Extracted data SHALL be emitted as structured progress events.

#### Scenario: Progress line parsed
- **WHEN** croc outputs a line like `file.txt 45% | 2.3 MB/s | 15s`
- **THEN** a progress event is emitted with `percent: 45`, `speed` containing the parsed rate, and `eta` containing the time estimate

#### Scenario: Hashing phase detected
- **WHEN** croc outputs a line containing "hash" or "hashed"
- **THEN** the progress event's phase is set to `hashing`

#### Scenario: Waiting phase detected
- **WHEN** croc outputs a line indicating waiting for receiver
- **THEN** the progress event's phase is set to `waiting`

### Requirement: Parse transfer completion
When croc exits or outputs a completion summary, the CrocProcessRunner SHALL emit a done event with success/canceled/failed status, error message, and timestamp.

#### Scenario: Successful transfer
- **WHEN** croc exits with code 0
- **THEN** a done event is emitted with `success: true`

#### Scenario: Failed transfer
- **WHEN** croc exits with non-zero code or outputs an error
- **THEN** a done event is emitted with `success: false` and the error message

### Requirement: Transfer session lifecycle in store
The transfer Zustand store SHALL create sessions on first progress, update fields on subsequent progress events, and finalize (set phase, error, finishedAt) on done events.

#### Scenario: Progress creates session
- **WHEN** `updateProgress()` is called for an unknown ID
- **THEN** a new session is created with `startedAt` set and `logTail` initialized

#### Scenario: Session finalized
- **WHEN** `finalizeSession()` is called with a done phase
- **THEN** the session's `phase`, `finishedAt`, and `percent` are set

### Requirement: Log tail management
Each progress/done event SHALL be appended to the session's log tail. The log tail SHALL be capped at 200 entries, keeping the most recent.

#### Scenario: Log overflow
- **WHEN** a session has 200 log entries and a new entry arrives
- **THEN** the oldest entry is removed and the new entry is appended
