## ADDED Requirements

### Requirement: Electron-store persistence
Settings SHALL be persisted via `electron-store` in the user's app data directory. The store SHALL provide typed get/set methods and on-change notifications.

#### Scenario: Settings persist across restarts
- **WHEN** settings are saved and the app restarts
- **THEN** previously saved settings are loaded

### Requirement: Zod validation
Settings SHALL be validated against a Zod schema before persistence. Invalid settings SHALL be rejected with an error.

#### Scenario: Invalid settings rejected
- **WHEN** settings with invalid values are submitted for save
- **THEN** validation fails and settings are not persisted

### Requirement: IPC get and set
The renderer SHALL access settings via `window.api.settings.get()` and `window.api.settings.set()`. The set method SHALL validate before writing.

#### Scenario: Get settings
- **WHEN** `window.api.settings.get()` is called
- **THEN** the full settings object is returned from the main process

### Requirement: Settings patching
Partial settings updates SHALL be supported via `window.api.settings.set()` with a partial object, merging with existing settings.
