export const VEHICLE_DYNAMICS = Object.freeze({
  mass: 1200,
  launchEngineForce: 12000,
  maxEngineForce: 18000,
  reverseEngineForce: 9000,
  brakingForce: 18000,
  highSpeedBrakingForce: 24000,
  emergencyBrakingForce: 30000,
  maxSteeringForce: 9000,
  nominalTopSpeed: 55,
  linearDamping: 0.3,
  angularDamping: 5,
  // Maximum controller-generated sideways correction. A hard acceleration
  // ceiling preserves momentum when chassis yaw and travel briefly disagree.
  lateralGripAcceleration: 10,
  // Render callbacks can receive a large delta after a background/suspended
  // frame. Every synthetic controller impulse must use the same bounded step;
  // otherwise lateral grip can remove almost all momentum while the engine
  // only applies one normal-sized impulse.
  maxControlStep: 1 / 20,
  physicsStep: 1 / 60,
  targetAcceleration: 5,
  targetDeceleration: 8,
  speedControlDeadband: 0.35,
  collisionEscapeArmSeconds: 0.25,
  collisionEscapeMaxSpeed: 1,
  collisionEscapeYawRate: 1,
})

// Rapier expects cuboid half-extents. Keeping the chassis dimensions beside
// the shared dynamics prevents player/AI colliders and track-edge planning
// from silently using different vehicle widths.
export const VEHICLE_COLLIDER_HALF_EXTENTS = Object.freeze({
  width: 1,
  height: 0.45,
  length: 2,
})

export const TRACK_EDGE_AVOIDANCE_DISTANCE = 2
export const TRACK_EDGE_AVOIDANCE_MAX_STEER = 1.5
export const AI_LANE_MERGE_DISTANCE = 60
// Two four-metre-long chassis touch at a four-metre centre distance. Start a
// deliberate lane change before that point instead of asking the solver to
// separate cars that are already interpenetrating.
export const AI_CAR_AVOIDANCE_DISTANCE = 5.5
export const AI_CAR_AVOIDANCE_MAX_STEER = 1.5
export const AI_TRAFFIC_BASE_GAP = VEHICLE_COLLIDER_HALF_EXTENTS.length * 2 + 1
export const AI_TRAFFIC_REACTION_SECONDS = 0.35

export function advanceAIMergeDistance(
  accumulatedDistance,
  previousProgress,
  currentProgress,
  trackLength,
) {
  const safeAccumulated = Number.isFinite(accumulatedDistance)
    ? Math.max(0, Math.min(AI_LANE_MERGE_DISTANCE, accumulatedDistance))
    : 0
  if (!Number.isFinite(previousProgress)
    || !Number.isFinite(currentProgress)
    || !Number.isFinite(trackLength)
    || trackLength <= 0) return safeAccumulated

  const signedProgress = ((currentProgress - previousProgress + 1.5) % 1) - 0.5
  const forwardDistance = Math.max(0, signedProgress * trackLength)
  return Math.min(AI_LANE_MERGE_DISTANCE, safeAccumulated + forwardDistance)
}

export function getAIMergeLateralOffset(
  startLateralOffset,
  travelledDistance,
  roadWidth,
  preferredLateralOffset = 0,
) {
  if (!Number.isFinite(startLateralOffset)
    || !Number.isFinite(travelledDistance)
    || !Number.isFinite(roadWidth)
    || roadWidth <= 0) return 0

  const maximumSafeOffset = Math.max(
    0,
    roadWidth / 2 - VEHICLE_COLLIDER_HALF_EXTENTS.width - 0.5,
  )
  const safeStartOffset = Math.max(
    -maximumSafeOffset,
    Math.min(maximumSafeOffset, startLateralOffset),
  )
  const safePreferredOffset = Number.isFinite(preferredLateralOffset)
    ? Math.max(-maximumSafeOffset, Math.min(maximumSafeOffset, preferredLateralOffset))
    : 0
  const progress = Math.max(0, Math.min(1, travelledDistance / AI_LANE_MERGE_DISTANCE))
  const smoothstep = progress * progress * (3 - 2 * progress)
  return safeStartOffset + (safePreferredOffset - safeStartOffset) * smoothstep
}

export function getTrackEdgeAvoidanceSteer(
  lateralOffset,
  roadWidth,
  preferredLateralOffset = 0,
) {
  if (!Number.isFinite(lateralOffset) || !Number.isFinite(roadWidth) || roadWidth <= 0) {
    return 0
  }

  const drivableCenterLimit = Math.max(
    0,
    roadWidth / 2 - VEHICLE_COLLIDER_HALF_EXTENTS.width,
  )
  const clearance = drivableCenterLimit - Math.abs(lateralOffset)
  const preferredClearance = Number.isFinite(preferredLateralOffset)
    && preferredLateralOffset !== 0
    ? drivableCenterLimit - Math.min(
      drivableCenterLimit,
      Math.abs(preferredLateralOffset),
    )
    : TRACK_EDGE_AVOIDANCE_DISTANCE
  const activationDistance = Math.max(
    0.5,
    Math.min(TRACK_EDGE_AVOIDANCE_DISTANCE, preferredClearance),
  )
  if (clearance >= activationDistance) return 0

  const strength = Math.min(
    1,
    Math.max(0, (activationDistance - clearance) / activationDistance),
  )
  return (lateralOffset > 0 ? -1 : 1) * strength * TRACK_EDGE_AVOIDANCE_MAX_STEER
}

