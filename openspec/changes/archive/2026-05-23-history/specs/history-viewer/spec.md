## ADDED Requirements

### Requirement: Filterable history table
The history dialog SHALL display a table of past transfer records. Users SHALL filter by type (all/send/receive), status (all/done/failed/canceled), and keyword search (matches code, relay, file names).

#### Scenario: Filter by type
- **WHEN** user selects "Send" from the type dropdown
- **THEN** only send-type records are displayed

#### Scenario: Keyword search
- **WHEN** user types a file name in the search input
- **THEN** only records whose code, relay, or file names contain that keyword are displayed

### Requirement: Detail inspection
Selecting a history record SHALL display its full metadata: code, relay, files (names and sizes), timestamps, status, options, and log tail.

#### Scenario: View transfer details
- **WHEN** user clicks a history row
- **THEN** the detail panel shows that record's full metadata

### Requirement: Re-send from history
The detail view SHALL have a re-send button for send-type records. Clicking it SHALL dispatch a `history:resend` custom DOM event with the record data, which the send panel consumes to pre-fill its form.

#### Scenario: Re-send a past transfer
- **WHEN** user clicks "Re-send" on a send-type history record
- **THEN** the send panel is populated with the record's mode, items/text, code, and overrides

### Requirement: Export history
The history dialog SHALL provide an export action that returns all records. The export data SHALL include full record metadata.

#### Scenario: Export all records
- **WHEN** user triggers export
- **THEN** all history records are returned via IPC

### Requirement: Clear all history
A "Clear All" button with confirmation dialog SHALL delete all history records from the store.

#### Scenario: Clear all with confirmation
- **WHEN** user clicks "Clear All" and confirms
- **THEN** all records are deleted and the table is empty
