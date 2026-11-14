// Physical Modeling, Wavetable Morphing, Granular Synthesis, ADSR Low-Pass Filtering,
// Humanization & Convolution Reverb DSP Primitives (100% Procedural Web Audio API)

export interface ADSREnvelope {
  attack: number;
  decay: number;
  sustain: number; // 0..1 of peak
  release: number;
}

export interface FilterADSR {
  baseCutoff: number;
  peakCutoff: number;
  sustainCutoff: number;
  releaseCutoff: number;
  q?: number;
  env: ADSREnvelope;
}

export interface KarplusParams {
  freq: number;
  duration: number;
  decay?: number; // 0.90..0.999
  brightness?: number; // 0.1..0.95 (lowpass loop coefficient)
  pickPosition?: number; // 0.05..0.5 (pluck comb filter position)
  dampingCutoff?: number; // dynamic post-filter peak Hz
  gain?: number;
  pan?: number;
  reverbSend?: number;
  stiffness?: number; // slight inharmonic metallic twist (0..0.15)
}

export interface ModalMembraneParams {
  baseFreq: number;
  startFreqMult?: number;
  pitchDropTime?: number;
  duration: number;
  modes?: number[]; // relative ratios
  modeWeights?: number[];
  noiseBurstGain?: number;
  noiseCutoff?: number;
  filterPeak?: number;
  filterEnd?: number;
  gain?: number;
  pan?: number;
  reverbSend?: number;
}

export type WavetableTimbre = 'cello' | 'brass' | 'glass' | 'reese' | 'koto';

export interface WavetableNoteParams {
  freq: number;
  startTime: number;
  duration: number;
  timbre: WavetableTimbre;
  gain?: number;
  pan?: number;
  reverbSend?: number;
  vibratoDepthCents?: number;
  vibratoRateHz?: number;
  filterCutoffPeak?: number;
  filterCutoffSustain?: number;
  filterQ?: number;
  attack?: number;
  release?: number;
}

export type GranularSourceId = 'crypt_choir' | 'plasma_shimmer' | 'beast_throat';

export interface GranularCloudParams {
  source: GranularSourceId;
  startTime: number;
  cloudDuration: number;
  grainCount: number;
  grainSizeSec?: number; // 0.015 .. 0.055s (15-55ms)
  grainSizeJitter?: number;
  startOffsetRatio?: number; // 0..1
  endOffsetRatio?: number; // 0..1
  pitchRatio?: number;
  pitchJitter?: number; // cents or ratio spread
  stereoSpread?: number; // 0..1
  lowpassStart?: number;
  lowpassEnd?: number;
  gain?: number;
  reverbSend?: number;
}

// ---------------------------------------------------------------------------
// 1. HUMANIZATION ("Imperfecciones humanas")
// ---------------------------------------------------------------------------
export function humanizeTime(baseTime: number, maxJitterSec = 0.011): number {
  // Triangular distribution feels more natural than uniform
  const r = (Math.random() - Math.random()) * maxJitterSec;
  return Math.max(baseTime, baseTime + r);
}

export function humanizeFreq(freq: number, maxCents = 7): number {
  const cents = (Math.random() - Math.random()) * maxCents;
  return freq * Math.pow(2, cents / 1200);
}

export function humanizeVel(gain: number, variance = 0.14): number {
  const factor = 1 + (Math.random() * 2 - 1) * variance;
  return Math.max(0.001, gain * factor);
}

// ---------------------------------------------------------------------------
// 2. CONVOLUTION REVERB IMPULSE RESPONSE (Cyber-Crypt Acoustic Chamber)
// ---------------------------------------------------------------------------
export function createCryptImpulseResponse(ctx: AudioContext, durationSec = 2.1): AudioBuffer {
  const sr = ctx.sampleRate;
  const length = Math.floor(sr * durationSec);
  const ir = ctx.createBuffer(2, length, sr);

  // Discrete early reflections (stone & brushed titanium corridor walls)
  const earlyTapsL = [
    { ms: 11, amp: 0.42 },
    { ms: 19, amp: -0.31 },
    { ms: 31, amp: 0.25 },
    { ms: 47, amp: -0.19 },
    { ms: 67, amp: 0.14 }
  ];
  const earlyTapsR = [
    { ms: 13, amp: -0.40 },
    { ms: 23, amp: 0.33 },
    { ms: 37, amp: -0.24 },
    { ms: 53, amp: 0.18 },
    { ms: 73, amp: -0.13 }
  ];

  for (let ch = 0; ch < 2; ch++) {
    const data = ir.getChannelData(ch);
    const taps = ch === 0 ? earlyTapsL : earlyTapsR;
    for (const tap of taps) {
      const idx = Math.floor((tap.ms / 1000) * sr);
      if (idx > 0 && idx < length) {
        data[idx] += tap.amp;
      }
    }

    // Progressive lowpass wall-absorption damping state
    let lp = 0;
    let lp2 = 0;
    for (let i = 0; i < length; i++) {
      const t = i / length;
      // Exponential room decay + soft onset fade-in over 18ms so early/late blend seamlessly
      const fadeIn = Math.min(1, i / (sr * 0.018));
      const decay = Math.pow(1 - t, 2.6) * Math.exp(-3.4 * t);
      const white = Math.random() * 2 - 1;

      // Wall air absorption: higher frequencies damp progressively faster as tail decays
      const dampAlpha = Math.max(0.08, 0.72 * (1 - t * 0.85));
      lp = lp + dampAlpha * (white - lp);
      lp2 = lp2 + dampAlpha * (lp - lp2);

      data[i] += lp2 * decay * fadeIn * 0.32;
    }
  }

  return ir;
}

