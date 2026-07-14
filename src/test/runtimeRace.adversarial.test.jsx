import React from 'react'
import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import App from '../App'
import { useGameStore } from '../store/gameStore'
import { createWrongWayState, updateWrongWayState } from '../utils/drivingGuards'
import { getStartGridPose } from '../utils/startGrid'
import { TRACK_CENTERLINE_Y, trackCurve, trackLength } from '../utils/trackData'
import { activeBodies, triggerFrames } from './setup'

const WORLD_UP = new THREE.Vector3(0, 1, 0)

const getPlayerBody = () => Array.from(activeBodies).find(body => body.name === 'player')

beforeEach(() => {
  vi.useFakeTimers()
  act(() => {
    useGameStore.setState({
      gameState: 'playing',
      gameMode: 'time_trial',
      lap: 2,
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

function recoverToCheckpoint(body) {
  window.mockKeys.reset = true
  triggerFrames(1 / 60, 1)
  window.mockKeys.reset = false
  triggerFrames(1 / 60, 1)
  body.setLinvel({ x: 0, y: 0, z: 0 })
}

function placeOnLane(body, progress, lateralOffset, speed, heightOffset = 1) {
  const point = trackCurve.getPointAt(progress)
  const tangent3d = trackCurve.getTangentAt(progress).normalize()
  const tangent = new THREE.Vector3(tangent3d.x, 0, tangent3d.z).normalize()
  const side = new THREE.Vector3().crossVectors(WORLD_UP, tangent3d).normalize()
  body.setTranslation({
    x: point.x + side.x * lateralOffset,
    y: point.y + heightOffset,
    z: point.z + side.z * lateralOffset,
  })
  body.setLinvel({ x: tangent.x * speed, y: 0, z: tangent.z * speed })
  body.setRotation(new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 0, -1),
    tangent,
  ))
}

describe('runtime race adversarial QA', () => {
  it.each([30, 60, 120])(
    'keeps a complete variable-offset lap physical at %s Hz',
    hz => {
      const view = render(<App />)
      const body = getPlayerBody()

      act(() => recoverToCheckpoint(body))
      const translationSpy = vi.spyOn(body, 'setTranslation')
      const delta = 1 / hz
      const speed = 60
      const distancePerSample = speed * delta
      const sampleCount = Math.ceil(trackLength / distancePerSample)
      const startProgress = 0.3

      act(() => {
        for (let sample = 1; sample <= sampleCount; sample += 1) {
          const lapFraction = Math.min(sample * distancePerSample / trackLength, 1)
          const progress = (startProgress + lapFraction) % 1
          // Exercise both road edges, every corner, the 1 -> 0 seam and a
          // modest suspension/road-height oscillation without discontinuities.
          const lateralOffset = Math.sin(lapFraction * Math.PI * 2) * 7.9
          const heightOffset = 1 + Math.sin(lapFraction * Math.PI * 14) * 0.35
          placeOnLane(body, progress, lateralOffset, speed, heightOffset)
          triggerFrames(delta, 1)
          expect(useGameStore.getState().isDrivingBackwards).toBe(false)
        }
      })

      // Every translation is the controlled driving path. A recovery would
      // add a setTranslation call inside Car.
      expect(translationSpy).toHaveBeenCalledTimes(sampleCount)
      view.unmount()
    },
  )

  it('does not accumulate collision-like reverse spikes into WRONG WAY at any frame rate', () => {
    for (const hz of [30, 60, 120]) {
      const state = createWrongWayState()
      const delta = 1 / hz
      for (let second = 0; second < 10; second += 1) {
        for (let frame = 0; frame < hz; frame += 1) {
          const collisionSpike = frame === Math.floor(hz / 2)
          const speed = collisionSpike ? -18 : 24
          const active = updateWrongWayState(state, {
            continuous: true,
            signedTrackTravel: speed * delta,
            longitudinalTrackSpeed: speed,
            delta,
          })
          expect(active, `${hz}Hz second ${second} frame ${frame}`).toBe(false)
        }
      }
    }
  })

  it('does not turn one rejected collision sample into a later valid-section respawn', () => {
    const view = render(<App />)
    const body = getPlayerBody()
    act(() => recoverToCheckpoint(body))
    const translationSpy = vi.spyOn(body, 'setTranslation')
    const sampleCount = 450

    act(() => {
      // A contact solver can make one position correction that the continuity
      // guard rejects. That logical rejection must not poison physical state
      // while the car subsequently continues across the flat circuit.
      for (let sample = 1; sample <= sampleCount; sample += 1) {
        const progress = 0.302 + (0.5 * sample) / sampleCount
        // Stay displaced for half a second, as with a barrier scrape/contact
        // correction, then regain the racing surface and continue normally.
        const lateralOffset = sample <= 30 ? 15 : 0
        placeOnLane(body, progress, lateralOffset, 30)
        triggerFrames(1 / 60, 1)
      }
    })

    expect(translationSpy).toHaveBeenCalledTimes(sampleCount)
    expect(useGameStore.getState().isDrivingBackwards).toBe(false)
    view.unmount()
  })

  it('starts the controlled lap from the expected checkpoint anchor on the shared plane', () => {
    const pose = getStartGridPose('player', 'time_trial')
    expect(pose.progress).toBeGreaterThan(0.98)
    expect(pose.point.y).toBe(TRACK_CENTERLINE_Y)
    expect(trackCurve.getPointAt(0.3).y).toBe(TRACK_CENTERLINE_Y)
    expect(trackCurve.getPointAt(0.75).y).toBe(TRACK_CENTERLINE_Y)
  })
})
