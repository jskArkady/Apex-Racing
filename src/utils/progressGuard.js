// The physical road is 16m wide. Give the continuity corridor meaningful
// runoff beyond its 8m half-width so driving near an edge cannot be confused
// with leaving the circuit. This guard is a last-resort recovery boundary,
// not a lap-validity boundary.
export const PROGRESS_CORRIDOR_LIMIT = 16;
const CORRIDOR_NUMERICAL_EPSILON = 0.005;
const MAX_PLAUSIBLE_SPEED = 120;
const MAX_PLAUSIBLE_ACCELERATION = 30;
const MIN_WORLD_DISPLACEMENT_ALLOWANCE = 3.25;
const MAX_SAMPLE_DELTA = 0.5;
// A vehicle on the inside edge of a tight bend travels a shorter world-space
// chord than the centreline arc for the same progress. Keep a small bounded
// allowance for that legal lane geometry and curve-projection quantization;
// it is deliberately tiny compared with the jumps rejected by the alias guard.
const CURVE_ARC_LANE_ALLOWANCE = 3.1;
const LOCAL_PROJECTION_WINDOW_METERS = 36;
const LOCAL_PROJECTION_COARSE_SAMPLES = 25;
const GLOBAL_PROJECTION_SPACING_METERS = 7;
export const PROJECTION_SEAM_SNAP_METERS = 0.02;
const createProjectionPoint = () => ({
  x: 0,
  y: 0,
  z: 0,
  set(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }
});
const projectionFirstPoint = createProjectionPoint();
const projectionSecondPoint = createProjectionPoint();
const projectionFinalPoint = createProjectionPoint();
const projectionCoarsePoint = createProjectionPoint();

const isFiniteVector = (position) => position
  && Number.isFinite(position.x)
  && Number.isFinite(position.y)
  && Number.isFinite(position.z);

const copyPosition = (position) => ({
  x: position.x,
  y: position.y,
  z: position.z
});

const wrapProgress = (progress) => ((progress % 1) + 1) % 1;

/**
 * Canonicalizes the numerically duplicated endpoint of a closed curve.
 * Three.js can return either 0 or 0.99999... for the same world position;
 * race controllers must agree on one value or a physical finish-line crossing
 * can be missed even though every preceding checkpoint was accepted.
 */
export function snapProgressAtClosedCurveSeam(progress, trackLength) {
  const wrappedProgress = wrapProgress(progress);
  return Number.isFinite(trackLength)
    && trackLength > 0
    && (1 - wrappedProgress) * trackLength <= PROJECTION_SEAM_SNAP_METERS
    ? 0
    : wrappedProgress;
}

const squaredDistance = (a, b) => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return dx * dx + dy * dy + dz * dz;
};

const squaredRoadPlaneDistance = (a, b) => {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return dx * dx + dz * dz;
};

const refineCurveProjection = (
  curve,
  worldPosition,
  center,
  halfWindow,
  iterations,
  distanceSquared = squaredDistance
) => {
  let left = center - halfWindow;
  let right = center + halfWindow;

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const first = left + (right - left) / 3;
    const second = right - (right - left) / 3;
    const firstPoint = curve.getPointAt(wrapProgress(first), projectionFirstPoint);
    const secondPoint = curve.getPointAt(wrapProgress(second), projectionSecondPoint);
    if (distanceSquared(worldPosition, firstPoint) <= distanceSquared(worldPosition, secondPoint)) {
      right = second;
    } else {
      left = first;
    }
  }

  const wrappedProgress = snapProgressAtClosedCurveSeam(
    (left + right) / 2,
    curve.getLength()
  );
  // The closed curve has two numerically equivalent parameters at the painted
  // line. Snap only the final two centimetres to zero so an exact crossing is
  // not reported as 0.99999 and missed by lap timing.
  const progress = wrappedProgress;
  // The corridor is a lateral road boundary. The rigid body's centre sits
  // about one metre above the curve, so including Y would shrink a 16m
  // horizontal corridor to ~15.97m and could trigger recovery while the car
  // is still inside it. Keep 3D distance for choosing the correct curve
  // section, but classify the accepted section in the road (XZ) plane.
  const centerlineDistance = Math.sqrt(
    squaredRoadPlaneDistance(
      worldPosition,
      curve.getPointAt(progress, projectionFinalPoint)
    )
  );
  return { progress, centerlineDistance };
};

