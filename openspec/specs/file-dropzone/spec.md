## ADDED Requirements

### Requirement: File dialog with size resolution
Selecting files/folders via `handleBrowseFiles` or `handleBrowseFolder` SHALL open native dialogs via `window.api.app.selectFiles()`, then fetch path stats via `window.api.app.getPathStats()` to determine size and directory kind.

#### Scenario: Browse files
- **WHEN** user clicks "Select Files" and picks files
- **THEN** the selected paths' stats are fetched and items are added to the form

#### Scenario: Browse folder
- **WHEN** user clicks "Select Folder" and picks a directory
- **THEN** the folder is added as a folder-kind item to the form

### Requirement: Item deduplication
Adding items whose paths already exist in the current form SHALL be a no-op for those items.

#### Scenario: Add duplicate path
- **WHEN** the same file path is selected twice
- **THEN** only one instance appears in the item list
