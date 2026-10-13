# Desktop Pet Companion

macOS-first Electron desktop pet: a transparent, always-on-top companion that wanders your desktop. Built with **Electron + TypeScript + Three.js + Vite + electron-builder**.

Pet art: **Gobkit Free Animal Pack** (CC0 1.0). See [`assets/pets/gobkit/ATTRIBUTION.md`](assets/pets/gobkit/ATTRIBUTION.md).

## Features (MVP)

- First-launch setup: browse pets, preview animations, name, personality → pet appears on the desktop
- Transparent frameless overlay (menu-bar / tray app, no Dock icon while running)
- Behavior states: `IDLE`, `WANDER`, `SLEEP`, `REACT`, `DRAGGED`
- Personalities: Playful, Relaxed, Shy (data-driven)
- Hover / click / drag interactions with click-through when not interacting
- Settings (tray or double-click / right-click pet): change pet, rename, personality, activity, pause, hide, launch at login, quit
- Local JSON preferences in the app `userData` directory
- Sandboxed renderer + `contextIsolation` + narrow preload bridge

## Requirements

- Node.js 20+ (22 recommended)
- npm 10+
- **macOS** for a native `.dmg` / menu-bar verification
- Optional: Windows for `npm run dist:win` later

## Install

```bash
npm install
```

## Develop

```bash
npm run dev
```

## Test

```bash
npm test
npm run typecheck
```

See [`docs/TEST_REPORT.md`](docs/TEST_REPORT.md) for what was verified in CI vs what needs a Mac.

## Build (macOS) — preferred

On a Mac:

```bash
# Unsigned .dmg + .zip for arm64 and x64
npm run dist:mac
```

Artifacts land in `release/`:

- `Desktop Pet Companion-0.1.0.dmg` (and arch-specific names if configured)
- `Desktop Pet Companion-0.1.0-arm64.zip` / `-x64.zip`

Open the `.dmg`, drag the app to Applications. **Unsigned builds:** right-click → Open the first time (Gatekeeper), or:

```bash
xattr -cr "/Applications/Desktop Pet Companion.app"
```

Code signing / notarization are not configured (`identity: null`). Add an Apple Developer identity in `package.json` → `build.mac` when you are ready to ship signed.

### Unpackaged Mac build (faster)

```bash
npm run dist:mac:dir
# → release/mac*/*.app
```

## Windows (optional, later)

```bash
npm run dist:win
# → release/*-Setup.exe
```

Architecture is cross-platform; Windows packaging is configured but not the primary delivery path.

## Project layout

```
src/main/          Electron main: windows, tray, IPC, persistence, pet-asset protocol
src/preload/       contextBridge API only
src/shared/        pets, personalities, behavior, bounds, persistence helpers
src/renderer/      overlay (Three.js), setup wizard, settings UI
src/test/          vitest unit tests
assets/pets/gobkit Gobkit CC0 GLBs + attribution
```

## License

App code: MIT (see repository).  
Gobkit models: CC0 1.0 (public domain) — attribution optional.
