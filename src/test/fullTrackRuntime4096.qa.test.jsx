import React from 'react'
import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'

const translationAudit = vi.hoisted(() => ({
  events: [],
  getSessionId: () => null,
}))

vi.mock('../utils/drivingGuards', async () => {
  const actual = await vi.importActual('../utils/drivingGuards')
  return {
    ...actual,
    setPlayerTranslation(body, translation, reason, context = {}) {
      translationAudit.events.push({
        reason,
        sessionId: context.raceSessionId ?? translationAudit.getSessionId(),
        gameState: context.gameState ?? null,
        trigger: context.trigger ?? null,
        translation: { ...translation },
      })
      return actual.setPlayerTranslation(body, translation, reason, context)
    },
  }
})

import App from '../App'
import { useGameStore } from '../store/gameStore'
import {
  PLAYER_TRANSLATION_REASON,
  WRONG_WAY_POLICY,
} from '../utils/drivingGuards'
import { trackCurve, trackLength } from '../utils/trackData'
import { activeBodies, triggerFrames } from './setup'

const WORLD_UP = new THREE.Vector3(0, 1, 0)
const CAR_FORWARD = new THREE.Vector3(0, 0, -1)
const START_PROGRESS = 0.3
const SEGMENT_COUNT = 4096
const LANE_OFFSETS = [0, 1, -1, 3, -3, 6, -6, 7.9, -7.9]
const FRAME_RATES = [30, 60, 120]

const getPlayerBody = () => Array.from(activeBodies).find(body => body.name === 'player')
const wrapProgress = progress => ((progress % 1) + 1) % 1

function getRoadPose(progress, lateralOffset = 0, heightOffset = 1) {
  const wrappedProgress = wrapProgress(progress)
  const point = trackCurve.getPointAt(wrappedProgress)
  const tangent3d = trackCurve.getTangentAt(wrappedProgress).normalize()
  const tangent = new THREE.Vector3(tangent3d.x, 0, tangent3d.z).normalize()
  const side = new THREE.Vector3().crossVectors(WORLD_UP, tangent3d).normalize()
  return {
    progress: wrappedProgress,
    position: new THREE.Vector3(
      point.x + side.x * lateralOffset,
      point.y + heightOffset,
      point.z + side.z * lateralOffset,
    ),
    tangent,
    side,
  }
}

function placeBody(body, pose, velocity, chassisDirection = pose.tangent) {
  body.setTranslation(pose.position)
  body.setLinvel(velocity)
  body.setRotation(new THREE.Quaternion().setFromUnitVectors(
    CAR_FORWARD,
    chassisDirection,
  ))
}

function resetAtProgressAnchor(body) {
  useGameStore.setState({
    gameState: 'playing',
    gameMode: 'time_trial',
    lap: 2,
    totalLaps: 3,
    maxLaps: 3,
    currentTime: 0,
    totalTime: 0,
    totalCheckpoints: 10,
    nextCheckpointIndex: 4,
    isDrivingBackwards: false,
  })
  window.mockKeys.reset = true
  triggerFrames(1 / 60, 1)
  triggerFrames(1 / 60, 2)
  window.mockKeys.reset = false
  triggerFrames(1 / 60, 1)
  body.setLinvel({ x: 0, y: 0, z: 0 })
}

function enterLaneContinuously(body, lateralOffset, delta) {
  const steps = Math.max(1, Math.ceil(Math.abs(lateralOffset) / 0.5))
  for (let step = 1; step <= steps; step += 1) {
    const pose = getRoadPose(START_PROGRESS, lateralOffset * step / steps)
    placeBody(body, pose, pose.tangent.clone().multiplyScalar(8))
    triggerFrames(delta, 1)
    expect(useGameStore.getState().isDrivingBackwards).toBe(false)
  }
}

function failOnCallbackPhysicalOverride({
  body,
  translationSpy,
  velocitySpy,
  delta,
  hz,
  segment,
  lane,
  scenario,
}) {
  const translationCount = translationSpy.mock.calls.length
  const velocityCount = velocitySpy.mock.calls.length
  const auditCount = translationAudit.events.length

  triggerFrames(delta, 1)

  const context = `hz=${hz} segment=${segment}/${SEGMENT_COUNT} lane=${lane} scenario=${scenario}`
  if (translationSpy.mock.calls.length !== translationCount) {
    throw new Error(`unauthorized Car translation ${context} body=${JSON.stringify(body.translation())}`)
  }
  if (velocitySpy.mock.calls.length !== velocityCount) {
    throw new Error(`unauthorized Car velocity override ${context} value=${JSON.stringify(velocitySpy.mock.calls.at(-1)?.[0])}`)
  }
  if (translationAudit.events.length !== auditCount) {
    throw new Error(`unexpected authorized translation ${context} event=${JSON.stringify(translationAudit.events.at(-1))}`)
  }
  if (useGameStore.getState().isDrivingBackwards) {
    throw new Error(`false WRONG WAY ${context} body=${JSON.stringify(body.translation())}`)
  }
}

