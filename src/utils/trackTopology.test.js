import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { BARRIER_SEGMENTS } from '../components/trackGeometry'
import { TRACK_PRESETS } from './trackData'

const WORLD_UP = new THREE.Vector3(0, 1, 0)
const TOPOLOGY_SAMPLES = 1024
const CURVATURE_SAMPLES = 8192
const BARRIER_HALF_WIDTH = 0.25

const cross2d = (a, b, c) => (
  (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x)
)

const onSegment2d = (a, b, point, epsilon = 1e-7) => (
  point.x >= Math.min(a.x, b.x) - epsilon
  && point.x <= Math.max(a.x, b.x) + epsilon
  && point.z >= Math.min(a.z, b.z) - epsilon
  && point.z <= Math.max(a.z, b.z) + epsilon
)

function segmentsIntersect2d(a, b, c, d) {
  const epsilon = 1e-7
  const abC = cross2d(a, b, c)
  const abD = cross2d(a, b, d)
  const cdA = cross2d(c, d, a)
  const cdB = cross2d(c, d, b)

  if (abC * abD < -epsilon && cdA * cdB < -epsilon) return true
  if (Math.abs(abC) <= epsilon && onSegment2d(a, b, c, epsilon)) return true
  if (Math.abs(abD) <= epsilon && onSegment2d(a, b, d, epsilon)) return true
  if (Math.abs(cdA) <= epsilon && onSegment2d(c, d, a, epsilon)) return true
  return Math.abs(cdB) <= epsilon && onSegment2d(c, d, b, epsilon)
}

function getOffsetLoop(curve, sampleCount, lateralOffset) {
  return Array.from({ length: sampleCount }, (_, index) => {
    const progress = index / sampleCount
    const point = curve.getPointAt(progress)
    const tangent = curve.getTangentAt(progress).setY(0).normalize()
    const side = new THREE.Vector3().crossVectors(WORLD_UP, tangent).normalize()
    return point.addScaledVector(side, lateralOffset)
  })
}

function findLoopSelfIntersections(loop) {
  const intersections = []
  for (let first = 0; first < loop.length; first += 1) {
    const firstNext = (first + 1) % loop.length
    for (let second = first + 1; second < loop.length; second += 1) {
      const cyclicDistance = Math.min(second - first, loop.length - (second - first))
      if (cyclicDistance <= 1) continue
      const secondNext = (second + 1) % loop.length
      if (segmentsIntersect2d(
        loop[first],
        loop[firstNext],
        loop[second],
        loop[secondNext],
      )) {
        intersections.push([first, second])
      }
    }
  }
  return intersections
}

function findLoopIntersections(firstLoop, secondLoop) {
  const intersections = []
  for (let first = 0; first < firstLoop.length; first += 1) {
    const firstNext = (first + 1) % firstLoop.length
    for (let second = 0; second < secondLoop.length; second += 1) {
      const secondNext = (second + 1) % secondLoop.length
      if (segmentsIntersect2d(
        firstLoop[first],
        firstLoop[firstNext],
        secondLoop[second],
        secondLoop[secondNext],
      )) {
        intersections.push([first, second])
      }
    }
  }
  return intersections
}

describe('selectable track topology', () => {
  it('keeps non-adjacent road branches farther apart than the full road width', () => {
    for (const preset of TRACK_PRESETS) {
      const points = Array.from(
        { length: TOPOLOGY_SAMPLES },
        (_, index) => preset.curve.getPointAt(index / TOPOLOGY_SAMPLES),
      )
      const adjacentSamples = Math.ceil(
        preset.roadWidth * 2 / preset.length * TOPOLOGY_SAMPLES,
      )
      let minimumDistance = Infinity

      for (let first = 0; first < points.length; first += 1) {
        for (let second = first + 1; second < points.length; second += 1) {
          const cyclicDistance = Math.min(
            second - first,
            points.length - (second - first),
          )
          if (cyclicDistance < adjacentSamples) continue
          minimumDistance = Math.min(
            minimumDistance,
            points[first].distanceTo(points[second]),
          )
        }
      }

      expect(
        minimumDistance,
        `${preset.id} minimum non-adjacent centreline clearance`,
      ).toBeGreaterThan(preset.roadWidth)
    }
  })

  it('keeps local curvature wider than the physical barrier offset', () => {
    for (const preset of TRACK_PRESETS) {
      const arcStep = preset.length / CURVATURE_SAMPLES
      let minimumRadius = Infinity

      for (let index = 0; index < CURVATURE_SAMPLES; index += 1) {
        const progress = index / CURVATURE_SAMPLES
        const previous = preset.curve
          .getTangentAt((progress - 1 / CURVATURE_SAMPLES + 1) % 1)
          .setY(0)
          .normalize()
        const next = preset.curve
          .getTangentAt((progress + 1 / CURVATURE_SAMPLES) % 1)
          .setY(0)
          .normalize()
        const headingChange = previous.angleTo(next)
        if (headingChange > 1e-12) {
          minimumRadius = Math.min(minimumRadius, 2 * arcStep / headingChange)
        }
      }

      expect(
        minimumRadius,
        `${preset.id} minimum curvature radius`,
      ).toBeGreaterThan(preset.roadWidth / 2 + BARRIER_HALF_WIDTH)
    }
  })

  it('generates collider-density barriers that neither cross the road nor fold into themselves', () => {
    for (const preset of TRACK_PRESETS) {
      const sampleCount = Math.max(
        BARRIER_SEGMENTS,
        Math.ceil(preset.length / 4.25),
      )
      const centerline = getOffsetLoop(preset.curve, sampleCount, 0)
      const barrierOffset = preset.roadWidth / 2 + BARRIER_HALF_WIDTH

      for (const lateralOffset of [-barrierOffset, barrierOffset]) {
        const barrier = getOffsetLoop(preset.curve, sampleCount, lateralOffset)
        expect(
          findLoopIntersections(barrier, centerline),
          `${preset.id} barrier/centreline crossings at ${lateralOffset}m`,
        ).toEqual([])
        expect(
          findLoopSelfIntersections(barrier),
          `${preset.id} barrier self-intersections at ${lateralOffset}m`,
        ).toEqual([])
      }
    }
  })
})
