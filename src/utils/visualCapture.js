import { getTrackPreset, isTrackId, START_FINISH_PROGRESS } from './trackData'
import { getTrackVisualCue } from './trackVisualCues'

const GANTRY_CAPTURE_DISTANCE = 28
const APEX_MEDIA_GANTRY_PROGRESS = 0.245

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
