## ADDED Requirements

### Requirement: Multi-tab settings dialog
The settings dialog SHALL display tabs for General, Advanced, Network, Security, and About. Opening the dialog SHALL load settings from the main process and refresh connection status.

#### Scenario: Open settings dialog
- **WHEN** `openSettings()` is called from the UI store
- **THEN** settings are loaded from the main process and the General tab is shown

### Requirement: Draft and save lifecycle
Settings changes SHALL be staged in a draft. Saving SHALL validate via Zod, persist via IPC, and update the stored settings. Resetting SHALL discard the draft and restore the last saved state.

#### Scenario: Edit and save
- **WHEN** user changes a setting and clicks Save
- **THEN** the draft is validated, persisted via IPC, and the dialog closes

#### Scenario: Edit and reset
- **WHEN** user changes a setting and clicks Reset
- **THEN** the draft reverts to the last saved state

### Requirement: General tab
The General tab SHALL expose download directory, auto-open on done, auto-copy code on send, auto-reset toggles, language selector, and theme selector.

#### Scenario: Change language
- **WHEN** user selects a different language in the General tab and saves
- **THEN** the app switches to the selected language

### Requirement: Advanced tab
The Advanced tab SHALL expose log tail lines, history retention days, extra croc flags, deep link toggle, and show transfer logs toggle.

### Requirement: Network tab
The Network tab SHALL expose default relay host, relay password, proxy (HTTP/HTTPS), and connection status indicators.

#### Scenario: Relay status update
- **WHEN** a `relay:status` event arrives with online status and latency
- **THEN** the relay status indicator updates in real time

### Requirement: Security tab
The Security tab SHALL expose security curve selection (p256, p384, p521, siec) and related cryptographic settings.

### Requirement: About tab
The About tab SHALL display app version, croc binary version, author info, and relevant links.

### Requirement: Connection diagnostics
The settings dialog SHALL show status for relay (online/offline and latency), proxy (configured status), and croc binary (installed/not installed with version).

#### Scenario: Relay online
- **WHEN** relay ping succeeds
- **THEN** relay status shows "Online" with latency in ms
