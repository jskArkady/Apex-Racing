import { beforeEach, describe, expect, it } from 'vitest'
import { useGameStore } from './gameStore'
import {
  calculateRacerScore,
  handleCheckpointPass,
  sortRacersWithCheckpoints
} from '../utils/raceLogic'

const startPlaying = () => {
  useGameStore.setState({ gameState: 'menu' })
  useGameStore.getState().startGame('single')
  useGameStore.setState({ gameState: 'playing', countdown: 0 })
}

describe('third-pass race-state audit', () => {
  beforeEach(startPlaying)

  it('does not let stale reports rewrite a finished racer result', () => {
    useGameStore.getState().updateRacerProgress('ai_1', 1, 0, 90, true, 90, 30)
    useGameStore.getState().updateRacerProgress('ai_1', 99, 9, 1, true, 1, 1)

    expect(useGameStore.getState().racers.find(({ id }) => id === 'ai_1')).toMatchObject({
      lap: 1,
      nextCheckpointIndex: 0,
      lastCheckpointTime: 90,
      finished: true,
      totalTime: 90,
      currentTime: 30
    })
  })

  it('rejects an impossible finished report without a finite result time', () => {
    useGameStore.getState().updateRacerProgress('ai_1', 3, 0, Infinity, true, Infinity, 30)

    expect(useGameStore.getState().racers.find(({ id }) => id === 'ai_1').finished).toBe(false)
  })

  it('resets fixed race configuration and advances the session on every restart', () => {
    const previousSession = useGameStore.getState().raceSessionId
    useGameStore.setState({ maxLaps: Infinity, totalCheckpoints: 0 })

    useGameStore.getState().restartRace()

    expect(useGameStore.getState()).toMatchObject({
      maxLaps: 1,
      totalCheckpoints: 10,
      raceSessionId: previousSession + 1
    })
  })

  it('keeps racer scores finite when multiplication overflows', () => {
    expect(calculateRacerScore(Number.MAX_VALUE, Number.MAX_VALUE)).toBe(0)
  })

  it('records the active lap in explicit finish timing statistics', () => {
    useGameStore.setState({ currentTime: 20, lastLapTime: 25, bestLapTime: 25, totalTime: 50 })

    useGameStore.getState().finishGame()

    expect(useGameStore.getState()).toMatchObject({
      gameState: 'finished',
      totalTime: 70,
      lastLapTime: 20,
      bestLapTime: 20
    })
  })

  it('does not reward negative finish or checkpoint times', () => {
    const sorted = sortRacersWithCheckpoints([
      { id: 'invalid', finished: true, totalTime: -10 },
      { id: 'valid', finished: true, totalTime: 90 },
      { id: 'missing', finished: true }
    ])

    expect(sorted.map(({ id }) => id)).toEqual(['valid', 'invalid', 'missing'])
  })

  it('normalizes unsafe integer lap and checkpoint configuration', () => {
    const result = handleCheckpointPass({
      gameState: 'playing',
      lap: Number.MAX_VALUE,
      maxLaps: Number.MAX_VALUE,
      totalCheckpoints: Number.MAX_VALUE,
      nextCheckpointIndex: 0,
      currentTime: 10,
      totalTime: 0,
      bestLapTime: 0
    }, 0)

    expect(result).toMatchObject({
      gameState: 'finished',
      lap: 1,
      nextCheckpointIndex: 0,
      totalTime: 10
    })
  })
})