// ---------------------------------------------------------------------------
// 3. DYNAMIC LOW-PASS FILTER & AMP ENVELOPES (ADSR)
// ---------------------------------------------------------------------------
export function applyADSRAmp(
  gainNode: GainNode,
  startTime: number,
  totalDur: number,
  peakGain: number,
  env: ADSREnvelope
) {
  const safePeak = Math.max(0.0005, peakGain);
  const atk = Math.max(0.002, env.attack);
  const dec = Math.max(0.005, env.decay);
  const rel = Math.max(0.01, env.release);
  const sustainVal = Math.max(0.0004, safePeak * Math.max(0.02, env.sustain));
  const releaseStart = Math.max(startTime + atk + dec * 0.5, startTime + totalDur - rel);

  gainNode.gain.setValueAtTime(0.0001, startTime);
  gainNode.gain.linearRampToValueAtTime(safePeak, startTime + atk);
  gainNode.gain.exponentialRampToValueAtTime(sustainVal, startTime + atk + dec);
  gainNode.gain.setValueAtTime(sustainVal, releaseStart);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, releaseStart + rel);
}

export function applyADSRFilter(
  filterNode: BiquadFilterNode,
  startTime: number,
  totalDur: number,
  cfg: FilterADSR
) {
  filterNode.type = 'lowpass';
  filterNode.Q.setValueAtTime(cfg.q ?? 1.8, startTime);

  const atk = Math.max(0.002, cfg.env.attack);
  const dec = Math.max(0.01, cfg.env.decay);
  const rel = Math.max(0.015, cfg.env.release);
  const baseHz = Math.max(40, cfg.baseCutoff);
  const peakHz = Math.max(baseHz + 40, Math.min(18000, cfg.peakCutoff));
  const sustainHz = Math.max(60, Math.min(peakHz, cfg.sustainCutoff));
  const releaseHz = Math.max(50, Math.min(sustainHz, cfg.releaseCutoff));
  const releaseStart = Math.max(startTime + atk + dec * 0.5, startTime + totalDur - rel);

  filterNode.frequency.setValueAtTime(baseHz, startTime);
  filterNode.frequency.exponentialRampToValueAtTime(peakHz, startTime + atk);
  filterNode.frequency.exponentialRampToValueAtTime(sustainHz, startTime + atk + dec);
  filterNode.frequency.setValueAtTime(sustainHz, releaseStart);
  filterNode.frequency.exponentialRampToValueAtTime(releaseHz, releaseStart + rel);
}

// ---------------------------------------------------------------------------
// 4. PHYSICAL MODELING: KARPLUS-STRONG PLUCKED STRING + CACHE
// ---------------------------------------------------------------------------
const ksBufferCache = new Map<string, AudioBuffer>();

export function synthesizeKarplusStrongBuffer(
  ctx: AudioContext,
  freq: number,
  durationSec: number,
  decay = 0.992,
  brightness = 0.52,
  pickPosition = 0.24,
  stiffness = 0
): AudioBuffer {
  const safeFreq = Math.max(36, Math.min(2600, freq));
  // Quantize cache key slightly for fast reuse in musical sequences while still allowing subtle variation
  const cacheKey = `${ctx.sampleRate}:${Math.round(safeFreq * 2)}:${Math.round(durationSec * 20)}:${Math.round(decay * 1000)}:${Math.round(brightness * 20)}:${Math.round(pickPosition * 20)}`;
  const cached = ksBufferCache.get(cacheKey);
  if (cached) return cached;

  const sr = ctx.sampleRate;
  const totalSamples = Math.max(256, Math.floor(sr * durationSec));
  const buffer = ctx.createBuffer(1, totalSamples, sr);
  const out = buffer.getChannelData(0);

  // Exact fractional delay length for true musical pitch
  const exactDelay = sr / safeFreq - 0.5;
  const delayLen = Math.max(4, Math.floor(exactDelay));
  const frac = exactDelay - delayLen;

  const ring = new Float32Array(delayLen + 2);
  const pickSamples = Math.max(1, Math.floor(delayLen * Math.max(0.05, Math.min(0.48, pickPosition))));

  // Exciter burst: pink-ish white noise shaped with pick-position comb filter
  const rawNoise = new Float32Array(delayLen + 2);
  let prevNoise = 0;
  for (let i = 0; i < delayLen + 2; i++) {
    const w = Math.random() * 2 - 1;
    // Slight low-frequency body warmth in exciter
    prevNoise = prevNoise * 0.3 + w * 0.7;
    rawNoise[i] = prevNoise;
  }
  for (let i = 0; i < delayLen + 2; i++) {
    const combIdx = i - pickSamples;
    const combVal = combIdx >= 0 ? rawNoise[combIdx] : 0;
    ring[i] = (rawNoise[i] - combVal * 0.72) * 0.85;
  }

  let writeIdx = 0;
  let prevFiltered = 0;
  let dcPrevIn = 0;
  let dcPrevOut = 0;
  const b = Math.max(0.08, Math.min(0.94, brightness));

  for (let i = 0; i < totalSamples; i++) {
    const readA = writeIdx;
    const readB = (writeIdx + 1) % delayLen;
    const readC = (writeIdx + 2) % delayLen;

    // Fractional linear interpolation
    const delayed = ring[readA] * (1 - frac) + ring[readB] * frac;
    const nextSample = ring[readB] * (1 - frac) + ring[readC] * frac;

    // Karplus-Strong damping lowpass + optional metallic stiffness inversion
    let filtered = decay * (b * delayed + (1 - b) * nextSample);
    if (stiffness > 0) {
      filtered = filtered * (1 - stiffness) - prevFiltered * stiffness;
    }
    prevFiltered = filtered;

    // Gentle DC blocker to prevent sub-sonic offset buildup
    const dcOut = delayed - dcPrevIn + 0.995 * dcPrevOut;
    dcPrevIn = delayed;
    dcPrevOut = dcOut;

    // Soft end fade over last 15ms
    const tailFade = i > totalSamples - sr * 0.015 ? (totalSamples - i) / (sr * 0.015) : 1;
    out[i] = Math.max(-1, Math.min(1, dcOut * tailFade));

    ring[writeIdx] = filtered;
    writeIdx = (writeIdx + 1) % delayLen;
  }

  if (ksBufferCache.size > 180) {
    // Keep bounded cache size
    const firstKey = ksBufferCache.keys().next().value;
    if (firstKey) ksBufferCache.delete(firstKey);
  }
  ksBufferCache.set(cacheKey, buffer);
  return buffer;
}

