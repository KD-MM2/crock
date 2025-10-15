# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2025-10-15

### Added

- Deep link support for receiving files via custom protocol
- Table component implementation for better data display
- Loading fallback component with enhanced suspense handling
- Network tab for managing relay and proxy settings with testing functionality
- Security tab for configuring security-related settings (curve selection, validation options)
- Complete phonetic alphabet words list for code generation
- GitHub publish configuration to electron-builder

### Changed

- Refactored settings tabs and components for improved organization
  - Merged MiscTab into NetworkTab and SecurityTab
  - Updated AboutTab and AdvancedTab components for better layout and UX
- Configured manual chunks for better code splitting
- Separated components for improved maintainability
- Adjusted format printWidth and reformatted entire codebase
- Added @trivago/prettier-plugin-sort-imports for better import organization
- Disabled drag-and-drop support due to Electron security limits
- Separated file and folder selection with updated UI texts and translations
- Removed console logs and streamlined bootstrap process
- Removed CapabilityDetector and implemented hard-coded capabilities for croc
- Upgraded dependencies to latest versions

### Fixed

- History view brush-up and improvements
- Invalid Vite configuration object
- Various lint errors
- UI text consistency across translations (English, Japanese, Vietnamese)

### Documentation

- Updated README with revised roadmap and known issues

## [0.1.0] - 2025-10-10

Initial release.

[0.1.1]: https://github.com/KD-MM2/crock/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/KD-MM2/crock/releases/tag/v0.1.0
