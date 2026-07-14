import React from 'react'
import { act, render } from '@testing-library/react'
import * as THREE from 'three'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { useGameStore } from '../store/gameStore'
import { getRuntimeDiagnostics, RUNTIME_EVENT_ID } from '../utils/runtimeDiagnostics'
import { TRACK_CENTERLINE_Y, trackCurve } from '../utils/trackData'
import { activeBodies, triggerFrames } from './setup'

const FRAME_RATES = [30, 60, 120]
const SEGMENTS = 4096
const CAR_FORWARD = new THREE.Vector3(0, 0, -1)
const WORLD_UP = new THREE.Vector3(0, 1, 0)

function getPose(progress) {
  const wrapped = ((progress % 1) + 1) % 1
  const point = trackCurve.getPointAt(wrapped)
  const tangent = trackCurve.getTangentAt(wrapped).setY(0).normalize()
  const side = new THREE.Vector3().crossVectors(WORLD_UP, tangent).normalize()
  return { point, tangent, side }
}

function startTimeTrial() {
  useGameStore.setState({
    gameState: 'playing',
    gameMode: 'time_trial',
    raceSessionId: 980,
    lap: 1,
    maxLaps: 3,
    totalLaps: 3,
    currentTime: 0,
    totalTime: 0,
    totalCheckpoints: 10,
    nextCheckpointIndex: 1,
    isDrivingBackwards: false,
  })
}

describe('flat-track long-drive actual Car callback QA', () => {
  beforeEach(() => {
    act(startTimeTrial)
    getRuntimeDiagnostics().clear()
  })

  it('keeps every centreline and tangent sample on one exact level', () => {
    for (let segment = 0; segment <= 16_384; segment += 1) {
      const progress = segment / 16_384
      const point = trackCurve.getPointAt(progress)
      const tangent = trackCurve.getTangentAt(progress)
      expect(point.y, `centreline y at segment ${segment}`).toBe(TRACK_CENTERLINE_Y)
      expect(tangent.y, `tangent y at segment ${segment}`).toBe(0)
    }
  })

  it.each(FRAME_RATES)(
    'survives a full lap of throttle, alternating steer, contacts and frame gaps at %sHz',
    hz => {
      window.mockKeys.forward = true
      const view = render(<App />)
      const body = Array.from(activeBodies).find(candidate => candidate.name === 'player')
      const translationSpy = vi.spyOn(body, 'setTranslation')
      const velocitySpy = vi.spyOn(body, 'setLinvel')
      const normalRotation = new THREE.Quaternion()
      const contactRotation = new THREE.Quaternion()
      let minimumPostCallbackSpeed = Infinity

      act(() => {
        for (let segment = 0; segment < SEGMENTS; segment += 1) {
          const progress = segment / SEGMENTS
          const { point, tangent, side } = getPose(progress)
          const isContact = segment % 521 >= 500 && segment % 521 <= 506
          const hasFrameGap = segment > 0 && segment % 683 === 0
          const steeringLeft = Math.floor(segment / 97) % 2 === 0
          window.mockKeys.left = steeringLeft
          window.mockKeys.right = !steeringLeft

          normalRotation.setFromUnitVectors(CAR_FORWARD, tangent)
          contactRotation.setFromAxisAngle(WORLD_UP, isContact ? Math.PI / 2 : 0)
            .multiply(normalRotation)
          const velocity = tangent.clone().multiplyScalar(16)
          if (isContact) velocity.addScaledVector(side, steeringLeft ? 8 : -8)

          body.setTranslation({ x: point.x, y: TRACK_CENTERLINE_Y + 1, z: point.z })
          body.setLinvel(velocity)
          body.setRotation(contactRotation)
          const translationCount = translationSpy.mock.calls.length
          const velocityCount = velocitySpy.mock.calls.length
          triggerFrames(hasFrameGap ? 0.2 : 1 / hz, 1)

          if (translationSpy.mock.calls.length !== translationCount) {
            throw new Error(`unexpected respawn hz=${hz} segment=${segment} progress=${progress}`)
          }
          if (velocitySpy.mock.calls.length !== velocityCount) {
            throw new Error(`unexpected velocity override hz=${hz} segment=${segment} progress=${progress}`)
          }
          if (useGameStore.getState().isDrivingBackwards) {
            throw new Error(`false WRONG WAY hz=${hz} segment=${segment} progress=${progress}`)
          }

          const outputVelocity = body.linvel()
          const outputSpeed = Math.hypot(outputVelocity.x, outputVelocity.z)
          minimumPostCallbackSpeed = Math.min(minimumPostCallbackSpeed, outputSpeed)
          if (outputSpeed < 7) {
            throw new Error(
              `sudden speed loss hz=${hz} segment=${segment} progress=${progress} `
              + `speed=${outputSpeed}`,
            )
          }
        }
      })

      const unexpected = getRuntimeDiagnostics().events.filter(event => (
        event.id === RUNTIME_EVENT_ID.PHYSICS_SPEED_DROP
        || event.id === RUNTIME_EVENT_ID.PHYSICS_POSITION_JUMP
        || event.id === RUNTIME_EVENT_ID.WRONG_WAY_TRANSITION
        || event.id === RUNTIME_EVENT_ID.PLAYER_TRANSLATION
      ))
      expect(unexpected).toEqual([])
      expect(minimumPostCallbackSpeed).toBeGreaterThanOrEqual(7)
      expect(translationSpy).toHaveBeenCalledTimes(SEGMENTS)
      expect(velocitySpy).toHaveBeenCalledTimes(SEGMENTS)

      translationSpy.mockRestore()
      velocitySpy.mockRestore()
      view.unmount()
    },
    60_000,
  )
})
