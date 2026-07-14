import { beforeEach, describe, expect, it } from 'vitest'
import { useGameStore } from './gameStore'

const startPlaying = () => {
  useGameStore.setState({ gameState: 'menu' })
  useGameStore.getState().startGame('single')
  useGameStore.setState({ gameState: 'playing', countdown: 0 })
}

const getAi = () => useGameStore.getState().racers.find(({ id }) => id === 'ai_1')

describe('fourth-pass racer report audit', () => {
  beforeEach(startPlaying)

  it('ignores a delayed report from a previous race session', () => {
    const staleSessionId = useGameStore.getState().raceSessionId
    useGameStore.getState().restartRace()
    useGameStore.setState({ gameState: 'playing', countdown: 0 })

    useGameStore.getState().updateRacerProgress(
      'ai_1', 2, 7, 40, false, 30, 10, staleSessionId
    )

    expect(getAi()).toMatchObject({
      lap: 1,
      nextCheckpointIndex: 1,
      lastCheckpointTime: 0,
      totalTime: 0,
      currentTime: 0
    })
  })

  it('does not let an out-of-order report move a racer backwards on the same lap', () => {
    const sessionId = useGameStore.getState().raceSessionId
    useGameStore.getState().updateRacerProgress('ai_1', 1, 6, 30, false, 0, 30, sessionId)
    useGameStore.getState().updateRacerProgress('ai_1', 1, 3, 20, false, 0, 20, sessionId)

    expect(getAi()).toMatchObject({
      lap: 1,
      nextCheckpointIndex: 6,
      lastCheckpointTime: 30,
      currentTime: 30
    })
  })

  it('keeps checkpoint progression monotonic even when reports have zero timing', () => {
    const sessionId = useGameStore.getState().raceSessionId
    useGameStore.getState().updateRacerProgress('ai_1', 1, 6, 0, false, 0, 0, sessionId)
    useGameStore.getState().updateRacerProgress('ai_1', 1, 3, 0, false, 0, 0, sessionId)

    expect(getAi().nextCheckpointIndex).toBe(6)
  })

  it('does not let a delayed prior-lap report overwrite the current lap', () => {
    useGameStore.setState({ maxLaps: 3 })
    const sessionId = useGameStore.getState().raceSessionId
    useGameStore.getState().updateRacerProgress('ai_1', 2, 1, 45, false, 45, 0, sessionId)
    useGameStore.getState().updateRacerProgress('ai_1', 1, 9, 44, false, 0, 44, sessionId)

    expect(getAi()).toMatchObject({
      lap: 2,
      nextCheckpointIndex: 1,
      lastCheckpointTime: 45,
      totalTime: 45,
      currentTime: 0
    })
  })

  it('rejects a finish report whose total time predates accepted race progress', () => {
    useGameStore.setState({ maxLaps: 3 })
    const sessionId = useGameStore.getState().raceSessionId
    useGameStore.getState().updateRacerProgress('ai_1', 2, 1, 60, false, 60, 0, sessionId)
    useGameStore.getState().updateRacerProgress('ai_1', 2, 6, 70, false, 60, 10, sessionId)
    useGameStore.getState().updateRacerProgress('ai_1', 3, 0, 65, true, 65, 5, sessionId)

    expect(getAi()).toMatchObject({
      lap: 2,
      nextCheckpointIndex: 6,
      finished: false,
      lastCheckpointTime: 70,
      totalTime: 60,
      currentTime: 10
    })
  })
})