export function playKarplusStrong(
  ctx: AudioContext,
  dryDest: AudioNode,
  wetDest: AudioNode | null,
  params: KarplusParams,
  startTime: number
) {
  const t = humanizeTime(startTime, 0.006);
  const f = humanizeFreq(params.freq, 6);
  const dur = Math.max(0.12, params.duration);
  const buf = synthesizeKarplusStrongBuffer(
    ctx,
    f,
    dur,
    params.decay ?? 0.992,
    params.brightness ?? 0.54,
    params.pickPosition ?? 0.24,
    params.stiffness ?? 0
  );

  const src = ctx.createBufferSource();
  src.buffer = buf;

  const filter = ctx.createBiquadFilter();
  const peakHz = params.dampingCutoff ?? Math.min(12000, f * 9);
  applyADSRFilter(filter, t, dur, {
    baseCutoff: Math.max(180, f * 1.4),
    peakCutoff: peakHz,
    sustainCutoff: Math.max(220, peakHz * 0.38),
    releaseCutoff: Math.max(140, f * 0.9),
    q: 1.4,
    env: { attack: 0.005, decay: dur * 0.45, sustain: 0.35, release: dur * 0.35 }
  });

  const amp = ctx.createGain();
  const g = humanizeVel(params.gain ?? 0.25, 0.12);
  amp.gain.setValueAtTime(g, t);
  amp.gain.exponentialRampToValueAtTime(0.0005, t + dur);

  let tailNode: AudioNode = amp;
  if (typeof ctx.createStereoPanner === 'function' && params.pan !== undefined) {
    const panner = ctx.createStereoPanner();
    panner.pan.setValueAtTime(Math.max(-1, Math.min(1, params.pan)), t);
    amp.connect(panner);
    tailNode = panner;
  }

  src.connect(filter);
  filter.connect(amp);
  tailNode.connect(dryDest);

  if (wetDest && (params.reverbSend ?? 0.25) > 0) {
    const send = ctx.createGain();
    send.gain.setValueAtTime(params.reverbSend ?? 0.25, t);
    tailNode.connect(send);
    send.connect(wetDest);
  }

  src.start(t);
  src.stop(t + dur + 0.02);
}

// ---------------------------------------------------------------------------
// 5. PHYSICAL MODELING: MODAL MEMBRANE (Drums, Footsteps, Metal Shields)
// ---------------------------------------------------------------------------
let sharedNoiseBuffer: AudioBuffer | null = null;
export function getSharedNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (sharedNoiseBuffer && sharedNoiseBuffer.sampleRate === ctx.sampleRate) {
    return sharedNoiseBuffer;
  }
  const len = Math.floor(ctx.sampleRate * 1.5);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  sharedNoiseBuffer = buf;
  return buf;
}

export function playModalMembrane(
  ctx: AudioContext,
  dryDest: AudioNode,
  wetDest: AudioNode | null,
  params: ModalMembraneParams,
  startTime: number
) {
  const t = humanizeTime(startTime, 0.005);
  const dur = Math.max(0.05, params.duration);
  const baseF = humanizeFreq(params.baseFreq, 8);
  const modes = params.modes ?? [1.0, 1.594, 2.136];
  const weights = params.modeWeights ?? [1.0, 0.42, 0.2];
  const peakGain = humanizeVel(params.gain ?? 0.3, 0.1);

  const bus = ctx.createGain();
  bus.gain.setValueAtTime(peakGain, t);

  const filter = ctx.createBiquadFilter();
  applyADSRFilter(filter, t, dur, {
    baseCutoff: params.filterPeak ?? 2600,
    peakCutoff: params.filterPeak ?? 2600,
    sustainCutoff: params.filterEnd ?? 240,
    releaseCutoff: Math.max(80, (params.filterEnd ?? 240) * 0.6),
    q: 1.5,
    env: { attack: 0.002, decay: dur * 0.55, sustain: 0.2, release: dur * 0.3 }
  });

  bus.connect(filter);

  let tail: AudioNode = filter;
  if (typeof ctx.createStereoPanner === 'function' && params.pan !== undefined) {
    const pan = ctx.createStereoPanner();
    pan.pan.setValueAtTime(Math.max(-1, Math.min(1, params.pan)), t);
    filter.connect(pan);
    tail = pan;
  }

  tail.connect(dryDest);
  if (wetDest && (params.reverbSend ?? 0.18) > 0) {
    const send = ctx.createGain();
    send.gain.setValueAtTime(params.reverbSend ?? 0.18, t);
    tail.connect(send);
    send.connect(wetDest);
  }

  // Modal oscillators (each overtone decays faster than the fundamental)
  modes.forEach((ratio, idx) => {
    const osc = ctx.createOscillator();
    const modeGain = ctx.createGain();
    const modeDur = dur / (1 + idx * 0.65);
    const f = baseF * ratio;

    osc.type = 'sine';
    if (idx === 0 && (params.startFreqMult ?? 1) > 1) {
      osc.frequency.setValueAtTime(f * (params.startFreqMult ?? 1), t);
      osc.frequency.exponentialRampToValueAtTime(f, t + (params.pitchDropTime ?? 0.045));
    } else {
      osc.frequency.setValueAtTime(f, t);
    }

    const w = weights[idx] ?? 0.18;
    modeGain.gain.setValueAtTime(w, t);
    modeGain.gain.exponentialRampToValueAtTime(0.0005, t + modeDur);

    osc.connect(modeGain);
    modeGain.connect(bus);
    osc.start(t);
    osc.stop(t + modeDur + 0.02);
  });

  // Strike/Impact Exciter Transient (stick/boot/mallet noise burst)
  if ((params.noiseBurstGain ?? 0.22) > 0) {
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = getSharedNoiseBuffer(ctx);

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(params.noiseCutoff ?? 1400, t);
    bp.Q.setValueAtTime(1.2, t);

    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(params.noiseBurstGain ?? 0.22, t);
    nGain.gain.exponentialRampToValueAtTime(0.0005, t + Math.min(0.055, dur * 0.45));

    noiseSrc.connect(bp);
    bp.connect(nGain);
    nGain.connect(bus);
    noiseSrc.start(t, Math.random() * 0.5, 0.07);
  }
}

