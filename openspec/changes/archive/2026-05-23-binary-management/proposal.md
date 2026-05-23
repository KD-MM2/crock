## Why

Crock UI bundles the croc CLI binary for the current platform and must keep it up to date. Users need to download specific versions from GitHub releases, handle cross-platform binary selection, verify integrity, and pin versions — all without leaving the app.

## What Changes

- **CrocBinaryManager** fetches GitHub releases, selects platform-appropriate assets, downloads and extracts binaries, verifies SHA256 checksums, and manages a version manifest
- **Bootstrap integration** ensures a croc binary is available on app start (or falls back to a compatible version)
- **Capability detection** queries croc `--help` output to determine supported flags and features
- **Version pinning** via settings allows users to lock to a specific croc version

## Capabilities

### New Capabilities
- `binary-download`: GitHub release fetching, asset selection, download, extraction, and verification
- `capability-detection`: Parse croc `--help` output to determine supported CLI flags

### Modified Capabilities
<!-- No existing specs to modify. -->

## Impact

- `electron/services/CrocBinaryManager.ts` — ensure(), download, extract, verify, version detection
- `electron/services/CrocCapabilities.ts` — parse help output for flag support
- `electron/main.ts` — bootstrap binary manager, apply capabilities to settings
- `electron/types/release.ts` — GitHub API response types
- `electron/types/capabilities.ts` — capability snapshot types
