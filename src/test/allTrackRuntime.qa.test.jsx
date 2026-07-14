import React from 'react'
import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import App from '../App'
import { useGameStore } from '../store/gameStore'
import {
  projectRoadPlanePointOntoClosedCurve,
} from '../utils/progressGuard'
import { trackCurve, trackLength } from '../utils/trackData'
import { activeBodies, triggerFrames } from './setup'

const WORLD_UP = new THREE.Vector3(0, 1, 0)
const START_PROGRESS = 0.3
const SEGMENT_COUNT = 1200
const TEST_SPEED = 60
const FRAME_DELTA = trackLength / SEGMENT_COUNT / TEST_SPEED
const LANE_OFFSETS = [0, 1, -1, 3, -3, 6, -6, 7.9, -7.9]

const getPlayerBody = () => Array.from(activeBodies).find(body => body.name === 'player')

function getRoadPose(progress, lateralOffset = 0, heightOffset = 1) {
  const point = trackCurve.getPointAt(progress)
  const tangent3d = trackCurve.getTangentAt(progress).normalize()
  const tangent = new THREE.Vector3(tangent3d.x, 0, tangent3d.z).normalize()
  const side = new THREE.Vector3().crossVectors(WORLD_UP, tangent3d).normalize()
  return {
    position: {
      x: point.x + side.x * lateralOffset,
      y: point.y + heightOffset,
      z: point.z + side.z * lateralOffset,
    },
    tangent,
    side,
  }
}

function setBodyPose(body, progress, lateralOffset, speed, heightOffset = 1) {
  const pose = getRoadPose(progress, lateralOffset, heightOffset)
  body.setTranslation(pose.position)
  body.setLinvel({
    x: pose.tangent.x * speed,
    y: 0,
    z: pose.tangent.z * speed,
  })
  body.setRotation(new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 0, -1),
    pose.tangent,
  ))
  return pose
}

function resetToProgressAnchor(body) {
  window.mockKeys.reset = true
  triggerFrames(1 / 60, 1)
  window.mockKeys.reset = false
  triggerFrames(1 / 60, 1)
  body.setLinvel({ x: 0, y: 0, z: 0 })
}

