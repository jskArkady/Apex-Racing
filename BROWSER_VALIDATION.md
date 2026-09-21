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

## Follow-up validation — 2026-09-17

Removed the global graphics-quality props and low/medium lighting branches.
The fixed renderer retains the former high settings: 1536 shadow map, all
circuit floodlights, six harbour tunnel lights and the same shadow casters.

Added a pinned Playwright development dependency, full-lap keyboard driver and
GitHub Actions workflow. The workflow runs lint/tests/build, then smoke and lap
checks against the uploaded production build, and retains browser diagnostics.

Local verification used WSL2, Node.js 24.16.0, Chromium 143.0.7499.4 and
SwiftShader. Chromium and its missing Linux libraries were extracted under
`/tmp`; the browser script used `CHROMIUM_EXECUTABLE` and
`CHROMIUM_LIBRARY_PATH`. No system library installation was required.

- `npm run verify`: 62 files / **609 tests**, lint and production build passed.
- Final lint, JavaScript syntax checks and `git diff --check` passed.
- Workflow YAML parsed and package/lockfile dependency declarations matched.
- Production smoke: all six track/viewport cases and both download-recovery
  scenarios passed (eight cases total).
- Full-lap tests ran separately with `BROWSER_TRACK` for each circuit, through
  `node scripts/browser-check.mjs lap`. All passed:

| Circuit | Completed lap | Physical distance observed |
| --- | ---: | ---: |
| Apex Grand Prix | 02:56:520 | 1713.1 m |
| Harbour Street | 01:54:533 | 983.7 m |
| Temple Speedway | 02:19:793 | 1367.3 m |

Every lap accepted checkpoints 1–9 and finish in order, produced a saved record
matching the result screen, and retained that record after page reload. The
driver injected keyboard events and observed existing HUD/minimap telemetry;
it did not write race state, teleport bodies or advance the clock artificially.
The lap times are test-driver results, not gameplay performance benchmarks.

Local evidence is in `/tmp/racing-verify.log`, `/tmp/racing-smoke-metrics.json`,
`/tmp/racing-lap-metrics.json`, `/tmp/racing-harbour-lap-metrics.json` and
`/tmp/racing-temple-lap-metrics.json`. These temporary files are not committed.
The GitHub-hosted workflow has not been run; its Node.js 22 runner remains to
be verified after a push. Full four-car race completion, physical mobile GPUs,
Safari, screen readers and audio output remain outside this browser run.

## First-race loading measurement — 2026-09-17

Added `npm run measure:race` and `scripts/browser-race-loading.mjs`, reusing the
production browser server/runtime. The current script measured the preserved
pre-change build at `/tmp/racing-before-loading` and the corrected build at
`dist`, sequentially, five fresh contexts per track/build (30 samples total).
Both used Chromium 143.0.7499.4, SwiftShader, 1280×720, disabled HTTP cache,
40 ms latency and 10 Mbps download bandwidth without CPU throttling.

All numbers below are medians of five samples, in milliseconds. The playing
milestone includes the intentional countdown and 15 Hz HUD observation delay;
movement includes keyboard dispatch and acceleration to a 0.1 m displacement.

| Track | Before HUD ready | After HUD ready | Before playing | After playing | After movement |
| --- | ---: | ---: | ---: | ---: | ---: |
| Apex Grand Prix | 3186.0 | 3277.1 | 7868.3 | 8916.4 | 9459.1 |
| Harbour Street | 2878.6 | 2935.8 | 6000.2 | 7437.3 | 8013.5 |
| Temple Speedway | 2181.6 | 2320.1 | 5359.0 | 5801.6 | 6066.3 |

The measurement exposed a countdown race: `RaceClock` started its interval in
the physics tree before the HUD committed. The baseline missed the initial `3`
in one Apex sample; two Harbour samples and one Temple sample spent less than
2.9 seconds between observed HUD readiness and playing. The timer now belongs
to the mounted HUD; scene readiness still gates mounting. All 15 corrected
samples observed `3`, `2`, `1` in order and preserved at least 2.9 seconds after
HUD readiness (100 ms tolerance for observation). Longer click-to-playing
times include the restored countdown; these results do not claim a speedup.

The last deferred JavaScript response arrived at roughly 829–839 ms in the
corrected-build medians. The remaining interval to HUD readiness was 2427 ms
for Apex, 2113 ms for Harbour and 1481 ms for Temple. It combines evaluation,
Rapier initialization, geometry/React work and rendering delays. Image response
completion medians were 5416, 6158 and 4581 ms respectively, overlapping the
countdown. Resource bytes are Resource Timing encoded-body totals, not packet
capture measurements; duplicate/coalesced image loads can affect these totals.

This identifies post-JavaScript scene preparation and overlapping texture work
as profiling candidates in this software-rendered environment. It does not
isolate physics initialization from geometry or shader/GPU work, establish
real-device bottlenecks, or justify changing graphics quality. No asset,
rendering-quality or physics optimization was made from these timings.

Verification: `npm run verify` passed **63 files / 610 tests**, lint and build.
The focused loading/countdown/UI/timing run passed 28 tests. A separate Python
check confirmed all 30 samples and recomputed every recorded summary median.
The new deterministic regression holds back HUD mounting for five seconds
after scene readiness, then checks countdown start, unmount and remount.
The corrected production build also passed all eight browser smoke scenarios:
six track/viewport/input cases plus delayed-download and failed-download
recovery. Final syntax, lint and diff checks passed. Full-lap checks were not
repeated for this timer-only change; their earlier results are recorded above.