export function getNearbyCarAvoidanceSteer(distance, forwardDistance, lateralDistance) {
  if (!Number.isFinite(distance)
    || !Number.isFinite(forwardDistance)
    || !Number.isFinite(lateralDistance)
    || distance >= AI_CAR_AVOIDANCE_DISTANCE
    // A correctly spaced car in the neighbouring grid column is close in
    // Euclidean distance but poses no overlap risk. Restrict the manoeuvre to
    // the lane-width corridor around this chassis.
    || Math.abs(lateralDistance) >= VEHICLE_COLLIDER_HALF_EXTENTS.width * 2 + 0.75
    || forwardDistance <= -2) return 0

  const strength = (AI_CAR_AVOIDANCE_DISTANCE - Math.max(0, distance))
    / AI_CAR_AVOIDANCE_DISTANCE
  return (lateralDistance >= 0 ? -1 : 1) * strength * AI_CAR_AVOIDANCE_MAX_STEER
}

const clamp01 = (value) => Math.max(0, Math.min(1, value))

/**
 * Continuous synthetic tyre envelope shared by AI command generation and
 * pure tests. It preserves full grip for gentle inputs and progressively
 * releases up to forty percent as speed/steering or braking demand rises.
 */
export function getContinuousGripScale(speed, steeringInput = 0, brakingInput = 0) {
  const safeSpeed = Number.isFinite(speed) ? Math.max(0, Math.abs(speed)) : 0
  const steeringDemand = Number.isFinite(steeringInput)
    ? clamp01(Math.abs(steeringInput))
    : 0
  const brakingDemand = Number.isFinite(brakingInput)
    ? clamp01(Math.abs(brakingInput))
    : 0
  const speedProgress = clamp01((safeSpeed - 20) / 25)
  const smoothSpeed = speedProgress * speedProgress * (3 - 2 * speedProgress)
  const tractionDemand = Math.max(brakingDemand, smoothSpeed * steeringDemand)
  return 1 - 0.4 * tractionDemand
}

/**
 * Returns a safe AI target speed for a car ahead in the same lane. When the
 * other velocity is available the allowance includes reaction distance and
 * relative-speed braking distance; legacy position-only callers retain a
 * conservative distance ramp.
 */
export function getAITrafficTargetSpeed(
  targetSpeed,
  forwardDistance,
  lateralDistance,
  egoForwardSpeed,
  otherForwardSpeed = Number.NaN,
) {
  const safeTargetSpeed = Number.isFinite(targetSpeed) ? Math.max(0, targetSpeed) : 0
  if (!Number.isFinite(forwardDistance)
    || !Number.isFinite(lateralDistance)
    || forwardDistance <= 0
    || Math.abs(lateralDistance) >= VEHICLE_COLLIDER_HALF_EXTENTS.width * 2 + 0.75) {
    return safeTargetSpeed
  }

  const baseGap = AI_TRAFFIC_BASE_GAP
  if (!Number.isFinite(egoForwardSpeed) || !Number.isFinite(otherForwardSpeed)) {
    if (forwardDistance >= 15) return safeTargetSpeed
    const distanceFactor = clamp01((forwardDistance - baseGap) / (15 - baseGap))
    return safeTargetSpeed * distanceFactor
  }

  const egoSpeed = Math.max(0, egoForwardSpeed)
  const otherSpeed = Math.max(0, otherForwardSpeed)
  const closingSpeed = Math.max(0, egoSpeed - otherSpeed)
  if (closingSpeed === 0) return safeTargetSpeed

  const brakingAcceleration = VEHICLE_DYNAMICS.highSpeedBrakingForce
    / VEHICLE_DYNAMICS.mass
  const reactionDistance = closingSpeed * AI_TRAFFIC_REACTION_SECONDS
  const availableBrakingDistance = Math.max(
    0,
    forwardDistance - baseGap - reactionDistance,
  )
  const safeClosingSpeed = Math.sqrt(2 * brakingAcceleration * availableBrakingDistance)
  const brakingTarget = otherSpeed + safeClosingSpeed
  const timeToGap = (forwardDistance - baseGap) / closingSpeed
  const ttcProgress = clamp01((timeToGap - 0.75) / 1.25)
  const smoothTtc = ttcProgress * ttcProgress * (3 - 2 * ttcProgress)
  const ttcTarget = otherSpeed + (brakingTarget - otherSpeed) * smoothTtc

  return Math.max(0, Math.min(safeTargetSpeed, ttcTarget))
}

