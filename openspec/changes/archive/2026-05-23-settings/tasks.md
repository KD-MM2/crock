## 1. Settings Store

- [x] 1.1 Create SettingsStore with electron-store for persistence
- [x] 1.2 Implement typed get/set methods with Zod validation
- [x] 1.3 Define default settings (download dir, auto toggles, language, theme)

## 2. Settings IPC

- [x] 2.1 Create `settings:get` handler returning full settings
- [x] 2.2 Create `settings:set` handler with validation before write
- [x] 2.3 Create `settings:validate` handler
- [x] 2.4 Create `settings:connection-status` handler

## 3. Settings Zustand Store

- [x] 3.1 Implement load/save/draft/reset lifecycle
- [x] 3.2 Implement patch() for partial updates
- [x] 3.3 Implement refreshConnectionStatus()
- [x] 3.4 Implement updateRelayStatus() for streaming events

## 4. Settings Dialog

- [x] 4.1 Create dialog shell with tab navigation (Radix Tabs)
- [x] 4.2 Implement General tab (download dir, toggles, language, theme)
- [x] 4.3 Implement Advanced tab (log lines, retention, extra flags, deep link)
- [x] 4.4 Implement Network tab (relay, proxy, connection status)
- [x] 4.5 Implement Security tab (curve selection)
- [x] 4.6 Implement About tab (versions, author, links)
- [x] 4.7 Add Save/Reset buttons with loading states

## 5. Connection Diagnostics

- [x] 5.1 Implement relay TCP ping check
- [x] 5.2 Implement croc binary version check
- [x] 5.3 Implement proxy configuration check
- [x] 5.4 Wire into settings dialog Network tab