// ---------------------------------------------------------------------------
// 6. WAVETABLE SYNTHESIS WITH DYNAMIC MORPHING
// ---------------------------------------------------------------------------
export class WavetableBank {
  private pairs: Partial<Record<WavetableTimbre, [PeriodicWave, PeriodicWave]>> = {};

  constructor(private ctx: AudioContext) {
    this.buildTables();
  }

  private createHarmonicWave(harmonics: number[]): PeriodicWave {
    const real = new Float32Array(harmonics.length + 1);
    const imag = new Float32Array(harmonics.length + 1);
    for (let i = 0; i < harmonics.length; i++) {
      imag[i + 1] = harmonics[i];
    }
    return this.ctx.createPeriodicWave(real, imag, { disableNormalization: false });
  }

  private buildTables() {
    // Cello: rich bowed string resonance (formant dip around 4th, peak around 1st, 2nd, 3rd, 5th)
    this.pairs.cello = [
      this.createHarmonicWave([1.0, 0.62, 0.48, 0.18, 0.34, 0.12, 0.16, 0.06, 0.08, 0.03]),
      this.createHarmonicWave([0.85, 0.78, 0.66, 0.42, 0.48, 0.32, 0.28, 0.18, 0.15, 0.11, 0.08, 0.06])
    ];

    // Brass: warm fundamental swelling into bright horn upper partials
    this.pairs.brass = [
      this.createHarmonicWave([1.0, 0.45, 0.25, 0.12, 0.08, 0.04]),
      this.createHarmonicWave([0.9, 0.88, 0.78, 0.65, 0.56, 0.45, 0.38, 0.28, 0.22, 0.16, 0.11, 0.08])
    ];

    // Glass / Bell: pure harmonic shimmer with high crystalline partials
    this.pairs.glass = [
      this.createHarmonicWave([1.0, 0.18, 0.05, 0.32, 0.04, 0.08, 0.22, 0.02, 0.05, 0.14]),
      this.createHarmonicWave([0.8, 0.35, 0.14, 0.48, 0.12, 0.2, 0.36, 0.08, 0.16, 0.25, 0.09, 0.18])
    ];

    // Reese / Cyber Bass: thick odd/even industrial spectrum
    this.pairs.reese = [
      this.createHarmonicWave([1.0, 0.75, 0.68, 0.48, 0.42, 0.3, 0.25, 0.18, 0.14, 0.1]),
      this.createHarmonicWave([0.9, 0.82, 0.79, 0.68, 0.61, 0.52, 0.46, 0.39, 0.33, 0.28, 0.22, 0.18, 0.14, 0.1])
    ];

    // Koto / Plucked Synth Lead: bright nasal harmonic profile
    this.pairs.koto = [
      this.createHarmonicWave([1.0, 0.32, 0.58, 0.15, 0.42, 0.12, 0.25, 0.08, 0.15]),
      this.createHarmonicWave([0.9, 0.55, 0.25, 0.14, 0.08, 0.04, 0.02])
    ];
  }

