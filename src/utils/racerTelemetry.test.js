import { expect, it } from 'vitest'
import { racerTelemetry } from './racerTelemetry'

it('clears both channels and exposes detached snapshots to browser diagnostics', () => {
  racerTelemetry.positions.player = { x: 1, z: 2 }
  racerTelemetry.progress.player = 0.5
  const snapshot = window.__RACING_TELEMETRY__
  racerTelemetry.positions.player.x = 3
  expect(snapshot.positions.player.x).toBe(1)
  expect(Object.isFrozen(snapshot.positions.player)).toBe(true)
  racerTelemetry.remove('player')
  expect(racerTelemetry.progress).toEqual({})
  expect(racerTelemetry.positions).toEqual({})
  racerTelemetry.positions.ai_1 = { x: 1 }
  racerTelemetry.reset()
  expect(window.__RACING_TELEMETRY__.positions).toEqual({})
})
