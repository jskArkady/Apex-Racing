import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import App from '../App'
import { useGameStore } from '../store/gameStore'

const sceneDownload = vi.hoisted(() => {
  let resolve
  const promise = new Promise(done => { resolve = done })
  return { promise, resolve }
})

vi.unmock('../components/LazyRaceScene')
vi.mock('../components/RaceScene', async (importOriginal) => {
  await sceneDownload.promise
  return importOriginal()
})

afterEach(() => vi.useRealTimers())

it('holds the countdown during a cold scene download and preserves pause and restart', async () => {
  vi.useFakeTimers()
  useGameStore.getState().returnToMenu()
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: 'Start Race', exact: true }))
  expect(screen.getByRole('status')).toHaveTextContent('Preparing race')

  act(() => vi.advanceTimersByTime(5000))
  expect(useGameStore.getState()).toMatchObject({ gameState: 'countdown', countdown: 3 })
  fireEvent.keyDown(window, { key: 'Escape' })

  await act(async () => {
    sceneDownload.resolve()
    await vi.dynamicImportSettled()
  })
  expect(useGameStore.getState()).toMatchObject({ gameState: 'paused', countdown: 3 })
  expect(screen.getByRole('dialog')).toHaveAccessibleName('PAUSED')

  fireEvent.click(screen.getByRole('button', { name: 'Resume', exact: true }))
  act(() => vi.advanceTimersByTime(2000))
  expect(useGameStore.getState()).toMatchObject({ gameState: 'countdown', countdown: 1 })
  act(() => vi.advanceTimersByTime(1000))
  expect(useGameStore.getState().gameState).toBe('playing')

  fireEvent.keyDown(window, { key: 'Escape' })
  fireEvent.click(screen.getByRole('button', { name: 'Restart Race', exact: true }))
  expect(useGameStore.getState()).toMatchObject({ gameState: 'countdown', countdown: 3, currentTime: 0 })
  act(() => vi.advanceTimersByTime(3000))
  expect(useGameStore.getState().gameState).toBe('playing')
})
