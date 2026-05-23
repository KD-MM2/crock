## 1. Form State & Code Input

- [x] 1.1 Implement `ReceiveFormState` type with code, options, session overrides, autoPaste
- [x] 1.2 Create code input with monospace font and 64-char max length
- [x] 1.3 Add paste-from-clipboard button
- [x] 1.4 Implement Enter-to-submit key handler
- [x] 1.5 Build `buildInitialReceiveForm()` to seed from settings

## 2. Session Options

- [x] 2.1 Create toggleable options panel
- [x] 2.2 Add relay host and password inputs
- [x] 2.3 Add auto-confirm toggle switch
- [x] 2.4 Add overwrite toggle switch
- [x] 2.5 Add auto-paste toggle with description

## 3. Receive Initiation

- [x] 3.1 Build receive payload resolving overrides against settings
- [x] 3.2 Call `window.api.croc.startReceive()` with full payload
- [x] 3.3 Create transfer session in store on receive start
- [x] 3.4 Show success/error toasts for receive outcome
- [x] 3.5 Display CLI command preview via useMemo

## 4. Deep Link Integration

- [x] 4.1 Read `pendingDeepLink` from UI store on mount/change
- [x] 4.2 Auto-fill code and session overrides from deep link data
- [x] 4.3 Clear pending deep link state after processing
- [x] 4.4 Show toast notification on deep link processing

## 5. Auto-Paste Behavior

- [x] 5.1 Implement auto-paste on mount when toggle is enabled
- [x] 5.2 Handle clipboard read cleanup on unmount