  public playNote(
    dryDest: AudioNode,
    wetDest: AudioNode | null,
    params: WavetableNoteParams
  ) {
    const pair = this.pairs[params.timbre] || this.pairs.cello!;
    const t = humanizeTime(params.startTime, 0.009);
    const freq = humanizeFreq(params.freq, 6);
    const dur = Math.max(0.08, params.duration);
    const atk = params.attack ?? Math.min(0.18, dur * 0.28);
    const rel = params.release ?? Math.min(0.35, dur * 0.4);
    const peakGain = humanizeVel(params.gain ?? 0.16, 0.12);

    const oscA = this.ctx.createOscillator();
    const oscB = this.ctx.createOscillator();
    oscA.setPeriodicWave(pair[0]);
    oscB.setPeriodicWave(pair[1]);

    // Subtle organic chorus detune between wavetable layers
    oscA.frequency.setValueAtTime(freq, t);
    oscB.frequency.setValueAtTime(freq * (params.timbre === 'reese' ? 1.0055 : 1.0018), t);

    // Delayed LFO vibrato for expressive human bow/breath feel
    if ((params.vibratoDepthCents ?? 0) > 0 && dur > 0.25) {
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(params.vibratoRateHz ?? 4.6 + Math.random() * 0.8, t);
      const vibCents = params.vibratoDepthCents ?? 9;
      lfoGain.gain.setValueAtTime(0, t);
      lfoGain.gain.linearRampToValueAtTime(vibCents, t + Math.min(0.22, dur * 0.45));
      lfo.connect(lfoGain);
      lfoGain.connect(oscA.detune);
      lfoGain.connect(oscB.detune);
      lfo.start(t);
      lfo.stop(t + dur + 0.05);
    }

    // Morph crossfade: start with Table A, swell into Table B during note bloom, return softly
    const gA = this.ctx.createGain();
    const gB = this.ctx.createGain();
    gA.gain.setValueAtTime(0.85, t);
    gA.gain.linearRampToValueAtTime(0.25, t + Math.max(0.05, dur * 0.45));
    gA.gain.linearRampToValueAtTime(0.75, t + dur);

    gB.gain.setValueAtTime(0.15, t);
    gB.gain.linearRampToValueAtTime(0.85, t + Math.max(0.05, dur * 0.45));
    gB.gain.linearRampToValueAtTime(0.25, t + dur);

    const filter = this.ctx.createBiquadFilter();
    const peakCut = params.filterCutoffPeak ?? Math.min(9000, freq * 6.5);
    const susCut = params.filterCutoffSustain ?? Math.max(240, freq * 2.2);
    applyADSRFilter(filter, t, dur, {
      baseCutoff: Math.max(110, freq * 0.9),
      peakCutoff: peakCut,
      sustainCutoff: susCut,
      releaseCutoff: Math.max(90, freq * 0.8),
      q: params.filterQ ?? 2.2,
      env: { attack: atk, decay: dur * 0.45, sustain: 0.4, release: rel }
    });

    const amp = this.ctx.createGain();
    applyADSRAmp(amp, t, dur, peakGain, {
      attack: atk,
      decay: Math.max(0.04, dur * 0.3),
      sustain: 0.65,
      release: rel
    });

    oscA.connect(gA);
    oscB.connect(gB);
    gA.connect(filter);
    gB.connect(filter);
    filter.connect(amp);

    let tail: AudioNode = amp;
    if (typeof this.ctx.createStereoPanner === 'function' && params.pan !== undefined) {
      const panner = this.ctx.createStereoPanner();
      panner.pan.setValueAtTime(Math.max(-1, Math.min(1, params.pan)), t);
      amp.connect(panner);
      tail = panner;
    }

    tail.connect(dryDest);
    if (wetDest && (params.reverbSend ?? 0.32) > 0) {
      const send = this.ctx.createGain();
      send.gain.setValueAtTime(params.reverbSend ?? 0.32, t);
      tail.connect(send);
      send.connect(wetDest);
    }

    oscA.start(t);
    oscB.start(t);
    oscA.stop(t + dur + 0.04);
    oscB.stop(t + dur + 0.04);
  }
}

// ---------------------------------------------------------------------------
// 7. GRANULAR SYNTHESIS ENGINE (Micro-Grains 15-55ms + Hann Windowing)
// ---------------------------------------------------------------------------
export class GranularEngine {
  private sources: Partial<Record<GranularSourceId, AudioBuffer>> = {};
  private hannCurve: Float32Array;

  constructor(private ctx: AudioContext) {
    // 32-point Hann window envelope for smooth zero-click micro-grains
    this.hannCurve = new Float32Array(33);
    for (let i = 0; i < 33; i++) {
      const x = i / 32;
      this.hannCurve[i] = 0.5 * (1 - Math.cos(2 * Math.PI * x));
    }
    this.buildSourceBuffers();
  }

  private buildSourceBuffers() {
    const sr = this.ctx.sampleRate;

    // 1. Crypt Choir / Pure Harmonic Atmospheric Source (2.4s, zero hiss)
    const choirLen = Math.floor(sr * 2.4);
    const choirBuf = this.ctx.createBuffer(1, choirLen, sr);
    const choir = choirBuf.getChannelData(0);
    const choirFreqs = [146.83, 220.0, 293.66, 349.23, 440.0, 523.25]; // D3, A3, D4, F4, A4, C5
    for (let i = 0; i < choirLen; i++) {
      const t = i / sr;
      let s = 0;
      for (let k = 0; k < choirFreqs.length; k++) {
        const f = choirFreqs[k] * (1 + 0.004 * Math.sin(2 * Math.PI * (0.35 + k * 0.13) * t));
        const mod = 0.65 + 0.35 * Math.sin(2 * Math.PI * (0.18 + k * 0.09) * t + k);
        s += Math.sin(2 * Math.PI * f * t + 0.25 * Math.sin(2 * Math.PI * f * 0.5 * t)) * mod / (k + 1.5);
      }
      choir[i] = Math.max(-1, Math.min(1, s * 0.62));
    }
    this.sources.crypt_choir = choirBuf;

    // 2. Plasma Shimmer / Smooth Crystalline Source (1.8s, zero crackle)
    const shimLen = Math.floor(sr * 1.8);
    const shimBuf = this.ctx.createBuffer(1, shimLen, sr);
    const shim = shimBuf.getChannelData(0);
    const shimFreqs = [587.33, 880.0, 1174.66, 1396.91, 1760.0];
    for (let i = 0; i < shimLen; i++) {
      const t = i / sr;
      let s = 0;
      for (let k = 0; k < shimFreqs.length; k++) {
        const fm = Math.sin(2 * Math.PI * shimFreqs[k] * 1.414 * t) * (0.45 + 0.35 * Math.sin(t * 2.2 + k));
        s += Math.sin(2 * Math.PI * shimFreqs[k] * t + fm) * (0.32 / (k + 1));
      }
      shim[i] = Math.max(-1, Math.min(1, s * 0.65));
    }
    this.sources.plasma_shimmer = shimBuf;

    // 3. Beast Throat / Organic Creature Growl & Sub Turbulence (1.6s)
    const beastLen = Math.floor(sr * 1.6);
    const beastBuf = this.ctx.createBuffer(1, beastLen, sr);
    const beast = beastBuf.getChannelData(0);
    let lpGrowl = 0;
    for (let i = 0; i < beastLen; i++) {
      const t = i / sr;
      const baseF = 58 + 14 * Math.sin(2 * Math.PI * 1.7 * t);
      const pulse = Math.sin(2 * Math.PI * baseF * t + 1.8 * Math.sin(2 * Math.PI * (baseF * 0.5) * t));
      const formant = Math.sin(2 * Math.PI * 210 * t) * 0.35 + Math.sin(2 * Math.PI * 460 * t) * 0.2;
      const noise = Math.random() * 2 - 1;
      lpGrowl = lpGrowl * 0.78 + noise * 0.22;
      beast[i] = Math.max(-1, Math.min(1, (pulse * 0.55 + formant * 0.3) * (0.7 + 0.3 * lpGrowl) + lpGrowl * 0.4));
    }
    this.sources.beast_throat = beastBuf;
  }

