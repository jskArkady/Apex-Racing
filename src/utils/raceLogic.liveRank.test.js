import { describe, expect, it } from 'vitest'
import { getLiveRacerRank } from './raceLogic'

const racers = () => [
  { id: 'player', lap: 1, nextCheckpointIndex: 5, finished: false, lastCheckpointTime: 20 },
  { id: 'ai_1', lap: 1, nextCheckpointIndex: 5, finished: false, lastCheckpointTime: 19 },
  { id: 'ai_2', lap: 1, nextCheckpointIndex: 4, finished: false, lastCheckpointTime: 18 },
]

describe('live race rank', () => {
  it('reflects overtakes and re-overtakes inside the same checkpoint band', () => {
    expect(getLiveRacerRank(racers(), {
      player: 145,
      ai_1: 146,
      ai_2: 138,
    })).toBe(2)
    expect(getLiveRacerRank(racers(), {
      player: 147,
      ai_1: 146,
      ai_2: 138,
    })).toBe(1)
  })

  it('uses live progress when checkpoint timestamps are still tied', () => {
    const field = racers()
    field[0].lastCheckpointTime = 20
    field[1].lastCheckpointTime = 20

    expect(getLiveRacerRank(field, {
      player: 147,
      ai_1: 146,
      ai_2: 138,
    })).toBe(1)
    expect(getLiveRacerRank(field, {
      player: 145,
      ai_1: 146,
      ai_2: 138,
    })).toBe(2)
  })

  it('keeps a finished racer ahead even when its seam score wrapped', () => {
    const field = racers()
    field[1] = { ...field[1], finished: true, totalTime: 80 }
    expect(getLiveRacerRank(field, {
      player: 199.8,
      ai_1: 100,
      ai_2: 138,
    })).toBe(2)
  })

  it('falls back safely when live samples or the player are unavailable', () => {
    expect(getLiveRacerRank(racers(), {}, 'player', 3)).toBeGreaterThanOrEqual(1)
    expect(getLiveRacerRank(racers(), {}, 'ghost', 3)).toBe(3)
    expect(getLiveRacerRank(null, {}, 'player', 2)).toBe(2)
  })
})
