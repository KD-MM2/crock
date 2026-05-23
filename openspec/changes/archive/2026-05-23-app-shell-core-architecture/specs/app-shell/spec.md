## ADDED Requirements

### Requirement: Single-instance lock
The app SHALL use `app.requestSingleInstanceLock()` to ensure only one instance runs. If a second instance is launched, it SHALL restore and focus the existing window instead of creating a new one.

#### Scenario: Second instance launched
- **WHEN** a second instance of the app is launched
- **THEN** the existing window is restored, focused, and the second instance quits

### Requirement: Secure BrowserWindow defaults
Every BrowserWindow SHALL be created with `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`, and a preload script path.

#### Scenario: Renderer attempts Node.js access
- **WHEN** renderer code tries to access `require()` or `process`
- **THEN** the access is blocked and `undefined` is returned

### Requirement: External link handling
The app SHALL open all external HTTP/HTTPS links in the system default browser. Internal navigation to non-HTTP URLs SHALL be prevented.

#### Scenario: User clicks external link
- **WHEN** a link to `https://github.com` is clicked in the renderer
- **THEN** the URL opens in the system browser, not in the Electron window

### Requirement: Window lifecycle on platform conventions
On Windows/Linux, closing all windows SHALL quit the app. On macOS, the app SHALL stay running and re-create the window on `activate`.

#### Scenario: Close window on Windows
- **WHEN** the main window is closed on Windows
- **THEN** the app quits

#### Scenario: Close window on macOS
- **WHEN** the main window is closed on macOS
- **THEN** the app stays running and can be reactivated from the dock

### Requirement: Deep link protocol registration
The app SHALL register the `croc://` protocol scheme via `app.setAsDefaultProtocolClient`.

#### Scenario: Protocol registration
- **WHEN** the app starts
- **THEN** `croc://` URLs are routed to this app
