# Apex Racing

Apex Racing is a browser-based 3D circuit racing game built with React, Three.js, React Three Fiber, and Rapier. It combines responsive arcade handling with rigid-body physics, AI rivals, race timing, and three distinct stylized circuits.

## Highlights

- Single Race mode with a four-car grid: the player and three AI opponents
- Time Trial mode focused on clean laps and personal bests
- Three circuit identities with track-specific scenery and lighting
- Arcade handling backed by Rapier rigid-body collision and recovery logic
- AI corner-speed control, traffic awareness, and stuck recovery
- Chase camera, minimap, checkpoints, live position, lap timing, gear, RPM, and wrong-way feedback
- Procedural Web Audio engine sound that responds to speed and RPM
- Keyboard and multitouch controls
- Low, medium, and high graphics presets for render scale and shadows

## Circuits

| Circuit | Inspiration | Character |
| --- | --- | --- |
| Apex Grand Prix | Bahrain / Sakhir | Wide desert circuit with floodlit grand-prix atmosphere |
| Harbour Street | Monaco | Tight harbour-side street racing with barriers and close scenery |
| Temple Speedway | Monza | Fast parkland circuit with long straights and historic racing character |

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

## Controls

| Input | Action |
| --- | --- |
| `W` or `↑` | Accelerate |
| `S` or `↓` | Brake, then reverse |
| `A` / `D` or `←` / `→` | Steer |
| `Space` | Brake |
| `R` | Recover the car to the starting grid |
| `Esc` | Pause or resume |

On touch devices, use the on-screen steering, throttle, brake/reverse, recovery, and pause controls. Multitouch allows steering and pedal input at the same time.

## Quality checks

```bash
npm test
npm run lint
npm run build
```

## Project layout

- `src/App.jsx` — 3D scene and game-flow composition
- `src/components/Car.jsx` — player controls, vehicle physics, collision recovery, and chase camera
- `src/components/Opponents.jsx` — AI vehicle behavior and race progress
- `src/components/Track.jsx` — circuit geometry, colliders, and track-side scenery
- `src/store/gameStore.js` — race state, timing, settings, and telemetry
- `src/ui/` — menus, HUD, pause screen, and results
- `src/utils/` — track data, audio, visual cues, and shared helpers
- `src/test/` — gameplay, physics, UI, and regression tests

## Disclaimer

Apex Racing is an independent fan-made project. It is not affiliated with, endorsed by, or sponsored by Formula 1, the FIA, the referenced circuits, or their owners. Circuit names and visual references are used only to describe creative inspiration.

No license has been granted for reuse or redistribution.
