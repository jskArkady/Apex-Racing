import React from 'react'
import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import App from '../App'
import { useGameStore } from '../store/gameStore'
import { WRONG_WAY_POLICY } from '../utils/drivingGuards'
import { trackCurve } from '../utils/trackData'
import { activeBodies, triggerFrames } from './setup'

const WORLD_UP = new THREE.Vector3(0, 1, 0)
const START_PROGRESS = 0.3
const SEGMENT_COUNT = 2048
const LANE_OFFSETS = [0, 1, -1, 3, -3, 6, -6, 7.9, -7.9]
const FRAME_RATES = [30, 60, 120]

const getPlayerBody = () => Array.from(activeBodies).find(body => body.name === 'player')

function getRoadPose(progress, lateralOffset = 0, heightOffset = 1) {
  const wrappedProgress = ((progress % 1) + 1) % 1
  const point = trackCurve.getPointAt(wrappedProgress)
  const tangent3d = trackCurve.getTangentAt(wrappedProgress).normalize()
  const tangent = new THREE.Vector3(tangent3d.x, 0, tangent3d.z).normalize()
  const side = new THREE.Vector3().crossVectors(WORLD_UP, tangent3d).normalize()
  return {
    position: new THREE.Vector3(
      point.x + side.x * lateralOffset,
      point.y + heightOffset,
      point.z + side.z * lateralOffset,
    ),
    tangent,
    side,
  }
}

function setBodySample(body, pose, velocity, spin = false) {
  body.setTranslation(pose.position)
  body.setLinvel(velocity)
  const heading = spin ? pose.tangent.clone().negate() : pose.tangent
  body.setRotation(new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 0, -1),
    heading,
  ))
}

function resetRaceAnchor(body) {
  useGameStore.setState({
    gameState: 'playing',
    gameMode: 'time_trial',
    lap: 2,
    totalLaps: 3,
    currentTime: 0,
    totalTime: 0,
    totalCheckpoints: 10,
    nextCheckpointIndex: 4,
    isDrivingBackwards: false,
  })
  window.mockKeys.reset = true
  triggerFrames(1 / 60, 1)
  // Holding R must not generate another reset.
  triggerFrames(1 / 60, 2)
  window.mockKeys.reset = false
  triggerFrames(1 / 60, 1)
  body.setLinvel({ x: 0, y: 0, z: 0 })
}

function enterLaneContinuously(body, lateralOffset, delta) {
  const transitionCount = Math.max(1, Math.ceil(Math.abs(lateralOffset) / 0.75))
  for (let step = 1; step <= transitionCount; step += 1) {
    const pose = getRoadPose(
      START_PROGRESS,
      lateralOffset * step / transitionCount,
    )
    setBodySample(body, pose, pose.tangent.clone().multiplyScalar(8))
    triggerFrames(delta, 1)
    expect(useGameStore.getState().isDrivingBackwards).toBe(false)
  }
}

