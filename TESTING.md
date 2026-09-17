# Testing

The suite is organized by responsibility instead of treating every jsdom
render as end-to-end coverage.

| Command | Contract |
| --- | --- |
| `npm run test:unit` | Pure race rules, geometry helpers, store transitions and input guards |
| `npm run test:ui` | HUD, menu, accessibility, visual LOD and Three.js resource ownership |
| `npm run test:integration` | Player/AI controllers running together through the mocked fixed-step harness |
| `npm run test:regression` | Release-blocking race-integrity regressions: seam ranking, render hitches, recovery and finish |
| `npm run test:qa` | Long-circuit, stress and adversarial scenarios |
| `npm run verify` | Lint, full suite and production build |
| `npm run verify:browser` | Production build + real Chromium smoke and full-lap checks |
| `npm run test:browser` | Production Chromium/WebGL driving flow, touch input and deferred-loading recovery (requires a build and Playwright runtime) |
| `npm run test:browser:lap` | Keyboard-driven full Time Trial lap on each circuit, ordered checkpoints, completion and persistent records after reload |
| `npm run measure:race` | Five first-race loading measurements per track against an existing production build |

## Test boundaries

- Files under `src/utils` and `src/store` are deterministic unit tests.
- Files under `src/ui` and `src/components` verify DOM contracts, accessibility
  state and scene complexity. R3F intrinsic nodes are represented by jsdom
  elements; expected renderer-mismatch warnings are filtered in `setup.js`.
- Files under `src/test` are integration or QA tests. `triggerFrames` models
  render callbacks, while `triggerFixedPhysicsSteps` models Rapier's 60 Hz
  accumulator explicitly.
- Controller integration tests eagerly load `RaceScene` through the shared
  mock so fixed-step assertions remain synchronous. `raceLoading.test.jsx`
  uses the real lazy boundary and holds its module download to check countdown
  and pause behavior. `raceCountdown.test.jsx` additionally holds back the HUD
  after scene readiness: the timer starts only when the overlay has committed.
- Most Vitest tests do not cover real WebGL or browser layout. The
  `rapierTrimeshCcd.regression.test.js` cases do run the actual Rapier runtime.
  Before release, verify the three tracks at desktop, 390 px portrait, 320 px
  portrait and landscape, including a real mobile GPU and screen reader pass.

## Production browser checks

`scripts/browser-check.mjs` serves the production build on a temporary loopback
port, launches headless Chromium with SwiftShader, and closes both after the run.
Playwright is pinned as a development dependency and does not ship with the game.
After `npm ci`, install its matching browser with `npx playwright install chromium`
(on Linux CI use `npx playwright install --with-deps chromium`).
Set `PLAYWRIGHT_MODULE` to its absolute `index.mjs` path if needed. Optionally
set `CHROMIUM_EXECUTABLE` and
`CHROMIUM_LIBRARY_PATH` for an existing Linux browser and its shared libraries.

```bash
npm run build
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs npm run test:browser
```

You can run the integrated browser verification with:

```bash
npm run verify:browser
```

The smoke checks cover all three tracks at 1280×720, plus Apex at 390×844,
Harbour at 320×740 and Temple at 844×390 with Chromium touch emulation. They
check real vehicle movement, pause stability, resume, grid reset, simultaneous
throttle/steering touches, release/cancel, and viewport overflow. Storage access
is denied from page initialization in these six cases. Separate cases cover
delayed race downloads, cancel/retry, pause during loading, Time Trial without
AI, and a failed download followed by reload recovery. Storage writes on race
completion are covered by the store tests, not by simulated browser finishes.

`npm run test:browser:lap` additionally drives a full Time Trial lap on all three
circuits in production Chromium. The test driver follows sampled circuit geometry
through keyboard events and reads the existing minimap telemetry and HUD. It does
not teleport the car, write the game store, invoke checkpoint/finish actions or
override physics/time. It checks every checkpoint in order, physical distance
travelled, a saved lap matching the result screen, and the same personal best
after reloading the application. These cases use available storage; denied
storage remains covered by smoke and store tests. This does not cover a full
four-car race or physical mobile devices.

Each circuit has a ten-minute wall-clock timeout. To diagnose one circuit:

```bash
BROWSER_TRACK=apex_gp npm run test:browser:lap
```

