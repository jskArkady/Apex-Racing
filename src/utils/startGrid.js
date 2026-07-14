import * as THREE from 'three'
import { START_FINISH_PROGRESS, trackCurve, trackLength } from './trackData'

// The grid is measured in metres behind the start/finish line, never in world
// axes. This keeps physics, AI and painted grid markings aligned if the circuit
// layout changes. The single-race grid is one transverse row just behind the
// painted line, matching the requested standing start while retaining visible
// clearance between cars.
export const START_GRID_DISTANCE_BEHIND_LINE = 4

export const START_GRID = Object.freeze({
  single: Object.freeze({
    ai_1: Object.freeze({ row: 0, side: -3, distanceBehindLine: START_GRID_DISTANCE_BEHIND_LINE, lateralOffset: -5.4 }),
    ai_2: Object.freeze({ row: 0, side: 1, distanceBehindLine: START_GRID_DISTANCE_BEHIND_LINE, lateralOffset: 1.8 }),
    ai_3: Object.freeze({ row: 0, side: 3, distanceBehindLine: START_GRID_DISTANCE_BEHIND_LINE, lateralOffset: 5.4 }),
    player: Object.freeze({ row: 0, side: -1, distanceBehindLine: START_GRID_DISTANCE_BEHIND_LINE, lateralOffset: -1.8 }),
  }),
  time_trial: Object.freeze({
    player: Object.freeze({ row: 0, side: 0, distanceBehindLine: START_GRID_DISTANCE_BEHIND_LINE, lateralOffset: 0 }),
  }),
})

const normalizeMode = (mode) => mode === 'time_trial' ? 'time_trial' : 'single'

export function getStartGridSlot(racerId, mode = 'single') {
  return START_GRID[normalizeMode(mode)][racerId] ?? null
}

export function getTrackPoseAtProgress(
  progress,
  lateralOffset = 0,
  curve = trackCurve,
) {
  if (!Number.isFinite(progress) || !Number.isFinite(lateralOffset)) {
    throw new RangeError('Track pose progress and lateral offset must be finite')
  }
  if (!curve || typeof curve.getPointAt !== 'function' || typeof curve.getTangentAt !== 'function') {
    throw new TypeError('Track pose requires a curve with point and tangent sampling')
  }

  const wrappedProgress = ((progress % 1) + 1) % 1
  const center = curve.getPointAt(wrappedProgress)
  const sampledTangent = curve.getTangentAt(wrappedProgress)
  const tangent = new THREE.Vector3(sampledTangent.x, 0, sampledTangent.z)
  if (tangent.lengthSq() < 1e-8) {
    throw new RangeError('Track-pose tangent must have a horizontal direction')
  }
  tangent.normalize()
  const right = new THREE.Vector3(-tangent.z, 0, tangent.x)
  const point = center.clone().addScaledVector(right, lateralOffset)
  const yaw = Math.atan2(-tangent.x, -tangent.z)
  const rotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw)

  return {
    progress: wrappedProgress,
    lateralOffset,
    point,
    tangent,
    right,
    position: [point.x, point.y + 1, point.z],
    rotation,
    yaw,
  }
}

export function getStartGridPose(racerId, mode = 'single', curve = trackCurve, length = trackLength) {
  const slot = getStartGridSlot(racerId, mode)
  if (!slot) return null
  if (!Number.isFinite(length) || length <= 0) {
    throw new RangeError('Track length must be a positive finite number')
  }

  const progress = ((START_FINISH_PROGRESS - slot.distanceBehindLine / length) % 1 + 1) % 1
  const pose = getTrackPoseAtProgress(progress, slot.lateralOffset, curve)

  return {
    racerId,
    mode: normalizeMode(mode),
    ...slot,
    ...pose,
  }
}

export function getStartGridPoses(mode = 'single') {
  const normalizedMode = normalizeMode(mode)
  return Object.keys(START_GRID[normalizedMode]).map((racerId) => (
    getStartGridPose(racerId, normalizedMode)
  ))
}
