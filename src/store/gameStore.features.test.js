import { beforeEach, describe, expect, it } from 'vitest'
import { useGameStore } from './gameStore'
import { DEFAULT_TRACK_ID } from '../utils/trackData'
import { championshipStandings } from '../utils/championship'

const initial = useGameStore.getState()
const state = () => useGameStore.getState()
const passLap = (duration) => {
  for (let cp = 1; cp <= 10; cp++) {
    useGameStore.setState({ currentTime: duration * cp / 10 })
    state().passCheckpoint(cp % 10)
  }
}

beforeEach(() => {
  localStorage.clear()
  useGameStore.setState({ ...initial, personalBests: {}, lapRecords: {} }, true)
})

describe('sector timing', () => {
  it('scores three different rounds once each and rolls back a retried result', () => {
    state().startChampionship()
    const tracks = []
    for (let round = 0; round < 3; round++) {
      tracks.push(state().selectedTrackId)
      useGameStore.setState({ gameState: 'playing' })
      passLap(100)
      state().finishGame()
      expect(state().championship.results.length).toBe(round + 1)
      if (round === 0) {
        state().restartRace()
        expect(state().championship.results).toEqual([])
        useGameStore.setState({ gameState: 'playing' })
        passLap(100)
      }
      state().nextChampionshipRound()
    }
    expect(new Set(tracks).size).toBe(3)
    expect(state().gameState).toBe('finished')
    expect(championshipStandings(state().championship).find(r => r.id === 'player').points).toBe(30)
    state().returnToMenu()
    expect(state().championship).toBeNull()
  })
  it('keeps the fastest intermediate lap across a three-lap race and restart', () => {
    state().updateRaceOptions({ laps: 3, difficulty: 'easy' })
    state().startGame('single')
    state().updateRaceOptions({ laps: 5 })
    expect(state().maxLaps).toBe(3)
    useGameStore.setState({ gameState: 'playing' })
    passLap(100)
    expect(state().lap).toBe(2)
    expect(state().currentTime).toBe(0)
    passLap(90)
    expect(state().gameState).toBe('playing')
    passLap(110)
    expect(state().gameState).toBe('finished')
    expect(state().totalTime).toBe(300)
    expect(state().personalBests[DEFAULT_TRACK_ID]).toBe(90)
    expect(state().lapRecords[DEFAULT_TRACK_ID].splits).toEqual([36, 63, 90])
    state().restartRace()
    expect(state().maxLaps).toBe(3)
    expect(state().raceOptions.difficulty).toBe('easy')
  })
  it('records ordered sectors and compares the same point of the best lap', () => {
    state().startGame('time_trial')
    useGameStore.setState({ gameState: 'playing' })
    passLap(100)
    expect(state().lastLapSplits).toEqual([40, 70, 100])
    expect(state().lapRecords[DEFAULT_TRACK_ID]).toMatchObject({ time: 100, splits: [40, 70, 100] })
    state().restartRace()
    useGameStore.setState({ gameState: 'playing', currentTime: 30 })
    state().passCheckpoint(4)
    expect(state().lastSector).toBe(0)
    for (let cp = 1; cp <= 4; cp++) state().passCheckpoint(cp)
    expect(state().sectorDelta).toBe(-10)
    expect(state().sectorTime).toBe(30)
  })

  it('does not compare splits from a different, older personal best', () => {
    useGameStore.setState({ personalBests: { [DEFAULT_TRACK_ID]: 90 },
      lapRecords: { [DEFAULT_TRACK_ID]: { time: 100, splits: [40, 70, 100] } } })
    state().startGame('time_trial')
    useGameStore.setState({ gameState: 'playing', currentTime: 30 })
    for (let cp = 1; cp <= 4; cp++) state().passCheckpoint(cp)
    expect(state().sectorDelta).toBeNull()
  })
})
