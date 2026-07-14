import React from 'react'
import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import App from '../App'
import { useGameStore } from '../store/gameStore'
import { getStartGridPose } from '../utils/startGrid'
import { DEFAULT_TRACK_ID, TRACK_PRESETS } from '../utils/trackData'
import { VEHICLE_COLLIDER_HALF_EXTENTS } from '../utils/vehicleDynamics'
import { activeBodies, triggerFrames } from './setup'

const FORWARD_AXIS = new THREE.Vector3(0, 0, -1)
const RACER_IDS = ['player', 'ai_1', 'ai_2', 'ai_3']
const SAMPLE_SPACING_METERS = 2
const TEST_SPEED = 24

function openSession(trackId, mode, gameState = 'countdown') {
  act(() => {
    useGameStore.setState({
      gameState: 'menu',
      selectedTrackId: DEFAULT_TRACK_ID,
      raceSessionId: 100,
    })
    useGameStore.getState().selectTrack(trackId)
    useGameStore.getState().startGame(mode)
    if (gameState === 'playing') {
      useGameStore.setState({ gameState: 'playing', countdown: 0 })
    }
  })
}

function getBody(racerId) {
  return Array.from(activeBodies).find(body => body.name === racerId)
}

function getVehicleBodies() {
  return Array.from(activeBodies).filter(body => RACER_IDS.includes(body.name))
}

function setBodyOnCenterline(body, track, progress) {
  const point = track.curve.getPointAt(progress)
  const tangent = track.curve.getTangentAt(progress)
  const flatTangent = new THREE.Vector3(tangent.x, 0, tangent.z).normalize()

  body.setTranslation({ x: point.x, y: point.y + 1, z: point.z })
  body.setLinvel({
    x: flatTangent.x * TEST_SPEED,
    y: 0,
    z: flatTangent.z * TEST_SPEED,
  })
  body.setRotation(new THREE.Quaternion().setFromUnitVectors(FORWARD_AXIS, flatTangent))
}

function driveOneCenterlineLap(body, track) {
  const passedCheckpoints = []
  const sampleCount = Math.ceil(track.length / SAMPLE_SPACING_METERS)

  for (let sample = 0; sample <= sampleCount + 1; sample += 1) {
    const progress = (sample / sampleCount) % 1
    const before = useGameStore.getState()

    act(() => {
      setBodyOnCenterline(body, track, progress)
      triggerFrames(1 / 60, 1)
    })

    const after = useGameStore.getState()
    if (after.nextCheckpointIndex !== before.nextCheckpointIndex
      || (before.gameState === 'playing' && after.gameState === 'finished')) {
      passedCheckpoints.push(before.nextCheckpointIndex)
    }
    if (after.gameState === 'finished') break
  }

  return passedCheckpoints
}

