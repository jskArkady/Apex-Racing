import { act } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { PERSONAL_BEST_STORAGE_KEY, useGameStore } from './gameStore'
import { DEFAULT_TRACK_ID } from '../utils/trackData'

describe('track personal best persistence', () => {
  beforeEach(() => {
    window.localStorage.clear()
    act(() => useGameStore.setState({
      gameState: 'menu',
      gameMode: 'single',
      selectedTrackId: DEFAULT_TRACK_ID,
      personalBests: {},
      bestLapTime: 0,
      currentTime: 0,
      totalTime: 0,
      lastLapTime: 0,
    }))
  })

  const completeTimeTrial = (seconds) => {
    act(() => {
      useGameStore.getState().startGame('time_trial')
      useGameStore.setState({ gameState: 'playing', countdown: 0, currentTime: seconds })
      useGameStore.getState().finishGame()
    })
  }

  it('retains the fastest valid lap across restart and menu transitions', () => {
    completeTimeTrial(42.5)

    expect(useGameStore.getState().personalBests[DEFAULT_TRACK_ID]).toBe(42.5)
    expect(JSON.parse(
      window.localStorage.getItem(PERSONAL_BEST_STORAGE_KEY)
    )[DEFAULT_TRACK_ID]).toBe(42.5)

    act(() => useGameStore.getState().restartRace())
    expect(useGameStore.getState().bestLapTime).toBe(42.5)

    act(() => {
      useGameStore.setState({ gameState: 'playing', currentTime: 48 })
      useGameStore.getState().finishGame()
    })
    expect(useGameStore.getState().personalBests[DEFAULT_TRACK_ID]).toBe(42.5)

    act(() => {
      useGameStore.getState().returnToMenu()
      useGameStore.getState().startGame('time_trial')
      useGameStore.setState({ gameState: 'playing', currentTime: 39.25 })
      useGameStore.getState().finishGame()
    })
    expect(useGameStore.getState().personalBests[DEFAULT_TRACK_ID]).toBe(39.25)
  })
})
