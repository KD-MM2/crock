## 1. Form State & Mode Management

- [x] 1.1 Implement `SendFormState` type with mode, items, text, code, options, session overrides
- [x] 1.2 Create mode toggle (files/text) with styled pill buttons
- [x] 1.3 Build `buildInitialForm()` to seed form from settings defaults
- [x] 1.4 Add form-level validation before send (no items in files mode, no text in text mode)

## 2. File Selection & Item List

- [x] 2.1 Implement `handleBrowseFiles()` with `selectFiles` IPC call
- [x] 2.2 Implement `handleBrowseFolder()` with folder-capable `selectFiles` IPC call
- [x] 2.3 Fetch path stats via `getPathStats` IPC for size and kind detection
- [x] 2.4 Display item list with name, size/folder label, remove button
- [x] 2.5 Show total count and combined size
- [x] 2.6 Implement clear-all button
- [x] 2.7 Handle mixed file+folder rejection with error toast

## 3. Code Phrase & QR Code

- [x] 3.1 Implement `generateCodePhrase()` with NATO word list
- [x] 3.2 Create code input with refresh and copy buttons
- [x] 3.3 Render QR code via `<QRCodeSVG>` in a dialog
- [x] 3.4 Implement QR SVG download with sanitized filename
- [x] 3.5 Sync form code with session-generated code

## 4. Text Mode

- [x] 4.1 Create textarea with character limit
- [x] 4.2 Add character counter display
- [x] 4.3 Implement clipboard paste via IPC

## 5. Session Overrides

- [x] 5.1 Create toggleable overrides panel
- [x] 5.2 Add relay host and password inputs
- [x] 5.3 Add exclusion patterns textarea (one per line)
- [x] 5.4 Add auto-confirm toggle switch
- [x] 5.5 Add reset-to-defaults button for overrides

## 6. Send Initiation

- [x] 6.1 Build send payload resolving overrides against settings
- [x] 6.2 Call `window.api.croc.startSend()` with full payload
- [x] 6.3 Create transfer session in store on send start
- [x] 6.4 Show success/error toasts for send outcome
- [x] 6.5 Display CLI command preview via `buildSendCliCommand()`

## 7. Auto-Reset & Auto-Copy

- [x] 7.1 Implement auto-reset on send success (watches session `done` phase)
- [x] 7.2 Implement auto-reset on send failure (watches `failed`/`canceled` phase)
- [x] 7.3 Implement auto-copy code on send initiation
- [x] 7.4 Block manual reset during active transfers

## 8. History Re-send

- [x] 8.1 Listen for `history:resend` custom DOM events
- [x] 8.2 Parse HistoryRecord to extract mode, items/text, code, overrides
- [x] 8.3 Reconstruct form state from history record
- [x] 8.4 Open overrides panel if record contains session overrides
