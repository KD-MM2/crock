## ADDED Requirements

### Requirement: GitHub release fetching
`CrocBinaryManager` SHALL fetch the latest release from `schollz/croc` GitHub API, selecting the asset matching the current platform and architecture.

#### Scenario: Fetch latest release
- **WHEN** `ensure()` is called without a version
- **THEN** the latest release is fetched, the correct platform asset is downloaded, and the binary is extracted

### Requirement: Version pinning
When `settings.binary.crocVersion` is set, the manager SHALL download that specific version. If the version is unavailable or fails, it SHALL fall back to the latest release.

#### Scenario: Pinned version available
- **WHEN** `crocVersion` is set to `v10.2.5` in settings
- **THEN** version v10.2.5 is downloaded and used

#### Scenario: Pinned version fails
- **WHEN** the pinned version cannot be downloaded
- **THEN** the latest release is used as fallback

### Requirement: SHA256 verification
Downloaded assets SHALL be verified against their published SHA256 checksum before extraction.

#### Scenario: Checksum mismatch
- **WHEN** the downloaded file's SHA256 doesn't match the published checksum
- **THEN** the download is rejected and an error is reported

### Requirement: Platform-specific asset selection
The manager SHALL select the correct asset based on `process.platform` and `process.arch`, mapping to croc's naming convention for release assets.

#### Scenario: Windows x64
- **WHEN** running on Windows x64
- **THEN** the Windows AMD64 asset is selected

### Requirement: Binary cache manifest
A `manifest.json` in `<userData>/bin` SHALL track the installed binary path, version, and checksum.

#### Scenario: Binary already cached
- **WHEN** the requested version is already cached and valid
- **THEN** no download occurs; the cached path is returned
