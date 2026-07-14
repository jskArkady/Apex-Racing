import { describe, expect, it } from 'vitest'
import { TRACK_PRESETS } from './trackData'
import { getTrackPreviewData } from './trackPreviewData'

describe('track preview data', () => {
  it('provides a compact set of centreline-only menu landmarks for every circuit', () => {
    for (const track of TRACK_PRESETS) {
      const preview = getTrackPreviewData(track.id)

      expect(preview.code).toMatch(/^[A-Z]{3}$/)
      expect(preview.landmarks).toHaveLength(3)
      expect(preview.landmarks.map(landmark => landmark.shortLabel)).toEqual(['01', '02', '03'])

      for (const landmark of preview.landmarks) {
        expect(landmark.progress).toBeGreaterThanOrEqual(0)
        expect(landmark.progress).toBeLessThan(1)
        expect(landmark.label).not.toHaveLength(0)
        expect(landmark).not.toHaveProperty('lateral')
        expect(landmark).not.toHaveProperty('captureProgress')
      }
    }
  })

  it('returns immutable empty metadata for an unknown circuit', () => {
    const preview = getTrackPreviewData('unknown')

    expect(preview).toEqual({ code: 'CIR', landmarks: [] })
    expect(Object.isFrozen(preview)).toBe(true)
    expect(Object.isFrozen(preview.landmarks)).toBe(true)
  })
})
