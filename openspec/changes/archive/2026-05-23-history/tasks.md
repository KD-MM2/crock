## 1. HistoryStore (Main Process)

- [x] 1.1 Create HistoryStore with electron-store persistence
- [x] 1.2 Implement configurable retention (retentionDays)
- [x] 1.3 Implement max log lines per record

## 2. History IPC

- [x] 2.1 Create `history:list` handler returning all records
- [x] 2.2 Create `history:clear` handler deleting all records
- [x] 2.3 Create `history:export` handler returning raw record data

## 3. History Zustand Store

- [x] 3.1 Implement load/refresh from IPC
- [x] 3.2 Implement client-side filtering (type, status, search)
- [x] 3.3 Implement select/deselect record
- [x] 3.4 Implement clearAll with IPC call
- [x] 3.5 Implement exportAll

## 4. History Dialog

- [x] 4.1 Create dialog shell with open/close from UI store
- [x] 4.2 Build filterable table with type/status/search controls
- [x] 4.3 Display records with masked code, type badge, status badge, timestamp
- [x] 4.4 Implement detail panel with full record metadata
- [x] 4.5 Add re-send button dispatching `history:resend` event
- [x] 4.6 Add export button
- [x] 4.7 Add "Clear All" with confirmation dialog
