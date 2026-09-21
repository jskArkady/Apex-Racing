export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.isPlaying = false;
    this.volume = 0.1;
    this.lastImpactTime = -Infinity;
    this.impacts = new Set();
  }

  setVolume(percent) {
    if (!Number.isFinite(percent)) return;
    this.volume = Math.max(0, Math.min(100, percent)) / 500;
    if (this.fxMaster) this.fxMaster.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
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
        this.initDrivingAudio();
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
    this.roadGain?.gain.setTargetAtTime(0, this.ctx.currentTime, 0.03);
    this.skidGain?.gain.setTargetAtTime(0, this.ctx.currentTime, 0.03);
    for (const impact of this.impacts) impact.stop();
    this.impacts.clear();
  }

  initDrivingAudio() {
    // Older/limited audio contexts can still provide the existing engine tone.
    if (!this.ctx.createBuffer || !this.ctx.createBufferSource) return;
    this.fxMaster = this.ctx.createGain();
    this.fxMaster.gain.value = this.volume;
    this.fxMaster.connect(this.ctx.destination);
    const noise = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
    const channel = noise.getChannelData(0);
    for (let i = 0; i < channel.length; i++) channel[i] = Math.random() * 2 - 1;
    this.noise = noise;
    for (const [name, frequency, type] of [['road', 180, 'lowpass'], ['skid', 1600, 'bandpass']]) {
      const source = this.ctx.createBufferSource();
      source.buffer = noise;
      source.loop = true;
      const filter = this.ctx.createBiquadFilter();
      filter.type = type;
      filter.frequency.value = frequency;
      const gain = this.ctx.createGain();
      gain.gain.value = 0;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.fxMaster);
      source.start();
      this[name + 'Gain'] = gain;
      this[name + 'Filter'] = filter;
    }
  }

  updateDriving(speed, lateralSpeed, offRoad = false) {
    if (!this.isPlaying || !this.roadGain || !Number.isFinite(speed) || !Number.isFinite(lateralSpeed)) return;
    const rolling = Math.min(1, Math.max(0, speed) / 45);
    const skid = Math.min(1, Math.max(0, Math.abs(lateralSpeed) - 1.5) / 7) * Math.min(1, speed / 8);
    this.roadGain.gain.setTargetAtTime(rolling * (offRoad ? 0.55 : 0.18), this.ctx.currentTime, 0.08);
    this.roadFilter.frequency.setTargetAtTime(offRoad ? 650 : 180, this.ctx.currentTime, 0.08);
    this.skidGain.gain.setTargetAtTime(Math.max(0, skid) * 0.28, this.ctx.currentTime, 0.04);
  }

  playImpact(speed) {
    if (!this.isPlaying || !this.noise || !Number.isFinite(speed) || speed < 1) return;
    const now = this.ctx.currentTime;
    if (now - this.lastImpactTime < 0.15) return;
    this.lastImpactTime = now;
    const source = this.ctx.createBufferSource();
    source.buffer = this.noise;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 500;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(Math.min(0.8, speed / 35), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.fxMaster);
    this.impacts.add(source);
    source.onended = () => {
      source.disconnect(); filter.disconnect(); gain.disconnect();
      this.impacts.delete(source);
    };
    source.start();
    source.stop(now + 0.2);
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
