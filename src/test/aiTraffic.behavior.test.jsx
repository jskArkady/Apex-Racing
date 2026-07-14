import React from 'react'
import { act, render } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import * as THREE from 'three'
import Opponents from '../components/Opponents'
import { useGameStore } from '../store/gameStore'
import { activeBodies, triggerFrames } from './setup'

const AI_IDS = ['ai_1', 'ai_2', 'ai_3']

describe('AI traffic response', () => {
  beforeEach(() => {
    window.racerPositions = {}
    window.racerProgress = {}
    act(() => useGameStore.setState({
      gameState: 'playing',
      gameMode: 'single',
      lap: 1,
      maxLaps: 3,
      currentTime: 0,
      totalTime: 0,
      totalCheckpoints: 10,
      nextCheckpointIndex: 1,
      racers: ['player', ...AI_IDS].map(id => ({
        id,
        lap: 1,
        nextCheckpointIndex: 1,
        lastCheckpointTime: 0,
        finished: false,
        totalTime: 0,
        currentTime: 0,
      })),
    }))
  })

  it('brakes for a slower same-lane car before contact and publishes velocity', () => {
    const { unmount } = render(<Opponents />)
    const body = Array.from(activeBodies).find(candidate => candidate.name === 'ai_2')
    expect(body).toBeDefined()

    const rotation = body.rotation()
    const forward = new THREE.Vector3(0, 0, -1)
      .applyQuaternion(new THREE.Quaternion(
        rotation.x,
        rotation.y,
        rotation.z,
        rotation.w,
      ))
      .setY(0)
      .normalize()
    const position = body.translation()
    body.setLinvel({ x: forward.x * 55, y: 0, z: forward.z * 55 })

    window.racerPositions.traffic_probe = {
      x: position.x + forward.x * 12,
      z: position.z + forward.z * 12,
      vx: forward.x * 40,
      vz: forward.z * 40,
    }

    const longitudinalImpulses = []
    const originalApplyImpulse = body.applyImpulse.bind(body)
    body.applyImpulse = impulse => {
      longitudinalImpulses.push(impulse.x * forward.x + impulse.z * forward.z)
      originalApplyImpulse(impulse)
    }

    act(() => triggerFrames(1 / 60, 1))

    expect(longitudinalImpulses.some(impulse => impulse < -100)).toBe(true)
    expect(window.racerPositions.ai_2).toMatchObject({
      vx: expect.any(Number),
      vz: expect.any(Number),
    })
    expect(Number.isFinite(window.racerPositions.ai_2.vx)).toBe(true)
    expect(Number.isFinite(window.racerPositions.ai_2.vz)).toBe(true)
    unmount()
  })
})
