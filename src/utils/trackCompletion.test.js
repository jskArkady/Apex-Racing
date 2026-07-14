import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { createBarrierGeometry, createRoadGeometry, ROAD_WIDTH } from '../components/trackGeometry'
import { handleCheckpointPass } from './raceLogic'
import { trackCurve, trackLength } from './trackData'

const SAMPLE_COUNT = 320
const CHECKPOINT_COUNT = 10

describe('track completion geometry', () => {
  it('uses a welded closed road mesh instead of a duplicate trimesh seam', () => {
    const geometry = createRoadGeometry(trackCurve, SAMPLE_COUNT)
    const positions = geometry.getAttribute('position')
    const indices = geometry.getIndex().array

    // Four vertices per cross-section. A duplicate (samples + 1) ring creates
    // coincident but disconnected boundary edges at start/finish in Rapier.
    expect(positions.count).toBe(SAMPLE_COUNT * 4)
    expect(indices.length).toBe(SAMPLE_COUNT * 4 * 6)
    expect(Array.from(positions.array).every(Number.isFinite)).toBe(true)

    const edgeUse = new Map()
    for (let offset = 0; offset < indices.length; offset += 3) {
      const triangle = [indices[offset], indices[offset + 1], indices[offset + 2]]
      for (let edge = 0; edge < 3; edge += 1) {
        const first = triangle[edge]
        const second = triangle[(edge + 1) % 3]
        const key = first < second ? `${first}:${second}` : `${second}:${first}`
        edgeUse.set(key, (edgeUse.get(key) ?? 0) + 1)
      }
    }
    expect(Array.from(edgeUse.values()).every((uses) => uses === 2)).toBe(true)

    const seamIndices = Array.from(indices.slice(-24))
    expect(seamIndices.some((index) => index < 4)).toBe(true)
    expect(seamIndices.every((index) => index < SAMPLE_COUNT * 4)).toBe(true)

    geometry.dispose()
  })

  it('keeps the complete centreline within drivable grade and curvature limits', () => {
    const samples = Math.ceil(trackLength)
    let maximumGrade = 0
    let minimumRadius = Infinity

    for (let index = 0; index < samples; index += 1) {
      const progress = index / samples
      const nextProgress = (index + 1) / samples
      const point = trackCurve.getPointAt(progress)
      const nextPoint = trackCurve.getPointAt(nextProgress)
      const tangent = trackCurve.getTangentAt(progress).normalize()
      const nextTangent = trackCurve.getTangentAt(nextProgress).normalize()
      const horizontal = Math.hypot(tangent.x, tangent.z)
      const distance = point.distanceTo(nextPoint)
      const headingChange = tangent.angleTo(nextTangent)

      maximumGrade = Math.max(maximumGrade, Math.abs(tangent.y) / horizontal)
      if (headingChange > 1e-6) {
        minimumRadius = Math.min(minimumRadius, distance / headingChange)
      }
    }

    expect(trackCurve.closed).toBe(true)
    expect(trackCurve.getPointAt(0).distanceTo(trackCurve.getPointAt(1))).toBeLessThan(1e-6)
    // Three.js estimates endpoint tangents with a finite difference, so allow
    // its sub-milliradian numerical mismatch while requiring visual continuity.
    expect(trackCurve.getTangentAt(0).angleTo(trackCurve.getTangentAt(1))).toBeLessThan(0.001)
    expect(maximumGrade).toBeLessThan(0.1)
    expect(minimumRadius).toBeGreaterThan(12)
  })

  it('places every checkpoint on a continuous, separated section of road', () => {
    const checkpoints = Array.from({ length: CHECKPOINT_COUNT }, (_, index) => ({
      point: trackCurve.getPointAt(index / CHECKPOINT_COUNT),
      tangent: trackCurve.getTangentAt(index / CHECKPOINT_COUNT).normalize(),
    }))

    for (let index = 0; index < checkpoints.length; index += 1) {
      const current = checkpoints[index]
      const next = checkpoints[(index + 1) % checkpoints.length]
      const separation = current.point.distanceTo(next.point)

      expect(current.point.toArray().every(Number.isFinite)).toBe(true)
      expect(current.tangent.length()).toBeCloseTo(1, 6)
      expect(separation).toBeGreaterThan(ROAD_WIDTH * 4)
    }
  })

  it('provides continuous barriers outside both road edges for the full loop', () => {
    const geometry = createBarrierGeometry(trackCurve, 256)
    const positions = geometry.getAttribute('position')
    const indices = geometry.getIndex().array
    const bounds = new THREE.Box3().setFromBufferAttribute(positions)

    expect(positions.count).toBe(256 * 4 * 2)
    expect(indices.length).toBe(256 * 4 * 6 * 2)
    expect(Array.from(positions.array).every(Number.isFinite)).toBe(true)
    expect(bounds.isEmpty()).toBe(false)
    expect([
      bounds.min.x,
      bounds.min.y,
      bounds.min.z,
      bounds.max.x,
      bounds.max.y,
      bounds.max.z,
    ].every(Number.isFinite)).toBe(true)

    geometry.dispose()
  })

  it('requires the finish line after checkpoint nine on every one of three laps', () => {
    let state = {
      gameState: 'playing',
      lap: 1,
      maxLaps: 3,
      totalCheckpoints: CHECKPOINT_COUNT,
      // The player starts on the finish line, so checkpoint one is the first
      // target. Checkpoint zero is reserved for the next finish-line crossing.
      nextCheckpointIndex: 1,
      currentTime: 45,
      totalTime: 0,
      bestLapTime: 0,
    }

    for (let lap = 1; lap <= 3; lap += 1) {
      for (let checkpoint = 1; checkpoint < CHECKPOINT_COUNT; checkpoint += 1) {
        state = handleCheckpointPass(state, checkpoint)
      }

      expect(state.lap).toBe(lap)
      expect(state.gameState).toBe('playing')
      expect(state.nextCheckpointIndex).toBe(0)

      state = handleCheckpointPass(state, 0)
      if (lap < 3) {
        expect(state.lap).toBe(lap + 1)
        expect(state.nextCheckpointIndex).toBe(1)
        state = { ...state, currentTime: 45 }
      }
    }

    expect(state.gameState).toBe('finished')
    expect(state.totalTime).toBe(135)
  })
})
