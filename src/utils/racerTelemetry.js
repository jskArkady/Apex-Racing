// Mutable, non-reactive samples owned by the active race. Controllers publish
// here; HUD and lighting sample without scheduling React work every frame.
export const racerTelemetry = {
  ghost: null,
  positions: {},
  progress: {},
  reset() {
    this.ghost = null
    this.positions = {}
    this.progress = {}
  },
  remove(id) {
    delete this.positions[id]
    delete this.progress[id]
  },
}

// Browser QA gets detached read-only snapshots, never the live mutable bridge.
if (typeof window !== 'undefined') {
  Object.defineProperty(window, '__RACING_TELEMETRY__', {
    configurable: true,
    get: () => Object.freeze({
      positions: Object.freeze(Object.fromEntries(Object.entries(racerTelemetry.positions)
        .map(([id, pose]) => [id, Object.freeze({ ...pose })]))),
      ghost: racerTelemetry.ghost ? Object.freeze({ ...racerTelemetry.ghost }) : null,
      progress: Object.freeze({ ...racerTelemetry.progress }),
    }),
  })
}