Other ids are `harbour_street` and `temple_speedway`. JSON diagnostics are saved
alongside the existing smoke results, including a screenshot on failure.

`.github/workflows/verify.yml` runs on pushes and pull requests. It runs
`npm run verify`, then tests that exact build with Chromium smoke and full-lap
checks. The production build and browser results are retained as CI artifacts
for seven days; browser results are also uploaded on failure. CI installation
uses the lockfile and the browser revision belonging to the pinned Playwright.

This is real Chromium/WebGL with emulated touch and software rendering, not a
physical mobile GPU, Safari, screen-reader or audio-output test.

For a repeatable initial-load comparison, preserve the old build before changing
code, then measure both builds with the same runtime:

```bash
# Before changing code:
npm run build
cp -a dist /tmp/apex-before
# After changing code and rebuilding:
node scripts/browser-check.mjs measure /tmp/apex-before before
node scripts/browser-check.mjs measure dist after
```

Export the same Playwright/browser environment variables for both measurements.
Each measurement uses five fresh browser contexts, disabled cache, gzip,
40 ms latency and 10 Mbps download bandwidth at 1280×720. Results contain first
contentful paint, menu DOM readiness sampled after two animation frames, and
compressed JavaScript response bytes. Menu readiness is not an input-latency or
GPU performance measurement. JSON results and screenshots go to `/tmp`, or to
`BROWSER_OUTPUT_DIR` when set. See `BROWSER_VALIDATION.md` for the recorded run.

## First-race loading measurements

Build once, then run `npm run measure:race`. Each track uses five fresh browser
contexts with HTTP cache disabled, 40 ms latency, 10 Mbps download bandwidth and
a 1280×720 viewport. No CPU throttling is applied. Use `BROWSER_TRACK=apex_gp`
to measure one circuit. Do not run other CPU/GPU-heavy checks concurrently.

```bash
npm run build
npm run measure:race
# Compare a preserved build with the same current measurement script:
node scripts/browser-check.mjs measure-race /tmp/apex-before first-race-before
node scripts/browser-check.mjs measure-race dist first-race-after
```

JSON results include all samples, resource download timings/encoded bytes and
per-track minimum, median and maximum. Time zero is the captured Start Race
click. The milestones are:

- `clickToCountdownMs`: first observed committed HUD, after scene/physics
  readiness. This is DOM availability, not proof of a fully painted 3D scene.
- `clickToPlayingMs`: first animation-frame observation of player telemetry
  and an advancing HUD clock. The clock is sampled at 15 Hz, so this is an
  observable upper bound on input availability, not an exact store transition.
- `clickToMovementMs`: first observed movement of more than 0.1 m under held
  throttle. This includes input dispatch, acceleration and observation delay.
- `jsDownloadEndMs` and `imageDownloadEndMs`: last deferred JS/image response
  relative to the click. Image download completion does not imply GPU upload
  or shader readiness. Menu/selected-sky downloads finish before the click.
- `postJsToCountdownMs`: elapsed time between the last JS response and HUD
  readiness. It combines module evaluation, physics initialization, geometry,
  React work and rendering delays; it is not a separate physics benchmark.
- `longTaskMs`: main-thread long-task time overlapping click→playing. It
  overlaps the other intervals and must not be added to download/setup times.
- `fullCountdownVisible`: the observer saw `3`, `2`, `1` in order. Missing
  cues are recorded so broken baseline builds can still be compared.
- `countdownDurationPreserved`: at least 2.9 seconds elapsed from observed HUD
  readiness to playing (three seconds minus 100 ms observation tolerance).

The normal three-second countdown is included in click→playing and reported
separately as `countdownToPlayingMs`; do not treat it as loading overhead.
These measurements use SwiftShader and do not establish real-GPU or mobile
performance. Physics initialization and first-frame GPU work are not separately
instrumented. Failed input/loading assertions still fail the measurement run;
countdown anomalies remain visible in its samples and summary.

## Release-blocking scenarios

1. A standing-grid score must remain monotonic through the first seam.
2. A 100–500 ms render hitch must not freeze AI checkpoint progress.
3. A physically plausible suspended frame crossing the finish seam must be
   confirmed once after re-anchoring.
4. Manual recovery must return to the actual accepted checkpoint pose.
5. AI recovery time, personal best persistence and repeated Escape input must
   remain monotonic and idempotent.
