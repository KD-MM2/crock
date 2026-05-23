## ADDED Requirements

### Requirement: Protocol registration
The app SHALL register as the default protocol handler for `croc://` on all platforms via `app.setAsDefaultProtocolClient('croc')`.

#### Scenario: Click croc:// link in browser
- **WHEN** user clicks a `croc://` link while the app is installed
- **THEN** the app opens (or is focused) and the URL is processed

### Requirement: Second-instance URL forwarding
On Windows/Linux, when a second instance is launched with a `croc://` URL argument, the existing instance SHALL receive and process the URL.

#### Scenario: Second instance with deep link
- **WHEN** the app is already running and the user opens a `croc://` link
- **THEN** the existing window is focused and the URL is processed

### Requirement: macOS open-url handling
On macOS, the `open-url` event SHALL forward URLs to the DeepLinkManager for processing.

#### Scenario: macOS dock click with URL
- **WHEN** the app receives an `open-url` event on macOS
- **THEN** the URL is parsed and routed to the receive panel

### Requirement: Setting gate
Deep link processing SHALL be skipped when `settings.advanced.deepLink` is false.

#### Scenario: Deep links disabled
- **WHEN** `deepLink` setting is false and a URL arrives
- **THEN** the URL is silently ignored

### Requirement: Window not ready buffering
If a URL arrives before the window is ready, it SHALL be stored in `pendingUrl` and processed once `setWindow()` is called.

#### Scenario: URL before window ready
- **WHEN** `handleUrl()` is called but the window is null
- **THEN** the URL is stored and processed when the window is set
