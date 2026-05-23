## ADDED Requirements

### Requirement: Periodic TCP health check
The RelayStatusMonitor SHALL attempt a TCP connection to the configured relay host:port every 15 seconds. Results SHALL be emitted as `relay:status` events on every check.

#### Scenario: Relay online
- **WHEN** a TCP connection to the relay succeeds
- **THEN** a `relay:status` event is emitted with `online: true` and `latencyMs`

#### Scenario: Relay offline
- **WHEN** a TCP connection to the relay times out or fails
- **THEN** a `relay:status` event is emitted with `online: false`

### Requirement: Monitor lifecycle tied to window
The monitor SHALL start when the main window loads and stop when the window closes. The interval SHALL use `unref()` to not block app shutdown.

#### Scenario: Window closes
- **WHEN** the main window emits `close`
- **THEN** `relayMonitor.stop()` is called, clearing the interval

### Requirement: Host:port parsing
`parseHostPort()` SHALL split a `host:port` string into host and port components. Invalid formats SHALL return a falsy value.

#### Scenario: Valid host:port
- **WHEN** `parseHostPort('croc.schollz.com:9009')` is called
- **THEN** it returns `{ host: 'croc.schollz.com', port: 9009 }`

### Requirement: IPv6 detection
`isIpv6()` SHALL return true when the given host string is an IPv6 address.

#### Scenario: IPv6 address
- **WHEN** `isIpv6('::1')` is called
- **THEN** it returns `true`
