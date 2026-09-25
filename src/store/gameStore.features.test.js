import { beforeEach, describe, expect, it } from 'vitest'
import { useGameStore } from './gameStore'
import { DEFAULT_TRACK_ID, TRACK_PRESETS } from '../utils/trackData'
import { championshipStandings } from '../utils/championship'
import { loadLapRecords } from '../utils/lapRecords'

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
  it('scores every circuit once and rolls back a retried result', () => {
    state().startChampionship()
    const tracks = []
    for (let round = 0; round < TRACK_PRESETS.length; round++) {
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
    expect(tracks).toEqual(TRACK_PRESETS.map(track => track.id))
    expect(state().gameState).toBe('finished')
    expect(championshipStandings(state().championship).find(r => r.id === 'player').points).toBe(10 * TRACK_PRESETS.length)
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

  it('keeps all four circuit records isolated and reloads the new circuit record', () => {
    const expectedBests = {}
    const expectedRecords = {}
    for (const [index, track] of TRACK_PRESETS.entries()) {
      state().selectTrack(track.id)
      state().startGame('time_trial')
      expect(state().bestLapTime).toBe(0)
      useGameStore.setState({ gameState: 'playing' })
      const duration = 100 + index * 10
      passLap(duration)
      expectedBests[track.id] = duration
      expectedRecords[track.id] = { time: duration, splits: [duration * 0.4, duration * 0.7, duration], samples: null }
      expect(state().personalBests).toEqual(expectedBests)
      expect(loadLapRecords()).toEqual(expectedRecords)
      state().returnToMenu()
    }
    state().selectTrack('silverstone_gp')
    state().startGame('time_trial')
    expect(state().bestLapTime).toBe(130)
    state().returnToMenu()
    state().selectTrack(DEFAULT_TRACK_ID)
    state().startGame('time_trial')
    expect(state().bestLapTime).toBe(100)
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
