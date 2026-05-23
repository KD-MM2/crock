## Context

Theme is managed by a React context provider that adds/removes `light` or `dark` classes on `<html>`. System mode watches `prefers-color-scheme`. Language uses `react-i18next` with `i18next` core, initialized once at module load with JSON bundles imported directly (not fetched).

## Goals / Non-Goals

**Goals:**
- Three themes: light, dark, system (follows OS)
- Theme persisted to localStorage
- Three languages: vi (default), en, ja
- Language changeable in settings without page reload
- All UI strings externalized to JSON bundles

**Non-Goals:**
- Custom theme colors or CSS variable editing
- RTL language support
- Lazy-loaded translation chunks

## Decisions

1. **CSS class toggling over CSS-in-JS theming** — Tailwind's `dark:` variant works by detecting the `dark` class on `<html>`. Adding/removing the class is sufficient.

2. **i18next with bundled JSON over dynamic imports** — The 3 language files are small enough to bundle. Dynamic imports would add complexity without meaningful benefit.

3. **`useSuspense: false`** — Prevents i18next from triggering React Suspense on language load, since translations are imported synchronously.

4. **Default language is Vietnamese** — Matches the primary author's locale. Falls back to vi for missing keys.
