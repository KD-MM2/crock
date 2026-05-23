## Context

The croc binary is downloaded from GitHub releases (`schollz/croc`), cached in `<userData>/bin`, and managed with a manifest file tracking versions and checksums. At bootstrap, the app ensures a binary is available — preferring the user's pinned version, falling back to the latest compatible release.

## Goals / Non-Goals

**Goals:**
- Fetch GitHub releases and select the correct platform/arch asset
- Download, extract (tar.gz or zip), and verify SHA256
- Cache binaries with version manifest
- Detect installed version
- Pin to specific version via settings

**Non-Goals:**
- Auto-update (users configure version pinning)
- Build croc from source
- Multi-binary management (only one croc binary at a time)

## Decisions

1. **GitHub Releases API over git clone** — Pre-built binaries are faster and smaller. No build toolchain needed on the user's machine.

2. **Manifest file over directory scanning** — A JSON manifest tracks installed version, path, and checksum. Faster than scanning directories on each start.

3. **Fallback chain**: preferred version → latest release → system PATH — Provides maximum availability.

4. **5-minute cache for release list** — Avoids hitting GitHub API rate limits on rapid restarts.
