import React from 'react'
import { act, render } from '@testing-library/react'
import * as THREE from 'three'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '../App'
import { useGameStore } from '../store/gameStore'
import { getRuntimeDiagnostics, RUNTIME_EVENT_ID } from '../utils/runtimeDiagnostics'
import { VEHICLE_DYNAMICS, getControlDelta } from '../utils/vehicleDynamics'
import { trackCurve, trackLength } from '../utils/trackData'
import { activeBodies, triggerFixedPhysicsSteps, triggerFrames } from './setup'

const RACE_BODY_IDS = ['player', 'ai_1', 'ai_2', 'ai_3']

function startRace() {
  useGameStore.setState({
    gameState: 'playing',
    gameMode: 'single',
    raceSessionId: 501,
    lap: 1,
    maxLaps: 3,
    currentTime: 0,
    totalTime: 0,
    totalCheckpoints: 10,
    nextCheckpointIndex: 1,
    isDrivingBackwards: false,
  })
}

function horizontalSpeed(body) {
  const velocity = body.linvel()
  return Math.hypot(velocity.x, velocity.z)
}

describe('suspended-frame sudden-stop regression', () => {
  beforeEach(() => {
    act(startRace)
    getRuntimeDiagnostics().clear()
  })

  it('uses one shared bounded integration step for every synthetic vehicle force', () => {
    expect(getControlDelta(1 / 120)).toBeCloseTo(1 / 120)
    expect(getControlDelta(0.2)).toBe(VEHICLE_DYNAMICS.maxControlStep)
    expect(getControlDelta(Number.NaN)).toBe(0)
    expect(getControlDelta(-1)).toBe(0)
  })

  it('applies control on every fixed physics substep during a delayed render frame', () => {
    window.mockKeys.forward = true
    const view = render(<App />)
    const player = Array.from(activeBodies).find(body => body.name === 'player')
    const impulseSpy = vi.spyOn(player, 'applyImpulse')

    act(() => {
      player.setLinvel({ x: 0, y: 0, z: 0 })
      expect(triggerFixedPhysicsSteps(0.2, VEHICLE_DYNAMICS.physicsStep)).toBe(12)
    })

    // Each step applies one longitudinal and one bounded lateral impulse.
    expect(impulseSpy).toHaveBeenCalledTimes(24)
    expect(horizontalSpeed(player)).toBeCloseTo(2, 6)
    view.unmount()
  })

  it('does not erase player momentum when a frame gap coincides with a yaw disturbance', () => {
    window.mockKeys.forward = true
    const view = render(<App />)
    const player = Array.from(activeBodies).find(body => body.name === 'player')
    const sideOnRotation = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      Math.PI / 2,
    )

    act(() => {
      // A wall/contact yaw can briefly make the velocity lateral in chassis
      // space. The old 0.2-second grip impulse removed 95% in this callback.
      player.setRotation(sideOnRotation)
      player.setLinvel({ x: 0, y: 0, z: -13 })
      expect(triggerFixedPhysicsSteps(0.2, VEHICLE_DYNAMICS.physicsStep)).toBe(12)
    })

    expect(horizontalSpeed(player)).toBeGreaterThan(8)

    act(() => {
      triggerFrames(1 / 60, 1)
    })
    expect(getRuntimeDiagnostics().events.filter(
      event => event.id === RUNTIME_EVENT_ID.PHYSICS_SPEED_DROP,
    )).toHaveLength(0)

    view.unmount()
  })

  it('preserves momentum across sustained post-contact yaw instead of decaying to zero', () => {
    window.mockKeys.forward = true
    const view = render(<App />)
    const player = Array.from(activeBodies).find(body => body.name === 'player')
    const translationSpy = vi.spyOn(player, 'setTranslation')
    const velocitySpy = vi.spyOn(player, 'setLinvel')
    const sideOnRotation = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      Math.PI / 2,
    )

    act(() => {
      player.setRotation(sideOnRotation)
      player.setLinvel({ x: 0, y: 0, z: -13 })
      translationSpy.mockClear()
      velocitySpy.mockClear()
      triggerFrames(1 / 60, 18)
    })

    expect(horizontalSpeed(player)).toBeGreaterThan(7)
    expect(translationSpy).not.toHaveBeenCalled()
    expect(velocitySpy).not.toHaveBeenCalled()
    expect(getRuntimeDiagnostics().events.filter(
      event => event.id === RUNTIME_EVENT_ID.PHYSICS_SPEED_DROP,
    )).toHaveLength(0)

    view.unmount()
  })

  it('arms bounded low-speed yaw assistance when throttle and steering stay pinned by contact', () => {
    window.mockKeys.forward = true
    window.mockKeys.left = true
    const view = render(<App />)
    const player = Array.from(activeBodies).find(body => body.name === 'player')
    const originalApplyImpulse = player.applyImpulse
    const angularVelocitySpy = vi.spyOn(player, 'setAngvel')

    // A contact solver consumes the requested impulse while the chassis is
    // pinned. Keep the mock body stationary long enough to arm escape assist.
    player.applyImpulse = vi.fn()
    player.triggerCollisionEnter()
    act(() => {
      expect(triggerFixedPhysicsSteps(0.5, VEHICLE_DYNAMICS.physicsStep)).toBe(30)
    })

    expect(angularVelocitySpy).toHaveBeenCalledWith(expect.objectContaining({
      y: 1,
    }), true)
    expect(getRuntimeDiagnostics().events).toContainEqual(expect.objectContaining({
      id: RUNTIME_EVENT_ID.COLLISION_ESCAPE,
      causeId: 'sustained-throttle-steering-at-contact',
    }))

    player.applyImpulse = originalApplyImpulse
    view.unmount()
  })

  it('does not force collision-escape yaw while stopped without a blocking contact', () => {
    window.mockKeys.forward = true
    window.mockKeys.left = true
    const view = render(<App />)
    const player = Array.from(activeBodies).find(body => body.name === 'player')
    const originalApplyImpulse = player.applyImpulse
    const angularVelocitySpy = vi.spyOn(player, 'setAngvel')

    player.applyImpulse = vi.fn()
    act(() => {
      expect(triggerFixedPhysicsSteps(0.5, VEHICLE_DYNAMICS.physicsStep)).toBe(30)
    })

    expect(angularVelocitySpy).not.toHaveBeenCalledWith(expect.objectContaining({
      y: VEHICLE_DYNAMICS.collisionEscapeYawRate,
    }), true)
    expect(getRuntimeDiagnostics().events).not.toContainEqual(expect.objectContaining({
      id: RUNTIME_EVENT_ID.COLLISION_ESCAPE,
    }))

    player.applyImpulse = originalApplyImpulse
    view.unmount()
  })

  it('ignores the permanent road support contact when arming escape yaw', () => {
    window.mockKeys.forward = true
    window.mockKeys.left = true
    const view = render(<App />)
    const player = Array.from(activeBodies).find(body => body.name === 'player')
    const originalApplyImpulse = player.applyImpulse

    player.applyImpulse = vi.fn()
    player.triggerCollisionEnter({ name: 'track-road', handle: 7 })
    act(() => {
      triggerFixedPhysicsSteps(0.5, VEHICLE_DYNAMICS.physicsStep)
    })

    expect(getRuntimeDiagnostics().events).not.toContainEqual(expect.objectContaining({
      id: RUNTIME_EVENT_ID.COLLISION_ESCAPE,
    }))

    player.applyImpulse = originalApplyImpulse
    view.unmount()
  })

  it('preserves the same frame-gap momentum floor for player and AI chassis', () => {
    window.mockKeys.forward = true
    const view = render(<App />)
    const bodies = RACE_BODY_IDS.map(id => (
      Array.from(activeBodies).find(body => body.name === id)
    ))
    const sideOnRotation = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      Math.PI / 2,
    )

    act(() => {
      for (const body of bodies) {
        body.setRotation(sideOnRotation)
        body.setLinvel({ x: 0, y: 0, z: -13 })
      }
      triggerFrames(0.2, 1)
    })

    for (const body of bodies) {
      expect(horizontalSpeed(body)).toBeGreaterThan(8)
    }

    view.unmount()
  })

  it('lets a finished AI coast instead of pinning it to zero speed on the finish line', () => {
    act(() => {
      useGameStore.setState({ maxLaps: 1 })
    })
    const view = render(<App />)
    const ai = Array.from(activeBodies).find(body => body.name === 'ai_1')
    const sampleCount = Math.ceil(trackLength)
    // The race contract is a forward crossing, not proximity to the seam.
    // Drive a few metres beyond the painted line so projection ambiguity at
    // exactly progress 0/1 cannot make the synthetic lap stop on the line.
    const finishOvershootSamples = 6

    act(() => {
      for (let sample = 0; sample <= sampleCount + finishOvershootSamples; sample += 1) {
        const progress = sample / sampleCount
        const wrappedProgress = progress % 1
        const point = trackCurve.getPointAt(wrappedProgress)
        const tangent = trackCurve.getTangentAt(wrappedProgress).normalize()
        const rotation = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 0, -1),
          tangent,
        )
        ai.setTranslation({ x: point.x, y: point.y + 1, z: point.z })
        ai.setRotation(rotation)
        ai.setLinvel({ x: tangent.x * 25, y: 0, z: tangent.z * 25 })
        triggerFrames(1 / 30, 1)

        const racer = useGameStore.getState().racers.find(({ id }) => id === 'ai_1')
        if (racer?.finished) break
      }
    })

    expect(useGameStore.getState().racers.find(({ id }) => id === 'ai_1')).toMatchObject({
      finished: true,
    })
    expect(horizontalSpeed(ai)).toBeGreaterThan(20)

    act(() => {
      triggerFrames(1 / 60, 2)
    })
    expect(horizontalSpeed(ai)).toBeGreaterThan(20)

    act(() => {
      ai.setTranslation({ x: 321, y: 1, z: -123 })
      triggerFrames(1 / 60, 1)
    })
    expect(window.racerPositions.ai_1).toMatchObject({ x: 321, z: -123 })

    view.unmount()
  })
})
