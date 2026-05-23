## ADDED Requirements

### Requirement: i18next initialization
`i18next` SHALL be initialized with `react-i18next` at module load, using JSON resources for vi (default), en, and ja. Interpolation escape SHALL be disabled for React compatibility.

#### Scenario: App starts with Vietnamese
- **WHEN** the app loads with default settings
- **THEN** all UI strings render in Vietnamese

### Requirement: Language switching
Changing the language in settings SHALL call `i18next.changeLanguage()` and all UI strings SHALL update immediately without page reload.

#### Scenario: Switch to English
- **WHEN** user selects "English" in settings and saves
- **THEN** all UI strings switch to English

### Requirement: Translation key convention
Translation keys SHALL use dot-notation namespacing (e.g., `transfer.send.title`, `settings.general.language`). The `useTranslation()` hook SHALL provide the `t()` function.

#### Scenario: Translated UI string
- **WHEN** a component renders `{t('transfer.send.title')}`
- **THEN** the correct translation string is displayed for the current language

### Requirement: Fallback language
When a translation key is missing in the current language, i18next SHALL fall back to Vietnamese (vi).

#### Scenario: Missing Japanese translation
- **WHEN** a key is missing in ja/translation.json
- **THEN** the Vietnamese translation is used instead
