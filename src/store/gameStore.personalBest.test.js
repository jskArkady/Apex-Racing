import { act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PERSONAL_BEST_STORAGE_KEY, useGameStore } from './gameStore'
import { DEFAULT_TRACK_ID } from '../utils/trackData'

describe('track personal best persistence', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

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

  it.each(['getter', 'getItem'])('initializes when the storage %s throws', async (failure) => {
    if (failure === 'getter') {
      vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
        throw new DOMException('Storage access denied', 'SecurityError')
      })
    } else {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new DOMException('Storage access denied', 'SecurityError')
      })
    }
    vi.resetModules()

    const { useGameStore: freshStore } = await import('./gameStore')

    expect(freshStore.getState()).toMatchObject({
      gameState: 'menu',
      personalBests: {},
      bestLapTime: 0,
    })
  })

  it.each([
    ['getter', 'finishGame'],
    ['getter', 'checkpoint'],
    ['setItem', 'finishGame'],
    ['setItem', 'checkpoint'],
  ])('completes via %s failure and %s while keeping the personal best in memory', (failure, completion) => {
    if (failure === 'getter') {
      vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
        throw new DOMException('Storage access denied', 'SecurityError')
      })
    } else {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('Storage quota exceeded', 'QuotaExceededError')
      })
    }

    act(() => {
      useGameStore.getState().startGame('time_trial')
      useGameStore.setState({ gameState: 'playing', countdown: 0, currentTime: 42.5 })
      if (completion === 'checkpoint') {
        for (let index = 1; index < useGameStore.getState().totalCheckpoints; index += 1) {
          useGameStore.getState().passCheckpoint(index)
        }
        useGameStore.getState().passCheckpoint(0)
      } else {
        useGameStore.getState().finishGame()
      }
    })

    expect(useGameStore.getState()).toMatchObject({
      gameState: 'finished',
      totalTime: 42.5,
      bestLapTime: 42.5,
      personalBests: { [DEFAULT_TRACK_ID]: 42.5 },
    })
    expect(useGameStore.getState().racers.find(({ id }) => id === 'player')).toMatchObject({
      finished: true,
      totalTime: 42.5,
    })
  })
})
