## ADDED Requirements

### Requirement: Typed API accessor
`getWindowApi()` in `src/lib/window-api.ts` SHALL return the typed `window.api` when running in Electron. It SHALL throw an error if `window.api` is absent. A static `api` export SHALL provide a fallback reference that is an empty object cast to `WindowApi` when `window.api` is unavailable.

#### Scenario: Running in Electron
- **WHEN** `getWindowApi()` is called and `window.api` exists
- **THEN** the real typed API object is returned (cached on first access)

#### Scenario: Running outside Electron
- **WHEN** `getWindowApi()` is called and `window.api` is absent
- **THEN** an error is thrown: "window.api is not available. Ensure the preload script is loaded."

### Requirement: Window API caching
The first successful call to `getWindowApi()` SHALL cache the result. Subsequent calls SHALL return the cached reference without re-checking `window.api`.

#### Scenario: Repeated access
- **WHEN** `getWindowApi()` is called twice in the same session
- **THEN** the second call returns the cached reference from the first call