export function getControlDelta(delta) {
  if (!Number.isFinite(delta) || delta <= 0) return 0
  return Math.min(delta, VEHICLE_DYNAMICS.maxControlStep)
}

export function getLateralCorrectionDelta(lateralSpeed, delta, gripScale = 1) {
  if (!Number.isFinite(lateralSpeed)) return 0
  const controlDelta = getControlDelta(delta)
  const safeScale = Number.isFinite(gripScale)
    ? Math.max(0, Math.min(1, gripScale))
    : 1
  const maximumDelta = VEHICLE_DYNAMICS.lateralGripAcceleration * safeScale * controlDelta
  return Math.max(-maximumDelta, Math.min(maximumDelta, -lateralSpeed))
}

export function getSteeringSpeedFactor(forwardSpeed) {
  const safeSpeed = Number.isFinite(forwardSpeed) ? Math.abs(forwardSpeed) : 0
  if (safeSpeed <= 12) return Math.max(0.22, safeSpeed / 12)
  return 1 - 0.6 * Math.min((safeSpeed - 12) / 43, 1)
}

export function moveTowards(current, target, maximumDelta) {
  if (!Number.isFinite(current) || !Number.isFinite(target)) return 0
  const safeDelta = Number.isFinite(maximumDelta) ? Math.max(0, maximumDelta) : 0
  if (target > current) return Math.min(target, current + safeDelta)
  return Math.max(target, current - safeDelta)
}

/**
 * Produces scalar impulses for one physics step. Keeping this calculation free
 * of Three/Rapier objects lets player and AI use exactly the same braking,
 * steering and grip envelope.
 */
export function calculateVehicleActuation({
  engineForce = 0,
  brakingForce = 0,
  steeringInput = 0,
  forwardSpeed = 0,
  lateralSpeed = 0,
  mass = VEHICLE_DYNAMICS.mass,
  delta = VEHICLE_DYNAMICS.physicsStep,
  gripScale = 1,
}) {
  const controlDelta = getControlDelta(delta)
  const safeMass = Number.isFinite(mass) && mass > 0 ? mass : VEHICLE_DYNAMICS.mass
  const safeForwardSpeed = Number.isFinite(forwardSpeed) ? forwardSpeed : 0
  const safeEngineForce = Number.isFinite(engineForce) ? engineForce : 0
  const safeBrakingForce = Number.isFinite(brakingForce) ? Math.max(0, brakingForce) : 0
  const safeSteeringInput = Number.isFinite(steeringInput)
    ? Math.max(-1, Math.min(1, steeringInput))
    : 0

  let forwardImpulse = safeEngineForce * controlDelta
  if (safeBrakingForce > 0) {
    const fullBrakeImpulse = safeBrakingForce * controlDelta
    const momentum = Math.abs(safeForwardSpeed) * safeMass
    if (fullBrakeImpulse >= momentum) {
      // A brake step that can fully stop the car wins over simultaneous
      // throttle. This reaches zero once without crossing into reverse jitter.
      forwardImpulse = momentum === 0
        ? 0
        : -Math.sign(safeForwardSpeed) * momentum
    } else {
      forwardImpulse += -Math.sign(safeForwardSpeed) * fullBrakeImpulse
    }
  }

  const steeringSpeedFactor = getSteeringSpeedFactor(safeForwardSpeed)
  const steeringForce = VEHICLE_DYNAMICS.maxSteeringForce
    * steeringSpeedFactor
    * safeSteeringInput
  const lateralVelocityDelta = getLateralCorrectionDelta(lateralSpeed, controlDelta, gripScale)

  return {
    controlDelta,
    forwardImpulse,
    lateralImpulse: lateralVelocityDelta * safeMass,
    steeringImpulse: steeringForce * controlDelta,
    steeringForce,
    steeringSpeedFactor,
  }
}

export function getForwardEngineForce(speed) {
  const safeSpeed = Number.isFinite(speed) ? Math.max(0, speed) : 0
  if (safeSpeed >= VEHICLE_DYNAMICS.nominalTopSpeed) return 0
  if (safeSpeed <= 10) return VEHICLE_DYNAMICS.launchEngineForce
  const accelerationBlend = Math.min((safeSpeed - 10) / 20, 1)
  const availableForce = VEHICLE_DYNAMICS.launchEngineForce
    + (VEHICLE_DYNAMICS.maxEngineForce - VEHICLE_DYNAMICS.launchEngineForce) * accelerationBlend
  const taperStart = VEHICLE_DYNAMICS.nominalTopSpeed - 10
  const topSpeedTaper = safeSpeed <= taperStart
    ? 1
    : (VEHICLE_DYNAMICS.nominalTopSpeed - safeSpeed) / 10
  return availableForce * topSpeedTaper
}

export function getBrakingForce(speed, emergency = false) {
  if (emergency) return VEHICLE_DYNAMICS.emergencyBrakingForce
  return speed > 5
    ? VEHICLE_DYNAMICS.highSpeedBrakingForce
    : VEHICLE_DYNAMICS.brakingForce
}
