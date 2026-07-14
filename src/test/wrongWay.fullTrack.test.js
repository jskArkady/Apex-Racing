import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { trackCurve, trackLength } from '../utils/trackData'
import {
  createWrongWayState,
  updateWrongWayState,
  WRONG_WAY_POLICY,
} from '../utils/drivingGuards'
import {
  createProgressGuardState,
  getSignedWrappedProgressDelta,
  projectPointOntoClosedCurve,
  updateProgressGuardState,
} from '../utils/progressGuard'

const WORLD_UP = new THREE.Vector3(0, 1, 0)

function lanePoint(progress, lateralOffset) {
  const point = trackCurve.getPointAt(((progress % 1) + 1) % 1)
  const tangent = trackCurve.getTangentAt(((progress % 1) + 1) % 1).normalize()
  const side = new THREE.Vector3().crossVectors(WORLD_UP, tangent).normalize()
  return point.addScaledVector(side, lateralOffset).add(new THREE.Vector3(0, 1, 0))
}

function createRuntimeDirectionHarness(progress, lateralOffset) {
  const progressGuard = createProgressGuardState()
  const wrongWay = createWrongWayState()
  const position = lanePoint(progress, lateralOffset)
  const projection = projectPointOntoClosedCurve(trackCurve, position, null)
  updateProgressGuardState(
    progressGuard,
    position,
    projection.progress,
    projection.centerlineDistance,
    0,
    1 / 60,
    trackLength,
  )
  return { position, progressGuard, wrongWay }
}

function sampleRuntimeDirection(harness, position, velocity, delta) {
  const previousProgress = harness.progressGuard.curveProgress
  const projection = projectPointOntoClosedCurve(
    trackCurve,
    position,
    previousProgress,
  )
  const speed = Math.hypot(velocity.x, velocity.z)
  const continuous = updateProgressGuardState(
    harness.progressGuard,
    position,
    projection.progress,
    projection.centerlineDistance,
    speed,
    delta,
    trackLength,
  )
  const approvedProgress = harness.progressGuard.curveProgress
  const tangent3d = trackCurve.getTangentAt(approvedProgress)
  const tangent = new THREE.Vector3(tangent3d.x, 0, tangent3d.z).normalize()
  const signedTrackTravel = continuous
    ? getSignedWrappedProgressDelta(previousProgress, approvedProgress) * trackLength
    : 0
  const active = updateWrongWayState(harness.wrongWay, {
    continuous,
    signedTrackTravel,
    longitudinalTrackSpeed: velocity.dot(tangent),
    delta,
  })
  harness.position = position
  return active
}

