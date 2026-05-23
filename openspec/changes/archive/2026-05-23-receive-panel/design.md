## Context

The receive panel is the counterpoint to the send panel. It has simpler state (no file management) but adds deep link integration and auto-paste behavior. The panel resolves relay/security settings from global configuration and session overrides at receive time.

## Goals / Non-Goals

**Goals:**
- Code phrase input with paste and Enter-to-submit
- Session overrides (relay, password, auto-confirm, overwrite)
- Auto-paste toggle that reads clipboard on mount
- Deep link auto-fill from `croc://receive?code=...` URLs
- CLI command preview

**Non-Goals:**
- Code phrase generation (only send side generates codes)
- File destination browser (uses global download directory setting)

## Decisions

1. **Auto-paste as a toggle instead of always-on** — Clipboard access is sensitive; the toggle gives users control. When enabled, clipboard is read once on mount.

2. **Deep link via Zustand pending state** — The UI store holds `pendingDeepLink` set by `TransferView`'s `deep-link:receive` event listener. The receive panel's `useEffect` consumes it and clears it.

3. **CLI preview built with `useMemo`** — Pure derivation from form state + settings, rebuilt on any relevant change.

## Risks / Trade-offs

- **Auto-paste may read sensitive clipboard content** — Mitigation: user-initiated via toggle, and clipboard is only read once on toggle enable.
- **Deep link data could be stale** — If the receive panel mounts before the deep link fires, the pending state bridges the gap. If neither timing works, the user can paste manually.
