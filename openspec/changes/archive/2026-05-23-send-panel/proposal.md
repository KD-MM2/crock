## Why

Crock UI users need a visual, intuitive way to send files and text via croc without memorizing CLI flags. The send panel must support drag-and-drop file queuing, text composition, code phrase management, and one-click transfer initiation — all while exposing the same session-level overrides (relay, password, exclusions, auto-confirm) that the CLI offers.

## What Changes

- **Send panel UI** with mode toggle (files vs text), file dropzone, text editor, code phrase input with generate/copy/QR actions
- **Code phrase generation** using a NATO-phonetic word list with random 2-digit number separator
- **QR code display** via `qrcode.react` with SVG download capability
- **File/folder selection** via Electron native dialogs, with size display and item list management
- **Session overrides panel** for relay, password, exclusion patterns, and auto-confirm
- **CLI command preview** showing the equivalent croc command
- **Auto-reset behavior** triggered by transfer completion (success/failure) per user settings
- **Auto-copy code** to clipboard on successful send initiation
- **History re-send** via custom DOM event, reconstructing form state from prior records

## Capabilities

### New Capabilities
- `send-form`: Mode-aware form state (files/text), code management, session overrides
- `code-phrase`: Random code generation from NATO word list, configurable delimiter and number insertion
- `file-dropzone`: File/folder selection via native dialog, item list with remove and size display
- `qr-code-display`: QR code rendering and SVG download for the transfer code phrase
- `send-auto-reset`: Form auto-clearing based on transfer outcome (success/failure) per settings

### Modified Capabilities
<!-- No existing specs to modify. -->

## Impact

- `src/components/transfer/send-panel/index.tsx` — main send panel component
- `src/components/transfer/send-panel/const.ts` — mode options, final phase list, max text length
- `src/components/transfer/send-panel/utils.ts` — form helpers, item merging, CLI builder, validation
- `src/lib/code.ts` — `generateCodePhrase()` using NATO word list
- `src/lib/format.ts` — `formatBytes()` for file size display
- `electron/ipc/modules/croc.ts` — `croc:start-send` IPC handler
- `electron/preload/api.d.ts` — typed `startSend` method signature
