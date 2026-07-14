import { describe, expect, it, vi } from 'vitest'
import {
  createWrongWayState,
  isClearlyBelowTrack,
  isReverseCheckpointCrossing,
  PLAYER_TRANSLATION_REASON,
  setPlayerTranslation,
  updateWrongWayState
} from './drivingGuards'

describe('driving guards', () => {
  it('allows only session initialization and explicit manual recovery to translate the player', () => {
    const body = { setTranslation: vi.fn() }
    const pose = { x: 1, y: 2, z: 3 }

    setPlayerTranslation(body, pose, PLAYER_TRANSLATION_REASON.SESSION_RESET)
    setPlayerTranslation(body, pose, PLAYER_TRANSLATION_REASON.MANUAL_RECOVERY)

    expect(body.setTranslation).toHaveBeenCalledTimes(2)
    expect(body.setTranslation).toHaveBeenNthCalledWith(1, pose, true)
    expect(body.setTranslation).toHaveBeenNthCalledWith(2, pose, true)

    for (const forbiddenReason of ['wrong-way', 'fall', 'off-track', 'projection-failure', undefined]) {
      expect(() => setPlayerTranslation(body, pose, forbiddenReason)).toThrow(
        `Invalid player translation reason: ${String(forbiddenReason)}`,
      )
    }
    expect(body.setTranslation).toHaveBeenCalledTimes(2)
  })

  it('classifies falls relative to the local road height, not world Y', () => {
    expect(isClearlyBelowTrack(-5.01, -5.02)).toBe(false)
    expect(isClearlyBelowTrack(-10.02, -5.02)).toBe(true)
    expect(isClearlyBelowTrack(-10.03, -5.02)).toBe(true)
    expect(isClearlyBelowTrack(-6, 0)).toBe(true)
    expect(isClearlyBelowTrack(Number.NaN, 0)).toBe(false)
  })

  it('requires sustained reverse time and distance for WRONG WAY', () => {
    const state = createWrongWayState()
    for (let frame = 0; frame < 59; frame += 1) {
      expect(updateWrongWayState(state, {
        continuous: true,
        signedTrackTravel: -6 / 60,
        longitudinalTrackSpeed: -6,
        delta: 1 / 60,
      })).toBe(false)
    }
    expect(updateWrongWayState(state, {
      continuous: true,
      signedTrackTravel: -6 / 60,
      longitudinalTrackSpeed: -6,
      delta: 1 / 60,
    })).toBe(true)
  })

  it('rejects projection jitter and clears immediately on forward correction', () => {
    const state = createWrongWayState()
    for (let frame = 0; frame < 120; frame += 1) {
      updateWrongWayState(state, {
        continuous: true,
        signedTrackTravel: frame % 2 ? -0.0005 : 0.0005,
        longitudinalTrackSpeed: -0.5,
        delta: 1 / 60,
      })
    }
    expect(state.active).toBe(false)

    for (let frame = 0; frame < 61; frame += 1) {
      updateWrongWayState(state, {
        continuous: true,
        signedTrackTravel: -5 / 60,
        longitudinalTrackSpeed: -5,
        delta: 1 / 60,
      })
    }
    expect(state.active).toBe(true)
    expect(updateWrongWayState(state, {
      continuous: true,
      signedTrackTravel: 0.05,
      longitudinalTrackSpeed: 3,
      delta: 1 / 60,
    })).toBe(false)
  })

  it('requires uninterrupted reverse evidence instead of accumulating separate corrections', () => {
    const state = createWrongWayState()

    for (let burst = 0; burst < 6; burst += 1) {
      for (let frame = 0; frame < 10; frame += 1) {
        updateWrongWayState(state, {
          continuous: true,
          signedTrackTravel: -5 / 60,
          longitudinalTrackSpeed: -5,
          delta: 1 / 60,
        })
      }
      updateWrongWayState(state, {
        continuous: true,
        signedTrackTravel: 0,
        longitudinalTrackSpeed: 0,
        delta: 1 / 60,
      })
    }

    expect(state.active).toBe(false)
    expect(state.reverseSeconds).toBe(0)
    expect(state.reverseDistance).toBe(0)
  })

  it('discards accumulated evidence on the first projection conflict', () => {
    const state = createWrongWayState()

    for (let frame = 0; frame < 30; frame += 1) {
      updateWrongWayState(state, {
        continuous: true,
        signedTrackTravel: -8 / 120,
        longitudinalTrackSpeed: -8,
        delta: 1 / 120,
      })
    }

    expect(updateWrongWayState(state, {
      continuous: true,
      signedTrackTravel: 0.5,
      longitudinalTrackSpeed: -8,
      delta: 1 / 120,
    })).toBe(false)
    expect(state.reverseSeconds).toBe(0)
    expect(state.reverseDistance).toBe(0)

    for (let frame = 0; frame < 120; frame += 1) {
      updateWrongWayState(state, {
        continuous: true,
        signedTrackTravel: -8 / 120,
        longitudinalTrackSpeed: -8,
        delta: 1 / 120,
      })
    }

    expect(state.active).toBe(false)
    expect(updateWrongWayState(state, {
      continuous: true,
      signedTrackTravel: -8 / 120,
      longitudinalTrackSpeed: -8,
      delta: 1 / 120,
    })).toBe(true)
  })

  it('clears reverse evidence when a projection conflict persists', () => {
    const state = createWrongWayState()

    for (let frame = 0; frame < 30; frame += 1) {
      updateWrongWayState(state, {
        continuous: true,
        signedTrackTravel: -5 / 60,
        longitudinalTrackSpeed: -5,
        delta: 1 / 60,
      })
    }

    for (let frame = 0; frame < 7; frame += 1) {
      updateWrongWayState(state, {
        continuous: true,
        signedTrackTravel: 0.05,
        longitudinalTrackSpeed: -5,
        delta: 1 / 60,
      })
    }

    expect(state.active).toBe(false)
    expect(state.reverseSeconds).toBe(0)
    expect(state.reverseDistance).toBe(0)
  })

  it('blocks checkpoint traversal before the debounced warning is active', () => {
    expect(isReverseCheckpointCrossing({
      continuous: true,
      signedTrackTravel: -0.0002,
      longitudinalTrackSpeed: -0.0002,
    })).toBe(true)
    expect(isReverseCheckpointCrossing({
      continuous: true,
      signedTrackTravel: 0.01,
      longitudinalTrackSpeed: 0.5,
    })).toBe(false)
    expect(isReverseCheckpointCrossing({
      continuous: true,
      signedTrackTravel: 0,
      longitudinalTrackSpeed: -1e-8,
    })).toBe(false)
  })

})
