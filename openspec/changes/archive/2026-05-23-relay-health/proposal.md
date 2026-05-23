## Why

Croc transfers depend on a relay server for peer discovery. Users need live feedback on whether their configured relay is reachable, how much latency to expect, and whether IPv6 is available — before starting a transfer.

## What Changes

- **RelayStatusMonitor** periodically pings the configured relay via TCP connection, measures latency, and emits status events to the renderer
- **Settings store integration** updates connection status in real time from streaming events
- **Network utilities** parse host:port strings, detect IPv6 addresses

## Capabilities

### New Capabilities
- `relay-monitor`: Periodic TCP health check with latency measurement and IPC event emission

### Modified Capabilities
<!-- No existing specs to modify. -->

## Impact

- `electron/services/RelayStatusMonitor.ts` — periodic ping loop, event emission
- `electron/utils/network.ts` — host:port parsing, IPv6 detection
- `src/stores/settings.ts` — `updateRelayStatus()` consuming streaming events
- `electron/main.ts` — monitor start/stop tied to window lifecycle
