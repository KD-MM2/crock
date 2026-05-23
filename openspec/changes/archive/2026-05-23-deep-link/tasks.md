## 1. DeepLinkManager

- [x] 1.1 Implement parseUrl() for croc:// URLs
- [x] 1.2 Validate code presence and minimum length
- [x] 1.3 Extract optional relay and password parameters
- [x] 1.4 Implement setWindow() with pending URL buffer
- [x] 1.5 Send parsed data to renderer via webContents.send
- [x] 1.6 Respect deepLink setting toggle

## 2. Main Process Integration

- [x] 2.1 Register croc:// protocol via app.setAsDefaultProtocolClient
- [x] 2.2 Handle second-instance event for Windows/Linux
- [x] 2.3 Handle open-url event for macOS
- [x] 2.4 Detect croc:// URLs in process.argv on Windows

## 3. Renderer Integration

- [x] 3.1 Listen for deep-link:receive events in TransferView
- [x] 3.2 Store pending deep link in UI store
- [x] 3.3 Consume and clear pending deep link in ReceivePanel
- [x] 3.4 Show toast on deep link processing
