## ADDED Requirements

### Requirement: Mode-aware send form
The send panel SHALL support two modes: `files` (file/folder selection) and `text` (freeform text input). Switching modes SHALL preserve the code and session overrides but clear mode-specific content.

#### Scenario: Switch from files to text mode
- **WHEN** user clicks the "Text" mode toggle while files are queued
- **THEN** the file list is hidden and a textarea is shown instead; code and overrides remain unchanged

### Requirement: File selection via native dialog
Users SHALL be able to select files or folders using native OS dialogs triggered by button clicks. Selected paths SHALL be validated for size and kind, then added to the item list.

#### Scenario: Select multiple files
- **WHEN** user clicks "Select Files" and picks 3 files
- **THEN** all 3 files appear in the item list with name and size displayed

#### Scenario: Mixed file and folder items
- **WHEN** a folder is added to an existing file list (or vice versa)
- **THEN** the operation is rejected with an error toast

### Requirement: Item list management
The item list SHALL display each queued item with name, size (or folder indicator), and a remove button. Total item count and combined size SHALL be shown. A clear-all button SHALL remove all items.

#### Scenario: Remove single item
- **WHEN** user clicks the trash icon on an item
- **THEN** that item is removed from the list and totals update

### Requirement: Text message composition
In text mode, a textarea SHALL accept up to a configurable max length. A character counter SHALL show current/max. A paste-from-clipboard button SHALL populate the textarea.

#### Scenario: Paste text from clipboard
- **WHEN** user clicks "Paste" button
- **THEN** clipboard text is read via IPC and set as textarea value, truncated to max length

### Requirement: Code phrase generation
The send panel SHALL display a code phrase input pre-filled with a random 3-part code (word-number-word) using NATO phonetic alphabet words. A refresh button SHALL generate a new random code. The code SHALL be editable.

#### Scenario: Generate new code
- **WHEN** user clicks the refresh button on the code input
- **THEN** `generateCodePhrase()` produces a new random code and the input is updated

### Requirement: QR code display
A QR code button SHALL open a dialog showing the current code as a QR code rendered by `qrcode.react`. A save button SHALL download the QR code as an SVG file.

#### Scenario: Save QR code as SVG
- **WHEN** user clicks "Save" in the QR dialog with a valid code
- **THEN** an SVG file named `croc-code-<code>.svg` is downloaded

### Requirement: Session overrides panel
A toggleable overrides panel SHALL expose relay host, relay password, exclusion patterns, and auto-confirm fields. Changes SHALL only affect the current session, not global settings.

#### Scenario: Set session relay override
- **WHEN** user enters a relay host in the overrides panel and sends
- **THEN** the transfer uses that relay instead of the global setting

### Requirement: CLI command preview
A read-only preview SHALL display the equivalent `croc send` CLI command constructed from the current form state and settings.

#### Scenario: CLI preview reflects form changes
- **WHEN** user changes the code or adds files
- **THEN** the CLI preview updates to reflect the new state

### Requirement: Send initiation via IPC
Clicking "Start Send" SHALL validate the form, call `window.api.croc.startSend()` with the full payload, create a transfer session in the store, and display a success toast.

#### Scenario: Send with missing items
- **WHEN** user clicks "Start Send" in files mode with no items
- **THEN** an error toast is shown and no IPC call is made

### Requirement: Auto-reset on transfer completion
When `autoResetOnSendSuccess` is enabled in settings, the form SHALL reset automatically when a send session reaches the `done` phase. When `autoResetOnSendFailure` is enabled, reset on `failed` or `canceled` phases.

#### Scenario: Auto-reset on success
- **WHEN** a send session reaches `done` phase and auto-reset is enabled
- **THEN** the form resets to initial state and completed sessions are removed

### Requirement: Auto-copy code on send
When `autoCopyCodeOnSend` is enabled, the transfer code SHALL be copied to clipboard automatically when a send session starts and receives its final code.

#### Scenario: Auto-copy on code receipt
- **WHEN** a send session's code becomes available and auto-copy is enabled
- **THEN** the code is copied to clipboard and a success toast is shown

### Requirement: History re-send
The send panel SHALL listen for `history:resend` custom DOM events and reconstruct form state from the received `HistoryRecord`, pre-filling mode, items/text, code, and overrides.

#### Scenario: Re-send from history
- **WHEN** a `history:resend` event fires with a send-type record
- **THEN** the form is populated with the record's mode, items/text, code, and overrides
