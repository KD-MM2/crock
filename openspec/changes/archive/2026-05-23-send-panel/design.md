## Context

The send panel is the primary user-facing feature of Crock UI. It replaces the `croc send <file>` CLI workflow with a reactive React form backed by IPC calls to the Electron main process. The panel must handle two modes (files and text), support session-level overrides, and integrate with the transfer progress system.

## Goals / Non-Goals

**Goals:**
- Dual-mode send form (files via native dialog, text via textarea)
- Code phrase generation with NATO phonetic words
- QR code rendering and SVG download
- Session overrides (relay, password, exclusions, auto-confirm)
- CLI command preview for transparency
- Auto-reset and auto-copy behaviors driven by settings
- History re-send via DOM custom events

**Non-Goals:**
- Inline drag-and-drop (known Electron limitation — paths can't be resolved from renderer-side drops)
- Multi-file drop from OS file manager
- Folder recursion depth configuration

## Decisions

1. **Form state as `useState` over Zustand** — Send form state is local and ephemeral; it doesn't need cross-component sharing. Zustand stores manage the transfer session that results from the form.

2. **`qrcode.react` over canvas-based QR** — Simpler React integration, SVG output enables easy download without canvas-to-blob conversion.

3. **History re-send via `CustomEvent` over Zustand action** — The history dialog lives in a separate DOM subtree. A DOM event decouples the two components without adding store-level coupling.

4. **NATO word list for code phrases** — Matches croc's default code generation style, making codes pronounceable and human-friendly.

5. **Session overrides stored in form state, resolved at send time** — Overrides merge with global settings via `resolveRelay()`/`resolveRelayPass()`/`resolveExcludePatterns()` utility functions.

## Risks / Trade-offs

- **No drag-and-drop from OS** — Electron's sandbox prevents renderer from getting absolute file paths from drop events. Mitigation: only native dialog selection works; dropzone is a styled click target.
- **Large file lists may cause UI lag** — No virtualization on the item list. Mitigation: scroll container with max-height; acceptable for typical transfer sizes.
- **QR code only shows final code** — Code must be confirmed before QR is available, which differs from CLI flow. Mitigation: dialog explains the code shown.