  public playCloud(
    dryDest: AudioNode,
    wetDest: AudioNode | null,
    params: GranularCloudParams
  ) {
    const srcBuf = this.sources[params.source];
    if (!srcBuf) return;

    const count = Math.max(4, Math.min(42, params.grainCount));
    const baseGrainSize = Math.max(0.012, Math.min(0.08, params.grainSizeSec ?? 0.036));
    const grainJitter = params.grainSizeJitter ?? 0.012;
    const cloudDur = Math.max(0.08, params.cloudDuration);
    const startOff = params.startOffsetRatio ?? 0.05;
    const endOff = params.endOffsetRatio ?? 0.85;
    const basePitch = params.pitchRatio ?? 1.0;
    const pitchSpread = params.pitchJitter ?? 0.08;
    const stereoSpread = params.stereoSpread ?? 0.75;
    const masterGain = humanizeVel(params.gain ?? 0.2, 0.1);

    // Master cloud filter for dynamic brightness shaping
    const cloudBus = this.ctx.createGain();
    cloudBus.gain.setValueAtTime(1, params.startTime);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.setValueAtTime(1.5, params.startTime);
    filter.frequency.setValueAtTime(Math.max(80, params.lowpassStart ?? 3200), params.startTime);
    filter.frequency.exponentialRampToValueAtTime(
      Math.max(80, params.lowpassEnd ?? 900),
      params.startTime + cloudDur + baseGrainSize
    );

    cloudBus.connect(filter);
    filter.connect(dryDest);
    if (wetDest && (params.reverbSend ?? 0.45) > 0) {
      const send = this.ctx.createGain();
      send.gain.setValueAtTime(params.reverbSend ?? 0.45, params.startTime);
      filter.connect(send);
      send.connect(wetDest);
    }

    const perGrainAmp = masterGain / Math.sqrt(Math.max(1, count * 0.45));

    for (let i = 0; i < count; i++) {
      const progress = count > 1 ? i / (count - 1) : 0;
      const gStart = humanizeTime(params.startTime + progress * cloudDur, cloudDur / count * 0.45);
      const gSize = Math.max(0.012, baseGrainSize + (Math.random() * 2 - 1) * grainJitter);
      const scrubPos = startOff + (endOff - startOff) * progress + (Math.random() - 0.5) * 0.14;
      const maxOffset = Math.max(0.01, srcBuf.duration - gSize * 1.5 - 0.02);
      const offsetSec = Math.max(0, Math.min(maxOffset, scrubPos * maxOffset));

      const rate = Math.max(0.25, basePitch * (1 + (Math.random() * 2 - 1) * pitchSpread));

      const gSrc = this.ctx.createBufferSource();
      gSrc.buffer = srcBuf;
      gSrc.playbackRate.setValueAtTime(rate, gStart);

      const gEnv = this.ctx.createGain();
      try {
        gEnv.gain.setValueCurveAtTime(this.hannCurve, gStart, gSize);
      } catch {
        gEnv.gain.setValueAtTime(0.0001, gStart);
        gEnv.gain.linearRampToValueAtTime(1, gStart + gSize * 0.5);
        gEnv.gain.linearRampToValueAtTime(0.0001, gStart + gSize);
      }

      const gScale = this.ctx.createGain();
      gScale.gain.setValueAtTime(perGrainAmp, gStart);

      gSrc.connect(gEnv);
      gEnv.connect(gScale);

      if (typeof this.ctx.createStereoPanner === 'function') {
        const panner = this.ctx.createStereoPanner();
        panner.pan.setValueAtTime((Math.random() * 2 - 1) * stereoSpread, gStart);
        gScale.connect(panner);
        panner.connect(cloudBus);
      } else {
        gScale.connect(cloudBus);
      }

      gSrc.start(gStart, offsetSec, gSize + 0.01);
    }
  }
}

// ---------------------------------------------------------------------------
// 8. FILTERED NOISE (Pink / Brown) + LFO LOWPASS — wind, rain, crypt breath
// ---------------------------------------------------------------------------
export type NoiseColor = 'white' | 'pink' | 'brown';

export interface AmbientNoiseParams {
  color: NoiseColor;
  duration: number;
  gain?: number;
  pan?: number;
  reverbSend?: number;
  /** Starting lowpass cutoff Hz */
  cutoffStart?: number;
  /** Ending lowpass cutoff Hz */
  cutoffEnd?: number;
  /** LFO rate modulating the cutoff (Hz) */
  lfoRateHz?: number;
  /** How many Hz the LFO swings the cutoff */
  lfoDepthHz?: number;
  filterQ?: number;
}

const noiseColorCache = new Map<string, AudioBuffer>();

