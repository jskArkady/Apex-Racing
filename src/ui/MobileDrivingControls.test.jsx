import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { useGameStore } from '../store/gameStore'
import MobileDrivingControls from './MobileDrivingControls'

const initialState = useGameStore.getState()
const originalPointerEvent = window.PointerEvent

const pointer = (pointerId) => ({ pointerId, pointerType: 'touch' })

beforeAll(() => {
  class TestPointerEvent extends MouseEvent {
    constructor(type, options = {}) {
      super(type, options)
      Object.defineProperties(this, {
        pointerId: { value: options.pointerId ?? 0 },
        pointerType: { value: options.pointerType ?? '' },
      })
    }
  }
  Object.defineProperty(window, 'PointerEvent', {
    configurable: true,
    value: TestPointerEvent,
  })
})

afterAll(() => {
  Object.defineProperty(window, 'PointerEvent', {
    configurable: true,
    value: originalPointerEvent,
  })
  Reflect.deleteProperty(document, 'hidden')
})

beforeEach(() => {
  act(() => useGameStore.setState(initialState, true))
  Object.defineProperty(document, 'hidden', { configurable: true, value: false })
})

describe('mobile driving controls', () => {
  it('exposes named button semantics and supports throttle plus steering multitouch', () => {
    render(<MobileDrivingControls />)
    const accelerator = screen.getByRole('button', { name: 'Accelerate' })
    const steerLeft = screen.getByRole('button', { name: 'Steer left' })

    fireEvent.pointerDown(accelerator, pointer(1))
    fireEvent.pointerDown(steerLeft, pointer(2))

    expect(accelerator).toHaveAttribute('aria-pressed', 'true')
    expect(steerLeft).toHaveAttribute('aria-pressed', 'true')
    expect(useGameStore.getState().touchControls).toMatchObject({
      forward: true,
      left: true,
    })

    fireEvent.pointerUp(steerLeft, pointer(2))
    expect(useGameStore.getState().touchControls).toMatchObject({
      forward: true,
      left: false,
    })

    fireEvent.pointerUp(accelerator, pointer(1))
    expect(useGameStore.getState().touchControls.forward).toBe(false)
  })

  it('reference-counts multiple contacts on one action', () => {
    render(<MobileDrivingControls />)
    const accelerator = screen.getByRole('button', { name: 'Accelerate' })

    fireEvent.pointerDown(accelerator, pointer(11))
    fireEvent.pointerDown(accelerator, pointer(12))
    fireEvent.pointerUp(accelerator, pointer(11))
    expect(useGameStore.getState().touchControls.forward).toBe(true)

    fireEvent.pointerUp(accelerator, pointer(12))
    expect(useGameStore.getState().touchControls.forward).toBe(false)
  })

  it('treats pointer cancel and lost capture as idempotent releases', () => {
    render(<MobileDrivingControls />)
    const brake = screen.getByRole('button', { name: 'Brake or reverse' })
    const reset = screen.getByRole('button', { name: 'Reset car' })

    fireEvent.pointerDown(brake, pointer(21))
    fireEvent.pointerCancel(brake, pointer(21))
    fireEvent.lostPointerCapture(brake, pointer(21))
    expect(useGameStore.getState().touchControls.backward).toBe(false)

    fireEvent.pointerDown(reset, pointer(22))
    fireEvent.lostPointerCapture(reset, pointer(22))
    fireEvent.pointerUp(reset, pointer(22))
    expect(useGameStore.getState().touchControls.reset).toBe(false)
  })

  it('releases every held action on blur, visibility loss, and unmount', () => {
    const view = render(<MobileDrivingControls />)
    const accelerator = screen.getByRole('button', { name: 'Accelerate' })
    const steerRight = screen.getByRole('button', { name: 'Steer right' })

    fireEvent.pointerDown(accelerator, pointer(31))
    fireEvent.pointerDown(steerRight, pointer(32))
    fireEvent.blur(window)
    expect(useGameStore.getState().touchControls).toMatchObject({ forward: false, right: false })

    fireEvent.pointerDown(accelerator, pointer(33))
    Object.defineProperty(document, 'hidden', { configurable: true, value: true })
    fireEvent(document, new Event('visibilitychange'))
    expect(useGameStore.getState().touchControls.forward).toBe(false)

    Object.defineProperty(document, 'hidden', { configurable: true, value: false })
    fireEvent.pointerDown(accelerator, pointer(34))
    view.unmount()
    expect(useGameStore.getState().touchControls.forward).toBe(false)
  })

  it('releases controls before pausing the race', () => {
    act(() => useGameStore.setState({ gameState: 'playing' }))
    render(<MobileDrivingControls />)
    const accelerator = screen.getByRole('button', { name: 'Accelerate' })

    fireEvent.pointerDown(accelerator, pointer(41))
    fireEvent.click(screen.getByRole('button', { name: 'Pause race' }))

    expect(useGameStore.getState().gameState).toBe('paused')
    expect(useGameStore.getState().touchControls.forward).toBe(false)
  })

  it('supports Enter and Space press-and-hold semantics', () => {
    render(<MobileDrivingControls />)
    const accelerator = screen.getByRole('button', { name: 'Accelerate' })
    const brake = screen.getByRole('button', { name: 'Brake or reverse' })

    fireEvent.keyDown(accelerator, { key: 'Enter', repeat: false })
    expect(useGameStore.getState().touchControls.forward).toBe(true)
    fireEvent.keyUp(screen.getByRole('button', { name: 'Accelerate' }), { key: 'Enter' })
    expect(useGameStore.getState().touchControls.forward).toBe(false)

    fireEvent.keyDown(brake, { key: ' ' })
    expect(useGameStore.getState().touchControls.backward).toBe(true)
    fireEvent.keyUp(brake, { key: ' ' })
    expect(useGameStore.getState().touchControls.backward).toBe(false)
  })

  it('offers a latched assistive-technology click alternative', () => {
    render(<MobileDrivingControls />)
    const accelerator = screen.getByRole('button', { name: 'Accelerate' })

    fireEvent.click(accelerator, { detail: 0 })
    expect(useGameStore.getState().touchControls.forward).toBe(true)
    expect(accelerator).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(accelerator, { detail: 0 })
    expect(useGameStore.getState().touchControls.forward).toBe(false)
  })
})