function getForwardScenario(segment, pose, previousPose, delta) {
  let velocity = pose.position.clone().sub(previousPose.position).divideScalar(delta)
  let chassisDirection = pose.tangent
  let scenario = 'normal-elevation'
  let callbackDelta = delta

  if (segment % 997 >= 485 && segment % 997 <= 500) {
    // A physical corner cut keeps positive curve travel while its velocity
    // follows the chord and carries a strong lateral component.
    velocity.addScaledVector(pose.side, segment % 2 === 0 ? 22 : -22)
    scenario = 'corner-cut'
  }
  if (segment % 883 === 417) {
    // Barrier contact can point the chassis away from the road and rebound
    // sharply sideways; neither is sustained reverse travel.
    velocity = pose.tangent.clone().multiplyScalar(4)
      .addScaledVector(pose.side, segment % 2 === 0 ? 38 : -38)
    chassisDirection = pose.side.clone().multiplyScalar(segment % 2 === 0 ? 1 : -1)
    scenario = 'barrier-bounce'
  }
  if (segment % 1021 === 509) {
    // One reverse collision impulse with forward positional progress must not
    // be accumulated into a WRONG WAY manoeuvre.
    velocity = pose.tangent.clone().multiplyScalar(-24)
    scenario = 'reverse-collision-spike'
  }
  if (segment === 2048) {
    callbackDelta = 0.75
    scenario = 'suspended-frame-gap'
  }

  return { velocity, chassisDirection, scenario, callbackDelta }
}

