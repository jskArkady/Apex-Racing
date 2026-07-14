import {
  recordRuntimeDiagnostic,
  RUNTIME_EVENT_ID,
  snapshotVector,
} from './runtimeDiagnostics'

export const WRONG_WAY_POLICY = Object.freeze({
  minimumReverseSpeed: 1,
  minimumReverseProgressSpeed: 0.75,
  // A barrier impact can throw a 1,200kg car backwards for several metres
  // while the driver is still trying to continue the lap.  WRONG WAY is a
  // navigation warning, not an impact detector, so require a manoeuvre that
  // is substantially longer than a normal collision rebound.
  entrySeconds: 1,
  entryDistance: 5,
  maximumSampleSeconds: 0.05,
  maximumProjectionNoiseDistance: 0.15,
  maximumProjectionNoiseSeconds: 0.1,
})

export const FALL_RECOVERY_CLEARANCE = 5

// Physical relocation is deliberately a very small, closed contract. Runtime
// classifications such as WRONG WAY, projection continuity and road distance
// are not relocation reasons: they may affect HUD/race validation, but never
// the rigid body. Keeping the allow-list beside the driving guards makes an
// accidental automatic respawn fail loudly during development and tests.
export const PLAYER_TRANSLATION_REASON = Object.freeze({
  SESSION_RESET: 'session-reset',
  MANUAL_RECOVERY: 'manual-recovery',
})

const PLAYER_TRANSLATION_REASON_SET = new Set(Object.values(PLAYER_TRANSLATION_REASON))

export function setPlayerTranslation(body, translation, reason, context = {}) {
  if (!PLAYER_TRANSLATION_REASON_SET.has(reason)) {
    throw new Error(`Invalid player translation reason: ${String(reason)}`)
  }
  if (!body || typeof body.setTranslation !== 'function') {
    throw new TypeError('Player translation requires a rigid body')
  }
  const before = typeof body.translation === 'function'
    ? snapshotVector(body.translation())
    : null
  body.setTranslation(translation, true)
  recordRuntimeDiagnostic(RUNTIME_EVENT_ID.PLAYER_TRANSLATION, {
    causeId: reason,
    reason,
    from: before,
    to: snapshotVector(translation),
    raceSessionId: context.raceSessionId ?? null,
    gameState: context.gameState ?? null,
    trigger: context.trigger ?? null,
  })
}

export function isClearlyBelowTrack(vehicleY, trackSurfaceY) {
  return Number.isFinite(vehicleY)
    && Number.isFinite(trackSurfaceY)
    && vehicleY <= trackSurfaceY - FALL_RECOVERY_CLEARANCE
}

export function createWrongWayState() {
  return {
    active: false,
    reverseSeconds: 0,
    reverseDistance: 0,
    projectionConflictSeconds: 0,
  }
}

export function resetWrongWayState(state) {
  state.active = false
  state.reverseSeconds = 0
  state.reverseDistance = 0
  state.projectionConflictSeconds = 0
  return false
}

export function updateWrongWayState(state, sample) {
  if (!state) return false
  const delta = Number.isFinite(sample?.delta)
    ? Math.min(Math.max(sample.delta, 0), WRONG_WAY_POLICY.maximumSampleSeconds)
    : 0
  const signedTravel = Number.isFinite(sample?.signedTrackTravel) ? sample.signedTrackTravel : 0
  const longitudinalSpeed = Number.isFinite(sample?.longitudinalTrackSpeed)
    ? sample.longitudinalTrackSpeed
    : 0

  if (sample?.grace || delta === 0) return resetWrongWayState(state)

  const progressSpeed = signedTravel / delta
  const physicallyReversing = longitudinalSpeed < -WRONG_WAY_POLICY.minimumReverseSpeed
  const confirmedReverse = sample?.continuous === true
    && physicallyReversing
    && progressSpeed < -WRONG_WAY_POLICY.minimumReverseProgressSpeed

  if (confirmedReverse) {
    state.projectionConflictSeconds = 0
    state.reverseSeconds += delta
    state.reverseDistance += -signedTravel
  } else if (
    physicallyReversing
    && sample?.continuous === true
    && Math.abs(signedTravel) <= WRONG_WAY_POLICY.maximumProjectionNoiseDistance
  ) {
    // At 120Hz the car can move less than the curve projection's refinement
    // resolution. One sample can therefore repeat (or move a few centimetres
    // forward) between valid reverse samples. Preserve, but never add to,
    // evidence only inside this tiny numerical envelope. A real forward
    // displacement or a conflict lasting more than 0.1s resets immediately.
    state.projectionConflictSeconds += delta
    if (state.projectionConflictSeconds > WRONG_WAY_POLICY.maximumProjectionNoiseSeconds) {
      return resetWrongWayState(state)
    }
    return state.active
  } else {
    // Both independent signals must agree on every accepted sample.  Holding
    // evidence across a projection conflict can join separate wall bounces or
    // a hairpin tangent transition into a false manoeuvre.  Resetting here is
    // conservative by design: a real sustained reverse drive immediately
    // starts accumulating again once projection and velocity agree.
    return resetWrongWayState(state)
  }

  state.active = state.reverseSeconds >= WRONG_WAY_POLICY.entrySeconds
    && state.reverseDistance >= WRONG_WAY_POLICY.entryDistance
  return state.active
}

export function isReverseCheckpointCrossing(sample) {
  const longitudinalSpeed = Number.isFinite(sample?.longitudinalTrackSpeed)
    ? sample.longitudinalTrackSpeed
    : 0
  const signedTravel = Number.isFinite(sample?.signedTrackTravel)
    ? sample.signedTrackTravel
    : 0

  // The HUD intentionally debounces WRONG WAY, but checkpoint validity does
  // not have a grace period. Keep a small numerical floor so a nearly lateral
  // velocity dot product cannot randomly block a checkpoint, while even very
  // slow deliberate reverse traversal remains invalid.
  return longitudinalSpeed < -0.0001
    || (sample?.continuous === true && signedTravel < -0.0001)
}