function synthesizeColoredNoiseBuffer(
  ctx: AudioContext,
  color: NoiseColor,
  durationSec: number
): AudioBuffer {
  const dur = Math.max(0.05, Math.min(8, durationSec));
  const key = `${ctx.sampleRate}:${color}:${Math.round(dur * 20)}`;
  const cached = noiseColorCache.get(key);
  if (cached) return cached;

  const sr = ctx.sampleRate;
  const len = Math.max(64, Math.floor(sr * dur));
  const buf = ctx.createBuffer(1, len, sr);
  const out = buf.getChannelData(0);

  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  let b3 = 0;
  let b4 = 0;
  let b5 = 0;
  let b6 = 0;
  let brown = 0;

  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1;
    let sample = white;
    if (color === 'pink') {
      // Paul Kellet approximate pink noise
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.969 * b2 + white * 0.153852;
      b3 = 0.8665 * b3 + white * 0.3104856;
      b4 = 0.55 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.016898;
      sample = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      b6 = white * 0.115926;
      sample *= 0.11;
    } else if (color === 'brown') {
      brown = (brown + 0.02 * white) / 1.02;
      sample = brown * 3.5;
    }
    // Soft fade edges to avoid clicks when looping short bursts
    const edge = Math.min(1, i / (sr * 0.012), (len - i) / (sr * 0.02));
    out[i] = Math.max(-1, Math.min(1, sample * edge));
  }

  if (noiseColorCache.size > 48) {
    const first = noiseColorCache.keys().next().value;
    if (first) noiseColorCache.delete(first);
  }
  noiseColorCache.set(key, buf);
  return buf;
}

export function playAmbientNoise(
  ctx: AudioContext,
  dryDest: AudioNode,
  wetDest: AudioNode | null,
  params: AmbientNoiseParams,
  startTime: number
) {
  const t = humanizeTime(startTime, 0.008);
  const dur = Math.max(0.08, params.duration);
  const buf = synthesizeColoredNoiseBuffer(ctx, params.color, Math.min(4, dur + 0.15));
  const src = ctx.createBufferSource();
  src.buffer = buf;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.Q.setValueAtTime(params.filterQ ?? 1.1, t);
  const cutStart = Math.max(60, params.cutoffStart ?? 900);
  const cutEnd = Math.max(50, params.cutoffEnd ?? 420);
  filter.frequency.setValueAtTime(cutStart, t);
  filter.frequency.exponentialRampToValueAtTime(cutEnd, t + dur);

  if ((params.lfoRateHz ?? 0) > 0 && (params.lfoDepthHz ?? 0) > 0) {
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(params.lfoRateHz ?? 0.18, t);
    lfoGain.gain.setValueAtTime(params.lfoDepthHz ?? 180, t);
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start(t);
    lfo.stop(t + dur + 0.05);
  }

  const amp = ctx.createGain();
  const peak = humanizeVel(params.gain ?? 0.08, 0.1);
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.linearRampToValueAtTime(peak, t + Math.min(0.35, dur * 0.25));
  amp.gain.setValueAtTime(peak, t + Math.max(0.05, dur - 0.25));
  amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  src.connect(filter);
  filter.connect(amp);

  let tail: AudioNode = amp;
  if (typeof ctx.createStereoPanner === 'function' && params.pan !== undefined) {
    const panner = ctx.createStereoPanner();
    panner.pan.setValueAtTime(Math.max(-1, Math.min(1, params.pan)), t);
    amp.connect(panner);
    tail = panner;
  }

  tail.connect(dryDest);
  if (wetDest && (params.reverbSend ?? 0.4) > 0) {
    const send = ctx.createGain();
    send.gain.setValueAtTime(params.reverbSend ?? 0.4, t);
    tail.connect(send);
    send.connect(wetDest);
  }

  src.start(t);
  src.stop(t + dur + 0.02);
}

// ---------------------------------------------------------------------------
// 9. WAVEGUIDE TUBE / FLUTE (scattering junction delay line)
// ---------------------------------------------------------------------------
export interface WaveguideParams {
  freq: number;
  duration: number;
  gain?: number;
  pan?: number;
  reverbSend?: number;
  /** Breath / turbulence mix 0..1 */
  breath?: number;
  /** Reflectivity / sustain of the tube 0.85..0.995 */
  reflection?: number;
  brightness?: number;
}

const waveguideCache = new Map<string, AudioBuffer>();

export function synthesizeWaveguideBuffer(
  ctx: AudioContext,
  freq: number,
  durationSec: number,
  reflection = 0.97,
  brightness = 0.55,
  breath = 0.35
): AudioBuffer {
  const safeFreq = Math.max(55, Math.min(1800, freq));
  const key = `${ctx.sampleRate}:${Math.round(safeFreq)}:${Math.round(durationSec * 25)}:${Math.round(reflection * 1000)}:${Math.round(brightness * 40)}:${Math.round(breath * 40)}`;
  const cached = waveguideCache.get(key);
  if (cached) return cached;

  const sr = ctx.sampleRate;
  const total = Math.max(256, Math.floor(sr * durationSec));
  const buf = ctx.createBuffer(1, total, sr);
  const out = buf.getChannelData(0);

  // Half-period delay for closed-open tube approximation
  const delayLen = Math.max(4, Math.floor(sr / (2 * safeFreq)));
  const delay = new Float32Array(delayLen);
  let write = 0;
  let lp = 0;
  const refl = Math.max(0.82, Math.min(0.995, reflection));
  const bright = Math.max(0.12, Math.min(0.92, brightness));
  const breathAmt = Math.max(0, Math.min(0.9, breath));

  for (let i = 0; i < total; i++) {
    const tNorm = i / total;
    // Soft attack envelope for embouchure pressure
    const pressure = Math.min(1, i / (sr * 0.04)) * (1 - tNorm * 0.55);
    const turb = (Math.random() * 2 - 1) * breathAmt * pressure;
    const delayed = delay[write];
    // One-pole lowpass at reflection junction (wall losses)
    lp = bright * delayed + (1 - bright) * lp;
    const y = -refl * lp + turb;
    delay[write] = y;
    write = (write + 1) % delayLen;

    const fade = i > total - sr * 0.03 ? (total - i) / (sr * 0.03) : 1;
    out[i] = Math.max(-1, Math.min(1, y * fade * 0.85));
  }

  if (waveguideCache.size > 120) {
    const first = waveguideCache.keys().next().value;
    if (first) waveguideCache.delete(first);
  }
  waveguideCache.set(key, buf);
  return buf;
}

