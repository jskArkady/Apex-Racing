import React from 'react'
import { act, render } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '../App'
import { useGameStore } from '../store/gameStore'
import { VEHICLE_DYNAMICS } from '../utils/vehicleDynamics'
import { activeBodies, triggerFrames } from './setup'

const RACE_BODY_IDS = ['player', 'ai_1', 'ai_2', 'ai_3']

function startRace() {
  useGameStore.setState({
    gameState: 'playing',
    gameMode: 'single',
    lap: 1,
    maxLaps: 3,
    currentTime: 0,
    totalTime: 0,
    totalCheckpoints: 10,
    nextCheckpointIndex: 1,
    racers: RACE_BODY_IDS.map(id => ({
      id,
      lap: 1,
      nextCheckpointIndex: 1,
      lastCheckpointTime: 0,
      finished: false,
      totalTime: 0,
      currentTime: 0
    }))
  })
}

function getRaceBodies() {
  return RACE_BODY_IDS.map(id => (
    Array.from(activeBodies).find(body => body.name === id)
  ))
}

function horizontalMagnitude(impulse) {
  return Math.hypot(impulse.x, impulse.z)
}

describe('AI/player performance parity', () => {
  beforeEach(() => {
    act(startRace)
  })

  it('gives every race car the same mass and full launch acceleration', () => {
    window.mockKeys.forward = true
    const { unmount } = render(<App />)
    const bodies = getRaceBodies()
    expect(bodies.every(Boolean)).toBe(true)

    const captured = new Map()
    for (const body of bodies) {
      const impulses = []
      const originalApplyImpulse = body.applyImpulse.bind(body)
      body.applyImpulse = impulse => {
        impulses.push({ ...impulse })
        originalApplyImpulse(impulse)
      }
      captured.set(body.name, impulses)
    }

    act(() => {
      triggerFrames(1 / 60, 1)
    })

    const expectedImpulse = VEHICLE_DYNAMICS.launchEngineForce / 60
    const expectedAccelerationStep = expectedImpulse / VEHICLE_DYNAMICS.mass

    for (const body of bodies) {
      expect(body.mass()).toBe(VEHICLE_DYNAMICS.mass)
      const driveImpulse = Math.max(...captured.get(body.name).map(horizontalMagnitude))
      expect(driveImpulse).toBeCloseTo(expectedImpulse, 5)
      expect(driveImpulse / body.mass()).toBeCloseTo(expectedAccelerationStep, 7)
    }

    unmount()
  })

  it('uses the same explicit chassis collider, yaw constraint and damping without trimesh CCD', () => {
    const { container, unmount } = render(<App />)
    const raceBodyElements = RACE_BODY_IDS.map(id => (
      container.querySelector(`[data-testid="rigid-body"][data-name="${id}"]`)
    ))

    expect(raceBodyElements.every(Boolean)).toBe(true)
    for (const bodyElement of raceBodyElements) {
      expect(bodyElement).toHaveAttribute('data-colliders', 'false')
      expect(bodyElement).toHaveAttribute(
        'data-linear-damping',
        String(VEHICLE_DYNAMICS.linearDamping)
      )
      expect(bodyElement).toHaveAttribute(
        'data-angular-damping',
        String(VEHICLE_DYNAMICS.angularDamping)
      )
      expect(bodyElement).toHaveAttribute(
        'data-enabled-rotations',
        JSON.stringify([false, true, false])
      )
      expect(bodyElement).toHaveAttribute('data-ccd', 'false')

      const collider = bodyElement.querySelector('[data-testid="cuboid-collider"]')
      expect(collider).toHaveAttribute('data-args', JSON.stringify([1, 0.45, 2]))
      expect(collider).toHaveAttribute('data-position', JSON.stringify([0, 0.45, 0]))
      expect(collider).toHaveAttribute('data-mass', String(VEHICLE_DYNAMICS.mass))
      expect(collider).toHaveAttribute('data-friction', '0')
      expect(collider).toHaveAttribute('data-restitution', '0.2')
      expect(collider.getAttribute('data-friction-combine-rule')).not.toBe('undefined')
    }

    unmount()
  })

  it('caps AI and player launch impulse identically after a suspended frame', () => {
    window.mockKeys.forward = true
    const { unmount } = render(<App />)
    const bodies = getRaceBodies()
    const captured = new Map()

    for (const body of bodies) {
      const impulses = []
      const originalApplyImpulse = body.applyImpulse.bind(body)
      body.applyImpulse = impulse => {
        impulses.push({ ...impulse })
        originalApplyImpulse(impulse)
      }
      captured.set(body.name, impulses)
    }

    act(() => {
      triggerFrames(0.2, 1)
    })

    const expectedCappedImpulse = VEHICLE_DYNAMICS.launchEngineForce * (1 / 20)
    for (const body of bodies) {
      const driveImpulse = Math.max(...captured.get(body.name).map(horizontalMagnitude))
      expect(driveImpulse).toBeCloseTo(expectedCappedImpulse, 5)
    }

    unmount()
  })

  it('charges the same elapsed race time to player and AI after a long frame', () => {
    const { unmount } = render(<App />)

    act(() => {
      triggerFrames(0.5, 1)
    })

    const state = useGameStore.getState()
    expect(state.currentTime).toBeCloseTo(0.5, 6)
    for (const racer of state.racers.filter(({ id }) => id.startsWith('ai_'))) {
      expect(racer.currentTime).toBeCloseTo(state.currentTime, 6)
    }

    unmount()
  })
})
