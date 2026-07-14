import { useCallback, useEffect, useRef, useState } from 'react'
import { useGameStore } from '../store/gameStore'

const CONTROL_NAMES = ['forward', 'backward', 'left', 'right', 'reset']

const createInactiveControls = () => Object.fromEntries(
  CONTROL_NAMES.map(name => [name, false]),
)

function HoldButton({ action, active, className = '', label, glyph, onPress, onRelease }) {
  return (
    <button
      type="button"
      className={`mobile-control ${className}`.trim()}
      aria-label={label}
      aria-pressed={active}
      onPointerDown={event => onPress(event, action)}
      onPointerUp={onRelease}
      onPointerCancel={onRelease}
      onLostPointerCapture={onRelease}
      onContextMenu={event => event.preventDefault()}
    >
      <span aria-hidden="true">{glyph}</span>
    </button>
  )
}

export default function MobileDrivingControls() {
  const setTouchControl = useGameStore(state => state.setTouchControl)
  const releaseTouchControls = useGameStore(state => state.releaseTouchControls)
  const pauseGame = useGameStore(state => state.pauseGame)
  const [activeControls, setActiveControls] = useState(createInactiveControls)
  const activePointersRef = useRef(new Map())
  const pointerCountsRef = useRef(createInactiveControls())

  const publishControl = useCallback((action, pressed) => {
    setTouchControl(action, pressed)
    setActiveControls(current => (
      current[action] === pressed ? current : { ...current, [action]: pressed }
    ))
  }, [setTouchControl])

  const releaseAll = useCallback(() => {
    activePointersRef.current.clear()
    pointerCountsRef.current = createInactiveControls()
    releaseTouchControls()
    setActiveControls(current => (
      CONTROL_NAMES.some(name => current[name]) ? createInactiveControls() : current
    ))
  }, [releaseTouchControls])

  const handlePointerDown = useCallback((event, action) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    event.preventDefault()
    if (activePointersRef.current.has(event.pointerId)) return

    activePointersRef.current.set(event.pointerId, action)
    const nextCount = (pointerCountsRef.current[action] ?? 0) + 1
    pointerCountsRef.current[action] = nextCount
    if (nextCount === 1) publishControl(action, true)

    try {
      event.currentTarget.setPointerCapture?.(event.pointerId)
    } catch {
      // Pointer capture can fail when a browser cancels the contact first.
    }
  }, [publishControl])

  const handlePointerRelease = useCallback((event) => {
    const action = activePointersRef.current.get(event.pointerId)
    if (!action) return

    activePointersRef.current.delete(event.pointerId)
    const nextCount = Math.max(0, (pointerCountsRef.current[action] ?? 1) - 1)
    pointerCountsRef.current[action] = nextCount
    if (nextCount === 0) publishControl(action, false)

    try {
      if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
    } catch {
      // Lost capture and pointerup can race; release above is idempotent.
    }
  }, [publishControl])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) releaseAll()
    }
    window.addEventListener('blur', releaseAll)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      window.removeEventListener('blur', releaseAll)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      activePointersRef.current.clear()
      pointerCountsRef.current = createInactiveControls()
      releaseTouchControls()
    }
  }, [releaseAll, releaseTouchControls])

  const handlePause = () => {
    releaseAll()
    pauseGame()
  }

  return (
    <section className="mobile-driving-controls" role="group" aria-label="Mobile driving controls">
      <div className="mobile-control-cluster mobile-steering-controls">
        <HoldButton
          action="left"
          active={activeControls.left}
          label="Steer left"
          glyph="←"
          onPress={handlePointerDown}
          onRelease={handlePointerRelease}
        />
        <HoldButton
          action="right"
          active={activeControls.right}
          label="Steer right"
          glyph="→"
          onPress={handlePointerDown}
          onRelease={handlePointerRelease}
        />
      </div>

      <div className="mobile-control-cluster mobile-pedal-controls">
        <HoldButton
          action="backward"
          active={activeControls.backward}
          className="mobile-control-pedal mobile-control-brake"
          label="Brake or reverse"
          glyph="BRAKE"
          onPress={handlePointerDown}
          onRelease={handlePointerRelease}
        />
        <HoldButton
          action="forward"
          active={activeControls.forward}
          className="mobile-control-pedal mobile-control-accelerator"
          label="Accelerate"
          glyph="ACCEL"
          onPress={handlePointerDown}
          onRelease={handlePointerRelease}
        />
      </div>

      <div className="mobile-control-cluster mobile-utility-controls">
        <HoldButton
          action="reset"
          active={activeControls.reset}
          className="mobile-control-utility"
          label="Reset car"
          glyph="↻"
          onPress={handlePointerDown}
          onRelease={handlePointerRelease}
        />
        <button
          type="button"
          className="mobile-control mobile-control-utility"
          aria-label="Pause race"
          onClick={handlePause}
        >
          <span aria-hidden="true">Ⅱ</span>
        </button>
      </div>
    </section>
  )
}