beforeEach(() => {
  vi.useFakeTimers()
  translationAudit.events.length = 0
  translationAudit.getSessionId = () => useGameStore.getState().raceSessionId
  act(() => {
    useGameStore.setState({
      gameState: 'playing',
      gameMode: 'time_trial',
      raceSessionId: 700,
      lap: 2,
      totalLaps: 3,
      maxLaps: 3,
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

describe('4,096-section actual Car callback audit', () => {
  it.each(FRAME_RATES)(
    'keeps all 9 lanes forward and physically untouched through every section at %s Hz',
    hz => {
      const view = render(<App />)
      const body = getPlayerBody()
      const delta = 1 / hz

      for (const lane of LANE_OFFSETS) {
        act(() => {
          resetAtProgressAnchor(body)
          enterLaneContinuously(body, lane, delta)
        })
        translationAudit.events.length = 0
        const translationSpy = vi.spyOn(body, 'setTranslation')
        const velocitySpy = vi.spyOn(body, 'setLinvel')
        let previousPose = getRoadPose(START_PROGRESS, lane)

        act(() => {
          for (let segment = 1; segment <= SEGMENT_COUNT; segment += 1) {
            const progress = START_PROGRESS + segment / SEGMENT_COUNT
            // Track elevation is always preserved; the extra suspension travel
            // exercises vertical motion without affecting road-plane progress.
            const heightOffset = 1
              + 0.7 * Math.sin(segment * Math.PI * 58 / SEGMENT_COUNT)
            const pose = getRoadPose(progress, lane, heightOffset)
            const scenario = getForwardScenario(segment, pose, previousPose, delta)
            placeBody(body, pose, scenario.velocity, scenario.chassisDirection)
            failOnCallbackPhysicalOverride({
              body,
              translationSpy,
              velocitySpy,
              delta: scenario.callbackDelta,
              hz,
              segment,
              lane,
              scenario: scenario.scenario,
            })
            previousPose = pose
          }
        })

        expect(translationSpy).toHaveBeenCalledTimes(SEGMENT_COUNT)
        expect(velocitySpy).toHaveBeenCalledTimes(SEGMENT_COUNT)
        expect(translationAudit.events).toEqual([])
        translationSpy.mockRestore()
        velocitySpy.mockRestore()
      }

      view.unmount()
    },
    120_000,
  )

  it.each(FRAME_RATES)(
    'detects sustained reverse travel in all 4,096 sections at %s Hz without moving the body',
    hz => {
      const view = render(<App />)
      const body = getPlayerBody()
      const delta = 1 / hz
      act(() => resetAtProgressAnchor(body))
      translationAudit.events.length = 0
      const translationSpy = vi.spyOn(body, 'setTranslation')
      const velocitySpy = vi.spyOn(body, 'setLinvel')
      const detectedSections = new Set()
      const entryFrames = Math.ceil(WRONG_WAY_POLICY.entrySeconds * hz)
      // Manual recovery deliberately suppresses direction evidence for 0.4s.
      // Traverse one complete reverse lap after both that grace and the entry
      // debounce have expired so every section is observed while active.
      const recoveryGraceFrames = Math.ceil(0.4 * hz)
      const sampleCount = SEGMENT_COUNT + recoveryGraceFrames + entryFrames + 16
      const startSection = Math.floor(START_PROGRESS * SEGMENT_COUNT)
      let firstDetectionSample = null
      let previousPose = getRoadPose(START_PROGRESS)

      act(() => {
        for (let sample = 1; sample <= sampleCount; sample += 1) {
          const progress = START_PROGRESS - sample / SEGMENT_COUNT
          const pose = getRoadPose(progress)
          const velocity = pose.position.clone().sub(previousPose.position).divideScalar(delta)
          placeBody(body, pose, velocity)

          const translationCount = translationSpy.mock.calls.length
          const velocityCount = velocitySpy.mock.calls.length
          triggerFrames(delta, 1)
          if (translationSpy.mock.calls.length !== translationCount
            || velocitySpy.mock.calls.length !== velocityCount) {
            throw new Error(
              `reverse caused physical override hz=${hz} sample=${sample} `
              + `progress=${pose.progress.toFixed(9)}`,
            )
          }

          if (useGameStore.getState().isDrivingBackwards) {
            if (firstDetectionSample === null) firstDetectionSample = sample
            const section = ((startSection - sample) % SEGMENT_COUNT + SEGMENT_COUNT) % SEGMENT_COUNT
            detectedSections.add(section)
          }
          previousPose = pose
        }
      })

      expect(firstDetectionSample).not.toBeNull()
      expect(firstDetectionSample).toBeGreaterThanOrEqual(entryFrames)
      expect(detectedSections.size, `reverse section coverage at ${hz}Hz`).toBe(SEGMENT_COUNT)
      expect(translationAudit.events).toEqual([])
      view.unmount()
    },
    60_000,
  )

  it('records only closed-contract translation reasons with the active session id', () => {
    const view = render(<App />)
    const body = getPlayerBody()

    act(() => {
      useGameStore.getState().restartRace()
    })
    const restartedSessionId = useGameStore.getState().raceSessionId
    expect(translationAudit.events).toEqual([
      expect.objectContaining({
        reason: PLAYER_TRANSLATION_REASON.SESSION_RESET,
        sessionId: restartedSessionId,
        gameState: 'countdown',
        trigger: 'race-session-effect',
      }),
    ])

    act(() => {
      useGameStore.setState({
        gameState: 'playing',
        lap: 2,
        nextCheckpointIndex: 4,
      })
    })
    act(() => {
      window.mockKeys.reset = true
      triggerFrames(1 / 60, 10)
      window.mockKeys.reset = false
      triggerFrames(1 / 60, 1)
    })

    expect(translationAudit.events).toHaveLength(2)
    expect(translationAudit.events[1]).toEqual(expect.objectContaining({
      reason: PLAYER_TRANSLATION_REASON.MANUAL_RECOVERY,
      sessionId: restartedSessionId,
      gameState: 'playing',
      trigger: 'reset-key-rising-edge',
    }))
    expect(body.linvel()).toEqual({ x: 0, y: 0, z: 0 })
    view.unmount()
  })

  it('covers the exact full circuit distance at 4,096 samples', () => {
    const segmentLength = trackLength / SEGMENT_COUNT
    expect(segmentLength).toBeGreaterThan(0)
    expect(segmentLength * SEGMENT_COUNT).toBeCloseTo(trackLength, 10)
    expect(getRoadPose(START_PROGRESS + 1).position.distanceTo(
      getRoadPose(START_PROGRESS).position,
    )).toBeLessThan(1e-8)
  })
})
