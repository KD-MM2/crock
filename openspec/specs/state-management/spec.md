## ADDED Requirements

### Requirement: UI store manages dialogs and active tab
The UI Zustand store SHALL manage `dialogs` (historyOpen, settingsOpen), `theme`, `activeTransferTab`, and `pendingDeepLink` state with corresponding setter actions.

#### Scenario: Open settings dialog
- **WHEN** `useUiStore.getState().openSettings()` is called
- **THEN** `dialogs.settingsOpen` becomes `true`

#### Scenario: Switch transfer tab
- **WHEN** `setActiveTransferTab('receive')` is called
- **THEN** `activeTransferTab` becomes `'receive'`

### Requirement: Transfer store manages session lifecycle
The transfer Zustand store SHALL maintain a map of `TransferSession` objects keyed by ID. It SHALL support upsert, progress update, append log, finalize, and remove operations.

#### Scenario: Transfer progress updates existing session
- **WHEN** `updateProgress()` is called with a progress payload matching an existing session ID
- **THEN** the session's `percent`, `speed`, `eta`, and `phase` fields are updated without creating a duplicate

#### Scenario: New transfer session created from progress
- **WHEN** `updateProgress()` is called with a progress payload for an unknown ID
- **THEN** a new session entry is created with defaults for `mode`, `logTail`, and `startedAt`

### Requirement: Settings store synchronizes with main process
The settings Zustand store SHALL load settings from the main process via IPC, maintain a draft for editing, validate on save, and update relay status from streaming events.

#### Scenario: Load settings
- **WHEN** `load()` is called
- **THEN** the store fetches settings from `window.api.settings.get()` and sets both `settings` and `draft`

#### Scenario: Save settings with validation
- **WHEN** `save()` is called and validation passes
- **THEN** settings are persisted via IPC and `draft` is reset to the saved state

#### Scenario: Draft reset
- **WHEN** `resetDraft()` is called
- **THEN** `draft` is set back to the last saved `settings` value

### Requirement: History store supports filtering
The history Zustand store SHALL load records from the main process, support filtering by type/status/search keyword, and provide clear and export operations.

#### Scenario: Filter by transfer type
- **WHEN** `setFilters({ type: 'send' })` is called
- **THEN** only records with `type === 'send'` are returned from `selectFilteredHistory()`

#### Scenario: Clear all history
- **WHEN** `clearAll()` is called
- **THEN** records are cleared from the main process store and the local state is reset
