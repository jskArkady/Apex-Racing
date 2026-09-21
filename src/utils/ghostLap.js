export const MAX_GHOST_SAMPLES = 18000

export function validGhostSamples(samples, duration) {
  return Array.isArray(samples) && samples.length >= 2 && samples.length <= MAX_GHOST_SAMPLES
    && samples[0]?.[0] === 0 && samples.at(-1)?.[0] === duration
    && samples.every((sample, i) => Array.isArray(sample) && sample.length === 8
      && sample.every(Number.isFinite)
      && sample[0] >= 0 && sample[0] <= duration
      && (i === 0 || sample[0] > samples[i - 1][0])
      && sample.slice(1, 4).every(value => Math.abs(value) < 100000)
      && Math.abs(Math.hypot(...sample.slice(4)) - 1) < 0.02)
}

export class GhostRecorder {
  reset(session, position, rotation) {
    this.session = session
    this.samples = []
    this.latest = null
    this.valid = true
    if (position && rotation) this.record(session, 0, position, rotation)
  }

  invalidate(session) {
    if (session === this.session) this.valid = false
  }

  record(session, time, p, q) {
    if (session !== this.session || !Number.isFinite(time)) return
    this.latest = [time, p.x, p.y, p.z, q.x, q.y, q.z, q.w]
    if (!this.valid) return
    const last = this.samples.at(-1)
    if (last && time - last[0] < 0.1) return
    if (this.samples.length >= MAX_GHOST_SAMPLES - 1) { this.valid = false; return }
    this.samples.push(this.latest)
  }

  complete(session, time) {
    if (session !== this.session) return null
    if (this.valid && this.latest && this.latest[0] === time
      && this.samples.at(-1)?.[0] !== time) this.samples.push(this.latest)
    const result = this.valid && validGhostSamples(this.samples, time) ? this.samples : null
    const latest = this.latest
    this.reset(session)
    if (latest) {
      this.latest = [0, ...latest.slice(1)]
      this.samples.push(this.latest)
    }
    return result
  }
}

// Binary search avoids scanning a full lap each frame. Rotation interpolation
// is handled by Three's quaternion slerp in the renderer.
export function ghostInterval(samples, time) {
  if (!samples?.length || !Number.isFinite(time) || time < 0 || time > samples.at(-1)[0]) return null
  let low = 0
  let high = samples.length - 1
  while (high - low > 1) {
    const middle = (low + high) >> 1
    if (samples[middle][0] <= time) low = middle
    else high = middle
  }
  const left = samples[low]
  const right = samples[high]
  return { left, right, alpha: (time - left[0]) / (right[0] - left[0] || 1) }
}

export const ghostRecorder = new GhostRecorder()
