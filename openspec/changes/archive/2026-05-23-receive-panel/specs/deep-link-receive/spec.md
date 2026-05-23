## ADDED Requirements

### Requirement: Deep link auto-fill
When `pendingDeepLink` in the UI store has `action: 'receive'` and a `code` value, the receive panel SHALL populate the code input and session overrides (relay, password) from the deep link data, then clear the pending state.

#### Scenario: Deep link received
- **WHEN** `pendingDeepLink` has `{ action: 'receive', code: '7243-aurora-ceiling-collect', relay: 'custom.relay.com:9009' }`
- **THEN** the code input shows `7243-aurora-ceiling-collect` and relay override is set to `custom.relay.com:9009`

#### Scenario: Deep link without relay
- **WHEN** `pendingDeepLink` has `{ action: 'receive', code: '7243-aurora-ceiling-collect' }` (no relay)
- **THEN** the code input is populated but relay override is unchanged

### Requirement: Deep link notification
When a deep link is processed, the receive panel SHALL show a success toast notification.

#### Scenario: Toast on deep link
- **WHEN** a deep link is auto-filled into the form
- **THEN** a success toast is displayed
