## ADDED Requirements

### Requirement: Relay health check
`ConnectionDiagnostics` SHALL test relay connectivity by attempting a TCP connection to the configured relay host:port. Results SHALL include online status and latency.

#### Scenario: Relay reachable
- **WHEN** `checkRelay()` is called and the relay accepts a TCP connection
- **THEN** status shows online with latency in milliseconds

#### Scenario: Relay unreachable
- **WHEN** `checkRelay()` is called and the relay does not respond
- **THEN** status shows offline

### Requirement: Croc binary check
`ConnectionDiagnostics` SHALL verify the croc binary is installed and report its version.

#### Scenario: Binary installed
- **WHEN** the croc binary exists at the configured path
- **THEN** status shows "Installed" with the version

#### Scenario: Binary not installed
- **WHEN** no croc binary is found
- **THEN** status shows "Not installed"

### Requirement: Proxy configuration check
`ConnectionDiagnostics` SHALL report whether proxy URLs (HTTP/HTTPS) are configured in settings.

#### Scenario: Proxy configured
- **WHEN** proxy URLs are set in settings
- **THEN** status shows the proxy endpoint is configured
