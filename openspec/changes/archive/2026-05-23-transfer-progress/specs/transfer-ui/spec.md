## ADDED Requirements

### Requirement: Active transfer progress display
The TransferProgressPanel SHALL render the active transfer session with a progress bar, phase-colored status badge, percentage, and metadata (file name, size, speed, ETA).

#### Scenario: Active transfer shown
- **WHEN** a transfer session is in `transferring` phase
- **THEN** a progress bar, speed, ETA, and file info are displayed

### Requirement: Phase-specific status icon and color
Each transfer phase SHALL map to a distinct icon and color (e.g., blue for connecting, green for done, red for failed, yellow for waiting).

#### Scenario: Failed transfer display
- **WHEN** a session reaches `failed` phase
- **THEN** a red error icon and error message are shown

### Requirement: Transfer log viewer
When `showTransferLogs` is enabled in settings, a scrollable log tail SHALL display raw croc output lines for the active session.

#### Scenario: Log viewer toggle
- **WHEN** `showTransferLogs` is false
- **THEN** no log tail is displayed

### Requirement: Stop/cancel active transfer
A stop button SHALL be available for active (non-final) transfers. Clicking it SHALL call `window.api.croc.stop()` with the session ID, sending SIGTERM to the child process.

#### Scenario: Cancel in-progress transfer
- **WHEN** user clicks stop during an active transfer
- **THEN** the croc process is terminated and the session enters `canceled` phase

### Requirement: Multi-session support
The transfer store SHALL support multiple concurrent sessions (send + receive). The UI SHALL display the most recently active session by default.

#### Scenario: Second transfer started during active one
- **WHEN** a new transfer starts while another is in progress
- **THEN** both sessions exist in the store; the new one becomes the active session