Evidence: `/tmp/racing-first-race-before-metrics.json`,
`/tmp/racing-first-race-after-metrics.json` and
`/tmp/racing-loading-verify.log`, with smoke evidence in
`/tmp/racing-loading-fix-smoke-metrics.json`. These temporary files contain per-resource
timings and per-track min/median/max; the checked-in table preserves the main
results. See `TESTING.md` for field definitions and repeatable commands.

## Consecutive slow-frame progress recovery (2026-09-18)

The failing Actions job showed physical driving with checkpoint 1 unchanged.
A deterministic regression reproduced a continuity guard failure: successive
legal slow frames were compared against a frozen position until recovery was
permanently disabled. This explains a possible failure path; the original job
had no guard diagnostics to prove that it was the exact cause.

The guard now keeps separate pending position/progress observations and checks
each hop against the existing bounded movement budget, track corridor and curve
alias limits. Race progress stays frozen during slow frames. A validated normal
frame reanchors it without awarding an ordinary checkpoint; subsequent continuous
frames can accept checkpoints. Invalid hops discard the pending chain. Forward
finish crossings survive a legal chain only once and are cancelled by crossing
backwards.

The browser lap report now includes `gameProgress` (frame delta, projected and
approved progress, rejection reason and recovery state). Timeout artifacts also
include the bounded runtime event snapshot and structured track telemetry.

Validation: `npm run verify` passed lint, 616 tests across 63 files, and production
build. Two additional forward/reverse finish-chain cases subsequently passed in
`src/test/raceIntegrity.regression.test.js` (5/5). Integration coverage exercises
the actual Car controller through repeated 600ms samples and then verifies that
checkpoint acceptance resumes. Syntax and whitespace checks passed.

Production Chromium 143 / SwiftShader full-lap validation passed on all tracks:
Apex GP 02:50:402, Harbour Street 01:38:275, Temple Speedway 02:15:739.
All nine checkpoints and finish were accepted in order; saved times matched the
results and survived reload. Guard telemetry was present in the output.
Raw results: `/tmp/racing-guard-fix-metrics.json` (temporary, not committed).
The updated code has not been pushed or rerun on GitHub Actions. These local
browser runs do not reproduce every timing condition of the original CI worker.

## Gameplay and code quality follow-up — 2026-09-21

Implemented sector splits and personal-best deltas, 1/3/5-lap races with three AI
difficulties, best-lap ghost playback, driving effects and a three-track
championship. Separated chase camera control, physical track rendering, scenery
rendering and asset ownership; replaced mutable window vehicle maps with a
module and detached browser snapshots.

Validation used WSL2, Node.js 24.16.0, Chromium 143.0.7499.4 and SwiftShader:

- `npm run verify`: **70 files / 633 tests**, lint and production build passed.
- Subsequent presentation-only changes passed lint and production build.
  A focused Chromium check confirmed separate championship title/subtitle lines
  and no menu overflow at 1280px and 320px; screenshots are saved as
  `/tmp/racing-final-menu-options-{1280,320}.png`.
- Chromium smoke: all six desktop/touch viewport cases, denied storage,
  delayed/failed downloads, pause, resume and restart passed. The 390px case
  selects 3 laps / Normal; the 320px case selects 5 laps / Easy and checks the
  selected lap count in the actual HUD. Menu horizontal overflow is checked.
- Four-car race: every circuit passed a real contact, one keyboard R recovery,
  ordered checkpoints, full physical lap, four-car classification and persisted
  lap time. All three AI cars also reached the finish in the recorded runs.
- Time Trial: every circuit passed ordered completion, matching saved sector
  reference and lap time, persistent ghost samples, reload, subsequent ghost
  movement and a visible ghost remaining frozen on pause.
- Independent review found two ghost issues: recovery carried an old pose into
  the next lap, and translucency could alter shared player materials. Both were
  fixed and protected by regression tests; the follow-up review found no
  remaining blocking issue.

| Circuit | Four-car test lap | Time Trial test lap | Ghost replay after reload |
| --- | ---: | ---: | --- |
| Apex Grand Prix | 174.915 s | 171.273 s | Passed |
| Harbour Street | 101.590 s | 101.753 s | Passed |
| Temple Speedway | 137.679 s | 135.569 s | Passed |

These are conservative keyboard-driver completion times, not performance or
race-balance benchmarks. The four-car times include the contact/recovery probe.
The browser scripts never write the game store, advance checkpoints directly,
scale time or teleport a rigid body.

Raw local results: `/tmp/racing-race-metrics.json`,
`/tmp/racing-lap-metrics.json`, `/tmp/racing-smoke-metrics.json`,
`/tmp/racing-verify-final.log` and `/tmp/racing-build-final.log`.
The local runtime uses `CHROMIUM_EXECUTABLE=/tmp/racing-chrome/chrome-linux64/chrome`
and `CHROMIUM_LIBRARY_PATH=/tmp/racing-browser-libs/usr/lib/x86_64-linux-gnu`.
Browser libraries were extracted into `/tmp`; no system installation was needed.

Physical mobile GPU performance, Safari, screen-reader operation and perceived
sound quality were not tested in this headless environment. Audio tests verify
surface/slip envelopes, volume, impact rate limiting, pause and owned-resource
cleanup. Championship progression/retries are covered by store/UI tests; the
full three-round championship was not separately driven in a real browser.