describe('WRONG WAY full-track direction contract', () => {
  it.each([30, 60, 120])(
    'never flags forward travel through every circuit metre and seam at %s Hz',
    hz => {
      const delta = 1 / hz
      const nominalSpeed = 30
      const progressStep = nominalSpeed * delta / trackLength

      for (const lateralOffset of [-7.9, -4, 0, 4, 7.9]) {
        const startProgress = 0.997
        const harness = createRuntimeDirectionHarness(startProgress, lateralOffset)
        const samples = Math.ceil(1 / progressStep) + 2

        for (let sample = 1; sample <= samples; sample += 1) {
          const progress = startProgress + sample * progressStep
          const position = lanePoint(progress, lateralOffset)
          const velocity = position.clone().sub(harness.position).divideScalar(delta)
          const active = sampleRuntimeDirection(harness, position, velocity, delta)
          expect(
            active,
            `${hz}Hz offset=${lateralOffset} progress=${progress % 1}`,
          ).toBe(false)
        }
      }
    },
  )

  it('rejects drift, spin and isolated collision impulses at every circuit section', () => {
    const sections = 360
    for (let section = 0; section < sections; section += 1) {
      const progress = section / sections
      const harness = createRuntimeDirectionHarness(progress, 0)
      const tangent3d = trackCurve.getTangentAt(progress)
      const tangent = new THREE.Vector3(tangent3d.x, 0, tangent3d.z).normalize()
      const side = new THREE.Vector3().crossVectors(WORLD_UP, tangent).normalize()

      // Chassis rotation is deliberately absent from the contract. A sideways
      // drift still has positive curve travel, while an isolated contact
      // impulse cannot survive the following neutral/forward sample.
      const next = lanePoint(progress + 0.4 / trackLength, 3)
      const driftVelocity = tangent.clone().multiplyScalar(8)
        .addScaledVector(side, 24)
      expect(sampleRuntimeDirection(harness, next, driftVelocity, 1 / 60)).toBe(false)

      const collisionPosition = lanePoint(progress + 0.35 / trackLength, 3)
      expect(sampleRuntimeDirection(
        harness,
        collisionPosition,
        tangent.clone().multiplyScalar(-30),
        1 / 60,
      )).toBe(false)

      const resumedPosition = lanePoint(progress + 0.8 / trackLength, 3)
      expect(sampleRuntimeDirection(
        harness,
        resumedPosition,
        tangent.clone().multiplyScalar(20),
        1 / 60,
      )).toBe(false)
    }
  })

  it.each([30, 60, 120])(
    'rejects a physically plausible barrier rebound at all 2,048 sections at %s Hz',
    hz => {
      const delta = 1 / hz
      const sections = 2048
      // A hard rebound starts at 16m/s backwards and linearly loses its
      // energy over 0.75s. It travels about six metres: farther than the old
      // distance threshold, but is still one impact rather than a deliberate
      // reverse manoeuvre. The following forward recovery must clear all
      // direction evidence.
      const reboundSeconds = 0.75
      const reboundFrames = Math.ceil(reboundSeconds * hz)

      for (let section = 0; section < sections; section += 1) {
        const startProgress = section / sections
        const lateralOffset = section % 2 === 0 ? -7.5 : 7.5
        const harness = createRuntimeDirectionHarness(startProgress, lateralOffset)
        let travelled = 0

        for (let frame = 0; frame < reboundFrames; frame += 1) {
          const elapsed = frame * delta
          const reverseSpeed = 16 * Math.max(0, 1 - elapsed / reboundSeconds)
          travelled -= reverseSpeed * delta
          const position = lanePoint(
            startProgress + travelled / trackLength,
            lateralOffset,
          )
          const velocity = position.clone().sub(harness.position).divideScalar(delta)
          expect(
            sampleRuntimeDirection(harness, position, velocity, delta),
            `rebound ${hz}Hz section=${section} frame=${frame}`,
          ).toBe(false)
        }

        // A wall scrape/spin can briefly leave the solver velocity pointing
        // backwards while the chassis continues advancing along the track.
        // Conflicting physical/projection signals must reset, not preserve,
        // the rebound evidence.
        for (let frame = 0; frame < Math.ceil(0.25 * hz); frame += 1) {
          travelled += 5 * delta
          const position = lanePoint(
            startProgress + travelled / trackLength,
            lateralOffset,
          )
          const tangent3d = trackCurve.getTangentAt(
            ((startProgress + travelled / trackLength) % 1 + 1) % 1,
          )
          const conflictingVelocity = new THREE.Vector3(
            -tangent3d.x * 12,
            0,
            -tangent3d.z * 12,
          )
          expect(
            sampleRuntimeDirection(harness, position, conflictingVelocity, delta),
            `scrape ${hz}Hz section=${section} frame=${frame}`,
          ).toBe(false)
        }

        travelled += 5 * delta
        const resumedPosition = lanePoint(
          startProgress + travelled / trackLength,
          lateralOffset,
        )
        const resumedVelocity = resumedPosition.clone()
          .sub(harness.position)
          .divideScalar(delta)
        expect(sampleRuntimeDirection(
          harness,
          resumedPosition,
          resumedVelocity,
          delta,
        )).toBe(false)

        expect(harness.wrongWay.reverseSeconds).toBe(0)
        expect(harness.wrongWay.reverseDistance).toBe(0)
      }
    },
    120_000,
  )

  it.each([30, 60, 120])(
    'reliably flags sustained real reverse travel from every circuit section at %s Hz',
    hz => {
      const delta = 1 / hz
      const reverseSpeed = 8
      const frames = Math.ceil((WRONG_WAY_POLICY.entrySeconds + 1) * hz)

      for (let section = 0; section < 72; section += 1) {
        const startProgress = section / 72
        for (const lateralOffset of [-7.9, 0, 7.9]) {
          const harness = createRuntimeDirectionHarness(startProgress, lateralOffset)
          let active = false
          for (let frame = 1; frame <= frames; frame += 1) {
            const progress = startProgress - frame * reverseSpeed * delta / trackLength
            const position = lanePoint(progress, lateralOffset)
            const velocity = position.clone().sub(harness.position).divideScalar(delta)
            active = sampleRuntimeDirection(harness, position, velocity, delta)
          }
          expect(
            active,
            `${hz}Hz section=${section} offset=${lateralOffset}`,
          ).toBe(true)
        }
      }
    },
  )
})
