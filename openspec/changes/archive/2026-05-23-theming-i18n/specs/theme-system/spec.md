## ADDED Requirements

### Requirement: Theme class toggling
ThemeProvider SHALL add `light` or `dark` class to `<html>` based on the current theme selection. In `system` mode, it SHALL follow the OS `prefers-color-scheme` media query.

#### Scenario: Dark theme selected
- **WHEN** user selects dark theme
- **THEN** `<html>` has class `dark` and not `light`

#### Scenario: System theme follows OS
- **WHEN** theme is "system" and OS switches to dark mode
- **THEN** `<html>` class updates to `dark`

### Requirement: Theme persistence
Theme choice SHALL be persisted to localStorage under the `vite-ui-theme` key. On app restart, the persisted theme SHALL be restored.

#### Scenario: Theme survives reload
- **WHEN** user sets theme to "dark" and reloads
- **THEN** the app loads with dark theme

### Requirement: Theme context
A React context (`ThemeProviderContext`) SHALL provide `theme` and `setTheme` to all child components via `useTheme` hook.

#### Scenario: Component reads current theme
- **WHEN** a component calls `useTheme()`
- **THEN** it receives `{ theme, setTheme }` from context
