# Apex Racing

Apex Racing is a browser-based 3D circuit racing game built with React, Three.js, React Three Fiber, and Rapier. It combines responsive arcade handling with rigid-body physics, AI rivals, race timing, and four distinct stylized circuits.

## Highlights

- Single Race mode with a four-car grid: the player and three AI opponents
- Time Trial with sector splits, personal-best deltas and a translucent best-lap ghost
- Selectable 1, 3 or 5 laps and Easy / Normal / Hard AI difficulty
- Four-round championship with standings and 10 / 6 / 4 / 2 points
- Four circuit identities with track-specific scenery and lighting
- Arcade handling backed by Rapier rigid-body collision and recovery logic
- AI corner-speed control, traffic awareness, and stuck recovery
- Chase camera, minimap, checkpoints, live position, lap timing, gear, RPM, and wrong-way feedback
- Procedural Web Audio engine, tyre-slip, road/off-road and collision sounds
- Keyboard and multitouch controls
- Fixed high-quality graphics with shadows; settings provide audio volume control

## Circuits

| Circuit | Inspiration | Character |
| --- | --- | --- |
| Apex Grand Prix | Bahrain / Sakhir | Wide desert circuit with floodlit grand-prix atmosphere |
| Harbour Street | Monaco | Tight harbour-side street racing with barriers and close scenery |
| Temple Speedway | Monza | Fast parkland circuit with long straights and historic racing character |
| Silverstone GP | Silverstone | Open airfield circuit with the Arena loop, fast esses and the Hangar straight |

Silverstone preserves the official layout silhouette at game scale, with locally
rounded tight corners for full-width barriers and a flat driving surface. Its
overcast sky, silver pit facade and responsive menu art use generated images;
shared road, grass, kerb and grandstand textures are reused. Generation prompts
and asset hashes are recorded in the two asset manifests.

The circuits are original, stylized interpretations designed for this game. They are not laser-scanned reproductions.

## Requirements

- Node.js `^20.19.0` or `>=22.12.0`
- npm
- A modern browser with WebGL and Web Audio support

## Run locally

```bash
git clone https://github.com/jskArkady/Apex-Racing.git
cd Apex-Racing
npm ci
npm run dev
```

Open the local address printed by Vite.

For a production build:

```bash
npm run build
npm run preview
```

## Race options and records

Select the lap count and AI difficulty beside the mode buttons. Hard preserves
this game's original AI pace; Normal and Easy reduce target speeds and look
further ahead for braking while sharing the player's vehicle physics.

Three sectors end at checkpoints 4, 7 and the finish. The HUD shows the last
sector duration and the cumulative difference against the **same point of the
personal-best lap**, not a prediction or an ideal lap assembled from sectors.
Every completed lap can improve the saved record, including intermediate laps
in a 3- or 5-lap race.

A new best with a complete clean recording saves a ghost locally. Enable
"Personal best ghost" to race it in Time Trial. Playback follows recorded lap
time, freezes on pause, and has no collision body. Existing records without a
recording need a new best to acquire a ghost. Using R invalidates only that lap's
ghost recording; the next lap can be recorded normally. Samples are taken at
up to 10 Hz and capped at 18,000 per lap. If browser storage is unavailable or
full, records remain usable in memory for the current page session.

Championship runs Apex, Harbour, Temple and Silverstone in that order with the selected laps
and difficulty. Each round ends when the player finishes. Completed cars rank by
finish time; remaining cars are classified by accepted checkpoint progress and
checkpoint time. Tied race ranks earn equal points; equal championship totals
share a place. "Next Round" advances, while "Race Again" replaces the current
round result without double-counting points. Quitting to the menu ends the cup;
championship progress is not persisted across page reloads.

## Controls

| Input | Action |
| --- | --- |
| `W` or `↑` | Accelerate |
| `S` or `↓` | Brake, then reverse |
| `A` / `D` or `←` / `→` | Steer |
| `Space` | Brake |
| `R` | Recover to the last accepted checkpoint, or the starting grid before the first checkpoint |
| `Esc` | Pause or resume |

On touch devices, use the on-screen steering, throttle, brake/reverse, recovery, and pause controls. Multitouch allows steering and pedal input at the same time.

## Quality checks

```bash
npm test
npm run lint
npm run build
```

For real Chromium driving, full-lap completion and record persistence checks:

```bash
npx playwright install chromium
npm run verify:browser
```

Pushes and pull requests run the checks through GitHub Actions. See
[TESTING.md](TESTING.md) for browser setup and coverage limits.
After a build, `npm run measure:race` records first-race loading and input
readiness for all circuits under repeatable network conditions.

## Project layout

- `src/App.jsx` — 3D scene and game-flow composition
- `src/components/Car.jsx` — player controls, physics and checkpoint progression
- `src/components/useChaseCamera.js` — camera framing, follow and recovery snaps
- `src/components/GhostCar.jsx` — collision-free best-lap playback
- `src/components/Opponents.jsx` — AI vehicle behavior and race progress
- `src/components/Track.jsx` — composition of track assets, physical surface and scenery
- `src/components/useTrackAssets.js` — geometry/material creation and disposal
- `src/components/TrackSurface.jsx` / `TrackScenery.jsx` — physics and visual rendering boundaries
- `src/utils/racerTelemetry.js` — non-reactive live vehicle samples and read-only browser diagnostics
- `src/store/gameStore.js` — race state, timing, settings, and telemetry
- `src/ui/` — menus, HUD, pause screen, and results
- `src/utils/` — track data, audio, visual cues, and shared helpers
- `src/test/` — gameplay, physics, UI, and regression tests

## Disclaimer

Apex Racing is an independent fan-made project. It is not affiliated with, endorsed by, or sponsored by Formula 1, the FIA, the referenced circuits, or their owners. Circuit names and visual references are used only to describe creative inspiration.

No license has been granted for reuse or redistribution.
