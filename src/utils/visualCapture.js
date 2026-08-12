import { getTrackPreset, isTrackId, START_FINISH_PROGRESS } from './trackData'
import { getTrackVisualCue } from './trackVisualCues'

const GANTRY_CAPTURE_DISTANCE = 28
const APEX_MEDIA_GANTRY_PROGRESS = 0.245
const APEX_TOWER_CHASE_PROGRESS = 0.4375
const APEX_HOSPITALITY_CHASE_PROGRESS = 0.095
const START_SIGNAL_CHASE_PROGRESS = 0.985
const KERB_CHASE_PROGRESS = Object.freeze({
  apex_gp: 0.135,
  harbour_street: 0.59,
  temple_speedway: 0.695,
})
const GRAVEL_CHASE_PROGRESS = Object.freeze({
  apex_gp: 0.13,
  temple_speedway: 0.18,
})
const GRANDSTAND_CHASE_PROGRESS = Object.freeze({
  apex_gp: 0.99,
  harbour_street: 0.62,
  temple_speedway: 0.17,
})
const PALM_TRUNK_DETAIL = Object.freeze({
  apex_gp: Object.freeze({
    captureProgress: 0.02,
    targetProgress: 0.04,
    targetLateral: 31,
    targetHeight: 2.5,
  }),
  harbour_street: Object.freeze({
    captureProgress: 0.225,
    targetProgress: 0.234,
    targetLateral: -9,
    targetHeight: 3.4,
  }),
})

