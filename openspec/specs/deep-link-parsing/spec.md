## ADDED Requirements

### Requirement: Parse croc:// URLs
`DeepLinkManager.parseUrl()` SHALL parse `croc://` URLs into structured data with `action`, `code`, and optional `relay` and `password` parameters. Invalid URLs SHALL return `valid: false` with an error message.

#### Scenario: Valid receive URL
- **WHEN** `parseUrl('croc://receive?code=7243-aurora-ceiling-collect')` is called
- **THEN** it returns `{ valid: true, data: { action: 'receive', code: '7243-aurora-ceiling-collect' } }`

#### Scenario: Missing code parameter
- **WHEN** `parseUrl('croc://receive')` is called
- **THEN** it returns `{ valid: false, error: 'Missing required parameter: code' }`

#### Scenario: Code too short
- **WHEN** `parseUrl('croc://receive?code=abc')` is called
- **THEN** it returns `{ valid: false, error: 'Invalid code format: too short' }`

#### Scenario: Unsupported action
- **WHEN** `parseUrl('croc://send?code=test')` is called
- **THEN** it returns `{ valid: false }` with an unsupported action error

### Requirement: Optional relay and password
The parser SHALL extract optional `relay` and `password` query parameters when present.

#### Scenario: URL with relay and password
- **WHEN** `parseUrl('croc://receive?code=test-code&relay=example.com:9009&password=secret')` is called
- **THEN** the data includes `relay: 'example.com:9009'` and `password: 'secret'`