function assertNoInternalPhysicalOverride({
  body,
  translationSpy,
  velocitySpy,
  progress,
  lateralOffset,
  hz,
  segment,
  delta,
}) {
  const translationCalls = translationSpy.mock.calls.length
  const velocityCalls = velocitySpy.mock.calls.length
  triggerFrames(delta, 1)

  if (translationSpy.mock.calls.length !== translationCalls) {
    throw new Error(
      `unexpected respawn hz=${hz} segment=${segment}/${SEGMENT_COUNT} `
      + `progress=${progress.toFixed(9)} lane=${lateralOffset} `
      + `position=${JSON.stringify(body.translation())}`,
    )
  }
  if (velocitySpy.mock.calls.length !== velocityCalls) {
    const injected = velocitySpy.mock.calls.at(-1)?.[0]
    throw new Error(
      `unexpected velocity override hz=${hz} segment=${segment}/${SEGMENT_COUNT} `
      + `progress=${progress.toFixed(9)} lane=${lateralOffset} `
      + `velocity=${JSON.stringify(injected)}`,
    )
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  act(() => {
    useGameStore.setState({
      gameState: 'playing',
      gameMode: 'time_trial',
      lap: 2,
      totalLaps: 3,
      currentTime: 0,
      totalTime: 0,
      totalCheckpoints: 10,
      nextCheckpointIndex: 4,
      isDrivingBackwards: false,
    })
  })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('2,048-section actual Car runtime QA', () => {
  it.each(FRAME_RATES)(
    'keeps all 9 lanes physical and forward through every section at %s Hz',
    hz => {
      const view = render(<App />)
      const body = getPlayerBody()
      const delta = 1 / hz

      for (const lateralOffset of LANE_OFFSETS) {
        act(() => {
          resetRaceAnchor(body)
          enterLaneContinuously(body, lateralOffset, delta)
        })
        const translationSpy = vi.spyOn(body, 'setTranslation')
        const velocitySpy = vi.spyOn(body, 'setLinvel')
        let previousPose = getRoadPose(START_PROGRESS, lateralOffset)

        act(() => {
          for (let segment = 1; segment <= SEGMENT_COUNT; segment += 1) {
            const progress = START_PROGRESS + segment / SEGMENT_COUNT
            const heightOffset = 1
              + 0.65 * Math.sin(segment * Math.PI * 46 / SEGMENT_COUNT)
            const pose = getRoadPose(progress, lateralOffset, heightOffset)
            let velocity = pose.position.clone().sub(previousPose.position).divideScalar(delta)

            // Exercise lateral drift, a spun chassis, and isolated reverse
            // collision impulses without changing the forward curve travel.
            const drifting = segment % 401 >= 185 && segment % 401 <= 205
            const spinning = segment % 613 >= 300 && segment % 613 <= 306
            const collisionImpulse = segment % 509 === 251
            if (drifting) velocity.addScaledVector(pose.side, 24)
            if (collisionImpulse) velocity = pose.tangent.clone().multiplyScalar(-18)
            setBodySample(body, pose, velocity, spinning)

            assertNoInternalPhysicalOverride({
              body,
              translationSpy,
              velocitySpy,
              progress: progress % 1,
              lateralOffset,
              hz,
              segment,
              // A suspended-tab frame must freeze/re-anchor logical progress,
              // never move the body or become direction evidence.
              delta: segment === 1024 ? 0.75 : delta,
            })

            if (useGameStore.getState().isDrivingBackwards) {
              throw new Error(
                `false WRONG WAY hz=${hz} segment=${segment}/${SEGMENT_COUNT} `
                + `progress=${(progress % 1).toFixed(9)} lane=${lateralOffset}`,
              )
            }
            previousPose = pose
          }
        })

        expect(translationSpy).toHaveBeenCalledTimes(SEGMENT_COUNT)
        expect(velocitySpy).toHaveBeenCalledTimes(SEGMENT_COUNT)
        translationSpy.mockRestore()
        velocitySpy.mockRestore()
      }

      view.unmount()
    },
    120_000,
  )

  it.each(FRAME_RATES)(
    'detects sustained real reverse travel at all 2,048 sections at %s Hz without respawning',
    hz => {
      const view = render(<App />)
      const body = getPlayerBody()
      const delta = 1 / hz

      act(() => resetRaceAnchor(body))
      const translationSpy = vi.spyOn(body, 'setTranslation')
      const velocitySpy = vi.spyOn(body, 'setLinvel')
      const detectedSections = new Set()
      const entryFrames = Math.ceil(WRONG_WAY_POLICY.entrySeconds * hz)
      // Continue far enough into the second reverse lap to observe every
      // section after both time and distance entry thresholds. Extra margin
      // also covers the first projection-anchor frame at every refresh rate.
      const sampleCount = SEGMENT_COUNT + entryFrames + 64
      let previousPose = getRoadPose(START_PROGRESS)

      act(() => {
        for (let sample = 1; sample <= sampleCount; sample += 1) {
          const progress = START_PROGRESS - sample / SEGMENT_COUNT
          const pose = getRoadPose(progress)
          const velocity = pose.position.clone().sub(previousPose.position).divideScalar(delta)
          setBodySample(body, pose, velocity)
          assertNoInternalPhysicalOverride({
            body,
            translationSpy,
            velocitySpy,
            progress: ((progress % 1) + 1) % 1,
            lateralOffset: 0,
            hz,
            segment: sample,
            delta,
          })

          if (useGameStore.getState().isDrivingBackwards) {
            detectedSections.add(((SEGMENT_COUNT - sample) % SEGMENT_COUNT + SEGMENT_COUNT) % SEGMENT_COUNT)
          }
          previousPose = pose
        }
      })

      expect(useGameStore.getState().isDrivingBackwards).toBe(true)
      expect(
        detectedSections.size,
        `reverse detection coverage at ${hz}Hz`,
      ).toBe(SEGMENT_COUNT)
      expect(translationSpy).toHaveBeenCalledTimes(sampleCount)
      expect(velocitySpy).toHaveBeenCalledTimes(sampleCount)
      view.unmount()
    },
    60_000,
  )

  it('treats a held R input as exactly one physical recovery', () => {
    const view = render(<App />)
    const body = getPlayerBody()
    const translationSpy = vi.spyOn(body, 'setTranslation')
    const velocitySpy = vi.spyOn(body, 'setLinvel')

    act(() => {
      const pose = getRoadPose(0.55, 5)
      setBodySample(body, pose, pose.tangent.clone().multiplyScalar(30))
      triggerFrames(1 / 60, 1)
      const translationCalls = translationSpy.mock.calls.length
      const velocityCalls = velocitySpy.mock.calls.length

      window.mockKeys.reset = true
      triggerFrames(1 / 60, 12)
      window.mockKeys.reset = false
      triggerFrames(1 / 60, 1)

      expect(translationSpy.mock.calls.length - translationCalls).toBe(1)
      expect(velocitySpy.mock.calls.length - velocityCalls).toBe(1)
      expect(velocitySpy.mock.calls.at(-1)?.[0]).toEqual({ x: 0, y: 0, z: 0 })
    })

    view.unmount()
  })
})
