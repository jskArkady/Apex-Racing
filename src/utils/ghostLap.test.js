import { describe, expect, it } from 'vitest'
import { GhostRecorder, ghostInterval, validGhostSamples } from './ghostLap'
import { loadLapRecords, LAP_RECORDS_KEY } from './lapRecords'

const p = { x: 0, y: 1, z: 0 }
const q = { x: 0, y: 0, z: 0, w: 1 }

describe('ghost recordings', () => {
  it('samples at bounded frequency, includes the finish and restarts time for the next lap', () => {
    const recorder = new GhostRecorder()
    recorder.reset(1, p, q)
    recorder.record(1, 0.05, p, q)
    recorder.record(1, 0.2, { ...p, x: 2 }, q)
    recorder.record(1, 0.25, { ...p, x: 3 }, q)
    const samples = recorder.complete(1, 0.25)
    expect(samples.map(s => s[0])).toEqual([0, 0.2, 0.25])
    expect(ghostInterval(samples, 0.1).alpha).toBe(0.5)
    expect(ghostInterval(samples, 0.3)).toBeNull()
    expect(recorder.samples[0]).toEqual([0, 3, 1, 0, 0, 0, 0, 1])
  })

  it('rejects recovery laps and stale session callbacks', () => {
    const recorder = new GhostRecorder()
    recorder.reset(2, p, q)
    recorder.record(1, 5, p, q)
    expect(recorder.complete(1, 5)).toBeNull()
    recorder.invalidate(2)
    recorder.record(2, 1, { ...p, x: 80 }, q)
    expect(recorder.complete(2, 1)).toBeNull()
    expect(recorder.samples[0][1]).toBe(80)
    recorder.record(2, 1, p, q)
    expect(recorder.complete(2, 1)).not.toBeNull()
  })

  it('loads valid timing even if the persisted ghost is corrupt', () => {
    localStorage.setItem(LAP_RECORDS_KEY, JSON.stringify({
      apex_gp: { time: 30, splits: [10, 20, 30], samples: [null, null] },
    }))
    expect(loadLapRecords().apex_gp).toEqual({ time: 30, splits: [10, 20, 30], samples: null })
    expect(validGhostSamples([[0, 0, 0, 0, 0, 0, 0, 1], [1, 0, 0, 0, 0, 0, 0, 0]], 1)).toBe(false)
  })
})
