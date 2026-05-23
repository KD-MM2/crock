## ADDED Requirements

### Requirement: QR code rendering
The QR dialog SHALL render the current transfer code as a QR code using `<QRCodeSVG>` from `qrcode.react` at 160px size. The code SHALL be displayed in monospace font above the QR image.

#### Scenario: QR dialog opened with valid code
- **WHEN** user opens the QR dialog with a non-empty code
- **THEN** a QR code SVG is rendered representing that code

#### Scenario: QR dialog button disabled without code
- **WHEN** no code is available (empty and no resolved/session code)
- **THEN** the QR button is disabled

### Requirement: QR SVG download
The "Save" button SHALL serialize the QR SVG element to a string, wrap it in a Blob, create an object URL, trigger a download via a temporary anchor element, and revoke the URL.

#### Scenario: Download QR code
- **WHEN** user clicks "Save" with a valid QR displayed
- **THEN** an SVG file downloads with name `croc-code-<sanitized-code>.svg`
