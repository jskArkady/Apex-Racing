import React from 'react'
import { act, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import App from '../App'
import { useGameStore } from '../store/gameStore'
import { getTrackPoseAtProgress } from '../utils/startGrid'
import { getTrackPreset } from '../utils/trackData'
import { getTrackVisualCue } from '../utils/trackVisualCues'
import { activeBodies, triggerFrames } from './setup'

afterEach(() => {
  window.history.replaceState({}, '', '/')
})

describe('visual capture bootstrap', () => {
  it('opens a dev-only time trial at the requested Monaco tunnel pose', () => {
    const track = getTrackPreset('harbour_street')
    const cue = getTrackVisualCue(track.id, 'tunnel')
    window.history.replaceState(
      {},
      '',
      `/?visualCapture=1&track=${track.id}&view=${cue.key}`,
    )
    act(() => {
      useGameStore.setState({
        gameState: 'menu',
        selectedTrackId: 'apex_gp',
        raceSessionId: 900,
      })
    })

    const view = render(<App />)
    const state = useGameStore.getState()
    const body = Array.from(activeBodies).find(candidate => candidate.name === 'player')
    const pose = getTrackPoseAtProgress(cue.captureProgress, 0, track.curve)

    expect(state).toMatchObject({
      gameState: 'playing',
      gameMode: 'time_trial',
      selectedTrackId: track.id,
      countdown: 0,
    })
    expect(body.translation()).toEqual({
      x: pose.position[0],
      y: pose.position[1],
      z: pose.position[2],
    })
    expect(document.documentElement.dataset.visualCapture).toBe(`${track.id}:${cue.key}`)
    expect(window.__racingVisualCapture).toMatchObject({
      trackId: track.id,
      view: cue.key,
      status: 'playing',
    })

    view.unmount()
    expect(window.__racingVisualCapture).toBeUndefined()
  })

  it('opens the high-speed evidence view as a four-car chase-camera race', () => {
    const track = getTrackPreset('temple_speedway')
    window.history.replaceState(
      {},
      '',
      `/?visualCapture=1&track=${track.id}&view=race`,
    )
    act(() => {
      useGameStore.setState({
        gameState: 'menu',
        selectedTrackId: 'apex_gp',
        raceSessionId: 901,
      })
    })

    const view = render(<App />)
    const state = useGameStore.getState()
    const racers = Array.from(activeBodies).filter(candidate => (
      candidate.name === 'player' || candidate.name?.startsWith('ai_')
    ))
    act(() => triggerFrames(1 / 60, 1))

    expect(state).toMatchObject({
      gameState: 'playing',
      gameMode: 'single',
      selectedTrackId: track.id,
      countdown: 0,
    })
    expect(racers).toHaveLength(4)
    expect(window.__racingVisualCapture).toMatchObject({
      trackId: track.id,
      view: 'race',
      cameraMode: 'chase',
      targetSpeed: 120,
      status: 'playing',
    })
    expect(window.__racingVisualCapture).toMatchObject({
      centerlineDistance: expect.any(Number),
      lateralOffset: expect.any(Number),
      headingError: expect.any(Number),
    })
    expect(Number.isFinite(window.__racingVisualCapture.centerlineDistance)).toBe(true)
    expect(Number.isFinite(window.__racingVisualCapture.lateralOffset)).toBe(true)
    expect(Number.isFinite(window.__racingVisualCapture.headingError)).toBe(true)

    view.unmount()
    expect(window.__racingVisualCapture).toBeUndefined()
  })
})