/**
 * Projects a position onto a closed curve. Once progress is established, the
 * search remains local to the last continuity-approved segment. This prevents
 * nearby/parallel parts of a circuit from stealing the nearest-point result
 * when the car uses the outer half of its lane.
 */
export function projectPointOntoClosedCurve(
  curve,
  worldPosition,
  previousProgress = null,
  coarseSamples = 128,
  refinementIterations = 14
) {
  if (!curve || !isFiniteVector(worldPosition)) {
    return { progress: 0, centerlineDistance: Infinity };
  }

  if (Number.isFinite(previousProgress)) {
    // Keep the continuity window in metres so a longer redesign cannot make
    // nearby parallel sections compete inside an oversized percentage window.
    // A folded chicane can contain more than one local distance minimum in
    // this window, so ternary-searching the entire span is invalid. Bracket
    // the closest 3m-scale sample first, then refine only that one basin.
    const center = wrapProgress(previousProgress);
    const halfWindow = LOCAL_PROJECTION_WINDOW_METERS / curve.getLength();
    const sampleStep = (halfWindow * 2) / (LOCAL_PROJECTION_COARSE_SAMPLES - 1);
    let bestProgress = center;
    let bestDistanceSquared = Infinity;
    for (let index = 0; index < LOCAL_PROJECTION_COARSE_SAMPLES; index += 1) {
      const progress = center - halfWindow + index * sampleStep;
      const distanceSquared = squaredDistance(
        worldPosition,
        curve.getPointAt(wrapProgress(progress), projectionCoarsePoint)
      );
      if (distanceSquared < bestDistanceSquared) {
        bestDistanceSquared = distanceSquared;
        bestProgress = progress;
      }
    }

    return refineCurveProjection(
      curve,
      worldPosition,
      bestProgress,
      sampleStep,
      refinementIterations
    );
  }

  const sampleCount = Math.max(
    16,
    Math.floor(coarseSamples),
    Math.ceil(curve.getLength() / GLOBAL_PROJECTION_SPACING_METERS)
  );
  let bestProgress = 0;
  let bestDistanceSquared = Infinity;
  for (let index = 0; index < sampleCount; index += 1) {
    const progress = index / sampleCount;
    const distanceSquared = squaredDistance(
      worldPosition,
      curve.getPointAt(progress, projectionCoarsePoint)
    );
    if (distanceSquared < bestDistanceSquared) {
      bestDistanceSquared = distanceSquared;
      bestProgress = progress;
    }
  }

  return refineCurveProjection(
    curve,
    worldPosition,
    bestProgress,
    1.5 / sampleCount,
    refinementIterations
  );
}

/**
 * Finds the physically nearest road section using XZ only. This is kept
 * separate from continuity-approved race progress: vehicle recovery needs the
 * road height under the current chassis, even while logical progress is
 * intentionally frozen after a discontinuity.
 */
export function projectRoadPlanePointOntoClosedCurve(
  curve,
  worldPosition,
  coarseSamples = 128,
  refinementIterations = 14
) {
  if (!curve || !isFiniteVector(worldPosition)) {
    return { progress: 0, centerlineDistance: Infinity };
  }

  const sampleCount = Math.max(
    16,
    Math.floor(coarseSamples),
    Math.ceil(curve.getLength() / GLOBAL_PROJECTION_SPACING_METERS)
  );
  let bestProgress = 0;
  let bestDistanceSquared = Infinity;
  for (let index = 0; index < sampleCount; index += 1) {
    const progress = index / sampleCount;
    const distanceSquared = squaredRoadPlaneDistance(
      worldPosition,
      curve.getPointAt(progress, projectionCoarsePoint)
    );
    if (distanceSquared < bestDistanceSquared) {
      bestDistanceSquared = distanceSquared;
      bestProgress = progress;
    }
  }

  return refineCurveProjection(
    curve,
    worldPosition,
    bestProgress,
    1.5 / sampleCount,
    refinementIterations,
    squaredRoadPlaneDistance
  );
}

