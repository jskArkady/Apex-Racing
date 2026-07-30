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

## Test boundaries

- Files under `src/utils` and `src/store` are deterministic unit tests.
- Files under `src/ui` and `src/components` verify DOM contracts, accessibility
  state and scene complexity. R3F intrinsic nodes are represented by jsdom
  elements; expected renderer-mismatch warnings are filtered in `setup.js`.
- Files under `src/test` are integration or QA tests. `triggerFrames` models
  render callbacks, while `triggerFixedPhysicsSteps` models Rapier's 60 Hz
  accumulator explicitly.
- These tests do not claim real WebGL, browser layout or native Rapier coverage.
  Before release, verify the three tracks at desktop, 390 px portrait, 320 px
  portrait and landscape, including a real mobile GPU and screen reader pass.

## Release-blocking scenarios

1. A standing-grid score must remain monotonic through the first seam.
2. A 100–500 ms render hitch must not freeze AI checkpoint progress.
3. A physically plausible suspended frame crossing the finish seam must be
   confirmed once after re-anchoring.
4. Manual recovery must return to the actual accepted checkpoint pose.
5. AI recovery time, personal best persistence and repeated Escape input must
   remain monotonic and idempotent.
