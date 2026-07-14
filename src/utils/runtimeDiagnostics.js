export const RUNTIME_DIAGNOSTICS_VERSION = '2026-07-08.1'

export const RUNTIME_EVENT_ID = Object.freeze({
  PLAYER_TRANSLATION: 'player-translation',
  WRONG_WAY_TRANSITION: 'wrong-way-transition',
  PHYSICS_POSITION_JUMP: 'physics-position-jump',
  PHYSICS_SPEED_DROP: 'physics-speed-drop',
  COLLISION_ESCAPE: 'collision-escape',
  AI_FALL_RECOVERY: 'ai-fall-recovery',
})

const MAX_EVENTS = 256
const SPEED_DROP_WINDOW_SECONDS = 2
const GLOBAL_KEY = '__RACING_RUNTIME_DIAGNOSTICS__'
const NO_EVENTS = Object.freeze([])

const appendEvent = (events, event) => {
  if (events === NO_EVENTS) return [event]
  events.push(event)
  return events
}

const finiteNumber = value => Number.isFinite(value) ? value : null

export const snapshotVector = vector => vector ? {
  x: finiteNumber(vector.x),
  y: finiteNumber(vector.y),
  z: finiteNumber(vector.z),
} : null

function getDiagnosticState() {
  const scope = globalThis
  if (scope[GLOBAL_KEY]?.version === RUNTIME_DIAGNOSTICS_VERSION) {
    return scope[GLOBAL_KEY]
  }

  const state = {
    version: RUNTIME_DIAGNOSTICS_VERSION,
    // import.meta.url survives both Vite development serving and hashed
    // production bundling, so a captured report identifies the code that
    // actually created it instead of guessing from the current DOM.
    source: import.meta.url,
    events: [],
    clear() {
      this.events.length = 0
    },
    snapshot() {
      return this.events.map(event => ({ ...event }))
    },
  }
  Object.defineProperty(scope, GLOBAL_KEY, {
    configurable: true,
    value: state,
  })
  return state
}

export function recordRuntimeDiagnostic(id, details = {}) {
  const state = getDiagnosticState()
  const event = {
    sequence: (state.events.at(-1)?.sequence || 0) + 1,
    id,
    timestamp: typeof performance === 'undefined' ? Date.now() : performance.now(),
    ...details,
  }
  state.events.push(event)
  if (state.events.length > MAX_EVENTS) {
    state.events.splice(0, state.events.length - MAX_EVENTS)
  }
  return event
}

export function getRuntimeDiagnostics() {
  return getDiagnosticState()
}

export function createPhysicsObservationState() {
  return {
    position: null,
    velocity: null,
    raceSessionId: null,
    speedWindowPeak: 0,
    speedWindowElapsed: 0,
  }
}

export function resetPhysicsObservation(state, sample = {}) {
  if (sample.position) {
    state.position ??= { x: null, y: null, z: null }
    state.position.x = finiteNumber(sample.position.x)
    state.position.y = finiteNumber(sample.position.y)
    state.position.z = finiteNumber(sample.position.z)
  } else {
    state.position = null
  }
  if (sample.velocity) {
    state.velocity ??= { x: null, y: null, z: null }
    state.velocity.x = finiteNumber(sample.velocity.x)
    state.velocity.y = finiteNumber(sample.velocity.y)
    state.velocity.z = finiteNumber(sample.velocity.z)
  } else {
    state.velocity = null
  }
  state.raceSessionId = sample.raceSessionId ?? null
  state.speedWindowPeak = 0
  state.speedWindowElapsed = 0
}

