## ADDED Requirements

### Requirement: Code phrase input
The receive panel SHALL provide a text input for the croc code phrase, with a font-mono style. Pressing Enter SHALL trigger receive if the code is non-empty. A paste button SHALL read the clipboard via IPC and populate the input.

#### Scenario: Enter to submit
- **WHEN** user types a valid code and presses Enter
- **THEN** the receive transfer is initiated

#### Scenario: Paste from clipboard
- **WHEN** user clicks the paste button
- **THEN** clipboard text is read and set as the code input value

### Requirement: Receive initiation via IPC
Clicking "Receive" (or pressing Enter) SHALL validate the code is non-empty, call `window.api.croc.startReceive()` with the full payload (code, relay, pass, overwrite, autoConfirm, outDir, curve, extraFlags), create a transfer session in the store, and display a success toast.

#### Scenario: Receive with empty code
- **WHEN** user clicks "Receive" with an empty code
- **THEN** an error toast is shown and no IPC call is made

#### Scenario: Successful receive start
- **WHEN** user clicks "Receive" with a valid code
- **THEN** the IPC call returns a session ID, a session is created in the transfer store, and a success toast appears

### Requirement: Session overrides panel
A toggleable options panel SHALL expose relay host, relay password, auto-confirm, overwrite, and auto-paste fields. Changes SHALL only affect the current receive session.

#### Scenario: Set overwrite on current session
- **WHEN** user enables overwrite in the options panel and starts a receive
- **THEN** the receive uses `--overwrite` for this session only

### Requirement: Auto-paste on mount
When `autoPaste` is enabled, the receive panel SHALL read the clipboard once on mount and populate the code input.

#### Scenario: Auto-paste fills code
- **WHEN** the receive panel mounts with `autoPaste: true` and clipboard contains a code
- **THEN** the code input is populated with the clipboard content

### Requirement: CLI command preview
A read-only preview SHALL display the equivalent `croc` receive command constructed from the current form state and settings, with proper argument quoting.

#### Scenario: CLI preview shows receive command
- **WHEN** user enters a code and sets overrides
- **THEN** the CLI preview shows a command like `croc --relay host:port --yes <code>`