export function parseVisualCaptureRequest(search, enabled = true) {
  if (!enabled || typeof search !== 'string') return null

  const params = new URLSearchParams(search)
  if (params.get('visualCapture') !== '1') return null

  const trackId = params.get('track')
  const view = params.get('view') ?? 'start'
  if (!isTrackId(trackId)) return null

  if (view === 'race') {
    return Object.freeze({
      trackId,
      view,
      cameraMode: 'chase',
      gameMode: 'single',
      targetSpeed: 120,
    })
  }

  if (view === 'kerb-chase') {
    return Object.freeze({
      trackId,
      view,
      cameraMode: 'chase',
      captureProgress: KERB_CHASE_PROGRESS[trackId],
    })
  }

  if (view === 'gravel-chase') {
    const captureProgress = GRAVEL_CHASE_PROGRESS[trackId]
    if (!Number.isFinite(captureProgress)) return null
    return Object.freeze({
      trackId,
      view,
      cameraMode: 'chase',
      captureProgress,
      cameraHeight: 3.6,
    })
  }

  if (view === 'grandstand-chase') {
    return Object.freeze({
      trackId,
      view,
      cameraMode: 'chase',
      captureProgress: GRANDSTAND_CHASE_PROGRESS[trackId],
      cameraHeight: 3.6,
    })
  }

  if (view === 'start-signal-chase') {
    return Object.freeze({
      trackId,
      view,
      cameraMode: 'chase',
      captureProgress: START_SIGNAL_CHASE_PROGRESS,
      cameraHeight: 3.6,
    })
  }

  if (view === 'pit-runoff-chase') {
    if (trackId !== 'apex_gp') return null
    return Object.freeze({
      trackId,
      view,
      cameraMode: 'chase',
      captureProgress: 0.99,
      cameraHeight: 3.6,
    })
  }

  if (view === 'timing-tower-cap-chase') {
    if (trackId !== 'temple_speedway') return null
    return Object.freeze({
      trackId,
      view,
      cameraMode: 'chase',
      captureProgress: 0.97,
      cameraHeight: 3.6,
    })
  }

  if (view === 'start') {
    return Object.freeze({
      trackId,
      view,
      captureProgress: START_FINISH_PROGRESS,
      targetProgress: 0.015,
      targetLateral: 0,
      targetHeight: 1,
    })
  }

  if (view === 'gantry') {
    const track = getTrackPreset(trackId)
    return Object.freeze({
      trackId,
      view,
      captureProgress: (
        (START_FINISH_PROGRESS - GANTRY_CAPTURE_DISTANCE / track.length) % 1 + 1
      ) % 1,
      targetProgress: START_FINISH_PROGRESS,
      targetLateral: 0,
      targetHeight: 5.8,
    })
  }

  if (view === 'media-gantry') {
    if (trackId !== 'apex_gp') return null
    const track = getTrackPreset(trackId)
    return Object.freeze({
      trackId,
      view,
      captureProgress: (
        (APEX_MEDIA_GANTRY_PROGRESS - GANTRY_CAPTURE_DISTANCE / track.length) % 1 + 1
      ) % 1,
      targetProgress: APEX_MEDIA_GANTRY_PROGRESS,
      targetLateral: 0,
      targetHeight: 4.6,
    })
  }

  if (view === 'yacht-chase') {
    if (trackId !== 'harbour_street') return null
    return Object.freeze({
      trackId,
      view,
      cameraMode: 'chase',
      captureProgress: 0.79,
    })
  }

  if (view === 'apartment-chase') {
    if (trackId !== 'harbour_street') return null
    return Object.freeze({
      trackId,
      view,
      cameraMode: 'chase',
      captureProgress: 0.125,
      cameraHeight: 3.6,
    })
  }

  if (view === 'tunnel-chase') {
    if (trackId !== 'harbour_street') return null
    return Object.freeze({
      trackId,
      view,
      cameraMode: 'chase',
      captureProgress: 0.47,
    })
  }

  if (view === 'hairpin-chase') {
    if (trackId !== 'harbour_street') return null
    return Object.freeze({
      trackId,
      view,
      cameraMode: 'chase',
      captureProgress: 0.215,
      cameraHeight: 3.6,
    })
  }

  if (view === 'palm-trunk-detail') {
    const detail = PALM_TRUNK_DETAIL[trackId]
    if (!detail) return null
    return Object.freeze({
      trackId,
      view,
      ...detail,
      cameraHeight: 5.5,
    })
  }

  if (view === 'tower-chase') {
    if (trackId !== 'apex_gp') return null
    return Object.freeze({
      trackId,
      view,
      cameraMode: 'chase',
      captureProgress: APEX_TOWER_CHASE_PROGRESS,
    })
  }

  if (view === 'timing-mast-chase') {
    if (trackId !== 'apex_gp') return null
    return Object.freeze({
      trackId,
      view,
      cameraMode: 'chase',
      captureProgress: 0.665,
      cameraHeight: 3.6,
    })
  }

  if (view === 'floodlight-chase') {
    if (trackId !== 'apex_gp') return null
    return Object.freeze({
      trackId,
      view,
      cameraMode: 'chase',
      captureProgress: 0.145,
      cameraHeight: 3.6,
    })
  }

  if (view === 'braking-board-chase') {
    const captureProgress = {
      apex_gp: 0.105,
      harbour_street: 0.19,
      temple_speedway: 0.16,
    }[trackId]
    if (!Number.isFinite(captureProgress)) return null
    return Object.freeze({
      trackId,
      view,
      cameraMode: 'chase',
      captureProgress,
      cameraHeight: 3.6,
    })
  }

  if (view === 'marshal-post-chase') {
    if (trackId !== 'apex_gp') return null
    return Object.freeze({
      trackId,
      view,
      cameraMode: 'chase',
      captureProgress: 0.105,
      cameraHeight: 3.6,
    })
  }

  if (view === 'broadcast-chase') {
    return Object.freeze({
      trackId,
      view,
      cameraMode: 'chase',
      captureProgress: 0.055,
      cameraHeight: 3.6,
    })
  }

  if (view === 'hospitality-chase') {
    if (trackId !== 'apex_gp') return null
    return Object.freeze({
      trackId,
      view,
      cameraMode: 'chase',
      captureProgress: APEX_HOSPITALITY_CHASE_PROGRESS,
      cameraHeight: 3.6,
    })
  }

  const cue = getTrackVisualCue(trackId, view)
  if (!cue) return null

  return Object.freeze({
    trackId,
    view,
    captureProgress: cue.captureProgress,
    targetProgress: cue.progress,
    targetLateral: cue.lateral ?? 0,
    targetHeight: cue.targetHeight ?? 1,
    ...(Number.isFinite(cue.cameraHeight) ? { cameraHeight: cue.cameraHeight } : {}),
  })
}
