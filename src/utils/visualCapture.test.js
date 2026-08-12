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
    for (const [trackId, captureProgress] of [
      ['apex_gp', 0.135],
      ['harbour_street', 0.59],
      ['temple_speedway', 0.695],
    ]) {
      expect(parseVisualCaptureRequest(
        `?visualCapture=1&track=${trackId}&view=kerb-chase`,
      )).toEqual({
        trackId,
        view: 'kerb-chase',
        cameraMode: 'chase',
        captureProgress,
      })
    }
    for (const [trackId, captureProgress] of [
      ['apex_gp', 0.13],
      ['temple_speedway', 0.18],
    ]) {
      expect(parseVisualCaptureRequest(
        `?visualCapture=1&track=${trackId}&view=gravel-chase`,
      )).toEqual({
        trackId,
        view: 'gravel-chase',
        cameraMode: 'chase',
        captureProgress,
        cameraHeight: 3.6,
      })
    }
    expect(parseVisualCaptureRequest(
      '?visualCapture=1&track=harbour_street&view=gravel-chase',
    )).toBeNull()
    expect(parseVisualCaptureRequest(
      '?visualCapture=1&track=apex_gp&view=pit-runoff-chase',
    )).toEqual({
      trackId: 'apex_gp',
      view: 'pit-runoff-chase',
      cameraMode: 'chase',
      captureProgress: 0.99,
      cameraHeight: 3.6,
    })
    expect(parseVisualCaptureRequest(
      '?visualCapture=1&track=harbour_street&view=pit-runoff-chase',
    )).toBeNull()
    expect(parseVisualCaptureRequest(
      '?visualCapture=1&track=temple_speedway&view=timing-tower-cap-chase',
    )).toEqual({
      trackId: 'temple_speedway',
      view: 'timing-tower-cap-chase',
      cameraMode: 'chase',
      captureProgress: 0.97,
      cameraHeight: 3.6,
    })
    expect(parseVisualCaptureRequest(
      '?visualCapture=1&track=apex_gp&view=timing-tower-cap-chase',
    )).toBeNull()
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
    const mediaGantryRequest = parseVisualCaptureRequest(
      '?visualCapture=1&track=apex_gp&view=media-gantry',
    )
    expect(mediaGantryRequest).toEqual({
      trackId: 'apex_gp',
      view: 'media-gantry',
      captureProgress: expect.any(Number),
      targetProgress: 0.245,
      targetLateral: 0,
      targetHeight: 4.6,
    })
    expect(mediaGantryRequest.captureProgress).toBeCloseTo(0.2287227742109316, 12)
    expect(parseVisualCaptureRequest(
      '?visualCapture=1&track=harbour_street&view=media-gantry',
    )).toBeNull()
    expect(parseVisualCaptureRequest(
      '?visualCapture=1&track=harbour_street&view=yacht-chase',
    )).toEqual({
      trackId: 'harbour_street',
      view: 'yacht-chase',
      cameraMode: 'chase',
      captureProgress: 0.79,
    })
    expect(parseVisualCaptureRequest(
      '?visualCapture=1&track=apex_gp&view=yacht-chase',
    )).toBeNull()
    expect(parseVisualCaptureRequest(
      '?visualCapture=1&track=harbour_street&view=apartment-chase',
    )).toEqual({
      trackId: 'harbour_street',
      view: 'apartment-chase',
      cameraMode: 'chase',
      captureProgress: 0.125,
      cameraHeight: 3.6,
    })
    expect(parseVisualCaptureRequest(
      '?visualCapture=1&track=apex_gp&view=apartment-chase',
    )).toBeNull()
    expect(parseVisualCaptureRequest(
      '?visualCapture=1&track=harbour_street&view=tunnel-chase',
    )).toEqual({
      trackId: 'harbour_street',
      view: 'tunnel-chase',
      cameraMode: 'chase',
      captureProgress: 0.47,
    })
    expect(parseVisualCaptureRequest(
      '?visualCapture=1&track=temple_speedway&view=tunnel-chase',
    )).toBeNull()
    expect(parseVisualCaptureRequest(
      '?visualCapture=1&track=harbour_street&view=hairpin-chase',
    )).toEqual({
      trackId: 'harbour_street',
      view: 'hairpin-chase',
      cameraMode: 'chase',
      captureProgress: 0.215,
      cameraHeight: 3.6,
    })
    expect(parseVisualCaptureRequest(
      '?visualCapture=1&track=apex_gp&view=hairpin-chase',
    )).toBeNull()
    expect(parseVisualCaptureRequest(
      '?visualCapture=1&track=apex_gp&view=palm-trunk-detail',
    )).toEqual({
      trackId: 'apex_gp',
      view: 'palm-trunk-detail',
      captureProgress: 0.02,
      targetProgress: 0.04,
      targetLateral: 31,
      targetHeight: 2.5,
      cameraHeight: 5.5,
    })
    expect(parseVisualCaptureRequest(
      '?visualCapture=1&track=harbour_street&view=palm-trunk-detail',
    )).toEqual({
      trackId: 'harbour_street',
      view: 'palm-trunk-detail',
      captureProgress: 0.225,
      targetProgress: 0.234,
      targetLateral: -9,
      targetHeight: 3.4,
      cameraHeight: 5.5,
    })
    expect(parseVisualCaptureRequest(
      '?visualCapture=1&track=temple_speedway&view=palm-trunk-detail',
    )).toBeNull()
    expect(parseVisualCaptureRequest(
      '?visualCapture=1&track=apex_gp&view=tower-chase',
    )).toEqual({
      trackId: 'apex_gp',
      view: 'tower-chase',
      cameraMode: 'chase',
      captureProgress: 0.4375,
    })
    expect(parseVisualCaptureRequest(
      '?visualCapture=1&track=apex_gp&view=timing-mast-chase',
    )).toEqual({
      trackId: 'apex_gp',
      view: 'timing-mast-chase',
      cameraMode: 'chase',
      captureProgress: 0.665,
      cameraHeight: 3.6,
    })
    expect(parseVisualCaptureRequest(
      '?visualCapture=1&track=harbour_street&view=timing-mast-chase',
    )).toBeNull()
    expect(parseVisualCaptureRequest(
      '?visualCapture=1&track=apex_gp&view=floodlight-chase',
    )).toEqual({
      trackId: 'apex_gp',
      view: 'floodlight-chase',
      cameraMode: 'chase',
      captureProgress: 0.145,
      cameraHeight: 3.6,
    })
    expect(parseVisualCaptureRequest(
      '?visualCapture=1&track=harbour_street&view=floodlight-chase',
    )).toBeNull()
    for (const [trackId, captureProgress] of [
      ['apex_gp', 0.105],
      ['harbour_street', 0.19],
      ['temple_speedway', 0.16],
    ]) {
      expect(parseVisualCaptureRequest(
        `?visualCapture=1&track=${trackId}&view=braking-board-chase`,
      )).toEqual({
        trackId,
        view: 'braking-board-chase',
        cameraMode: 'chase',
        captureProgress,
        cameraHeight: 3.6,
      })
    }
    for (const [trackId, captureProgress] of [
      ['apex_gp', 0.99],
      ['harbour_street', 0.62],
      ['temple_speedway', 0.17],
    ]) {
      expect(parseVisualCaptureRequest(
        `?visualCapture=1&track=${trackId}&view=grandstand-chase`,
      )).toEqual({
        trackId,
        view: 'grandstand-chase',
        cameraMode: 'chase',
        captureProgress,
        cameraHeight: 3.6,
      })
    }
    for (const track of TRACK_PRESETS) {
      expect(parseVisualCaptureRequest(
        `?visualCapture=1&track=${track.id}&view=start-signal-chase`,
      )).toEqual({
        trackId: track.id,
        view: 'start-signal-chase',
        cameraMode: 'chase',
        captureProgress: 0.985,
        cameraHeight: 3.6,
      })
    }
    expect(parseVisualCaptureRequest(
      '?visualCapture=1&track=apex_gp&view=marshal-post-chase',
    )).toEqual({
      trackId: 'apex_gp',
      view: 'marshal-post-chase',
      cameraMode: 'chase',
      captureProgress: 0.105,
      cameraHeight: 3.6,
    })
    expect(parseVisualCaptureRequest(
      '?visualCapture=1&track=temple_speedway&view=marshal-post-chase',
    )).toBeNull()
    for (const track of TRACK_PRESETS) {
      expect(parseVisualCaptureRequest(
        `?visualCapture=1&track=${track.id}&view=broadcast-chase`,
      )).toEqual({
        trackId: track.id,
        view: 'broadcast-chase',
        cameraMode: 'chase',
        captureProgress: 0.055,
        cameraHeight: 3.6,
      })
    }
    expect(parseVisualCaptureRequest(
      '?visualCapture=1&track=apex_gp&view=hospitality-chase',
    )).toEqual({
      trackId: 'apex_gp',
      view: 'hospitality-chase',
      cameraMode: 'chase',
      captureProgress: 0.095,
      cameraHeight: 3.6,
    })
    expect(parseVisualCaptureRequest(
      '?visualCapture=1&track=harbour_street&view=tower-chase',
    )).toBeNull()
    expect(parseVisualCaptureRequest(
      '?visualCapture=1&track=temple_speedway&view=hospitality-chase',
    )).toBeNull()
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
