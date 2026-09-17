import { describe, expect, it } from 'vitest'
import { TRACK_PRESETS } from '../utils/trackData'
import { calculateShadowRigPose, SHADOW_SETTINGS } from './RaceLighting'

describe('RaceLighting shadow rig', () => {
  it('snaps the focus to shadow texels while preserving the sun vector', () => {
    const preset = SHADOW_SETTINGS
    const result = calculateShadowRigPose(
      { x: 13.147, y: 1.25, z: -7.211 },
      [-90, 150, -40],
      { x: 0, y: 0, z: 0 },
    )

    expect(result.targetX / preset.texelSize).toBeCloseTo(Math.round(13.147 / preset.texelSize))
    expect(result.targetZ / preset.texelSize).toBeCloseTo(Math.round(-7.211 / preset.texelSize))
    expect(result.lightX - result.targetX).toBe(-90)
    expect(result.lightY - result.targetY).toBe(150)
    expect(result.lightZ - result.targetZ).toBe(-40)
  })

  it('reuses the caller target and falls back from invalid live positions', () => {
    const target = {}
    const preset = SHADOW_SETTINGS
    const result = calculateShadowRigPose(
      { x: Number.NaN, y: undefined, z: Infinity },
      [-80, 120, -60],
      { x: 8, y: 0.75, z: -4 },
      target,
    )

    expect(result).toBe(target)
    expect(result.targetY).toBe(0.75)
    expect(result.targetX).toBeCloseTo(Math.round(8 / preset.texelSize) * preset.texelSize)
    expect(result.targetZ).toBeCloseTo(Math.round(-4 / preset.texelSize) * preset.texelSize)
  })

  it('preserves every track lighting preset when the rig follows the player', () => {
    for (const track of TRACK_PRESETS) {
      const result = calculateShadowRigPose(
        { x: track.bounds.centerX, y: 0, z: track.bounds.centerZ },
        track.environment.sunPosition,
        { x: 0, y: 0, z: 0 },
      )
      expect([
        result.lightX - result.targetX,
        result.lightY - result.targetY,
        result.lightZ - result.targetZ,
      ]).toEqual(track.environment.sunPosition)
    }
  })
})
