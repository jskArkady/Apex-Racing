const freezeLandmarks = landmarks => Object.freeze(
  landmarks.map(landmark => Object.freeze(landmark)),
)

const createPreviewPreset = (code, landmarks) => Object.freeze({
  code,
  landmarks: freezeLandmarks(landmarks),
})

// Menu landmarks deliberately describe positions on the circuit centreline.
// Scene/camera cues live in trackVisualCues and can sit far outside the road;
// reusing them here made the circuit map look like it contained random dots.
export const TRACK_PREVIEW_DATA = Object.freeze({
  apex_gp: createPreviewPreset('APX', [
    { progress: 0.16, shortLabel: '01', label: 'Opening braking zone' },
    { progress: 0.34, shortLabel: '02', label: 'Switchback complex' },
    { progress: 0.428, shortLabel: '03', label: 'Late hairpin' },
  ]),
  harbour_street: createPreviewPreset('HBR', [
    { progress: 0.175, shortLabel: '01', label: 'Casino climb' },
    { progress: 0.234, shortLabel: '02', label: 'Grand Hotel hairpin' },
    { progress: 0.5, shortLabel: '03', label: 'Tunnel sector' },
  ]),
  temple_speedway: createPreviewPreset('TMP', [
    { progress: 0.18, shortLabel: '01', label: 'Rettifilo braking' },
    { progress: 0.42, shortLabel: '02', label: 'Lesmo pair' },
    { progress: 0.695, shortLabel: '03', label: 'Ascari complex' },
  ]),
})

const EMPTY_PREVIEW_DATA = createPreviewPreset('CIR', [])

export function getTrackPreviewData(trackId) {
  return TRACK_PREVIEW_DATA[trackId] ?? EMPTY_PREVIEW_DATA
}