export function observePlayerPhysics(state, sample) {
  if (!state || !sample) return []

  const currentPosition = sample.position
  const currentVelocity = sample.velocity
  const delta = Number.isFinite(sample.delta) ? Math.max(0, sample.delta) : 0
  const sessionChanged = state.raceSessionId !== null
    && state.raceSessionId !== sample.raceSessionId
  const previousPosition = state.position
  const previousVelocity = state.velocity
  let events = NO_EVENTS

  if (!sessionChanged && previousPosition && currentPosition && delta > 0 && delta <= 0.25) {
    const dx = currentPosition.x - previousPosition.x
    const dy = currentPosition.y - previousPosition.y
    const dz = currentPosition.z - previousPosition.z
    const displacement = Math.hypot(dx, dy, dz)
    const previousSpeed = previousVelocity
      ? Math.hypot(previousVelocity.x, previousVelocity.y, previousVelocity.z)
      : 0
    // Leave ample room for collision/sub-step motion. The event is evidence,
    // never an instruction to alter physics.
    const allowedDisplacement = Math.max(8, previousSpeed * delta * 3 + 2)
    if (displacement > allowedDisplacement) {
      events = appendEvent(events, recordRuntimeDiagnostic(RUNTIME_EVENT_ID.PHYSICS_POSITION_JUMP, {
        causeId: 'uncommanded-physics-displacement',
        raceSessionId: sample.raceSessionId,
        delta,
        displacement,
        allowedDisplacement,
        from: snapshotVector(previousPosition),
        to: snapshotVector(currentPosition),
        velocity: snapshotVector(currentVelocity),
        gameState: sample.gameState,
      }))
    }

    if (previousVelocity && currentVelocity) {
      const currentSpeed = Math.hypot(currentVelocity.x, currentVelocity.y, currentVelocity.z)
      const speedDrop = previousSpeed - currentSpeed
      let recordedImmediateDrop = false
      if (previousSpeed >= 12 && currentSpeed <= 1 && speedDrop >= 12) {
        events = appendEvent(events, recordRuntimeDiagnostic(RUNTIME_EVENT_ID.PHYSICS_SPEED_DROP, {
          causeId: 'uncommanded-physics-speed-drop',
          raceSessionId: sample.raceSessionId,
          delta,
          previousSpeed,
          currentSpeed,
          position: snapshotVector(currentPosition),
          gameState: sample.gameState,
          controls: sample.controls ? { ...sample.controls } : undefined,
        }))
        recordedImmediateDrop = true
      }

      const controls = sample.controls
      const activelyAccelerating = controls?.forward === true
        && controls?.backward !== true
        && controls?.brake !== true
        && controls?.reset !== true
      if (activelyAccelerating && !recordedImmediateDrop) {
        state.speedWindowElapsed += Math.min(delta, 0.25)
        state.speedWindowPeak = Math.max(state.speedWindowPeak, previousSpeed, currentSpeed)
        if (state.speedWindowPeak >= 12
          && currentSpeed <= 1
          && state.speedWindowElapsed <= SPEED_DROP_WINDOW_SECONDS) {
          events = appendEvent(events, recordRuntimeDiagnostic(RUNTIME_EVENT_ID.PHYSICS_SPEED_DROP, {
            causeId: 'progressive-physics-speed-drop',
            raceSessionId: sample.raceSessionId,
            delta,
            previousSpeed: state.speedWindowPeak,
            currentSpeed,
            position: snapshotVector(currentPosition),
            gameState: sample.gameState,
            controls: { ...controls },
          }))
          state.speedWindowPeak = currentSpeed
          state.speedWindowElapsed = 0
        } else if (state.speedWindowElapsed > SPEED_DROP_WINDOW_SECONDS) {
          state.speedWindowPeak = currentSpeed
          state.speedWindowElapsed = 0
        }
      } else {
        state.speedWindowPeak = currentSpeed
        state.speedWindowElapsed = 0
      }
    }
  }

  if (sessionChanged) {
    state.speedWindowPeak = 0
    state.speedWindowElapsed = 0
  }
  const peak = state.speedWindowPeak
  const elapsed = state.speedWindowElapsed
  resetPhysicsObservation(state, sample)
  state.speedWindowPeak = peak
  state.speedWindowElapsed = elapsed
  return events
}
