# Browser validation — 2026-09-06

Status: **Verified for the requested scope**. No deployment or commit was made.
Baseline: repository HEAD `fcac61e`, rebuilt with the existing installed dependencies.
The comparison build is the working tree containing the changes below.

## Changes

| Files | Result |
| --- | --- |
| `src/store/gameStore.js`, `src/store/gameStore.personalBest.test.js` | Catch storage getter, read and write failures; allow startup and completion with personal bests retained in memory. Six regression cases added. |
| `README.md` | Document fixed high graphics, audio-volume settings, and recovery to the accepted checkpoint or initial grid. |
| `src/App.jsx`, `src/components/LazyRaceScene.jsx`, `src/components/RaceScene.jsx`, `src/components/RaceSceneBoundary.jsx` | Load the race scene on demand; start the countdown after scene/physics readiness; provide loading cancellation and download-error recovery. |
| `vite.config.js` | Keep the existing vendor classifications, disable recursive dependency capture and preserve execution order so the menu does not preload Rapier. |
| `src/index.css` | Tighten HUD spacing at widths ≤360px to prevent clipped timing text and wrapped lap counts. |
| `src/test/raceLoading.test.jsx`, `src/test/setup.js` | Verify the cold lazy boundary; retain synchronous controller integration coverage using an eagerly loaded scene mock. |
| `scripts/browser-check.mjs`, `package.json`, `TESTING.md` | Add repeatable production-browser smoke checks and initial-load measurements without adding game dependencies. |

## Initial-load measurement

Linux/WSL2, Chromium **151.0.7922.108**, headless SwiftShader, viewport 1280×720.
Each build used five fresh browser contexts, disabled HTTP cache, gzip responses,
40ms simulated latency and 10Mbps download bandwidth. Runs were sequential.
Menu readiness is a DOM-presence timestamp sampled after two animation frames;
first contentful paint is reported separately. Neither metric measures driving FPS.

| Metric (median of 5) | Before | After | Reduction |
| --- | ---: | ---: | ---: |
| Menu DOM readiness | 1,217.9 ms | 485.3 ms | 60.2% |
| First contentful paint | 1,264.0 ms | 572.0 ms | 54.7% |
| Initial compressed JavaScript | 1,207,124.0 bytes | 316,516.0 bytes | 73.8% |

Raw timing samples, in milliseconds:

| Run | Before menu | After menu | Before FCP | After FCP |
| --- | ---: | ---: | ---: | ---: |
| 1 | 1243.8 | 442.4 | 1520 | 824 |
| 2 | 1211.3 | 548.0 | 1260 | 628 |
| 3 | 1225.3 | 485.3 | 1268 | 532 |
| 4 | 1204.6 | 503.6 | 1252 | 572 |
| 5 | 1217.9 | 482.5 | 1264 | 560 |

Initial JavaScript response bytes were identical within each build's five runs.
The final menu requests no `RaceScene-*`, `rapier-core-*` or `rapier-react-*` chunk.
The first race downloads the deferred scene, physics runtime and circuit assets
before its countdown. Measurements cover the menu benefit; they do not establish
first-race loading time or mobile GPU performance.

## Functional verification

- `npm run verify`: lint, **62 test files / 610 tests**, and production build passed.
- The focused cold-loading test, lint and build also passed after the final loading-message adjustment.
- Independent read-only review found no outstanding blocking defect after the loading-error boundary and narrow HUD correction.

Production browser matrix (all passed):

| Track | Viewport | Input |
| --- | --- | --- |
| Apex Grand Prix | 1280×720 | Keyboard |
| Harbour Street | 1280×720 | Keyboard |
| Temple Speedway | 1280×720 | Keyboard |
| Apex Grand Prix | 390×844 | Emulated touch |
| Harbour Street | 320×740 | Emulated touch |
| Temple Speedway | 844×390 | Emulated touch |

Each case denied `window.localStorage` access before app initialization and checked
start → real vehicle movement → pause → resume → restart. Paused position/time,
reset grid position, zero restart speed, a real WebGL2 context, and absence of
uncaught page errors were asserted. Touch cases used native Chromium input events
for simultaneous acceleration/steering and release/cancel. HUD text ranges were
checked against the viewport, in addition to document overflow.

Two additional browser scenarios passed:

1. Hold the race module download past the normal countdown duration, cancel to
   the menu, retry, pause while loading, resume with a full countdown, and enter
   Time Trial with only the player present.
2. Abort the race module download, show the recovery alert, return to the menu,
   then reload and successfully start another race.

The 320px case reproduced timing text outside the visible viewport. After the
CSS correction, the time and lap readouts remain within the screen. The narrow
case and both loading scenarios were checked again after the final message edit.

## Evidence and limits

Commands and runtime setup are documented in [TESTING.md](TESTING.md).
Local JSON results, logs and screenshots are preserved in the ignored
[.screenshots/validation/](.screenshots/validation/) directory. Key files are
`racing-before-metrics.json`, `racing-after-metrics.json`,
`racing-smoke-metrics.json`, `racing-final-narrow-metrics.json`, and `verify.log`.
The raw timing samples above remain in this report if local artifacts are removed.

These checks use real Chromium and Rapier with software rendering and touch
emulation. Physical phones/mobile GPUs, Safari, screen readers and audible output
were not tested. Browser smoke checks do not complete a full lap; storage failures
on completion are covered by the store regression tests. Personal bests remain
session-only when storage is denied. A failed dynamic module import is recovered
by reloading the page.
