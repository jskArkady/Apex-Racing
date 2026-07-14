import React from 'react'
import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import App from '../App'
import { useGameStore } from '../store/gameStore'
import { WRONG_WAY_POLICY } from '../utils/drivingGuards'
import { trackCurve } from '../utils/trackData'
import { activeBodies, triggerFrames } from './setup'

const getPlayerBody = () => Array.from(activeBodies).find(body =>
  body.name === 'player'
)

beforeEach(() => {
  vi.useFakeTimers()
  act(() => {
    useGameStore.setState({
      gameState: 'playing',
      gameMode: 'time_trial',
      lap: 1,
      maxLaps: 3,
      currentTime: 0,
      totalTime: 0,
      totalCheckpoints: 10,
      nextCheckpointIndex: 4,
      isDrivingBackwards: true,
      racers: [{
        id: 'player',
        lap: 1,
        nextCheckpointIndex: 4,
        lastCheckpointTime: 0,
        finished: false,
        totalTime: 0,
        currentTime: 0,
      }],
    })
  })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('player respawn regression', () => {
  it('treats a held R key as one recovery request instead of respawning every frame', () => {
    const view = render(<App />)
    const body = getPlayerBody()
    const translationSpy = vi.spyOn(body, 'setTranslation')

    window.mockKeys.reset = true
    act(() => triggerFrames(1 / 60, 5))

    expect(translationSpy).toHaveBeenCalledTimes(1)

    window.mockKeys.reset = false
    act(() => triggerFrames(1 / 60, 1))
    window.mockKeys.reset = true
    act(() => triggerFrames(1 / 60, 1))

    expect(translationSpy).toHaveBeenCalledTimes(2)

    for (let tap = 0; tap < 6; tap += 1) {
      window.mockKeys.reset = false
      act(() => triggerFrames(1 / 120, 1))
      window.mockKeys.reset = true
      act(() => triggerFrames(1 / 120, 1))
    }

    expect(translationSpy).toHaveBeenCalledTimes(8)
    view.unmount()
  })

  it('respawns with a yaw-only rotation aligned to the checkpoint tangent and clears wrong-way state', () => {
    const view = render(<App />)
    const body = getPlayerBody()
    const recoveryProgress = 0.3
    const tangent = trackCurve.getTangentAt(recoveryProgress)
    const flatTangent = new THREE.Vector3(tangent.x, 0, tangent.z).normalize()

    window.mockKeys.reset = true
    act(() => triggerFrames(1 / 60, 1))
    window.mockKeys.reset = false
    act(() => triggerFrames(1 / 60, 1))

    const rotation = body.rotation()
    const forward = new THREE.Vector3(0, 0, -1)
      .applyQuaternion(new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w))
      .setY(0)
      .normalize()

    expect(forward.dot(flatTangent)).toBeGreaterThan(0.9999)
    expect(rotation.x).toBeCloseTo(0, 8)
    expect(rotation.z).toBeCloseTo(0, 8)
    expect(body.linvel()).toEqual({ x: 0, y: 0, z: 0 })
    expect(useGameStore.getState().isDrivingBackwards).toBe(false)
    view.unmount()
  })

  it('never turns a persistent projection-based off-track classification into a physical recovery', () => {
    const view = render(<App />)
    const body = getPlayerBody()

    act(() => triggerFrames(1 / 60, 1))
    const translationSpy = vi.spyOn(body, 'setTranslation')
    const offTrackProgress = 0.3
    const offTrackPoint = trackCurve.getPointAt(offTrackProgress)
    const offTrackTangent = trackCurve.getTangentAt(offTrackProgress).normalize()
    const offTrackSide = new THREE.Vector3(0, 1, 0).cross(offTrackTangent).normalize()
    const offTrack = offTrackPoint.clone()
      .addScaledVector(offTrackSide, 25)
      .add(new THREE.Vector3(0, 1, 0))

    act(() => {
      body.setTranslation(offTrack)
      triggerFrames(1 / 20, 27)
    })

    // Projection is race metadata, not authoritative physical-contact state.
    // The only translation here must be the deliberate test placement.
    expect(translationSpy).toHaveBeenCalledTimes(1)
    expect(Math.hypot(body.translation().x - offTrack.x, body.translation().z - offTrack.z)).toBeLessThan(0.01)
    view.unmount()
  })

  it('aligns yaw-only recovery rotations with every checkpoint tangent, including CP9 before finish', () => {
    const view = render(<App />)
    const body = getPlayerBody()

    for (let recoveryCheckpointIndex = 0; recoveryCheckpointIndex < 10; recoveryCheckpointIndex += 1) {
      const nextCheckpointIndex = (recoveryCheckpointIndex + 1) % 10
      const progress = recoveryCheckpointIndex / 10
      const tangent = trackCurve.getTangentAt(progress)
      const flatTangent = new THREE.Vector3(tangent.x, 0, tangent.z).normalize()

      act(() => {
        // Lap 2 bypasses the intentional pre-CP1 grid-slot recovery special
        // case so this loop can validate each actual checkpoint tangent.
        useGameStore.setState({ lap: 2, nextCheckpointIndex, isDrivingBackwards: true })
        window.mockKeys.reset = true
        triggerFrames(1 / 60, 1)
      })

      const rotation = body.rotation()
      const forward = new THREE.Vector3(0, 0, -1)
        .applyQuaternion(new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w))
        .setY(0)
        .normalize()

      expect(forward.dot(flatTangent), `CP${recoveryCheckpointIndex}`).toBeGreaterThan(0.9999)
      expect(rotation.x, `CP${recoveryCheckpointIndex} pitch`).toBeCloseTo(0, 8)
      expect(rotation.z, `CP${recoveryCheckpointIndex} roll`).toBeCloseTo(0, 8)
      expect(useGameStore.getState().isDrivingBackwards).toBe(false)

      act(() => {
        window.mockKeys.reset = false
        triggerFrames(1 / 60, 1)
      })
    }

    view.unmount()
  })

  it('recovers once when reset is combined with throttle and steering, then resumes those controls', () => {
    const view = render(<App />)
    const body = getPlayerBody()
    const translationSpy = vi.spyOn(body, 'setTranslation')
    const impulseSpy = vi.spyOn(body, 'applyImpulse')
    const torqueSpy = vi.spyOn(body, 'applyTorqueImpulse')

    window.mockKeys.reset = true
    window.mockKeys.forward = true
    window.mockKeys.left = true
    act(() => triggerFrames(1 / 60, 1))

    expect(translationSpy).toHaveBeenCalledTimes(1)
    expect(impulseSpy).not.toHaveBeenCalled()
    expect(torqueSpy).not.toHaveBeenCalled()

    act(() => triggerFrames(1 / 60, 1))

    expect(translationSpy).toHaveBeenCalledTimes(1)
    expect(impulseSpy).toHaveBeenCalled()
    expect(torqueSpy).toHaveBeenCalled()
    view.unmount()
  })

  it('does not treat reset held during pause as a fresh recovery after resume', () => {
    const view = render(<App />)
    const body = getPlayerBody()
    const translationSpy = vi.spyOn(body, 'setTranslation')

    act(() => {
      useGameStore.setState({ gameState: 'paused' })
    })
    act(() => {
      window.mockKeys.reset = true
      triggerFrames(1 / 60, 2)
    })
    expect(translationSpy).not.toHaveBeenCalled()

    act(() => {
      useGameStore.setState({ gameState: 'playing' })
    })
    act(() => {
      triggerFrames(1 / 60, 1)
    })
    expect(translationSpy).not.toHaveBeenCalled()
    view.unmount()
  })

  it('does not classify the circuit low point as a fall', () => {
    const view = render(<App />)
    const body = getPlayerBody()
    const translationSpy = vi.spyOn(body, 'setTranslation')
    const sampleCount = 400
    const speed = 75
    const delta = trackCurve.getLength() / sampleCount / speed

    act(() => {
      for (let index = 0; index < sampleCount; index += 1) {
        const progress = index / sampleCount
        const point = trackCurve.getPointAt(progress)
        const tangent = trackCurve.getTangentAt(progress).setY(0).normalize()
        // The circuit reaches slightly below world Y=-5. The old absolute
        // threshold respawned the chassis at this ordinary low section.
        body.setTranslation({ x: point.x, y: point.y + 0.001, z: point.z })
        body.setLinvel({ x: tangent.x * speed, y: 0, z: tangent.z * speed })
        triggerFrames(delta, 1)
      }
    })

    expect(translationSpy).toHaveBeenCalledTimes(sampleCount)
    expect(Math.hypot(body.linvel().x, body.linvel().z)).toBeGreaterThan(1)
    view.unmount()
  })

  it('uses current XZ road height when continuity progress is stale across elevation changes', () => {
    const view = render(<App />)
    const body = getPlayerBody()
    const translationSpy = vi.spyOn(body, 'setTranslation')
    const sampleCount = 100
    const speed = 75
    const highProgress = 0.3345

    act(() => {
      for (let index = 0; index < sampleCount; index += 1) {
        const progress = highProgress * index / (sampleCount - 1)
        const point = trackCurve.getPointAt(progress)
        const tangent = trackCurve.getTangentAt(progress).setY(0).normalize()
        body.setTranslation({ x: point.x, y: point.y + 0.001, z: point.z })
        body.setLinvel({ x: tangent.x * speed, y: 0, z: tangent.z * speed })
        triggerFrames(1 / 60, 1)
      }

      // This discontinuous placement intentionally leaves logical progress at
      // the high section. Recovery must still inspect the road under current
      // XZ, where y=-5 is valid surface rather than a ten-metre fall.
      const lowProgress = 0.7515
      const lowPoint = trackCurve.getPointAt(lowProgress)
      const lowTangent = trackCurve.getTangentAt(lowProgress).setY(0).normalize()
      body.setTranslation({ x: lowPoint.x, y: lowPoint.y + 0.001, z: lowPoint.z })
      body.setLinvel({ x: lowTangent.x * speed, y: 0, z: lowTangent.z * speed })
      triggerFrames(1 / 60, 2)
    })

    expect(translationSpy).toHaveBeenCalledTimes(sampleCount + 1)
    expect(Math.hypot(body.linvel().x, body.linvel().z)).toBeGreaterThan(1)
    view.unmount()
  })

  it('never auto-recovers a fall or an off-corridor projection rejection', () => {
    const view = render(<App />)
    const body = getPlayerBody()
    const translationSpy = vi.spyOn(body, 'setTranslation')
    const velocitySpy = vi.spyOn(body, 'setLinvel')

    act(() => {
      body.setTranslation({ x: 500, y: -6, z: -500 })
      body.setLinvel({ x: 80, y: -40, z: 80 })
      triggerFrames(1 / 60, 1)
    })
    expect(translationSpy).toHaveBeenCalledTimes(1)
    expect(velocitySpy).toHaveBeenCalledTimes(1)
    expect(Math.hypot(body.linvel().x, body.linvel().y, body.linvel().z)).toBeGreaterThan(1)

    const offCorridorProgress = 0.3
    const offCorridorPoint = trackCurve.getPointAt(offCorridorProgress)
    const offCorridorTangent = trackCurve.getTangentAt(offCorridorProgress).normalize()
    const offCorridorSide = new THREE.Vector3(0, 1, 0)
      .cross(offCorridorTangent)
      .normalize()
    const offCorridor = offCorridorPoint.clone()
      .addScaledVector(offCorridorSide, 25)
      .add(new THREE.Vector3(0, 1, 0))
    act(() => {
      body.setTranslation(offCorridor)
      triggerFrames(1 / 20, 27)
    })

    // Both translations are deliberate test placements. Neither calculated
    // condition may insert a physical translation or zero the velocity.
    expect(translationSpy).toHaveBeenCalledTimes(2)
    expect(velocitySpy).toHaveBeenCalledTimes(1)
    view.unmount()
  })

  it('can continue from a CP9 recovery through the finish without another recovery or wrong-way flag', () => {
    const view = render(<App />)
    const body = getPlayerBody()
    const translationSpy = vi.spyOn(body, 'setTranslation')

    act(() => {
      useGameStore.setState({ lap: 1, nextCheckpointIndex: 0 })
      window.mockKeys.reset = true
      triggerFrames(1 / 60, 1)
      window.mockKeys.reset = false
    })

    for (let sample = 1; sample <= 121; sample += 1) {
      const progress = 0.9 + (sample / 120) * 0.1
      const wrappedProgress = progress % 1
      const point = trackCurve.getPointAt(wrappedProgress)
      const tangent = trackCurve.getTangentAt(wrappedProgress)
      const flatTangent = new THREE.Vector3(tangent.x, 0, tangent.z).normalize()
      const rotation = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, -1),
        flatTangent
      )

      act(() => {
        body.setTranslation({ x: point.x, y: point.y + 1, z: point.z })
        body.setLinvel({ x: flatTangent.x * 20, y: 0, z: flatTangent.z * 20 })
        body.setRotation(rotation)
        triggerFrames(1 / 60, 1)
      })
    }

    // One explicit recovery plus the 121 deliberate path samples; no guard
    // recovery may be inserted while crossing the wrapped finish seam.
    expect(translationSpy).toHaveBeenCalledTimes(122)
    expect(useGameStore.getState().lap).toBe(2)
    expect(useGameStore.getState().nextCheckpointIndex).toBe(1)
    expect(useGameStore.getState().isDrivingBackwards).toBe(false)
    view.unmount()
  })

  it('uses sustained reverse travel for wrong-way, not chassis heading or lateral movement', () => {
    const view = render(<App />)
    const body = getPlayerBody()
    const progress = 0.3
    const point = trackCurve.getPointAt(progress)
    const tangent = trackCurve.getTangentAt(progress)
    const flatTangent = new THREE.Vector3(tangent.x, 0, tangent.z).normalize()
    const reverseRotation = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, -1),
      flatTangent.clone().negate()
    )
    const forwardRotation = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, -1),
      flatTangent
    )

    // Rebase the continuity guard at the intended checkpoint first.
    act(() => {
      useGameStore.setState({ nextCheckpointIndex: 4 })
      window.mockKeys.reset = true
      triggerFrames(1 / 60, 1)
      window.mockKeys.reset = false
      body.setTranslation({ x: point.x, y: point.y + 1, z: point.z })
      body.setLinvel({ x: 0, y: 0, z: 0 })
      body.setRotation(reverseRotation)
      triggerFrames(1 / 60, 1)
    })
    expect(useGameStore.getState().isDrivingBackwards).toBe(false)

    act(() => {
      // Expire the post-recovery direction grace while reverse-facing but
      // stationary. Heading alone is not reverse travel.
      triggerFrames(1 / 60, 25)
    })
    expect(useGameStore.getState().isDrivingBackwards).toBe(false)

    const side = new THREE.Vector3(0, 1, 0).cross(flatTangent).normalize()
    act(() => {
      body.setLinvel({ x: side.x * 10, y: 0, z: side.z * 10 })
      triggerFrames(1 / 60, 30)
    })
    expect(useGameStore.getState().isDrivingBackwards).toBe(false)

    // Rebase after the deliberate five-metre lateral slide so the reverse
    // portion measures direction evidence rather than a test-only teleport
    // back to the centerline.
    act(() => {
      window.mockKeys.reset = true
      triggerFrames(1 / 60, 1)
      window.mockKeys.reset = false
      triggerFrames(1 / 60, 25)
    })

    const driveReverseSamples = (count, startIndex = 0) => {
      for (let index = startIndex; index < startIndex + count; index += 1) {
        const reverseProgress = progress - ((index + 1) * 10 / 60) / trackCurve.getLength()
        const reversePoint = trackCurve.getPointAt(reverseProgress)
        const reverseTangent = trackCurve.getTangentAt(reverseProgress)
          .setY(0)
          .normalize()
        body.setTranslation({ x: reversePoint.x, y: reversePoint.y + 1, z: reversePoint.z })
        body.setLinvel({
          x: -reverseTangent.x * 10,
          y: 0,
          z: -reverseTangent.z * 10
        })
        triggerFrames(1 / 60, 1)
      }
    }

    act(() => {
      // A sub-threshold reverse correction is not sustained wrong-way travel.
      driveReverseSamples(20)
    })
    expect(useGameStore.getState().isDrivingBackwards).toBe(false)

    act(() => {
      // Crossing the sustained-reverse window (allowing one projection sample
      // to establish direction) raises the warning.
      const totalEntrySamples = Math.ceil(Math.max(
        WRONG_WAY_POLICY.entrySeconds * 60,
        WRONG_WAY_POLICY.entryDistance / 10 * 60,
      )) + 3
      driveReverseSamples(totalEntrySamples - 20, 20)
    })
    expect(useGameStore.getState().isDrivingBackwards).toBe(true)

    act(() => {
      body.setRotation(forwardRotation)
      body.setLinvel({ x: flatTangent.x * 0.1, y: 0, z: flatTangent.z * 0.1 })
      triggerFrames(1 / 60, 1)
    })
    expect(useGameStore.getState().isDrivingBackwards).toBe(false)
    view.unmount()
  })

  it('rebases after a suspended frame and never turns forward travel into wrong-way or recovery', () => {
    const view = render(<App />)
    const body = getPlayerBody()
    const translationSpy = vi.spyOn(body, 'setTranslation')

    const placeForward = (progress, delta) => {
      const point = trackCurve.getPointAt(progress)
      const tangent = trackCurve.getTangentAt(progress).setY(0).normalize()
      body.setTranslation({ x: point.x, y: point.y + 1, z: point.z })
      body.setLinvel({ x: tangent.x * 30, y: 0, z: tangent.z * 30 })
      triggerFrames(delta, 1)
    }

    act(() => {
      placeForward(0.2, 1 / 60)
      // Simulate a background/suspended render callback after physics has
      // advanced a plausible distance during the timing gap.
      placeForward(0.22, 0.8)
      placeForward(0.221, 1 / 60)
      placeForward(0.222, 1 / 60)
      placeForward(0.223, 1 / 60)
    })

    expect(translationSpy).toHaveBeenCalledTimes(5)
    expect(useGameStore.getState().isDrivingBackwards).toBe(false)
    view.unmount()
  })

  it.each([-7.9, -7.5, -3, -1, 0, 1, 3, 7.5, 7.9])(
    'drives a complete parallel lane at %sm offset without wrong-way or automatic respawn',
    (lateralOffset) => {
      const view = render(<App />)
      const body = getPlayerBody()

      act(() => {
        useGameStore.setState({
          gameState: 'playing',
          lap: 1,
          nextCheckpointIndex: 1,
          isDrivingBackwards: false,
        })
      })

      const translationSpy = vi.spyOn(body, 'setTranslation')
      const worldUp = new THREE.Vector3(0, 1, 0)
      // Match the physical road collider resolution so every swept section,
      // including the 1 -> 0 weld, executes Car's real recovery path.
      const sampleCount = 320
      const speed = 75
      const delta = trackCurve.getLength() / sampleCount / speed

      act(() => {
        for (let index = 0; index < sampleCount; index += 1) {
          const progress = index / sampleCount
          const point = trackCurve.getPointAt(progress)
          const tangent = trackCurve.getTangentAt(progress).normalize()
          const flatTangent = new THREE.Vector3(tangent.x, 0, tangent.z).normalize()
          const side = new THREE.Vector3().crossVectors(worldUp, tangent).normalize()
          const lanePoint = point.clone()
            .addScaledVector(side, lateralOffset)
            .add(new THREE.Vector3(0, 1, 0))
          const rotation = new THREE.Quaternion().setFromUnitVectors(
            new THREE.Vector3(0, 0, -1),
            flatTangent
          )

          body.setTranslation(lanePoint)
          body.setLinvel({
            x: flatTangent.x * speed,
            y: tangent.y * speed,
            z: flatTangent.z * speed,
          })
          body.setRotation(rotation)
          triggerFrames(delta, 1)

          expect(useGameStore.getState().isDrivingBackwards, `progress ${progress}`).toBe(false)
        }
      })

      // Every translation came from the test path itself. An automatic
      // recovery would add another setTranslation call on the following frame.
      expect(translationSpy).toHaveBeenCalledTimes(sampleCount)
      view.unmount()
    }
  )
})