export function playWaveguide(
  ctx: AudioContext,
  dryDest: AudioNode,
  wetDest: AudioNode | null,
  params: WaveguideParams,
  startTime: number
) {
  const t = humanizeTime(startTime, 0.007);
  const f = humanizeFreq(params.freq, 5);
  const dur = Math.max(0.1, params.duration);
  const buf = synthesizeWaveguideBuffer(
    ctx,
    f,
    dur,
    params.reflection ?? 0.97,
    params.brightness ?? 0.55,
    params.breath ?? 0.35
  );

  const src = ctx.createBufferSource();
  src.buffer = buf;

  const filter = ctx.createBiquadFilter();
  applyADSRFilter(filter, t, dur, {
    baseCutoff: Math.max(200, f * 1.2),
    peakCutoff: Math.min(9000, f * 8),
    sustainCutoff: Math.max(180, f * 2.4),
    releaseCutoff: Math.max(120, f * 0.9),
    q: 1.6,
    env: { attack: 0.02, decay: dur * 0.4, sustain: 0.45, release: dur * 0.3 }
  });

  const amp = ctx.createGain();
  applyADSRAmp(amp, t, dur, humanizeVel(params.gain ?? 0.12, 0.1), {
    attack: 0.03,
    decay: dur * 0.25,
    sustain: 0.55,
    release: Math.min(0.4, dur * 0.35)
  });

  src.connect(filter);
  filter.connect(amp);

  let tail: AudioNode = amp;
  if (typeof ctx.createStereoPanner === 'function' && params.pan !== undefined) {
    const panner = ctx.createStereoPanner();
    panner.pan.setValueAtTime(Math.max(-1, Math.min(1, params.pan)), t);
    amp.connect(panner);
    tail = panner;
  }

  tail.connect(dryDest);
  if (wetDest && (params.reverbSend ?? 0.28) > 0) {
    const send = ctx.createGain();
    send.gain.setValueAtTime(params.reverbSend ?? 0.28, t);
    tail.connect(send);
    send.connect(wetDest);
  }

  src.start(t);
  src.stop(t + dur + 0.02);
}

// ---------------------------------------------------------------------------
// 10. ADDITIVE SYNTHESIS (partial stack with per-harmonic ADSR) — bells / glass
// ---------------------------------------------------------------------------
export interface AdditivePartial {
  ratio: number;
  weight: number;
  decayScale?: number;
}

export interface AdditiveParams {
  freq: number;
  duration: number;
  partials?: AdditivePartial[];
  gain?: number;
  pan?: number;
  reverbSend?: number;
  attack?: number;
  inharmonicity?: number; // stretch partials slightly (bells)
}

export function playAdditiveBell(
  ctx: AudioContext,
  dryDest: AudioNode,
  wetDest: AudioNode | null,
  params: AdditiveParams,
  startTime: number
) {
  const t = humanizeTime(startTime, 0.006);
  const f0 = humanizeFreq(params.freq, 4);
  const dur = Math.max(0.08, params.duration);
  const peak = humanizeVel(params.gain ?? 0.14, 0.1);
  const inharm = params.inharmonicity ?? 0.012;
  const partials =
    params.partials ??
    [
      { ratio: 1.0, weight: 1.0, decayScale: 1.0 },
      { ratio: 2.0, weight: 0.55, decayScale: 1.35 },
      { ratio: 2.76, weight: 0.42, decayScale: 1.6 },
      { ratio: 4.07, weight: 0.28, decayScale: 2.0 },
      { ratio: 5.4, weight: 0.18, decayScale: 2.4 },
      { ratio: 6.75, weight: 0.1, decayScale: 2.8 }
    ];

  const bus = ctx.createGain();
  bus.gain.setValueAtTime(peak, t);

  const filter = ctx.createBiquadFilter();
  applyADSRFilter(filter, t, dur, {
    baseCutoff: Math.max(300, f0 * 2),
    peakCutoff: Math.min(14000, f0 * 14),
    sustainCutoff: Math.max(400, f0 * 4),
    releaseCutoff: Math.max(200, f0 * 1.5),
    q: 1.2,
    env: {
      attack: params.attack ?? 0.008,
      decay: dur * 0.35,
      sustain: 0.35,
      release: dur * 0.4
    }
  });

  bus.connect(filter);

  let tail: AudioNode = filter;
  if (typeof ctx.createStereoPanner === 'function' && params.pan !== undefined) {
    const panner = ctx.createStereoPanner();
    panner.pan.setValueAtTime(Math.max(-1, Math.min(1, params.pan)), t);
    filter.connect(panner);
    tail = panner;
  }

  tail.connect(dryDest);
  if (wetDest && (params.reverbSend ?? 0.35) > 0) {
    const send = ctx.createGain();
    send.gain.setValueAtTime(params.reverbSend ?? 0.35, t);
    tail.connect(send);
    send.connect(wetDest);
  }

  partials.forEach((p, idx) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const stretch = 1 + inharm * (p.ratio - 1);
    const freq = f0 * p.ratio * stretch;
    const modeDur = Math.max(0.05, dur / (p.decayScale ?? 1 + idx * 0.35));
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    applyADSRAmp(g, t, modeDur, p.weight, {
      attack: params.attack ?? 0.006,
      decay: modeDur * 0.35,
      sustain: 0.25,
      release: modeDur * 0.45
    });
    osc.connect(g);
    g.connect(bus);
    osc.start(t);
    osc.stop(t + modeDur + 0.03);
  });
}