function expectCleanRaceState(trackId, mode) {
  const state = useGameStore.getState()
  expect(state).toMatchObject({
    gameState: 'countdown',
    gameMode: mode,
    selectedTrackId: trackId,
    lap: 1,
    maxLaps: 1,
    currentTime: 0,
    totalTime: 0,
    nextCheckpointIndex: 1,
    isDrivingBackwards: false,
  })
  expect(state.racers).toHaveLength(mode === 'time_trial' ? 1 : 4)
  for (const racer of state.racers) {
    expect(racer).toMatchObject({
      lap: 1,
      nextCheckpointIndex: 1,
      lastCheckpointTime: 0,
      finished: false,
      totalTime: 0,
      currentTime: 0,
    })
  }
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('selected-track race flow integration', () => {
  it.each(TRACK_PRESETS)(
    'validates CP1..CP9 and the finish in order on $name',
    track => {
      openSession(track.id, 'time_trial', 'playing')
      const view = render(<App />)
      const playerBody = getBody('player')

      expect(playerBody).toBeDefined()
      expect(driveOneCenterlineLap(playerBody, track)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 0])

      const state = useGameStore.getState()
      expect(state).toMatchObject({
        selectedTrackId: track.id,
        gameState: 'finished',
        lap: 1,
        nextCheckpointIndex: 0,
      })
      expect(state.totalTime).toBeGreaterThan(0)
      expect(state.racers).toHaveLength(1)
      expect(state.racers[0]).toMatchObject({
        id: 'player',
        finished: true,
        nextCheckpointIndex: 0,
      })
      view.unmount()
    },
    15_000,
  )

  it.each(TRACK_PRESETS)(
    'keeps every $name single-race chassis collider inside its configured road width',
    track => {
      openSession(track.id, 'single')
      const view = render(<App />)
      const bodies = getVehicleBodies()
      const colliders = view.getAllByTestId('cuboid-collider')

      expect(bodies).toHaveLength(RACER_IDS.length)
      expect(colliders).toHaveLength(RACER_IDS.length)
      for (const collider of colliders) {
        expect(JSON.parse(collider.dataset.args)).toEqual([
          VEHICLE_COLLIDER_HALF_EXTENTS.width,
          VEHICLE_COLLIDER_HALF_EXTENTS.height,
          VEHICLE_COLLIDER_HALF_EXTENTS.length,
        ])
      }

      for (const racerId of RACER_IDS) {
        const body = getBody(racerId)
        expect(body).toBeDefined()
        const pose = getStartGridPose(racerId, 'single', track.curve, track.length)
        const center = track.curve.getPointAt(pose.progress)
        const relative = new THREE.Vector3(
          body.translation().x - center.x,
          0,
          body.translation().z - center.z,
        )
        const actualLateralOffset = relative.dot(pose.right)

        expect(actualLateralOffset).toBeCloseTo(pose.lateralOffset, 7)
        expect(Math.abs(actualLateralOffset) + VEHICLE_COLLIDER_HALF_EXTENTS.width)
          .toBeLessThanOrEqual(track.roadWidth / 2)
      }
      view.unmount()
    },
  )

  it('cleans runtime bridges and race state across restart and track switching', () => {
    const view = render(<App />)
    const firstTrack = TRACK_PRESETS[0]
    const secondTrack = TRACK_PRESETS[1]

    openSession(firstTrack.id, 'single', 'playing')
    const firstSessionId = useGameStore.getState().raceSessionId
    const firstPlayerBody = getBody('player')

    act(() => {
      firstPlayerBody.setTranslation({ x: 999, y: -20, z: -777 })
      firstPlayerBody.setLinvel({ x: 20, y: -8, z: 30 })
      window.racerPositions = { player: { x: 999, z: -777 }, ghost: { x: 1, z: 2 } }
      window.racerProgress = { player: 188, ghost: 999 }
      useGameStore.setState({
        lap: 1,
        currentTime: 42,
        totalTime: 17,
        nextCheckpointIndex: 8,
        isDrivingBackwards: true,
      })
      useGameStore.getState().restartRace()
    })

    expect(useGameStore.getState().raceSessionId).toBe(firstSessionId + 1)
    expectCleanRaceState(firstTrack.id, 'single')
    expect(window.racerPositions).toEqual({})
    expect(window.racerProgress).toEqual({})
    const resetPose = getStartGridPose('player', 'single', firstTrack.curve, firstTrack.length)
    expect(firstPlayerBody.translation()).toEqual({
      x: resetPose.position[0],
      y: resetPose.position[1],
      z: resetPose.position[2],
    })
    expect(firstPlayerBody.linvel()).toEqual({ x: 0, y: 0, z: 0 })

    act(() => {
      useGameStore.getState().returnToMenu()
      useGameStore.getState().selectTrack(secondTrack.id)
      useGameStore.getState().startGame('time_trial')
    })

    expectCleanRaceState(secondTrack.id, 'time_trial')
    expect(window.racerPositions).toEqual({})
    expect(window.racerProgress).toEqual({})
    expect(getVehicleBodies()).toHaveLength(1)
    const secondPlayerBody = getBody('player')
    const secondPose = getStartGridPose(
      'player',
      'time_trial',
      secondTrack.curve,
      secondTrack.length,
    )
    expect(secondPlayerBody.translation()).toEqual({
      x: secondPose.position[0],
      y: secondPose.position[1],
      z: secondPose.position[2],
    })
    view.unmount()
  })
})
