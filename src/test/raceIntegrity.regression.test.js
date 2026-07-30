import { describe, expect, it } from 'vitest'
import {
  calculateLiveRaceScore,
  getLiveRacerRank,
} from '../utils/raceLogic'
import {
  createProgressGuardState,
  didConfirmForwardSeamCrossing,
  validateProgressSample,
} from '../utils/progressGuard'

const TRACK_LENGTH = 900

const sample = (state, {
  x,
  progress,
  speed,
  delta,
}) => validateProgressSample(state, {
  worldPosition: { x, y: 0, z: 0 },
  curveProgress: progress,
  centerlineDistance: 0,
  speed,
  delta,
  trackLength: TRACK_LENGTH,
})

describe('release-blocking race integrity regressions', () => {
  it('keeps standing-grid scores monotonic through the first seam', () => {
    const gridScore = calculateLiveRaceScore(1, 1, 0.997)
    const crossedScore = calculateLiveRaceScore(1, 1, 0.01)

    expect(gridScore).toBeCloseTo(99.7)
    expect(crossedScore).toBeCloseTo(101)
    expect(crossedScore).toBeGreaterThan(gridScore)

    const field = [
      { id: 'player', lap: 1, nextCheckpointIndex: 1, finished: false },
      { id: 'ai_1', lap: 1, nextCheckpointIndex: 1, finished: false },
    ]
    expect(getLiveRacerRank(field, {
      player: gridScore,
      ai_1: crossedScore,
    })).toBe(2)
  })

  it('accepts a plausible 200ms AI displacement when validation receives elapsed time', () => {
    const initial = sample(createProgressGuardState(), {
      x: 0,
      progress: 0.4,
      speed: 55,
      delta: 1 / 60,
    })
    const hitch = sample(initial.state, {
      x: 11,
      progress: 0.4 + 11 / TRACK_LENGTH,
      speed: 55,
      delta: 0.2,
    })
    const resumed = sample(hitch.state, {
      x: 11 + 55 / 60,
      progress: 0.4 + (11 + 55 / 60) / TRACK_LENGTH,
      speed: 55,
      delta: 1 / 60,
    })

    expect(hitch.valid).toBe(true)
    expect(resumed.valid).toBe(true)
  })

  it('confirms one plausible finish crossing after a suspended-frame re-anchor', () => {
    const beforeFinish = sample(createProgressGuardState(), {
      x: 0,
      progress: 0.99,
      speed: 30,
      delta: 1 / 60,
    })
    const suspended = sample(beforeFinish.state, {
      x: 13,
      progress: 0.005,
      speed: 30,
      delta: 0.6,
    })
    const reanchored = sample(suspended.state, {
      x: 13.5,
      progress: 0.006,
      speed: 30,
      delta: 1 / 60,
    })
    const next = sample(reanchored.state, {
      x: 14,
      progress: 0.0065,
      speed: 30,
      delta: 1 / 60,
    })

    expect(suspended).toMatchObject({ valid: false, reason: 'timing-discontinuity' })
    expect(reanchored.valid).toBe(false)
    expect(didConfirmForwardSeamCrossing(reanchored.state)).toBe(true)
    expect(didConfirmForwardSeamCrossing(next.state)).toBe(false)
  })
})
