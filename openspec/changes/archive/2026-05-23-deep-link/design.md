## Context

Deep links use the `croc://` protocol scheme. On macOS, the `open-url` event fires; on Windows/Linux, the URL is passed as a command-line argument. The `second-instance` event handles URLs when the app is already running. The manager buffers URLs if the window isn't ready yet.

## Goals / Non-Goals

**Goals:**
- Register `croc://` as default protocol handler
- Parse URLs into `{ action, code, relay?, password? }` data
- Route to receive panel with auto-fill
- Handle cold-launch, warm-launch, and second-instance scenarios
- Gated by `deepLink` setting toggle

**Non-Goals:**
- Send-action deep links (only `receive` currently)
- Custom URL schemes beyond `croc://`

## Decisions

1. **Pending URL buffer** — If the window isn't ready when a URL arrives, it's stored and processed when `setWindow()` is called.

2. **UI store as intermediary** — Deep link data passes through `pendingDeepLink` in the Zustand UI store rather than direct component refs. This decouples the event listener from the receive panel.

3. **Setting gate** — `settings.advanced.deepLink` must be enabled for deep links to be processed. Default is enabled.
