## ADDED Requirements

### Requirement: Vite dev server with Electron hot-reload
The dev script SHALL launch Vite and Electron together via `vite-plugin-electron`. Changes to renderer, main, or preload code SHALL trigger hot-reload without manual restart.

#### Scenario: Renderer code change
- **WHEN** a `.tsx` file in `src/` is edited during `pnpm dev`
- **THEN** the renderer reloads with the updated code

#### Scenario: Main process code change
- **WHEN** a `.ts` file in `electron/` is edited during `pnpm dev`
- **THEN** the main process restarts automatically

### Requirement: Type-checking before production build
The `pnpm build` script SHALL run `tsc` to validate all TypeScript before Vite bundling and electron-builder packaging.

#### Scenario: Build with type errors
- **WHEN** `pnpm build` is run and TypeScript errors exist
- **THEN** the build fails before any bundling or packaging occurs

### Requirement: Platform-specific package output
The build SHALL use `electron-builder` with configuration from `electron-builder.json5` to produce platform-specific installers (NSIS for Windows, DMG for macOS, AppImage for Linux).

#### Scenario: Windows build
- **WHEN** `pnpm build:win` is run
- **THEN** a Windows installer is generated in the `dist/` directory

### Requirement: Environment-aware public path
The app SHALL resolve static assets from `public/` in dev mode and from `dist/` in production mode, using `VITE_DEV_SERVER_URL` to detect the environment.

#### Scenario: Dev mode asset loading
- **WHEN** `VITE_DEV_SERVER_URL` is set
- **THEN** `process.env.VITE_PUBLIC` points to the `public/` directory
