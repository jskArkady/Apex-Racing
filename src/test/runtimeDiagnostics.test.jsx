import React from 'react'
import { act, render } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import * as THREE from 'three'
import App from '../App'
import { useGameStore } from '../store/gameStore'
import {
  PLAYER_TRANSLATION_REASON,
  setPlayerTranslation,
} from '../utils/drivingGuards'
import {
  createPhysicsObservationState,
  getRuntimeDiagnostics,
  observePlayerPhysics,
  RUNTIME_DIAGNOSTICS_VERSION,
  RUNTIME_EVENT_ID,
} from '../utils/runtimeDiagnostics'
import { trackCurve } from '../utils/trackData'
import { activeBodies, triggerFrames } from './setup'

const playerBody = () => Array.from(activeBodies).find(body => body.name === 'player')

beforeEach(() => {
  getRuntimeDiagnostics().clear()
  act(() => {
    useGameStore.setState({
      gameState: 'countdown',
      gameMode: 'time_trial',
      raceSessionId: 71,
      lap: 2,
      nextCheckpointIndex: 4,
      totalCheckpoints: 10,
      isDrivingBackwards: false,
    })
  })
})

describe('runtime cause diagnostics', () => {
  it('labels every authorized player translation without adding another move', () => {
    const body = {
      translation: () => ({ x: 1, y: 2, z: 3 }),
      setTranslation: (...args) => {
        body.calls.push(args)
      },
      calls: [],
    }

    setPlayerTranslation(
      body,
      { x: 4, y: 5, z: 6 },
      PLAYER_TRANSLATION_REASON.MANUAL_RECOVERY,
      { raceSessionId: 9, gameState: 'playing', trigger: 'test' },
    )

    expect(body.calls).toHaveLength(1)
    expect(getRuntimeDiagnostics().version).toBe(RUNTIME_DIAGNOSTICS_VERSION)
    expect(getRuntimeDiagnostics().events).toEqual([
      expect.objectContaining({
        id: RUNTIME_EVENT_ID.PLAYER_TRANSLATION,
        causeId: PLAYER_TRANSLATION_REASON.MANUAL_RECOVERY,
        from: { x: 1, y: 2, z: 3 },
        to: { x: 4, y: 5, z: 6 },
        raceSessionId: 9,
        gameState: 'playing',
        trigger: 'test',
      }),
    ])
  })

  it('observes uncommanded position and speed discontinuities without mutating physics', () => {
    const state = createPhysicsObservationState()
    observePlayerPhysics(state, {
      position: { x: 0, y: 1, z: 0 },
      velocity: { x: 0, y: 0, z: -20 },
      delta: 1 / 60,
      raceSessionId: 4,
      gameState: 'playing',
    })
    const events = observePlayerPhysics(state, {
      position: { x: 100, y: 1, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      delta: 1 / 60,
      raceSessionId: 4,
      gameState: 'playing',
      controls: { forward: true, reset: false },
    })

    expect(events.map(event => event.id)).toEqual([
      RUNTIME_EVENT_ID.PHYSICS_POSITION_JUMP,
      RUNTIME_EVENT_ID.PHYSICS_SPEED_DROP,
    ])
    expect(state.position).toEqual({ x: 100, y: 1, z: 0 })
    expect(state.velocity).toEqual({ x: 0, y: 0, z: 0 })
  })

  it('records a progressive speed collapse while throttle remains held', () => {
    const state = createPhysicsObservationState()
    const speeds = [15, 10, 5, 0.5]
    let events = []
    for (const speed of speeds) {
      events = events.concat(observePlayerPhysics(state, {
        position: { x: 0, y: 1, z: 0 },
        velocity: { x: 0, y: 0, z: -speed },
        delta: 0.1,
        raceSessionId: 8,
        gameState: 'playing',
        controls: { forward: true, backward: false, brake: false, reset: false },
      }))
    }

    expect(events).toContainEqual(expect.objectContaining({
      id: RUNTIME_EVENT_ID.PHYSICS_SPEED_DROP,
      causeId: 'progressive-physics-speed-drop',
    }))
  })

  it('does not lose a gradual throttle-held collapse just beyond one second', () => {
    const state = createPhysicsObservationState()
    let events = []
    for (let sample = 0; sample <= 15; sample += 1) {
      const speed = 15 - sample
      events = events.concat(observePlayerPhysics(state, {
        position: { x: sample, y: 1, z: 0 },
        velocity: { x: 0, y: 0, z: -Math.max(0, speed) },
        delta: 0.1,
        raceSessionId: 10,
        gameState: 'playing',
        controls: { forward: true, backward: false, brake: false, reset: false },
      }))
    }

    expect(events).toContainEqual(expect.objectContaining({
      id: RUNTIME_EVENT_ID.PHYSICS_SPEED_DROP,
      causeId: 'progressive-physics-speed-drop',
    }))
  })

  it('records session reset, R recovery, real WRONG WAY entry and its clearing in Car', () => {
    const view = render(<App />)
    const body = playerBody()

    expect(getRuntimeDiagnostics().events).toContainEqual(expect.objectContaining({
      id: RUNTIME_EVENT_ID.PLAYER_TRANSLATION,
      causeId: PLAYER_TRANSLATION_REASON.SESSION_RESET,
    }))

    act(() => {
      useGameStore.setState({ gameState: 'playing' })
    })
    act(() => {
      window.mockKeys.reset = true
      triggerFrames(1 / 60, 1)
      window.mockKeys.reset = false
      triggerFrames(1 / 60, 1)
    })
    expect(getRuntimeDiagnostics().events).toContainEqual(expect.objectContaining({
      id: RUNTIME_EVENT_ID.PLAYER_TRANSLATION,
      causeId: PLAYER_TRANSLATION_REASON.MANUAL_RECOVERY,
    }))

    const delta = 1 / 60
    const step = 0.00075
    act(() => {
      for (let index = 1; index <= 90; index += 1) {
        const progress = 0.3 - index * step
        const point = trackCurve.getPointAt(progress)
        const tangent = trackCurve.getTangentAt(progress).normalize()
        body.setTranslation({ x: point.x, y: point.y + 1, z: point.z })
        body.setLinvel(tangent.multiplyScalar(-18))
        triggerFrames(delta, 1)
      }
    })

    expect(getRuntimeDiagnostics().events).toContainEqual(expect.objectContaining({
      id: RUNTIME_EVENT_ID.WRONG_WAY_TRANSITION,
      causeId: 'confirmed-reverse-entry',
      active: true,
    }))

    act(() => {
      const progress = 0.3 - 89 * step
      const point = trackCurve.getPointAt(progress)
      const tangent = trackCurve.getTangentAt(progress).normalize()
      body.setTranslation(new THREE.Vector3(point.x, point.y + 1, point.z))
      body.setLinvel(tangent.multiplyScalar(18))
      triggerFrames(delta, 1)
    })
    expect(getRuntimeDiagnostics().events).toContainEqual(expect.objectContaining({
      id: RUNTIME_EVENT_ID.WRONG_WAY_TRANSITION,
      causeId: 'reverse-evidence-cleared',
      active: false,
    }))

    view.unmount()
  })
})
