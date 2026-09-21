import { validGhostSamples } from './ghostLap'
import { isTrackId } from './trackData'

export const LAP_RECORDS_KEY = 'apex-racing:lap-records:v1'

export function loadLapRecords() {
  try {
    const value = JSON.parse(window.localStorage.getItem(LAP_RECORDS_KEY) ?? '{}')
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
    return Object.fromEntries(Object.entries(value).filter(([id, record]) => (
      isTrackId(id) && Number.isFinite(record?.time) && record.time > 0
      && record.time < 86400 && Array.isArray(record.splits)
      && record.splits.length === 3
      && record.splits.every((time, index) => Number.isFinite(time)
        && time > (record.splits[index - 1] ?? 0) && time <= record.time)
      && record.splits[2] === record.time
    )).map(([id, record]) => [id, {
      time: record.time, splits: record.splits,
      samples: validGhostSamples(record.samples, record.time) ? record.samples : null,
    }]))
  } catch {
    return {}
  }
}

export function saveLapRecords(records) {
  try {
    window.localStorage.setItem(LAP_RECORDS_KEY, JSON.stringify(records))
  } catch {
    // A full or disabled storage must not interrupt a race.
  }
}

export function getSectorIndex(checkpoint, count) {
  if (checkpoint === 0) return 2
  if (checkpoint === Math.ceil(count / 3)) return 0
  if (checkpoint === Math.ceil(count * 2 / 3)) return 1
  return -1
}

// Called only after the existing ordered checkpoint validator accepts a pass.
export function recordSector(state, checkpoint) {
  const index = getSectorIndex(checkpoint, state.totalCheckpoints)
  if (index < 0) return {}
  const splits = [...state.currentSplits]
  splits[index] = state.currentTime
  const reference = state.lapRecords[state.selectedTrackId]
  const comparable = reference?.time === state.bestLapTime
  const referenceTime = comparable ? reference.splits[index] : null
  return {
    currentSplits: checkpoint === 0 ? [] : splits,
    lastLapSplits: checkpoint === 0 ? splits : state.lastLapSplits,
    lastSector: index + 1,
    sectorTime: state.currentTime - (splits[index - 1] ?? 0),
    sectorDelta: Number.isFinite(referenceTime) ? state.currentTime - referenceTime : null,
  }
}

export function formatDelta(delta) {
  return Number.isFinite(delta) ? `${delta > 0 ? '+' : ''}${delta.toFixed(3)} s` : 'NO REFERENCE'
}
