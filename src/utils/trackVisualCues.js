const freezeCues = cues => Object.freeze(
  cues.map(cue => Object.freeze(cue)),
)

export const TRACK_VISUAL_CUES = Object.freeze({
  apex_gp: freezeCues([
    { key: 'pit', label: 'Floodlit main straight', type: 'speed', progress: 0.03, captureProgress: 0.015, lateral: -18, targetHeight: 4 },
    // Visual-cue lateral values use the preview/camera right-vector convention,
    // which is the inverse of trackGeometry's local side vector.
    { key: 'tower', label: 'Sakhir tower', type: 'city', progress: 0.53, captureProgress: 0.505, lateral: 36, targetHeight: 14 },
    { key: 'turn-one', label: 'Turn 1 braking zone', type: 'chicane', progress: 0.16, captureProgress: 0.14, lateral: 0, targetHeight: 1 },
    { key: 'switchbacks', label: 'Turns 5-7 switchbacks', type: 'chicane', progress: 0.34, captureProgress: 0.32, lateral: 0, targetHeight: 1 },
    { key: 'turn-eight', label: 'Turn 8 hairpin', type: 'hairpin', progress: 0.428, captureProgress: 0.41, lateral: 0, targetHeight: 1 },
  ]),
  harbour_street: freezeCues([
    { key: 'casino', label: 'Casino city', type: 'city', progress: 0.175, captureProgress: 0.125, lateral: -18, targetHeight: 16 },
    { key: 'hairpin', label: 'Tight Grand Hotel hairpin', type: 'hairpin', progress: 0.234, captureProgress: 0.215, lateral: 0, targetHeight: 1 },
    // Keep the portrait landmark composition wide enough to retain the car
    // while still looking through the illuminated tunnel bend.
    { key: 'tunnel', label: 'Monaco tunnel', type: 'tunnel', progress: 0.495, captureProgress: 0.48, lateral: 0, targetHeight: 3.2 },
    { key: 'harbour', label: 'Harbour waterfront', type: 'water', progress: 0.83469, captureProgress: 0.805, lateral: -29.2658, targetHeight: 0.5, cameraHeight: 5.5 },
    { key: 'yachts', label: 'Yacht harbour', type: 'water', progress: 0.833475, captureProgress: 0.81, lateral: -46.6937, targetHeight: 3.2, cameraHeight: 5.5 },
  ]),
  temple_speedway: freezeCues([
    { key: 'rettifilo', label: 'Long straight to Rettifilo', type: 'chicane', progress: 0.18, captureProgress: 0.16, lateral: 0, targetHeight: 1 },
    { key: 'lesmo', label: 'Forest and Lesmo pair', type: 'forest', progress: 0.42, captureProgress: 0.39, lateral: 0, targetHeight: 1 },
    { key: 'banking', label: 'Old banking flyover', type: 'banking', progress: 0.665, captureProgress: 0.615, lateral: 22, targetHeight: 7 },
    { key: 'ascari', label: 'Ascari complex', type: 'chicane', progress: 0.695, captureProgress: 0.675, lateral: 0, targetHeight: 1 },
    { key: 'parabolica', label: 'Parabolica', type: 'speed', progress: 0.91, captureProgress: 0.885, lateral: 0, targetHeight: 1 },
  ]),
})

export function getTrackVisualCues(trackId) {
  return TRACK_VISUAL_CUES[trackId] ?? Object.freeze([])
}

export function getTrackVisualCue(trackId, cueKey) {
  return getTrackVisualCues(trackId).find(cue => cue.key === cueKey) ?? null
}
