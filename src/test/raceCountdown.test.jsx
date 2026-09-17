import { act, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import RaceScene from '../components/RaceScene'
import HUD from '../ui/HUD'
import { useGameStore } from '../store/gameStore'
import { getTrackPreset } from '../utils/trackData'

afterEach(() => vi.useRealTimers())

it('waits for the HUD before counting down and stops while the HUD is unmounted', () => {
  vi.useFakeTimers()
  useGameStore.getState().returnToMenu()
  useGameStore.getState().startGame('single')
  const onReady = vi.fn()
  const scene = render(<RaceScene track={getTrackPreset()} onReady={onReady} />)
  expect(onReady).toHaveBeenCalledWith(true)

  // A cold WebGL scene can commit before the DOM overlay. Loading time must
  // not consume any countdown seconds even after physics becomes ready.
  act(() => vi.advanceTimersByTime(5000))
  expect(useGameStore.getState().countdown).toBe(3)
  const hud = render(<HUD />)
  expect(screen.getByText('3', { selector: '.countdown span' })).toBeInTheDocument()
  act(() => vi.advanceTimersByTime(1000))
  expect(useGameStore.getState().countdown).toBe(2)
  hud.unmount()
  act(() => vi.advanceTimersByTime(3000))
  expect(useGameStore.getState().countdown).toBe(2)

  render(<HUD />)
  act(() => vi.advanceTimersByTime(2000))
  expect(useGameStore.getState().gameState).toBe('playing')
  scene.unmount()
})
