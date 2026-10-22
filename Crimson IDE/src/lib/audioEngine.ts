/**
 * Web Audio API Keystroke Sound Synthesizer (MechVibes / Sound FX Engine)
 * Generates realistic mechanical keyboard switches, vintage typewriter strikes,
 * and sci-fi console audio with zero external dependencies.
 */

import { TypingSoundpack } from '../types';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private soundpack: TypingSoundpack = 'none';
  private volume: number = 0.35;
  private pitchVariation: boolean = true;

  private initContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setConfig(soundpack?: TypingSoundpack, volume?: number, pitchVariation?: boolean) {
    if (soundpack !== undefined) this.soundpack = soundpack;
    if (volume !== undefined) this.volume = Math.max(0, Math.min(1, volume));
    if (pitchVariation !== undefined) this.pitchVariation = pitchVariation;
  }

  public getSoundpack(): TypingSoundpack {
    return this.soundpack;
  }

  public getVolume(): number {
    return this.volume;
  }

  public playKey(key: string = 'a') {
    if (this.soundpack === 'none' || this.volume <= 0) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const isEnter = key === 'Enter';
      const isSpace = key === ' ';
      const isBackspace = key === 'Backspace';

      // Random micro pitch variation (+/- 6%)
      const jitter = this.pitchVariation ? 0.94 + Math.random() * 0.12 : 1.0;

      switch (this.soundpack) {
        case 'cherry-blue':
          this.playCherryBlue(ctx, jitter, isEnter, isSpace, isBackspace);
          break;
        case 'alpaca-thock':
          this.playAlpacaThock(ctx, jitter, isEnter, isSpace, isBackspace);
          break;
        case 'typewriter':
          this.playTypewriter(ctx, jitter, isEnter, isSpace, isBackspace);
          break;
        case 'hacker-beep':
          this.playHackerBeep(ctx, jitter, isEnter, isSpace, isBackspace);
          break;
        case 'bubble-pop':
          this.playBubblePop(ctx, jitter, isEnter, isSpace, isBackspace);
          break;
        default:
          break;
      }
    } catch {
      // Ignore audio synthesis errors gracefully
    }
  }

  // 1. Cherry MX Blue: High frequency tactile click + lower bottom-out clack
  private playCherryBlue(ctx: AudioContext, jitter: number, isEnter: boolean, isSpace: boolean, isBackspace: boolean) {
    const t0 = ctx.currentTime;
    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);

    const baseVol = (isEnter ? 1.2 : isSpace ? 1.0 : isBackspace ? 1.1 : 0.9) * this.volume;
    gainNode.gain.setValueAtTime(baseVol * 0.45, t0);

    // Click snap (high pass noise/oscillator)
    const clickOsc = ctx.createOscillator();
    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime((isEnter ? 1800 : 2400) * jitter, t0);
    clickOsc.frequency.exponentialRampToValueAtTime(300, t0 + 0.015);

    const clickGain = ctx.createGain();
    clickGain.gain.setValueAtTime(0.8, t0);
    clickGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.02);

    clickOsc.connect(clickGain);
    clickGain.connect(gainNode);

    // Body bottom out (warm mid-low thud)
    const bodyOsc = ctx.createOscillator();
    bodyOsc.type = 'sine';
    const bodyFreq = (isSpace ? 220 : isEnter ? 180 : 320) * jitter;
    bodyOsc.frequency.setValueAtTime(bodyFreq, t0);
    bodyOsc.frequency.exponentialRampToValueAtTime(60, t0 + 0.05);

    const bodyGain = ctx.createGain();
    bodyGain.gain.setValueAtTime(0.6, t0);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.06);

    bodyOsc.connect(bodyGain);
    bodyGain.connect(gainNode);

    clickOsc.start(t0);
    bodyOsc.start(t0);
    clickOsc.stop(t0 + 0.025);
    bodyOsc.stop(t0 + 0.07);
  }

  // 2. Alpaca Thock: Deep, buttery, dampened acoustic bottom-out
  private playAlpacaThock(ctx: AudioContext, jitter: number, isEnter: boolean, isSpace: boolean, isBackspace: boolean) {
    const t0 = ctx.currentTime;
    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);

    const baseVol = (isEnter ? 1.25 : isSpace ? 1.15 : isBackspace ? 1.1 : 0.95) * this.volume;
    gainNode.gain.setValueAtTime(baseVol * 0.5, t0);

    // Low dampened body
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    const startFreq = (isSpace ? 140 : isEnter ? 120 : 190) * jitter;
    osc.frequency.setValueAtTime(startFreq, t0);
    osc.frequency.exponentialRampToValueAtTime(45, t0 + 0.065);

    // Low-pass filter for velvety creamy thock
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(650, t0);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.9, t0);
    env.gain.exponentialRampToValueAtTime(0.001, t0 + 0.07);

    osc.connect(filter);
    filter.connect(env);
    env.connect(gainNode);

    osc.start(t0);
    osc.stop(t0 + 0.08);
  }

  // 3. Vintage Typewriter: Mechanical bar strike, with carriage return bell on Enter
  private playTypewriter(ctx: AudioContext, jitter: number, isEnter: boolean, _isSpace: boolean, _isBackspace: boolean) {
    const t0 = ctx.currentTime;
    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);
    gainNode.gain.setValueAtTime(this.volume * 0.5, t0);

    // Mechanical strike
    const osc1 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(800 * jitter, t0);
    osc1.frequency.exponentialRampToValueAtTime(110, t0 + 0.04);

    const gain1 = ctx.createGain();
    gain1.gain.setValueAtTime(0.7, t0);
    gain1.gain.exponentialRampToValueAtTime(0.001, t0 + 0.045);

    osc1.connect(gain1);
    gain1.connect(gainNode);
    osc1.start(t0);
    osc1.stop(t0 + 0.05);

    // If Enter, play typewriter bell ding!
    if (isEnter) {
      const bell = ctx.createOscillator();
      bell.type = 'sine';
      bell.frequency.setValueAtTime(2600, t0 + 0.02);

      const bellGain = ctx.createGain();
      bellGain.gain.setValueAtTime(0.001, t0);
      bellGain.gain.setValueAtTime(0.65, t0 + 0.02);
      bellGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.55);

      bell.connect(bellGain);
      bellGain.connect(gainNode);
      bell.start(t0 + 0.02);
      bell.stop(t0 + 0.6);
    }
  }

  // 4. Hacker Sci-Fi Beep: 8-bit futuristic terminal telemetry blip
  private playHackerBeep(ctx: AudioContext, jitter: number, isEnter: boolean, isSpace: boolean, _isBackspace: boolean) {
    const t0 = ctx.currentTime;
    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);
    gainNode.gain.setValueAtTime(this.volume * 0.35, t0);

    const osc = ctx.createOscillator();
    osc.type = 'square';
    const freq = (isEnter ? 440 : isSpace ? 660 : 880 + Math.floor(Math.random() * 400)) * jitter;
    osc.frequency.setValueAtTime(freq, t0);
    osc.frequency.setValueAtTime(freq * 1.5, t0 + 0.015);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.4, t0);
    env.gain.exponentialRampToValueAtTime(0.001, t0 + 0.035);

    osc.connect(env);
    env.connect(gainNode);
    osc.start(t0);
    osc.stop(t0 + 0.04);
  }

  // 5. Bubble Pop: Soft acoustic pop
  private playBubblePop(ctx: AudioContext, jitter: number, isEnter: boolean, _isSpace: boolean, _isBackspace: boolean) {
    const t0 = ctx.currentTime;
    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);
    gainNode.gain.setValueAtTime(this.volume * 0.5, t0);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    const startFreq = (isEnter ? 400 : 750) * jitter;
    osc.frequency.setValueAtTime(startFreq, t0);
    osc.frequency.exponentialRampToValueAtTime(startFreq * 2.2, t0 + 0.03);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.7, t0);
    env.gain.exponentialRampToValueAtTime(0.001, t0 + 0.04);

    osc.connect(env);
    env.connect(gainNode);
    osc.start(t0);
    osc.stop(t0 + 0.05);
  }
}

export const audioEngine = new AudioEngine();
