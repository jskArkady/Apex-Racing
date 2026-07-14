import React from 'react'
import { act, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import Car from '../components/Car'
import Opponents from '../components/Opponents'
import { useGameStore } from '../store/gameStore'
import { getStartGridPose, getStartGridPoses } from '../utils/startGrid'
import { getTrackPreset } from '../utils/trackData'
import { activeBodies, frameCallbacks } from './setup'

const expectBodyAtPose = (body, pose) => {
  expect(body.translation().x).toBeCloseTo(pose.position[0], 7)
  expect(body.translation().y).toBeCloseTo(pose.position[1], 7)
  expect(body.translation().z).toBeCloseTo(pose.position[2], 7)
  const rotation = body.rotation()
  const actualForward = new THREE.Vector3(0, 0, -1)
    .applyQuaternion(new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w))
  expect(actualForward.dot(pose.tangent)).toBeGreaterThan(0.999999)
}

describe('starting-grid physics integration', () => {
  beforeEach(() => {
    useGameStore.setState({
      gameState: 'countdown',
      gameMode: 'single',
      raceSessionId: 100,
      countdown: 3,
    })
  })

  it('resets a mounted player body, velocity, heading and camera on restart', () => {
    render(<Car />)
    const body = Array.from(activeBodies)[0]
    const pose = getStartGridPose('player', 'single')
    expectBodyAtPose(body, pose)

    act(() => {
      useGameStore.setState({ gameState: 'paused' })
      body.setTranslation({ x: 80, y: 4, z: -120 })
      body.setLinvel({ x: 20, y: 2, z: -30 })
      body.setRotation({ x: 0, y: 1, z: 0, w: 0 })
      useGameStore.getState().restartRace()
    })

    expectBodyAtPose(body, pose)
    expect(body.linvel()).toEqual({ x: 0, y: 0, z: 0 })

    const camera = { position: { lerp: vi.fn() }, lookAt: vi.fn() }
    act(() => {
      frameCallbacks.forEach((callback) => callback({ camera }, 1 / 60))
    })
    expect(camera.position.lerp).toHaveBeenCalledTimes(1)
    expect(camera.lookAt).toHaveBeenCalledTimes(1)
  })

  it('places all AI bodies in the same non-overlapping shared grid', () => {
    render(<Opponents />)
    const bodies = Array.from(activeBodies)
    const poses = getStartGridPoses('single').filter((pose) => pose.racerId !== 'player')
    expect(bodies).toHaveLength(3)
    poses.forEach((pose) => {
      const body = bodies.find((candidate) => (
        candidate.initialX === pose.position[0] && candidate.initialZ === pose.position[2]
      ))
      expect(body).toBeDefined()
      expectBodyAtPose(body, pose)
    })
  })

  it('starts time trial alone on the centered grid slot', () => {
    act(() => useGameStore.setState({ gameMode: 'time_trial' }))
    render(<Car />)
    const pose = getStartGridPose('player', 'time_trial')
    const bodies = Array.from(activeBodies)
    expect(bodies).toHaveLength(1)
    expectBodyAtPose(bodies[0], pose)
    expect(pose.lateralOffset).toBe(0)
  })

  it.each(['harbour_street', 'temple_speedway'])(
    'uses the selected %s curve for player and AI grid placement',
    trackId => {
      const track = getTrackPreset(trackId)
      const playerView = render(<Car track={track} />)
      const playerBody = Array.from(activeBodies).find(body => body.name === 'player')

      expectBodyAtPose(
        playerBody,
        getStartGridPose('player', 'single', track.curve, track.length)
      )

      playerView.unmount()

      const aiView = render(<Opponents track={track} />)
      const aiBodies = Array.from(activeBodies)
      const poses = ['ai_1', 'ai_2', 'ai_3'].map(racerId => (
        getStartGridPose(racerId, 'single', track.curve, track.length)
      ))

      expect(aiBodies).toHaveLength(3)
      for (const pose of poses) {
        const body = aiBodies.find(candidate => (
          candidate.initialX === pose.position[0] && candidate.initialZ === pose.position[2]
        ))
        expect(body).toBeDefined()
        expectBodyAtPose(body, pose)
      }

      aiView.unmount()
    }
  )
})