/**
 * Projection/timing failures must freeze race progress, not move the physical
 * car. Only a position confirmed well outside the road and runoff requests an
 * automatic recovery; falling and manual reset are handled directly by Car.
 */
export function shouldRecoverFromProgressFailure() {
  return false;
}

const rejectProgress = (state, reason) => {
  state.segmentValid = false;
  state.reason = reason;
  state.timingReanchorAllowed = false;
  state.pendingForwardSeamCrossing = false;
  return false;
};

export function createProgressGuardState(segmentValid = true) {
  return {
    initialized: false,
    worldPosition: null,
    curveProgress: 0,
    segmentValid,
    reason: null,
    timingReanchorAllowed: false,
    pendingForwardSeamCrossing: false,
    confirmedForwardSeamCrossing: false
  };
}

export function didConfirmForwardSeamCrossing(state) {
  return state?.confirmedForwardSeamCrossing === true;
}

/**
 * Returns the shortest signed progress delta on a closed unit interval.
 * Positive values move forward through the 1 -> 0 seam.
 */
export function getSignedWrappedProgressDelta(previousProgress, currentProgress) {
  return ((currentProgress - previousProgress + 1.5) % 1) - 0.5;
}

/**
 * Validates whether a frame-to-frame race progress sample is physically
 * continuous. Only accepted samples advance the returned guard state.
 */
