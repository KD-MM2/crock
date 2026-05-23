## Context

The relay monitor uses a simple TCP connection test — if the relay accepts a TCP handshake on its port, it's considered online. Latency is measured from connection start to established. The monitor runs on a 15-second interval with a 2-second connection timeout.

## Goals / Non-Goals

**Goals:**
- Periodic TCP health check with online/offline status
- Latency measurement in milliseconds
- IPv6 detection
- Streaming status events to renderer via IPC

**Non-Goals:**
- Application-level protocol check (croc protocol handshake)
- Historical uptime tracking
- Multi-relay monitoring (only the configured relay)

## Decisions

1. **TCP connect over HTTP health endpoint** — Croc relays don't expose an HTTP API. A TCP handshake to the relay port is the simplest viable health check.

2. **15-second polling interval** — Frequent enough for responsive UI, infrequent enough to avoid network overhead. Unref'd timer prevents blocking app shutdown.

3. **2-second connection timeout** — Faster than default OS socket timeout; ensures UI doesn't hang on relay status updates.