function enterLaneContinuously(body, lateralOffset) {
  const transitionCount = Math.max(1, Math.ceil(Math.abs(lateralOffset)))
  for (let step = 1; step <= transitionCount; step += 1) {
    setBodyPose(
      body,
      START_PROGRESS,
      lateralOffset * step / transitionCount,
      TEST_SPEED,
    )
    triggerFrames(FRAME_DELTA, 1)
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  act(() => {
    useGameStore.setState({
      gameState: 'playing',
      gameMode: 'time_trial',
      lap: 1,
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

describe('all-track physical recovery and WRONG WAY runtime QA', () => {
  it.each(LANE_OFFSETS)(
    'crosses all 1,200 track segments at lateral offset %s m without a recovery or zero-velocity injection',
    lateralOffset => {
      const view = render(<App />)
      const body = getPlayerBody()

      act(() => {
        resetToProgressAnchor(body)
        enterLaneContinuously(body, lateralOffset)
      })

      const translationSpy = vi.spyOn(body, 'setTranslation')
      const velocitySpy = vi.spyOn(body, 'setLinvel')

      act(() => {
        for (let segment = 1; segment <= SEGMENT_COUNT; segment += 1) {
          const progress = (START_PROGRESS + segment / SEGMENT_COUNT) % 1
          const heightOffset = 1 + 0.55 * Math.sin(segment * Math.PI * 82 / SEGMENT_COUNT)
          const pose = setBodyPose(
            body,
            progress,
            lateralOffset,
            TEST_SPEED,
            heightOffset,
          )
          const translationCalls = translationSpy.mock.calls.length
          const velocityCalls = velocitySpy.mock.calls.length

          triggerFrames(FRAME_DELTA, 1)

          if (translationSpy.mock.calls.length !== translationCalls) {
            throw new Error(
              `unexpected recovery at segment=${segment}/${SEGMENT_COUNT} `
              + `progress=${progress.toFixed(8)} offset=${lateralOffset} `
              + `position=(${pose.position.x.toFixed(4)},${pose.position.y.toFixed(4)},${pose.position.z.toFixed(4)})`,
            )
          }
          if (velocitySpy.mock.calls.length !== velocityCalls) {
            const injected = velocitySpy.mock.calls.at(-1)?.[0]
            throw new Error(
              `unexpected velocity override at segment=${segment}/${SEGMENT_COUNT} `
              + `progress=${progress.toFixed(8)} offset=${lateralOffset} `
              + `velocity=${JSON.stringify(injected)}`,
            )
          }
          if (useGameStore.getState().isDrivingBackwards) {
            throw new Error(
              `false WRONG WAY at segment=${segment}/${SEGMENT_COUNT} `
              + `progress=${progress.toFixed(8)} offset=${lateralOffset} `
              + `position=(${pose.position.x.toFixed(4)},${pose.position.y.toFixed(4)},${pose.position.z.toFixed(4)})`,
            )
          }
        }
      })

      expect(translationSpy).toHaveBeenCalledTimes(SEGMENT_COUNT)
      expect(velocitySpy).toHaveBeenCalledTimes(SEGMENT_COUNT)
      expect(useGameStore.getState().isDrivingBackwards).toBe(false)
      view.unmount()
    },
    30_000,
  )

  it('never auto-recovers a fall and recovers exactly once on R in every one of 1,200 segments', () => {
    const view = render(<App />)
    const body = getPlayerBody()

    act(() => resetToProgressAnchor(body))
    const translationSpy = vi.spyOn(body, 'setTranslation')
    const velocitySpy = vi.spyOn(body, 'setLinvel')

    act(() => {
      for (let segment = 0; segment < SEGMENT_COUNT; segment += 1) {
        const progress = segment / SEGMENT_COUNT
        const lateralOffset = LANE_OFFSETS[segment % LANE_OFFSETS.length]
        const pose = getRoadPose(progress, lateralOffset, 0)
        const localProjection = projectRoadPlanePointOntoClosedCurve(
          trackCurve,
          pose.position,
        )
        const localSurfaceY = trackCurve.getPointAt(localProjection.progress).y
        const fallenPosition = {
          x: pose.position.x,
          y: localSurfaceY - 6,
          z: pose.position.z,
        }

        body.setTranslation(fallenPosition)
        body.setLinvel({
          x: pose.tangent.x * TEST_SPEED,
          y: 0,
          z: pose.tangent.z * TEST_SPEED,
        })
        const translationCalls = translationSpy.mock.calls.length
        const velocityCalls = velocitySpy.mock.calls.length

        triggerFrames(FRAME_DELTA, 1)

        if (translationSpy.mock.calls.length !== translationCalls) {
          throw new Error(
            `automatic fall recovery at segment=${segment}/${SEGMENT_COUNT} `
            + `progress=${progress.toFixed(8)} offset=${lateralOffset} `
            + `surfaceY=${localSurfaceY.toFixed(5)} vehicleY=${fallenPosition.y.toFixed(5)}`,
          )
        }
        if (velocitySpy.mock.calls.length !== velocityCalls) {
          throw new Error(
            `automatic fall velocity reset at segment=${segment}/${SEGMENT_COUNT} `
            + `progress=${progress.toFixed(8)} offset=${lateralOffset}`,
          )
        }

        window.mockKeys.reset = true
        triggerFrames(FRAME_DELTA, 1)
        window.mockKeys.reset = false
        triggerFrames(FRAME_DELTA, 1)

        if (translationSpy.mock.calls.length !== translationCalls + 1) {
          throw new Error(
            `manual recovery count mismatch at segment=${segment}/${SEGMENT_COUNT} `
            + `progress=${progress.toFixed(8)} offset=${lateralOffset}`,
          )
        }
        if (velocitySpy.mock.calls.length !== velocityCalls + 1) {
          throw new Error(
            `manual recovery velocity reset missing at segment=${segment}/${SEGMENT_COUNT} `
            + `progress=${progress.toFixed(8)} offset=${lateralOffset}`,
          )
        }
        const resetVelocity = velocitySpy.mock.calls.at(-1)?.[0]
        if (resetVelocity?.x !== 0 || resetVelocity?.y !== 0 || resetVelocity?.z !== 0) {
          throw new Error(
            `fall recovery did not stop the body at segment=${segment}/${SEGMENT_COUNT} `
            + `progress=${progress.toFixed(8)} velocity=${JSON.stringify(resetVelocity)}`,
          )
        }
      }
    })

    expect(translationSpy).toHaveBeenCalledTimes(SEGMENT_COUNT * 2)
    expect(velocitySpy).toHaveBeenCalledTimes(SEGMENT_COUNT * 2)
    view.unmount()
  }, 30_000)
})