export function updateProgressGuardState(
  state,
  worldPosition,
  curveProgress,
  centerlineDistance,
  speed,
  delta,
  trackLength
) {
  if (!state) return false;
  state.confirmedForwardSeamCrossing = false;

  if (
    !isFiniteVector(worldPosition)
    || !Number.isFinite(curveProgress)
    || !Number.isFinite(centerlineDistance)
    || !Number.isFinite(speed)
    || !Number.isFinite(delta)
    || !Number.isFinite(trackLength)
    || delta <= 0
    || trackLength <= 0
  ) {
    return rejectProgress(state, 'invalid-sample');
  }

  if (delta > MAX_SAMPLE_DELTA) {
    let timingReanchorAllowed = false;
    if (state.initialized && isFiniteVector(state.worldPosition)) {
      const suspendedDisplacement = Math.sqrt(squaredDistance(worldPosition, state.worldPosition));
      const boundedSpeed = Math.min(Math.abs(speed), MAX_PLAUSIBLE_SPEED);
      // Rapier/render integration is not allowed to claim an arbitrarily large
      // displacement budget merely because a browser tab was hidden for a
      // long time. The controller treats at most one normal guard interval as
      // simulated motion across the gap.
      const boundedDelta = Math.min(delta, MAX_SAMPLE_DELTA);
      const suspendedDisplacementLimit = Math.max(
        MIN_WORLD_DISPLACEMENT_ALLOWANCE,
        1.5 * boundedSpeed * boundedDelta
          + 0.5 * MAX_PLAUSIBLE_ACCELERATION * boundedDelta * boundedDelta
          + 1
      );
      timingReanchorAllowed = suspendedDisplacement <= suspendedDisplacementLimit;
    }
    const normalizedProgress = wrapProgress(curveProgress);
    const wrappedDelta = state.initialized
      ? getSignedWrappedProgressDelta(state.curveProgress, normalizedProgress)
      : 0;
    rejectProgress(state, 'timing-discontinuity');
    state.timingReanchorAllowed = timingReanchorAllowed;
    state.pendingForwardSeamCrossing = timingReanchorAllowed
      && state.curveProgress > 0.5
      && normalizedProgress < 0.5
      && wrappedDelta > 0;
    return false;
  }

  if (
    centerlineDistance > PROGRESS_CORRIDOR_LIMIT + CORRIDOR_NUMERICAL_EPSILON
    || centerlineDistance < 0
  ) {
    return rejectProgress(state, 'outside-corridor');
  }

  const normalizedProgress = wrapProgress(curveProgress);
  if (!state.initialized) {
    state.initialized = true;
    state.worldPosition = copyPosition(worldPosition);
    state.curveProgress = normalizedProgress;
    state.segmentValid = true;
    state.reason = null;
    return true;
  }

  // A suspended-frame timing sample must not permanently pin projection to an
  // obsolete curve section. Car performs one global projection after this
  // specific rejection; use it as a fresh anchor, but return false so the
  // discontinuous frame cannot award a checkpoint.
  //
  // Do not apply this to world teleports or curve aliases. Those must retain
  // the last trusted anchor indefinitely (or until reset), otherwise holding a
  // teleported position for two frames would turn the guard into an exploit.
  if (
    !state.segmentValid
    && state.reason === 'timing-discontinuity'
    && state.timingReanchorAllowed
  ) {
    state.worldPosition = copyPosition(worldPosition);
    state.curveProgress = normalizedProgress;
    state.segmentValid = true;
    state.reason = 'continuity-reanchored';
    state.timingReanchorAllowed = false;
    state.confirmedForwardSeamCrossing = state.pendingForwardSeamCrossing === true;
    state.pendingForwardSeamCrossing = false;
    return false;
  }

  if (!isFiniteVector(state.worldPosition) || !Number.isFinite(state.curveProgress)) {
    return rejectProgress(state, 'invalid-state');
  }

  const dx = worldPosition.x - state.worldPosition.x;
  const dy = worldPosition.y - state.worldPosition.y;
  const dz = worldPosition.z - state.worldPosition.z;
  const worldDisplacement = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const boundedSpeed = Math.min(Math.abs(speed), MAX_PLAUSIBLE_SPEED);
  const worldDisplacementLimit = Math.max(
    MIN_WORLD_DISPLACEMENT_ALLOWANCE,
    1.5 * boundedSpeed * delta
      + 0.5 * MAX_PLAUSIBLE_ACCELERATION * delta * delta
      + 1
  );

  if (worldDisplacement > worldDisplacementLimit) {
    return rejectProgress(state, 'world-teleport');
  }

  const wrappedDelta = getSignedWrappedProgressDelta(state.curveProgress, normalizedProgress);
  const curveArcDisplacement = Math.abs(wrappedDelta) * trackLength;
  const curveArcLimit = 1.25 * worldDisplacement + CURVE_ARC_LANE_ALLOWANCE;

  if (curveArcDisplacement > curveArcLimit) {
    return rejectProgress(state, 'curve-alias-jump');
  }

  state.worldPosition.x = worldPosition.x;
  state.worldPosition.y = worldPosition.y;
  state.worldPosition.z = worldPosition.z;
  state.curveProgress = normalizedProgress;
  state.segmentValid = true;
  state.reason = null;
  state.timingReanchorAllowed = false;
  state.pendingForwardSeamCrossing = false;
  return true;
}

/**
 * Immutable wrapper used by unit tests and other pure-logic consumers.
 * Runtime controllers use updateProgressGuardState to avoid per-frame GC.
 */
export function validateProgressSample(previousState, sample) {
  const sourceState = previousState ?? createProgressGuardState();
  const state = {
    ...sourceState,
    worldPosition: sourceState.worldPosition
      ? copyPosition(sourceState.worldPosition)
      : null
  };
  const {
    worldPosition,
    curveProgress,
    centerlineDistance,
    speed,
    delta,
    trackLength
  } = sample ?? {};
  const valid = updateProgressGuardState(
    state,
    worldPosition,
    curveProgress,
    centerlineDistance,
    speed,
    delta,
    trackLength
  );

  return { valid, reason: state.reason, state };
}
