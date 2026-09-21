import { afterEach, describe, expect, it, vi } from 'vitest'
import { AudioEngine } from './AudioEngine'

const param = () => ({ value: 0, setTargetAtTime: vi.fn(), setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() })
const node = () => ({ connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn(), gain: param(), frequency: param() })

afterEach(() => vi.unstubAllGlobals())

describe('driving audio', () => {
  it('scales surface/slip audio, rate-limits impacts and silences effects on pause', () => {
    const sources = []
    vi.stubGlobal('AudioContext', class {
      state = 'running'
      currentTime = 1
      sampleRate = 100
      destination = {}
      createGain = node
      createOscillator = node
      createBiquadFilter = node
      createBuffer = () => ({ getChannelData: () => new Float32Array(100) })
      createBufferSource = () => { const source = node(); sources.push(source); return source }
    })
    const engine = new AudioEngine()
    engine.start()
    expect(sources).toHaveLength(2)
    engine.updateDriving(45, 0, false)
    expect(engine.roadGain.gain.setTargetAtTime).toHaveBeenLastCalledWith(0.18, 1, 0.08)
    engine.updateDriving(45, 9, true)
    expect(engine.roadGain.gain.setTargetAtTime).toHaveBeenLastCalledWith(0.55, 1, 0.08)
    expect(engine.skidGain.gain.setTargetAtTime).toHaveBeenLastCalledWith(0.28, 1, 0.04)
    engine.setVolume(0)
    expect(engine.fxMaster.gain.setTargetAtTime).toHaveBeenLastCalledWith(0, 1, 0.05)
    engine.playImpact(20)
    engine.playImpact(20)
    expect(sources).toHaveLength(3)
    engine.stop()
    expect(engine.roadGain.gain.setTargetAtTime).toHaveBeenLastCalledWith(0, 1, 0.03)
    expect(engine.skidGain.gain.setTargetAtTime).toHaveBeenLastCalledWith(0, 1, 0.03)
    expect(sources[2].stop).toHaveBeenCalledWith()
    sources[2].onended()
    expect(sources[2].disconnect).toHaveBeenCalled()
    engine.playImpact(20)
    expect(sources).toHaveLength(3)
  })
})
