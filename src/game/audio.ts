class SynthAudioEngine {
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false;
  private isMusicPlaying: boolean = false;
  private synthLoopTimer: any = null;
  private step: number = 0;

  // Synthwave scale (D minor: D, F, G, A, C)
  private bassNotes = [73.42, 87.31, 98.00, 110.00]; // D2, F2, G2, A2
  private arpHermit = [220.00, 261.63, 293.66, 349.23, 392.00, 440.00, 523.25]; // D3, F3, G3, A3, C4, D4, E4

  private ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.6, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 0.7, this.ctx.currentTime);
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public startMusic() {
    this.ensureContext();
    if (this.isMusicPlaying || !this.ctx) return;
    this.isMusicPlaying = true;
    this.step = 0;

    // 124 BPM synthwave clock (16th notes = ~120ms)
    const intervalMs = 125;
    this.synthLoopTimer = setInterval(() => {
      this.tickSynthwaveBeat();
    }, intervalMs);
  }

  public stopMusic() {
    if (this.synthLoopTimer) {
      clearInterval(this.synthLoopTimer);
      this.synthLoopTimer = null;
    }
    this.isMusicPlaying = false;
  }

  private tickSynthwaveBeat() {
    if (!this.ctx || !this.musicGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const s = this.step % 16;
    const bar = Math.floor(this.step / 16) % 4;
    this.step++;

    // Bass note based on chord progression (D -> F -> C -> G)
    const chords = [73.42, 87.31, 65.41, 98.00]; // D2, F2, C2, G2
    const baseFreq = chords[bar];

    // Synthwave 16th-note driving bass
    if (s % 2 === 0) {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(s % 4 === 2 ? baseFreq * 2 : baseFreq, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(350 + Math.sin(now * 0.5) * 200, now);
      filter.Q.setValueAtTime(4, now);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);

      osc.start(now);
      osc.stop(now + 0.2);
    }

    // Synth Kick on beats 0, 4, 8, 12
    if (s % 4 === 0) {
      const kickOsc = this.ctx.createOscillator();
      const kickGain = this.ctx.createGain();
      kickOsc.type = 'sine';
      kickOsc.frequency.setValueAtTime(140, now);
      kickOsc.frequency.exponentialRampToValueAtTime(32, now + 0.12);

      kickGain.gain.setValueAtTime(0.3, now);
      kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      kickOsc.connect(kickGain);
      kickGain.connect(this.musicGain);

      kickOsc.start(now);
      kickOsc.stop(now + 0.15);
    }

    // Synth Snare on beats 4, 12
    if (s === 4 || s === 12) {
      const bufferSize = this.ctx.sampleRate * 0.1;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'highpass';
      noiseFilter.frequency.setValueAtTime(900, now);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.15, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.musicGain);

      noise.start(now);
      noise.stop(now + 0.12);
    }

    // Melodic Arpeggio on every 16th note
    if (s % 2 === 1) {
      const arpNote = this.arpHermit[(s + bar * 2) % this.arpHermit.length];
      const arpOsc = this.ctx.createOscillator();
      const arpGain = this.ctx.createGain();

      arpOsc.type = 'triangle';
      arpOsc.frequency.setValueAtTime(arpNote, now);

      arpGain.gain.setValueAtTime(0.08, now);
      arpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      arpOsc.connect(arpGain);
      arpGain.connect(this.musicGain);

      arpOsc.start(now);
      arpOsc.stop(now + 0.15);
    }
  }

  // SFX PROCEDURAL GENERATORS
  public playSFX(type: 'hit' | 'player_hurt' | 'crit' | 'kill' | 'pickup' | 'chest' | 'shrine' | 'level_up' | 'death' | 'teleport' | 'skill') {
    this.ensureContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const now = this.ctx.currentTime;

    switch (type) {
      case 'hit': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.08);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.09);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
      }

      case 'crit': {
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(520, now);
        osc1.frequency.exponentialRampToValueAtTime(110, now + 0.2);

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1040, now);
        osc2.frequency.exponentialRampToValueAtTime(220, now + 0.15);

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.sfxGain);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.25);
        osc2.stop(now + 0.25);
        break;
      }

      case 'player_hurt': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(130, now);
        osc.frequency.linearRampToValueAtTime(70, now + 0.15);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.18);
        break;
      }

      case 'kill': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(280, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.28);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.32);
        break;
      }

      case 'level_up': {
        // Glorious arpeggio fanfare
        const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
          if (!this.ctx || !this.sfxGain) return;
          const noteOsc = this.ctx.createOscillator();
          const noteGain = this.ctx.createGain();
          const startTime = now + idx * 0.08;

          noteOsc.type = 'triangle';
          noteOsc.frequency.setValueAtTime(freq, startTime);

          noteGain.gain.setValueAtTime(0.2, startTime);
          noteGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);

          noteOsc.connect(noteGain);
          noteGain.connect(this.sfxGain);
          noteOsc.start(startTime);
          noteOsc.stop(startTime + 0.32);
        });
        break;
      }

      case 'chest':
      case 'pickup': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.2);
        break;
      }

      case 'shrine': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(330, now);
        osc.frequency.linearRampToValueAtTime(660, now + 0.4);

        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.52);
        break;
      }

      case 'skill': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(650, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.25);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.3);
        break;
      }

      case 'teleport': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.35);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.38);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.4);
        break;
      }

      case 'death': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(25, now + 0.8);

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.9);
        break;
      }
    }
  }
}

export const soundEngine = new SynthAudioEngine();
