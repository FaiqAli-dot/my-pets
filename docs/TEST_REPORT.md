# Test Report — Desktop Pet Companion MVP

Date: 2026-10-13  
Primary target: **macOS** (menu bar / transparent overlay / `.dmg`)  
CI / agent environment: **Linux x64 cloud VM** (no macOS GUI, no Apple code signing)

## Automated tests (vitest)

Command: `npm test`  
**Result: 20/20 passed** (bounds, behavior, persistence) on Linux Node 22.

| Area | Coverage |
|------|----------|
| Bounds clamping / validity | `src/test/bounds.test.ts` |
| Wander destination selection | `src/test/bounds.test.ts` |
| Elapsed-time movement + angle lerp | `src/test/bounds.test.ts` |
| Display / work-area resolution | `src/test/bounds.test.ts` |
| State transitions (IDLE→WANDER/SLEEP/REACT/DRAGGED) | `src/test/behavior.test.ts` |
| Personality parameter differences | `src/test/behavior.test.ts` |
| Drag vs click classification | `src/test/behavior.test.ts` |
| Hover does not wake sleep | `src/test/behavior.test.ts` |
| Persistence normalize/patch | `src/test/persistence.test.ts` |
| Missing animation clip fallbacks | `src/test/persistence.test.ts` |

Gobkit GLB clip names were verified offline by parsing the GLB JSON chunk for `Corgi.glb`: `idle`, `attack`, `dead`, `walk` (separate named clips).

## Platform behaviors

| Behavior | Tested here? | Notes |
|----------|--------------|-------|
| Unit logic (bounds, FSM, prefs, clips) | **Yes** (Linux) | Fully automated |
| TypeScript compile / Vite build | **Yes** (Linux) | `npm run build` / `typecheck` |
| macOS `.zip` packaging | **Yes (Linux CI)** | `electron-builder --mac zip` produced unsigned `release/Desktop Pet Companion-0.1.0-arm64.zip` (and x64). Code signing skipped (macOS-only). |
| macOS `.dmg` packaging | **Not on Linux** | `dmg-license` / DMG tooling requires Darwin. Run `npm run dist:mac` on a Mac for `.dmg`. |
| Transparent overlay compositing | **Not on macOS** | Requires macOS window server |
| `setIgnoreMouseEvents({ forward })` click-through | **Not on macOS** | Must be verified on a Mac desktop |
| Menu bar tray + `LSUIElement` | **Not on macOS** | Implemented; needs Mac smoke test |
| Launch at login | **Not on macOS** | Uses `app.setLoginItemSettings` |
| Multi-display clamp | Partial | Logic unit-tested; display hotplug needs real hardware |
| Windows installer / click-through | **Not tested** | `dist:win` available for later |

## Manual checklist (run on a Mac)

1. `npm install && npm run dist:mac`
2. Install from `.dmg`, launch app
3. Complete setup (preview clips, name, confirm)
4. Confirm transparent pet (no grey rectangle) and always-on-top
5. Wander within desktop bounds; sleep; hover glance; click react; drag move
6. Move mouse through empty overlay area — desktop should remain usable (click-through)
7. Open settings from menu bar / double-click pet; rename; change personality; quit

## Known limitations

- Cloud Linux cannot fully certify macOS click-through, vibrancy, or Gatekeeper UX
- Builds are **unsigned** (`build.mac.identity: null`) until a Developer ID is configured
- No sleep clip in Gobkit pack — sleep uses slowed `idle` + procedural bob
- Windows remains a secondary packaging target (`npm run dist:win`)
