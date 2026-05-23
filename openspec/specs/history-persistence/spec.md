## ADDED Requirements

### Requirement: History persistence via electron-store
The HistoryStore SHALL persist transfer records in electron-store. Records SHALL include id, type, status, code, relay, files, timestamps, options, and error information.

#### Scenario: Record persisted after transfer
- **WHEN** a transfer completes
- **THEN** its record is stored and survives app restart

### Requirement: Configurable retention
The HistoryStore SHALL auto-delete records older than the configured `retentionDays`. A max log lines setting SHALL cap the number of stored log lines per record.

#### Scenario: Old records pruned
- **WHEN** history is loaded and `retentionDays` is 30
- **THEN** records older than 30 days are removed
