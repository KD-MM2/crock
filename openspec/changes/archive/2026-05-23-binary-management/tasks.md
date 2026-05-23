## 1. CrocBinaryManager

- [x] 1.1 Fetch GitHub releases from schollz/croc API
- [x] 1.2 Select platform/arch-appropriate asset from release
- [x] 1.3 Download asset with progress tracking
- [x] 1.4 Extract tar.gz or zip archive
- [x] 1.5 Verify SHA256 checksum against published value
- [x] 1.6 Cache binary in <userData>/bin with manifest.json
- [x] 1.7 Implement version pinning with fallback chain
- [x] 1.8 Implement version detection from binary

## 2. Capability Detection

- [x] 2.1 Run `croc --help` and parse flag output
- [x] 2.2 Detect curve support (p256, p384, p521, siec)
- [x] 2.3 Detect other optional flags (exclude, no-compress)
- [x] 2.4 Return typed Capabilities object

## 3. Bootstrap Integration

- [x] 3.1 Ensure binary availability on app start
- [x] 3.2 Apply capabilities to settings store
- [x] 3.3 Report detected version to settings
