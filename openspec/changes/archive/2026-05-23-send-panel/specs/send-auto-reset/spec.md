## ADDED Requirements

### Requirement: Auto-reset on send success
When `settings.general.autoResetOnSendSuccess` is true, the form SHALL automatically reset (clear items, regenerate code, collapse overrides) when a send session enters the `done` phase.

#### Scenario: Send completes successfully with auto-reset
- **WHEN** `autoResetOnSendSuccess` is true and a session reaches `done`
- **THEN** the form resets and completed sessions are removed

### Requirement: Auto-reset on send failure
When `settings.general.autoResetOnSendFailure` is true, the form SHALL automatically reset when a send session enters `failed` or `canceled` phase.

#### Scenario: Send fails with auto-reset
- **WHEN** `autoResetOnSendFailure` is true and a session reaches `failed`
- **THEN** the form resets and failed sessions are removed

### Requirement: Reset blocked during active transfer
Manual reset via the Reset button SHALL be blocked while a send is in progress (non-final phase).

#### Scenario: Reset during active send
- **WHEN** user clicks "Reset" while a send session is in `connecting` or `transferring` phase
- **THEN** a warning toast is shown and the form is not reset
