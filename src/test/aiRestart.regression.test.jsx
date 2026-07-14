import React from 'react'
import { act, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Opponents from '../components/Opponents'
import { useGameStore } from '../store/gameStore'
import { activeBodies, triggerFrames } from './setup'
import { getStartGridPose } from '../utils/startGrid'
import { trackCurve } from '../utils/trackData'

const aiOnePose = getStartGridPose('ai_1', 'single')
const getAiOne = () => Array.from(activeBodies)
  .find(body => body.initialX === aiOnePose.position[0] && body.initialZ === aiOnePose.position[2])

describe('AI session reset', () => {
  beforeEach(() => {
    useGameStore.setState({ gameState: 'playing', gameMode: 'single' })
  })

  it('returns the physical AI body to its grid slot when a race restarts', () => {
    render(<Opponents />)
    const body = getAiOne()

    act(() => {
      body.setTranslation({ x: 140, y: 2, z: -80 })
      body.setLinvel({ x: 12, y: 3, z: -9 })
      useGameStore.getState().restartRace()
    })

    expect(body.translation()).toEqual({
      x: aiOnePose.position[0],
      y: aiOnePose.position[1],
      z: aiOnePose.position[2]
    })
    expect(body.linvel()).toEqual({ x: 0, y: 0, z: 0 })
  })

  it('resets the physical AI body when restart keeps the game in countdown', () => {
    act(() => useGameStore.setState({ gameState: 'countdown', countdown: 2 }))
    render(<Opponents />)
    const body = getAiOne()

    act(() => {
      body.setTranslation({ x: 140, y: 2, z: -80 })
      body.setLinvel({ x: 12, y: 3, z: -9 })
      useGameStore.getState().restartRace()
    })

    expect(body.translation()).toEqual({
      x: aiOnePose.position[0],
      y: aiOnePose.position[1],
      z: aiOnePose.position[2]
    })
    expect(body.linvel()).toEqual({ x: 0, y: 0, z: 0 })
  })

  it('removes its window bridge entries when opponents unmount', () => {
    const { unmount } = render(<Opponents />)
    window.racerPositions.ai_1 = { x: 1, z: 2 }
    window.racerProgress.ai_1 = 123

    unmount()

    expect(window.racerPositions.ai_1).toBeUndefined()
    expect(window.racerProgress.ai_1).toBeUndefined()
  })

  it('does not respawn an AI that is above a low-elevation road section', () => {
    const { unmount } = render(<Opponents />)
    const body = getAiOne()
    const originalGetPointAt = trackCurve.getPointAt.bind(trackCurve)
    const curveSpy = vi.spyOn(trackCurve, 'getPointAt').mockImplementation((progress, target) => {
      const point = originalGetPointAt(progress, target)
      point.y = -10
      return point
    })
    const translationSpy = vi.spyOn(body, 'setTranslation')

    act(() => {
      body.setTranslation({ x: body.translation().x, y: -6, z: body.translation().z })
      triggerFrames(1 / 60, 1)
    })

    expect(translationSpy).toHaveBeenCalledTimes(1)
    expect(body.translation().y).toBeGreaterThan(-10)

    curveSpy.mockRestore()
    unmount()
  })
})
