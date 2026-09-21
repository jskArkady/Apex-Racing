import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import Opponents from '../components/Opponents'
import { useGameStore } from '../store/gameStore'
import * as dynamics from '../utils/vehicleDynamics'
import { getTrackPreset } from '../utils/trackData'
import { activeBodies, triggerFrames } from './setup'

const initial = useGameStore.getState()
beforeEach(() => useGameStore.setState(initial, true))
afterEach(() => vi.restoreAllMocks())

it.each([['easy', true], ['normal', false], ['hard', false]])(
  '%s AI uses its speed target while retaining shared vehicle actuation', (difficulty, shouldBrake) => {
    const curve = new THREE.CatmullRomCurve3(Array.from({ length: 32 }, (_, i) => (
      new THREE.Vector3(Math.cos(i / 32 * Math.PI * 2) * 1000, 0, Math.sin(i / 32 * Math.PI * 2) * 1000)
    )), true)
    const track = { ...getTrackPreset(), curve, length: curve.getLength() }
    useGameStore.setState({ gameState: 'menu' })
    useGameStore.getState().updateRaceOptions({ difficulty })
    useGameStore.getState().startGame('single')
    useGameStore.setState({ gameState: 'playing' })
    const actuation = vi.spyOn(dynamics, 'calculateVehicleActuation')
    const { unmount } = render(<Opponents track={track} />)
    const bodies = [...activeBodies]
    // Separate rivals so traffic does not mask the selected difficulty.
    bodies.slice(1).forEach((body, i) => body.setTranslation(curve.getPointAt(0.3 + i * 0.3), true))
    const body = bodies[0]
    const rotation = body.rotation()
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w))
    body.setLinvel(forward.multiplyScalar(44), true)
    act(() => triggerFrames(1 / 60, 1))
    const command = actuation.mock.calls[0][0]
    expect(command.mass).toBe(dynamics.VEHICLE_DYNAMICS.mass)
    expect(command.brakingForce > 0).toBe(shouldBrake)
    unmount()
  },
)
