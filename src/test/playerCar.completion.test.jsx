import React from 'react'
import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import App from '../App'
import { useGameStore } from '../store/gameStore'
import { trackCurve, trackLength } from '../utils/trackData'
import { activeBodies, triggerFrames } from './setup'

const getPlayerBody = () => Array.from(activeBodies).find(body => body.name === 'player')

const resetKeys = () => {
  window.mockKeys = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    brake: false,
    reset: false,
    pause: false,
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  resetKeys()
  act(() => {
    useGameStore.setState({
      gameState: 'playing',
      gameMode: 'time_trial',
      lap: 1,
      maxLaps: 1,
      currentTime: 0,
      totalTime: 0,
      totalCheckpoints: 10,
      nextCheckpointIndex: 1,
      isDrivingBackwards: false,
      racers: [{
        id: 'player',
        lap: 1,
        nextCheckpointIndex: 1,
        lastCheckpointTime: 0,
        finished: false,
        totalTime: 0,
        currentTime: 0,
      }],
    })
  })
})

afterEach(() => {
  resetKeys()
  vi.useRealTimers()
})

describe('player car completion controls', () => {
  it('cancels opposite throttle and steering inputs instead of choosing an arbitrary side', () => {
    const view = render(<App />)
    const body = getPlayerBody()
    const impulseSpy = vi.spyOn(body, 'applyImpulse')
    const torqueSpy = vi.spyOn(body, 'applyTorqueImpulse')

    window.mockKeys.forward = true
    window.mockKeys.backward = true
    window.mockKeys.left = true
    window.mockKeys.right = true

    act(() => triggerFrames(1 / 60, 1))

    const driveImpulse = impulseSpy.mock.calls[0][0]
    const steeringImpulse = torqueSpy.mock.calls[0][0]
    expect(driveImpulse.x).toBeCloseTo(0, 8)
    expect(driveImpulse.z).toBeCloseTo(0, 8)
    expect(steeringImpulse.y).toBeCloseTo(0, 8)
    view.unmount()
  })

  it('reduces steering torque at racing speed while retaining low-speed authority', () => {
    const view = render(<App />)
    const body = getPlayerBody()
    const torqueSpy = vi.spyOn(body, 'applyTorqueImpulse')
    window.mockKeys.left = true

    act(() => {
      body.setLinvel({ x: 0, y: 0, z: -12 })
      triggerFrames(1 / 60, 1)
    })
    const lowSpeedTorque = Math.abs(torqueSpy.mock.calls.at(-1)[0].y)

    act(() => {
      body.setTranslation({ x: 0, y: 1, z: 0 })
      body.setLinvel({ x: 0, y: 0, z: -55 })
      triggerFrames(1 / 60, 1)
    })
    const highSpeedTorque = Math.abs(torqueSpy.mock.calls.at(-1)[0].y)

    expect(lowSpeedTorque).toBeGreaterThan(0)
    expect(highSpeedTorque).toBeGreaterThan(0)
    expect(highSpeedTorque).toBeLessThan(lowSpeedTorque * 0.65)
    view.unmount()
  })

  it('clamps a suspended-frame control impulse to the configured control step', () => {
    const view = render(<App />)
    const body = getPlayerBody()
    const impulseSpy = vi.spyOn(body, 'applyImpulse')
    window.mockKeys.forward = true

    act(() => triggerFrames(1, 1))

    const driveImpulse = impulseSpy.mock.calls[0][0]
    expect(Math.hypot(driveImpulse.x, driveImpulse.z)).toBeLessThanOrEqual(600.001)
    expect(Number.isFinite(body.linvel().x)).toBe(true)
    expect(Number.isFinite(body.linvel().z)).toBe(true)
    view.unmount()
  })

  it('ignores a zero frame delta without injecting NaN into the rigid body', () => {
    const view = render(<App />)
    const body = getPlayerBody()
    window.mockKeys.forward = true

    act(() => {
      body.setLinvel({ x: 3, y: 0, z: -8 })
      triggerFrames(0, 1)
    })

    expect(Number.isFinite(body.linvel().x)).toBe(true)
    expect(Number.isFinite(body.linvel().y)).toBe(true)
    expect(Number.isFinite(body.linvel().z)).toBe(true)
    expect(Number.isFinite(useGameStore.getState().currentTime)).toBe(true)
    view.unmount()
  })

  it('can validate every checkpoint in order and complete the one-lap race', () => {
    const view = render(<App />)
    const body = getPlayerBody()
    const forwardAxis = new THREE.Vector3(0, 0, -1)
    const samplesPerLap = Math.ceil(trackLength / 1.75)

    for (let lap = 0; lap < 1 && useGameStore.getState().gameState === 'playing'; lap++) {
      for (let sample = 0; sample <= samplesPerLap + 2; sample++) {
        const progress = (sample / samplesPerLap) % 1
        const point = trackCurve.getPointAt(progress)
        const tangent = trackCurve.getTangentAt(progress)
        const flatTangent = new THREE.Vector3(tangent.x, 0, tangent.z).normalize()
        const rotation = new THREE.Quaternion().setFromUnitVectors(forwardAxis, flatTangent)

        act(() => {
          body.setTranslation({ x: point.x, y: point.y + 1, z: point.z })
          body.setLinvel({ x: tangent.x * 20, y: tangent.y * 20, z: tangent.z * 20 })
          body.setRotation(rotation)
          triggerFrames(1 / 60, 1)
        })
      }
    }

    expect(useGameStore.getState().gameState).toBe('finished')
    expect(useGameStore.getState().nextCheckpointIndex).toBe(0)
    expect(useGameStore.getState().totalTime).toBeGreaterThan(0)
    view.unmount()
  })

  it('preserves finish-line seam history across a continuity-valid render hitch', () => {
    const view = render(<App />)
    const body = getPlayerBody()
    const forwardAxis = new THREE.Vector3(0, 0, -1)

    const placeForward = (progress, delta) => {
      const point = trackCurve.getPointAt(progress)
      const tangent = trackCurve.getTangentAt(progress).setY(0).normalize()
      body.setTranslation({ x: point.x, y: point.y + 1, z: point.z })
      body.setLinvel({ x: tangent.x * 30, y: 0, z: tangent.z * 30 })
      body.setRotation(new THREE.Quaternion().setFromUnitVectors(forwardAxis, tangent))
      triggerFrames(delta, 1)
    }

    act(() => {
      useGameStore.setState({ nextCheckpointIndex: 0 })
      placeForward(0.997, 1 / 60)
      // 0.3s disables the local projection hint, but remains within the
      // continuity guard's accepted sample interval and displacement budget.
      placeForward(0.001, 0.3)
    })

    expect(useGameStore.getState().gameState).toBe('finished')
    expect(useGameStore.getState().totalTime).toBeGreaterThan(0)
    view.unmount()
  })

  it('keeps continuous leaderboard progress between CP9 and the finish line', () => {
    const view = render(<App />)
    const body = getPlayerBody()
    const progress = 0.95
    const point = trackCurve.getPointAt(progress)
    const tangent = trackCurve.getTangentAt(progress)
    const flatTangent = new THREE.Vector3(tangent.x, 0, tangent.z).normalize()
    const rotation = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, -1),
      flatTangent
    )

    act(() => {
      useGameStore.setState({ lap: 1, nextCheckpointIndex: 0 })
      body.setTranslation({ x: point.x, y: point.y + 1, z: point.z })
      body.setLinvel({ x: tangent.x * 20, y: tangent.y * 20, z: tangent.z * 20 })
      body.setRotation(rotation)
      triggerFrames(1 / 60, 1)
    })

    expect(window.racerProgress.player).toBeGreaterThan(190)
    expect(window.racerProgress.player).toBeLessThan(200)
    view.unmount()
  })

  it('uses R to recover at the previous checkpoint, including CP9 before finish', () => {
    const view = render(<App />)
    const body = getPlayerBody()
    const cp9 = trackCurve.getPointAt(0.9)

    act(() => {
      useGameStore.setState({ lap: 1, nextCheckpointIndex: 0 })
      body.setTranslation({ x: cp9.x + 5, y: cp9.y + 1, z: cp9.z + 5 })
      body.setLinvel({ x: 30, y: -4, z: 20 })
      window.mockKeys.reset = true
      triggerFrames(1 / 60, 1)
    })

    expect(body.translation().x).toBeCloseTo(cp9.x, 5)
    expect(body.translation().y).toBeCloseTo(cp9.y + 1, 5)
    expect(body.translation().z).toBeCloseTo(cp9.z, 5)
    expect(body.linvel()).toEqual({ x: 0, y: 0, z: 0 })
    expect(useGameStore.getState().nextCheckpointIndex).toBe(0)
    view.unmount()
  })
})
