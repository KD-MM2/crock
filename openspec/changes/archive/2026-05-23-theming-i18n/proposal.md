## Why

Crock UI must support light, dark, and system-following themes for user comfort, and Vietnamese, English, and Japanese translations to serve an international user base. Both systems must be configurable via settings and apply without requiring app restart.

## What Changes

- **ThemeProvider** applies light/dark class to `<html>`, respects system preference via `prefers-color-scheme` media query, and persists choice to localStorage
- **react-i18next** initialization with vi (default), en, and ja resource bundles
- **Settings integration** — theme and language selectors in General settings tab, applied on save
- **Translation JSON bundles** in `src/locales/<lang>/translation.json` covering all UI strings

## Capabilities

### New Capabilities
- `theme-system`: Light/dark/system theme with CSS class toggling and localStorage persistence
- `internationalization`: react-i18next with 3 language bundles, settings integration

### Modified Capabilities
<!-- No existing specs to modify. -->

## Impact

- `src/providers/theme.tsx` — ThemeProvider with localStorage and system detection
- `src/lib/i18n.ts` — i18next initialization with resource imports
- `src/locales/{en,ja,vi}/translation.json` — translation bundles
- `src/components/mode-toggle.tsx` — theme toggle component
- `src/components/settings/general-tab.tsx` — language and theme selectors
