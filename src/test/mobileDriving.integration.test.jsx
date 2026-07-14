import React from 'react'
import { act, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { mergeDrivingControlSources } from '../components/Car'
import { useGameStore } from '../store/gameStore'
import { activeBodies, triggerFrames } from './setup'

const getPlayerBody = () => Array.from(activeBodies).find(body => body.name === 'player')

beforeEach(() => {
  act(() => {
    useGameStore.setState({
      gameState: 'playing',
      gameMode: 'time_trial',
      countdown: 0,
      lap: 1,
      maxLaps: 3,
      currentTime: 0,
      totalTime: 0,
      nextCheckpointIndex: 1,
      totalCheckpoints: 10,
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
    useGameStore.getState().releaseTouchControls()
  })
})

describe('mobile input integration', () => {
  it('OR-merges keyboard and touch without one source releasing the other', () => {
    const target = {}
    expect(mergeDrivingControlSources(
      { forward: true, left: false },
      { forward: false, left: true },
      target,
    )).toMatchObject({ forward: true, left: true })

    expect(mergeDrivingControlSources(
      { forward: true, left: false },
      { forward: false, left: false },
      target,
    )).toMatchObject({ forward: true, left: false })
  })

  it('feeds held touch throttle and steering into player physics', () => {
    const view = render(<App />)
    const body = getPlayerBody()
    const impulseSpy = vi.spyOn(body, 'applyImpulse')
    const torqueSpy = vi.spyOn(body, 'applyTorqueImpulse')

    act(() => {
      useGameStore.getState().setTouchControl('forward', true)
      useGameStore.getState().setTouchControl('left', true)
      triggerFrames(1 / 60, 1)
    })

    expect(Math.hypot(
      impulseSpy.mock.calls[0][0].x,
      impulseSpy.mock.calls[0][0].z,
    )).toBeGreaterThan(0)
    expect(Math.abs(torqueSpy.mock.calls[0][0].y)).toBeGreaterThan(0)
    view.unmount()
  })

  it('gives the mobile brake priority over held throttle without engaging reverse at rest', () => {
    const view = render(<App />)
    const body = getPlayerBody()
    const impulseSpy = vi.spyOn(body, 'applyImpulse')

    body.setLinvel({ x: 0, y: 0, z: -20 })
    act(() => {
      useGameStore.getState().setTouchControl('forward', true)
      useGameStore.getState().setTouchControl('backward', true)
      triggerFrames(1 / 60, 1)
    })

    expect(impulseSpy.mock.calls[0][0].z).toBeGreaterThan(0)
    expect(body.linvel().z).toBeGreaterThan(-20)

    body.setLinvel({ x: 0, y: 0, z: 0 })
    impulseSpy.mockClear()
    act(() => triggerFrames(1 / 60, 1))
    expect(Math.hypot(
      impulseSpy.mock.calls[0][0].x,
      impulseSpy.mock.calls[0][0].z,
    )).toBe(0)

    impulseSpy.mockClear()
    act(() => {
      useGameStore.getState().setTouchControl('forward', false)
      triggerFrames(1 / 60, 1)
    })
    expect(impulseSpy.mock.calls[0][0].z).toBeGreaterThan(0)
    view.unmount()
  })
})
