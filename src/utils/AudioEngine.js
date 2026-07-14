export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.isPlaying = false;
    this.volume = 0.1;
  }

  setVolume(percent) {
    if (!Number.isFinite(percent)) return;
    this.volume = Math.max(0, Math.min(100, percent)) / 500;
    if (this.isPlaying && this.ctx && this.engineGain) {
      this.engineGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
  }

  init() {
    if (!this.ctx) {
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        this.ctx = new AudioContextClass();
        
        this.engineOsc = this.ctx.createOscillator();
        this.engineOsc.type = 'sawtooth';
        
        this.engineFilter = this.ctx.createBiquadFilter();
        this.engineFilter.type = 'lowpass';
        this.engineFilter.frequency.value = 1000;
        
        this.engineGain = this.ctx.createGain();
        this.engineGain.gain.value = 0;
        
        this.engineOsc.connect(this.engineFilter);
        this.engineFilter.connect(this.engineGain);
        this.engineGain.connect(this.ctx.destination);
        
        this.engineOsc.start();
      } catch (e) {
        console.warn('AudioContext not supported or blocked:', e);
        this.ctx = null;
      }
    }
  }

  start() {
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(e => console.warn('AudioContext resume failed:', e));
    }
    this.isPlaying = true;
    this.engineGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.1);
  }

  stop() {
    if (!this.ctx) return;
    this.isPlaying = false;
    this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
  }

  updateEngine(rpm) {
    if (!this.isPlaying || !this.ctx) return;

    if (!Number.isFinite(rpm)) return;

    const safeRpm = Math.min(8000, Math.max(0, rpm));
    
    // Map RPM to frequency
    const baseFreq = 50;
    const freq = baseFreq + (safeRpm / 8000) * 150;
    
    this.engineOsc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.05);
    this.engineFilter.frequency.setTargetAtTime(300 + safeRpm * 0.5, this.ctx.currentTime, 0.05);
  }
}

export const audioEngine = new AudioEngine();
