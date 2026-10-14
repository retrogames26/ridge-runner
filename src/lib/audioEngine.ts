/**
 * Zero-dependency Web Audio API Engine & Off-Road Sound Synthesizer
 */

class AudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private engineOsc: OscillatorNode | null = null;
  private subOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private gravelGain: GainNode | null = null;
  private noiseNode: AudioBufferSourceNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private isStarted: boolean = false;

  public init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    } catch {
      console.warn('Web Audio not supported in current environment.');
    }
  }

  public start() {
    if (!this.ctx) this.init();
    if (!this.ctx || this.isStarted) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    // Engine Fundamental Rumble Oscillator (Sawtooth + Lowpass)
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.setValueAtTime(45, this.ctx.currentTime);

    // Deep Sub-harmonic V8 rumble (Triangle)
    this.subOsc = this.ctx.createOscillator();
    this.subOsc.type = 'triangle';
    this.subOsc.frequency.setValueAtTime(22.5, this.ctx.currentTime);

    this.filterNode = this.ctx.createBiquadFilter();
    this.filterNode.type = 'lowpass';
    this.filterNode.frequency.setValueAtTime(180, this.ctx.currentTime);

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

    this.engineOsc.connect(this.filterNode);
    this.subOsc.connect(this.filterNode);
    this.filterNode.connect(this.engineGain);
    this.engineGain.connect(this.ctx.destination);

    this.engineOsc.start();
    this.subOsc.start();

    // Gravel crunch noise buffer
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    this.noiseNode = this.ctx.createBufferSource();
    this.noiseNode.buffer = noiseBuffer;
    this.noiseNode.loop = true;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(800, this.ctx.currentTime);
    noiseFilter.Q.setValueAtTime(1.5, this.ctx.currentTime);

    this.gravelGain = this.ctx.createGain();
    this.gravelGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.noiseNode.connect(noiseFilter);
    noiseFilter.connect(this.gravelGain);
    this.gravelGain.connect(this.ctx.destination);
    this.noiseNode.start();

    this.isStarted = true;
  }

  public update(rpm: number, speedKmh: number, isBraking: boolean) {
    if (!this.ctx || !this.isStarted || this.isMuted) return;

    const baseFreq = 30 + (rpm / 6000) * 110;
    const now = this.ctx.currentTime;

    if (this.engineOsc && this.subOsc && this.filterNode) {
      this.engineOsc.frequency.setTargetAtTime(baseFreq, now, 0.08);
      this.subOsc.frequency.setTargetAtTime(baseFreq * 0.5, now, 0.08);
      this.filterNode.frequency.setTargetAtTime(160 + (rpm / 6000) * 550, now, 0.08);
    }

    // Gravel crunch intensity based on wheel speed
    if (this.gravelGain) {
      const gravelVol = Math.min(0.09, (Math.abs(speedKmh) / 100) * 0.08 + (isBraking ? 0.04 : 0.0));
      this.gravelGain.gain.setTargetAtTime(gravelVol, now, 0.05);
    }
  }

  public playSuspensionThud() {
    if (!this.ctx || this.isMuted) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(90, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.14);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.15);
    } catch {
      // Ignore audio glitch
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.engineGain) {
      this.engineGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.08, this.ctx?.currentTime || 0, 0.05);
    }
    if (this.gravelGain && this.isMuted) {
      this.gravelGain.gain.setValueAtTime(0, this.ctx?.currentTime || 0);
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }
}

export const audioEngine = new AudioEngine();
