import { describe, expect, it } from 'vitest'
import { calculateChaseCameraFraming, calculateChaseCameraLens } from './Car'
import {
  HARBOUR_TUNNEL_ROOF_UNDERSIDE,
  ROAD_TOP_OFFSET,
} from './trackGeometry'
import { VEHICLE_DYNAMICS } from '../utils/vehicleDynamics'

describe('chase camera framing', () => {
  it('keeps the existing distance and height on desktop viewports', () => {
    expect(calculateChaseCameraFraming(0, 16 / 9)).toEqual({
      distance: 6,
      height: 2.5,
    })
    expect(calculateChaseCameraFraming(100, 1)).toEqual({
      distance: 7.5,
      height: 3,
    })
  })

  it('widens and raises the chase view on a 390x844 portrait viewport', () => {
    const desktop = calculateChaseCameraFraming(0, 16 / 9)
    const portraitAspect = 390 / 844
    const portrait = calculateChaseCameraFraming(0, portraitAspect)

    expect(portrait.distance).toBeCloseTo(desktop.distance / portraitAspect)
    expect(portrait.height).toBeGreaterThan(desktop.height)
    expect(portrait.distance * portraitAspect).toBeCloseTo(desktop.distance)
  })

  it('caps compensation for extremely narrow or invalid aspects', () => {
    expect(calculateChaseCameraFraming(0, 0.1).distance).toBe(13.5)
    expect(calculateChaseCameraFraming(0, Number.NaN)).toEqual({
      distance: 6,
      height: 2.5,
    })
  })

  it('keeps the maximum portrait chase camera below the Monaco tunnel roof', () => {
    const portrait = calculateChaseCameraFraming(
      VEHICLE_DYNAMICS.nominalTopSpeed * 3.6,
      390 / 844,
    )
    const cameraWorldY = ROAD_TOP_OFFSET + portrait.height

    expect(cameraWorldY).toBeLessThan(HARBOUR_TUNNEL_ROOF_UNDERSIDE - 0.25)
  })

  it('adds bounded speed FOV and look-ahead while protecting portrait framing', () => {
    const stopped = calculateChaseCameraLens(0, 16 / 9)
    const fastDesktop = calculateChaseCameraLens(220, 16 / 9)
    const fastPortrait = calculateChaseCameraLens(220, 390 / 844)

    expect(stopped).toEqual({ fov: 58, lookAhead: 10 })
    expect(fastDesktop).toEqual({ fov: 68, lookAhead: 15 })
    expect(fastPortrait).toEqual({ fov: 63, lookAhead: 15 })
    expect(calculateChaseCameraLens(110, 16 / 9).fov).toBeGreaterThan(stopped.fov)
    expect(calculateChaseCameraLens(500, 16 / 9).fov).toBe(fastDesktop.fov)
  })

  it('disables dynamic lens motion for reduced-motion users', () => {
    expect(calculateChaseCameraLens(220, 16 / 9, true)).toEqual({
      fov: 58,
      lookAhead: 10,
    })
  })
})
