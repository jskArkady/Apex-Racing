import { beforeEach, describe, expect, it } from 'vitest'
import { useGameStore } from './gameStore'

const initialState = useGameStore.getState()
const expectReleased = () => {
  expect(useGameStore.getState().touchControls).toEqual({
    forward: false,
    backward: false,
    left: false,
    right: false,
    brake: false,
    reset: false,
  })
}

beforeEach(() => {
  useGameStore.setState(initialState, true)
})

describe('touch control state', () => {
  it('publishes only supported boolean control edges and releases them atomically', () => {
    const before = useGameStore.getState()
    before.setTouchControl('forward', true)
    expect(useGameStore.getState().touchControls.forward).toBe(true)

    const activeState = useGameStore.getState()
    activeState.setTouchControl('unknown', true)
    expect(useGameStore.getState()).toBe(activeState)

    useGameStore.getState().releaseTouchControls()
    expectReleased()
    const releasedState = useGameStore.getState()
    releasedState.releaseTouchControls()
    expect(useGameStore.getState()).toBe(releasedState)
  })

  it('cannot carry held input across start, restart, or return-to-menu sessions', () => {
    useGameStore.getState().setTouchControl('forward', true)
    useGameStore.getState().startGame('single')
    expectReleased()

    useGameStore.setState({ gameState: 'playing' })
    useGameStore.getState().setTouchControl('left', true)
    useGameStore.getState().restartRace()
    expectReleased()

    useGameStore.getState().setTouchControl('right', true)
    useGameStore.getState().returnToMenu()
    expectReleased()
  })

  it('releases active touch input when a race pauses or finishes', () => {
    useGameStore.setState({ gameState: 'playing' })
    useGameStore.getState().setTouchControl('backward', true)
    useGameStore.getState().pauseGame()
    expectReleased()

    useGameStore.setState({ gameState: 'playing' })
    useGameStore.getState().setTouchControl('brake', true)
    useGameStore.getState().finishGame()
    expectReleased()
  })
})
