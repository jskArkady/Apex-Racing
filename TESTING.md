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
| `npm run verify:browser` | Production build + real Chromium smoke checks |
| `npm run test:browser` | Production Chromium/WebGL driving flow, touch input and deferred-loading recovery (requires a build and Playwright runtime) |

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
  and pause behavior.
- Most Vitest tests do not cover real WebGL or browser layout. The
  `rapierTrimeshCcd.regression.test.js` cases do run the actual Rapier runtime.
  Before release, verify the three tracks at desktop, 390 px portrait, 320 px
  portrait and landscape, including a real mobile GPU and screen reader pass.

## Production browser checks

`scripts/browser-check.mjs` serves the production build on a temporary loopback
port, launches headless Chromium with SwiftShader, and closes both after the run.
It reuses an installed Playwright runtime; no browser package ships with the game.
If Playwright is installed as a dependency, the script resolves it automatically.
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

If Playwright is missing, run:

```bash
npm i -D playwright
npx playwright install chromium
```

The smoke checks cover all three tracks at 1280×720, plus Apex at 390×844,
Harbour at 320×740 and Temple at 844×390 with Chromium touch emulation. They
check real vehicle movement, pause stability, resume, grid reset, simultaneous
throttle/steering touches, release/cancel, and viewport overflow. Storage access
is denied from page initialization in these six cases. Separate cases cover
delayed race downloads, cancel/retry, pause during loading, Time Trial without
AI, and a failed download followed by reload recovery. Storage writes on race
completion are covered by the store tests, not by simulated browser finishes.

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

## Release-blocking scenarios

1. A standing-grid score must remain monotonic through the first seam.
2. A 100–500 ms render hitch must not freeze AI checkpoint progress.
3. A physically plausible suspended frame crossing the finish seam must be
   confirmed once after re-anchoring.
4. Manual recovery must return to the actual accepted checkpoint pose.
5. AI recovery time, personal best persistence and repeated Escape input must
   remain monotonic and idempotent.
