## ADDED Requirements

### Requirement: Parse croc help output
`getCapabilities()` SHALL run `croc --help` and parse the output to detect supported flags (e.g., `--curve`, `--exclude`, `--no-compress`). Detected capabilities SHALL be returned as a typed object.

#### Scenario: Curve support detected
- **WHEN** croc's help output includes `--curve` flag
- **THEN** the capabilities object includes curve support with available options

### Requirement: Apply capabilities to settings
Detected capabilities SHALL be merged into the settings store at bootstrap, enabling or disabling UI controls based on what the installed croc version supports.

#### Scenario: Feature gated by capability
- **WHEN** the installed croc version does not support `--exclude`
- **THEN** the exclusion pattern UI is hidden in settings and session overrides
