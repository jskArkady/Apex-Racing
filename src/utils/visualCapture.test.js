import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { START_FINISH_PROGRESS, TRACK_PRESETS } from './trackData'
import { getTrackVisualCues } from './trackVisualCues'
import { parseVisualCaptureRequest } from './visualCapture'

describe('development visual capture requests', () => {
  it('maps every whitelisted track cue to a finite deterministic progress', () => {
    for (const track of TRACK_PRESETS) {
      const cues = getTrackVisualCues(track.id)
      expect(cues).toHaveLength(5)
      expect(new Set(cues.map(cue => cue.key)).size).toBe(cues.length)

      for (const cue of cues) {
        expect(cue.captureProgress).toBeGreaterThanOrEqual(0)
        expect(cue.captureProgress).toBeLessThan(1)
        expect(parseVisualCaptureRequest(
          `?visualCapture=1&track=${track.id}&view=${cue.key}`,
        )).toEqual({
          trackId: track.id,
          view: cue.key,
          captureProgress: cue.captureProgress,
          targetProgress: cue.progress,
          targetLateral: cue.lateral ?? 0,
          targetHeight: cue.targetHeight ?? 1,
          ...(Number.isFinite(cue.cameraHeight) ? { cameraHeight: cue.cameraHeight } : {}),
        })
      }
    }
  })

  it('supports the shared start line and rejects disabled or unknown requests', () => {
    expect(parseVisualCaptureRequest('?visualCapture=1&track=apex_gp&view=race')).toEqual({
      trackId: 'apex_gp',
      view: 'race',
      cameraMode: 'chase',
      gameMode: 'single',
      targetSpeed: 120,
    })
    expect(parseVisualCaptureRequest('?visualCapture=1&track=apex_gp&view=start')).toEqual({
      trackId: 'apex_gp',
      view: 'start',
      captureProgress: START_FINISH_PROGRESS,
      targetProgress: 0.015,
      targetLateral: 0,
      targetHeight: 1,
    })
    for (const track of TRACK_PRESETS) {
      const request = parseVisualCaptureRequest(
        `?visualCapture=1&track=${track.id}&view=gantry`,
      )
      expect(request).toEqual({
        trackId: track.id,
        view: 'gantry',
        captureProgress: expect.any(Number),
        targetProgress: START_FINISH_PROGRESS,
        targetLateral: 0,
        targetHeight: 5.8,
      })
      expect(request.captureProgress).toBeGreaterThan(0.9)
      expect(request.captureProgress).toBeLessThan(1)
    }
    expect(parseVisualCaptureRequest('?visualCapture=1&track=unknown&view=start')).toBeNull()
    expect(parseVisualCaptureRequest('?visualCapture=1&track=apex_gp&view=unknown')).toBeNull()
    expect(parseVisualCaptureRequest('?visualCapture=0&track=apex_gp&view=start')).toBeNull()
    expect(parseVisualCaptureRequest('?visualCapture=1&track=apex_gp&view=start', false)).toBeNull()
  })

  it('anchors the Monaco hairpin cue to the actual high-curvature turn', () => {
    const harbour = TRACK_PRESETS.find(track => track.id === 'harbour_street')
    const cue = getTrackVisualCues(harbour.id).find(candidate => candidate.key === 'hairpin')
    const before = harbour.curve.getTangentAt(cue.progress - 0.008).setY(0).normalize()
    const after = harbour.curve.getTangentAt(cue.progress + 0.008).setY(0).normalize()

    expect(cue.captureProgress).toBeLessThan(cue.progress)
    expect(THREE.MathUtils.radToDeg(before.angleTo(after))).toBeGreaterThan(45)
  })

  it('targets the physical harbour water, a yacht, and the active Ascari bends', () => {
    const harbour = TRACK_PRESETS.find(track => track.id === 'harbour_street')
    const harbourCues = getTrackVisualCues(harbour.id)
    const getCuePoint = cue => {
      const point = harbour.curve.getPointAt(cue.progress)
      const tangent = harbour.curve.getTangentAt(cue.progress).setY(0).normalize()
      return point.add(new THREE.Vector3(-tangent.z, 0, tangent.x).multiplyScalar(cue.lateral))
    }
    const waterTarget = getCuePoint(harbourCues.find(cue => cue.key === 'harbour'))
    const yachtTarget = getCuePoint(harbourCues.find(cue => cue.key === 'yachts'))

    expect(waterTarget.x).toBeGreaterThanOrEqual(-130)
    expect(waterTarget.x).toBeLessThanOrEqual(170)
    expect(waterTarget.z).toBeGreaterThanOrEqual(83)
    expect(waterTarget.z).toBeLessThanOrEqual(159)
    expect(yachtTarget.distanceTo(new THREE.Vector3(-112, 0, 102))).toBeLessThan(1)

    const temple = TRACK_PRESETS.find(track => track.id === 'temple_speedway')
    const ascari = getTrackVisualCues(temple.id).find(cue => cue.key === 'ascari')
    const before = temple.curve.getTangentAt(ascari.progress - 0.008).setY(0).normalize()
    const after = temple.curve.getTangentAt(ascari.progress + 0.008).setY(0).normalize()
    expect(THREE.MathUtils.radToDeg(before.angleTo(after))).toBeGreaterThan(10)
  })

  it('targets the actual Sakhir tower and Monaco apartment anchors', () => {
    const getCuePoint = (track, cue) => {
      const point = track.curve.getPointAt(cue.progress)
      const tangent = track.curve.getTangentAt(cue.progress).setY(0).normalize()
      return point.add(new THREE.Vector3(-tangent.z, 0, tangent.x).multiplyScalar(cue.lateral))
    }
    const getSceneryPoint = (track, progress, lateral) => {
      const point = track.curve.getPointAt(progress)
      const tangent = track.curve.getTangentAt(progress).setY(0).normalize()
      return point.add(new THREE.Vector3(tangent.z, 0, -tangent.x).multiplyScalar(lateral))
    }

    const apex = TRACK_PRESETS.find(track => track.id === 'apex_gp')
    const tower = getTrackVisualCues(apex.id).find(cue => cue.key === 'tower')
    expect(getCuePoint(apex, tower).distanceTo(getSceneryPoint(apex, 0.53, -36))).toBeLessThan(0.01)

    const harbour = TRACK_PRESETS.find(track => track.id === 'harbour_street')
    const casino = getTrackVisualCues(harbour.id).find(cue => cue.key === 'casino')
    expect(getCuePoint(harbour, casino).distanceTo(getSceneryPoint(harbour, 0.175, 18))).toBeLessThan(0.01)
  })
})
