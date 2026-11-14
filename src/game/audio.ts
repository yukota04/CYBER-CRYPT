import {
  GranularEngine,
  NoiseColor,
  WavetableBank,
  createCryptImpulseResponse,
  playAdditiveBell,
  playAmbientNoise,
  playKarplusStrong,
  playModalMembrane,
  playWaveguide
} from './audioDSP';

export type SoundEventType =
  | 'step'
  | 'blocked'
  | 'hit'
  | 'player_hurt'
  | 'crit'
  | 'kill'
  | 'pickup'
  | 'coin'
  | 'chest'
  | 'shrine'
  | 'checkpoint'
  | 'level_up'
  | 'death'
  | 'teleport'
  | 'ranged_shot'
  | 'forge_success'
  | 'forge_destroy'
  | 'potion_heal'
  | 'potion_energy'
  | 'skill'
  | 'skill_dash'
  | 'skill_aoe'
  | 'skill_lightning'
  | 'skill_fire'
  | 'skill_frost'
  | 'skill_heal'
  | 'skill_shield'
  | 'skill_beam'
  | 'monster_alert'
  | 'monster_windup'
  | 'monster_attack_swarmer'
  | 'monster_attack_stalker'
  | 'monster_attack_behemoth'
  | 'monster_attack_disruptor'
  | 'monster_attack_boss';

export type UISoundType = 'click' | 'confirm' | 'open' | 'close' | 'error';

export type MusicIntensity = 'title' | 'explore' | 'combat' | 'boss';

export interface MusicContextInfo {
  scene: 'login' | 'title' | 'playing' | 'paused' | 'gameover';
  floor?: number;
  nearbyEnemies?: number;
  bossVisible?: boolean;
  lowHp?: boolean;
}

// MIDI note -> frequency helper
function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// Menu-ONLY Atmospheric Cyber-Noir Theme (never played inside dungeon floors)
const MENU_PROGRESSION_A = [
  { root: 38, bass: [38, 38, 50, 38], arp: [50, 57, 60, 62, 65, 69, 72, 69], pad: [50, 57, 60, 64] },
  { root: 34, bass: [34, 34, 46, 34], arp: [46, 53, 57, 58, 62, 65, 69, 65], pad: [46, 53, 57, 62] },
  { root: 31, bass: [31, 31, 43, 31], arp: [43, 50, 55, 58, 62, 65, 67, 62], pad: [43, 50, 55, 58] },
  { root: 33, bass: [33, 33, 45, 33], arp: [45, 52, 57, 61, 64, 67, 70, 64], pad: [45, 52, 57, 61] }
];

const MENU_PROGRESSION_B = [
  { root: 41, bass: [41, 41, 53, 41], arp: [53, 60, 64, 65, 69, 72, 76, 72], pad: [53, 60, 64, 69] },
  { root: 36, bass: [36, 36, 48, 36], arp: [48, 55, 59, 60, 64, 67, 71, 67], pad: [48, 55, 59, 64] },
  { root: 31, bass: [31, 31, 43, 31], arp: [43, 50, 55, 58, 62, 65, 70, 65], pad: [43, 50, 55, 58] },
  { root: 33, bass: [33, 45, 33, 40], arp: [45, 52, 55, 57, 61, 64, 69, 73], pad: [45, 52, 57, 61] }
];

const MENU_MELODY = [
  0, 0, 69, 0, 0, 72, 0, 0,
  70, 0, 69, 0, 65, 0, 64, 0,
  0, 0, 65, 0, 69, 0, 74, 0,
  72, 0, 69, 0, 64, 0, 0, 0
];

export interface FloorChordVoicing {
  root: number;
  bass: number[];
  arp: number[];
  pad: number[];
}

export interface FloorTheme {
  floor: number;
  scaleName: string;
  rootMidi: number;
  bpm: number;
  /** 0..1 — rises with dungeon depth; drives density, dissonance, noise */
  tension: number;
  progressionA: FloorChordVoicing[];
  progressionB: FloorChordVoicing[];
  melodyExplore: number[];
  melodyCombat: number[];
  leadTimbre: 'koto' | 'glass' | 'cello' | 'brass';
  padTimbre: 'cello' | 'brass' | 'glass';
  granularSource: 'crypt_choir' | 'plasma_shimmer' | 'beast_throat';
  drumGroove: 'driving' | 'syncopated' | 'halftime' | 'tribal';
  arpMode: 'up' | 'down' | 'pendulum' | 'broken';
  kickFreq: number;
  bassBrightness: number;
  noiseColor: NoiseColor;
  ambientDensity: number;
  dissonanceCents: number;
  waveguideBreath: number;
  leadEngine: 'wavetable' | 'karplus' | 'waveguide' | 'additive';
  signatureHash: string;
}

const FLOOR_SCALES: { name: string; intervals: number[] }[] = [
  { name: 'Dorian Cyber-Noir', intervals: [0, 2, 3, 5, 7, 9, 10] },
  { name: 'Phrygian Dominant', intervals: [0, 1, 4, 5, 7, 8, 10] },
  { name: 'Harmonic Minor', intervals: [0, 2, 3, 5, 7, 8, 11] },
  { name: 'Aeolian Dark', intervals: [0, 2, 3, 5, 7, 8, 10] },
  { name: 'Hungarian Minor', intervals: [0, 2, 3, 6, 7, 8, 11] },
  { name: 'Lydian Neon', intervals: [0, 2, 4, 6, 7, 9, 10] },
  { name: 'Hirajoshi Cyber', intervals: [0, 2, 3, 7, 8, 12, 14] }
];

const CHORD_DEGREE_PROGRESSIONS: number[][] = [
  [0, 5, 3, 4],
  [0, 3, 6, 4],
  [0, 6, 5, 4],
  [0, 2, 5, 3],
  [0, 4, 5, 2],
  [0, 3, 1, 4],
  [0, 5, 6, 4]
];

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateFloorTheme(floor: number): FloorTheme {
  const safeFloor = Math.max(1, Math.floor(floor));
  // Unique seed per floor — adjacent floors never collide
  const rng = mulberry32(safeFloor * 7919 + 4123 + safeFloor * safeFloor * 17);

  // Tension rises with depth (asymptotic toward 1 after deep floors)
  const tension = Math.min(1, (safeFloor - 1) / 14 + Math.max(0, safeFloor - 8) * 0.02);

  // Rotate scales & keys so adjacent floors ALWAYS change harmonic color
  const scaleObj = FLOOR_SCALES[(safeFloor - 1) % FLOOR_SCALES.length];
  const rootPalette = [35, 38, 40, 33, 41, 36, 43, 34, 39, 37];
  const rootMidi = rootPalette[(safeFloor - 1) % rootPalette.length];

  // Ascending tempo: base palette + tension climb (never shared identically across floors)
  const bpmPalette = [96, 104, 110, 116, 122, 108, 128, 114, 132, 120, 136, 124];
  const bpm =
    bpmPalette[(safeFloor - 1) % bpmPalette.length] +
    Math.floor(tension * 18) +
    Math.floor(rng() * 4);

  const scaleDegreeToMidi = (deg: number, octaveOffset: number): number => {
    const len = scaleObj.intervals.length;
    const oct = Math.floor(deg / len) + octaveOffset;
    const idx = ((deg % len) + len) % len;
    return rootMidi + oct * 12 + scaleObj.intervals[idx];
  };

  const buildVoicing = (degree: number, idx: number): FloorChordVoicing => {
    const r = scaleDegreeToMidi(degree, 0);
    const third = scaleDegreeToMidi(degree + 2, 0);
    const fifth = scaleDegreeToMidi(degree + 4, 0);
    const seventh = scaleDegreeToMidi(degree + 6, 0);
    // Higher floors add cluster / minor-2nd grit to pads
    const grit =
      tension > 0.45 && rng() < tension
        ? scaleDegreeToMidi(degree + 1, 1)
        : seventh + 12;

    const bassPattern =
      idx % 2 === 0 ? [r, r, r + 12, fifth] : [r, fifth, r + 12, third];

    const arpBase = [
      scaleDegreeToMidi(degree, 1),
      scaleDegreeToMidi(degree + 2, 1),
      scaleDegreeToMidi(degree + 4, 1),
      scaleDegreeToMidi(degree + 6, 1),
      scaleDegreeToMidi(degree + 1, 2),
      scaleDegreeToMidi(degree + 2, 2),
      scaleDegreeToMidi(degree + 4, 2),
      scaleDegreeToMidi(degree + 3, 2)
    ];
    // Shuffle arp order with floor seed so patterns never clone across floors
    const arp = arpBase.map((n, i) => {
      const swapWith = Math.floor(rng() * arpBase.length);
      return i === swapWith ? arpBase[(i + safeFloor) % arpBase.length] : n;
    });

    const pad = [r + 12, scaleDegreeToMidi(degree + 2, 1), scaleDegreeToMidi(degree + 4, 1), grit];

    return { root: r, bass: bassPattern, arp, pad };
  };

  const degSetA = CHORD_DEGREE_PROGRESSIONS[(safeFloor - 1) % CHORD_DEGREE_PROGRESSIONS.length];
  const degSetB = CHORD_DEGREE_PROGRESSIONS[(safeFloor + 3) % CHORD_DEGREE_PROGRESSIONS.length];

  const progressionA = degSetA.map((d, idx) => buildVoicing(d, idx));
  const progressionB = degSetB.map((d, idx) => buildVoicing(d, idx + 1));

  // Density of notes rises with tension — unique motifs per floor
  const exploreDensity = 0.42 + tension * 0.35;
  const combatDensity = 0.55 + tension * 0.38;
  const melodyExplore: number[] = [];
  const melodyCombat: number[] = [];
  for (let i = 0; i < 32; i++) {
    const barChordDeg = degSetA[Math.floor(i / 8) % 4];
    const playExplore = (i + safeFloor) % 3 !== 2 && rng() < exploreDensity;
    if (playExplore) {
      const stepOffset = [0, 2, 4, 5, 6, 7, 9][Math.floor(rng() * (5 + Math.floor(tension * 2)))];
      melodyExplore.push(scaleDegreeToMidi(barChordDeg + stepOffset, 2));
    } else {
      melodyExplore.push(0);
    }

    const playCombat = rng() < (i % 4 === 0 ? Math.min(0.95, combatDensity + 0.2) : combatDensity);
    if (playCombat) {
      const stepOffset = [0, 1, 2, 4, 6, 7, 8, 10][Math.floor(rng() * (6 + Math.floor(tension * 2)))];
      melodyCombat.push(scaleDegreeToMidi(barChordDeg + stepOffset, 2));
    } else {
      melodyCombat.push(0);
    }
  }

  const leadTimbres: FloorTheme['leadTimbre'][] = ['koto', 'glass', 'cello', 'brass'];
  const padTimbres: FloorTheme['padTimbre'][] = ['cello', 'brass', 'glass'];
  const granSources: FloorTheme['granularSource'][] = ['crypt_choir', 'plasma_shimmer', 'beast_throat'];
  const drumGrooves: FloorTheme['drumGroove'][] = ['driving', 'syncopated', 'halftime', 'tribal'];
  const arpModes: FloorTheme['arpMode'][] = ['up', 'down', 'pendulum', 'broken'];
  const noiseColors: NoiseColor[] = ['pink', 'brown', 'pink', 'brown'];
  const leadEngines: FloorTheme['leadEngine'][] = ['karplus', 'waveguide', 'additive', 'wavetable'];

  const leadTimbre = leadTimbres[(safeFloor - 1) % leadTimbres.length];
  const padTimbre = padTimbres[(safeFloor + Math.floor(rng() * 2)) % padTimbres.length];
  const granularSource = granSources[(safeFloor + Math.floor(rng() * granSources.length)) % granSources.length];
  const drumGroove = drumGrooves[(safeFloor - 1) % drumGrooves.length];
  const arpMode = arpModes[(safeFloor * 3 + Math.floor(rng() * 2)) % arpModes.length];
  const leadEngine = leadEngines[(safeFloor - 1) % leadEngines.length];
  const noiseColor = noiseColors[(safeFloor - 1) % noiseColors.length];
  const kickFreq = 42 + ((safeFloor * 7) % 22) + Math.floor(tension * 8);
  const bassBrightness = 0.32 + ((safeFloor * 13) % 40) / 100 + tension * 0.12;
  const ambientDensity = 0.25 + tension * 0.7;
  const dissonanceCents = Math.floor(tension * 28 + rng() * 6);
  const waveguideBreath = 0.22 + tension * 0.45 + rng() * 0.08;

  const signatureHash = [
    safeFloor,
    scaleObj.name,
    rootMidi,
    bpm,
    leadTimbre,
    padTimbre,
    granularSource,
    drumGroove,
    arpMode,
    leadEngine,
    noiseColor,
    melodyExplore.filter(Boolean).slice(0, 8).join('.')
  ].join('|');

  return {
    floor: safeFloor,
    scaleName: scaleObj.name,
    rootMidi,
    bpm,
    tension,
    progressionA,
    progressionB,
    melodyExplore,
    melodyCombat,
    leadTimbre,
    padTimbre,
    granularSource,
    drumGroove,
    arpMode,
    kickFreq,
    bassBrightness,
    noiseColor,
    ambientDensity,
    dissonanceCents,
    waveguideBreath,
    leadEngine,
    signatureHash
  };
}

export interface AudioConfig {
  masterMuted: boolean;
  musicEnabled: boolean;
  musicVolume: number; // 0..1
  sfxEnabled: boolean;
  sfxVolume: number; // 0..1
  ambientReverbEnabled: boolean;
}

class HybridAcousticAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private masterCompressor: DynamicsCompressorNode | null = null;
  private musicDryGain: GainNode | null = null;
  private musicWetSend: GainNode | null = null;
  private sfxDryGain: GainNode | null = null;
  private sfxWetSend: GainNode | null = null;
  private reverbConvolver: ConvolverNode | null = null;
  private reverbReturnGain: GainNode | null = null;

  private wavetables: WavetableBank | null = null;
  private granular: GranularEngine | null = null;

  private isMuted: boolean = false;
  private musicEnabled: boolean = true;
  private musicVolume: number = 0.7;
  private sfxEnabled: boolean = true;
  private sfxVolume: number = 0.85;
  private ambientReverbEnabled: boolean = true;

  private isMusicPlaying: boolean = false;
  private isMusicPaused: boolean = false;
  private schedulerTimer: ReturnType<typeof setInterval> | null = null;
  private nextStepTime: number = 0;
  private step: number = 0;

  private intensity: MusicIntensity = 'title';
  private currentFloor: number = 1;
  private currentFloorTheme: FloorTheme = generateFloorTheme(1);
  private floorThemeCache = new Map<number, FloorTheme>();
  private footstepLeft: boolean = true;

  // Cooldown throttles so overlapping events never distort or spam
  private lastUiSoundMs: number = 0;
  private lastStepSoundMs: number = 0;
  private lastAlertSoundMs: number = 0;
  private lastPickupSoundMs: number = 0;

  private ensureContext(): boolean {
    if (typeof window === 'undefined') return false;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return false;
      this.ctx = new AudioCtx();

      // Master dynamics compressor keeps dense granular/wavetable mixes punchy and clip-free
      this.masterCompressor = this.ctx.createDynamicsCompressor();
      this.masterCompressor.threshold.setValueAtTime(-14, this.ctx.currentTime);
      this.masterCompressor.knee.setValueAtTime(18, this.ctx.currentTime);
      this.masterCompressor.ratio.setValueAtTime(4, this.ctx.currentTime);
      this.masterCompressor.attack.setValueAtTime(0.004, this.ctx.currentTime);
      this.masterCompressor.release.setValueAtTime(0.18, this.ctx.currentTime);

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.78, this.ctx.currentTime);

      this.masterCompressor.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      // Convolution Reverb Bus (Cyber-Crypt Impulse Response)
      this.reverbConvolver = this.ctx.createConvolver();
      this.reverbConvolver.buffer = createCryptImpulseResponse(this.ctx, 2.05);

      this.reverbReturnGain = this.ctx.createGain();
      this.reverbReturnGain.gain.setValueAtTime(this.ambientReverbEnabled ? 0.45 : 0, this.ctx.currentTime);
      this.reverbConvolver.connect(this.reverbReturnGain);
      this.reverbReturnGain.connect(this.masterCompressor);

      // Dry / Wet routing buses for Music and SFX
      const mScale = this.musicEnabled ? this.musicVolume : 0;
      const sScale = this.sfxEnabled ? this.sfxVolume : 0;

      this.musicDryGain = this.ctx.createGain();
      this.musicDryGain.gain.setValueAtTime(0.36 * mScale, this.ctx.currentTime);
      this.musicDryGain.connect(this.masterCompressor);

      this.musicWetSend = this.ctx.createGain();
      this.musicWetSend.gain.setValueAtTime(0.30 * mScale, this.ctx.currentTime);
      this.musicWetSend.connect(this.reverbConvolver);

      this.sfxDryGain = this.ctx.createGain();
      this.sfxDryGain.gain.setValueAtTime(0.68 * sScale, this.ctx.currentTime);
      this.sfxDryGain.connect(this.masterCompressor);

      this.sfxWetSend = this.ctx.createGain();
      this.sfxWetSend.gain.setValueAtTime(0.34 * sScale, this.ctx.currentTime);
      this.sfxWetSend.connect(this.reverbConvolver);

      // Synthesis Banks
      this.wavetables = new WavetableBank(this.ctx);
      this.granular = new GranularEngine(this.ctx);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return true;
  }

  public unlockFromGesture() {
    this.ensureContext();
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.78, this.ctx.currentTime, 0.03);
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setAudioSettings(partial: Partial<AudioConfig>) {
    const wasMusicOn = this.musicEnabled && !this.isMuted;
    if (typeof partial.masterMuted === 'boolean') this.isMuted = partial.masterMuted;
    if (typeof partial.musicEnabled === 'boolean') this.musicEnabled = partial.musicEnabled;
    if (typeof partial.musicVolume === 'number') this.musicVolume = Math.max(0, Math.min(1, partial.musicVolume));
    if (typeof partial.sfxEnabled === 'boolean') this.sfxEnabled = partial.sfxEnabled;
    if (typeof partial.sfxVolume === 'number') this.sfxVolume = Math.max(0, Math.min(1, partial.sfxVolume));
    if (typeof partial.ambientReverbEnabled === 'boolean') this.ambientReverbEnabled = partial.ambientReverbEnabled;

    if (this.ctx) {
      const now = this.ctx.currentTime;
      const mScale = this.musicEnabled ? this.musicVolume : 0;
      const sScale = this.sfxEnabled ? this.sfxVolume : 0;
      this.masterGain?.gain.setTargetAtTime(this.isMuted ? 0 : 0.78, now, 0.03);
      this.musicDryGain?.gain.setTargetAtTime(0.36 * mScale, now, 0.03);
      this.musicWetSend?.gain.setTargetAtTime(0.30 * mScale, now, 0.03);
      this.sfxDryGain?.gain.setTargetAtTime(0.68 * sScale, now, 0.03);
      this.sfxWetSend?.gain.setTargetAtTime(0.34 * sScale, now, 0.03);
      this.reverbReturnGain?.gain.setTargetAtTime(this.ambientReverbEnabled ? 0.45 : 0, now, 0.04);
    }

    if (!this.musicEnabled || this.isMuted) {
      this.stopMusic();
    } else if (!wasMusicOn) {
      // Music just turned on — boot the procedural scheduler
      this.startMusic();
    }
  }

  public getAudioSettings(): AudioConfig {
    return {
      masterMuted: this.isMuted,
      musicEnabled: this.musicEnabled,
      musicVolume: this.musicVolume,
      sfxEnabled: this.sfxEnabled,
      sfxVolume: this.sfxVolume,
      ambientReverbEnabled: this.ambientReverbEnabled
    };
  }

  private getThemeForFloor(floor: number): FloorTheme {
    const safe = Math.max(1, Math.floor(floor));
    let theme = this.floorThemeCache.get(safe);
    if (!theme) {
      theme = generateFloorTheme(safe);
      this.floorThemeCache.set(safe, theme);
    }
    return theme;
  }

  public setMusicContext(info: MusicContextInfo) {
    const prevWasMenu = this.intensity === 'title';
    const prevFloor = this.currentFloor;
    const floorVal = Math.max(1, info.floor ?? this.currentFloor ?? 1);

    if (info.scene === 'login' || info.scene === 'title') {
      // Menu music ONLY on login/title screens
      this.isMusicPaused = false;
      this.intensity = 'title';
      if (!prevWasMenu && this.ctx) {
        this.step = 0;
        this.nextStepTime = this.ctx.currentTime + 0.04;
      }
      return;
    }

    if (info.scene === 'paused' || info.scene === 'gameover') {
      // NEVER play menu music inside the game (paused/gameover stays quiet or paused)
      this.isMusicPaused = true;
      return;
    }

    // Active In-Game Floor Music (menu music completely excluded)
    this.isMusicPaused = false;
    this.currentFloor = floorVal;
    this.currentFloorTheme = this.getThemeForFloor(floorVal);

    if (info.bossVisible || (floorVal > 0 && floorVal % 5 === 0 && (info.nearbyEnemies ?? 0) > 0)) {
      this.intensity = 'boss';
    } else if ((info.nearbyEnemies ?? 0) > 0 || info.lowHp) {
      this.intensity = 'combat';
    } else {
      this.intensity = 'explore';
    }

    // Reset musical phase cleanly when entering game from menu OR changing dungeon floor
    if ((prevWasMenu || prevFloor !== floorVal) && this.ctx) {
      this.step = 0;
      this.nextStepTime = this.ctx.currentTime + 0.04;
    }
  }

  public startMusic(mode?: MusicIntensity) {
    if (mode) this.intensity = mode;
    this.isMusicPaused = false;
    if (!this.musicEnabled || this.isMuted || this.musicVolume <= 0.01) return;
    if (!this.ensureContext() || !this.ctx) return;
    if (this.isMusicPlaying) return;

    this.isMusicPlaying = true;
    this.step = 0;
    this.nextStepTime = this.ctx.currentTime + 0.04;

    // Lookahead scheduler (every 30ms, schedules notes up to 110ms ahead cleanly)
    this.schedulerTimer = setInterval(() => {
      this.scheduleMusicAhead();
    }, 30);
  }

  public stopMusic() {
    if (this.schedulerTimer) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
    this.isMusicPlaying = false;
    this.isMusicPaused = false;
  }

  public dispose() {
    this.stopMusic();
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close().catch(() => {});
    }
    this.ctx = null;
    this.masterGain = null;
    this.masterCompressor = null;
    this.musicDryGain = null;
    this.musicWetSend = null;
    this.sfxDryGain = null;
    this.sfxWetSend = null;
    this.reverbConvolver = null;
    this.reverbReturnGain = null;
    this.wavetables = null;
    this.granular = null;
  }

  private getCurrentStepDurationSec(): number {
    if (this.intensity === 'title') {
      // Fixed menu tempo — never tied to dungeon floor themes
      return 60 / 86 / 4;
    }
    const theme = this.currentFloorTheme;
    const tensionBoost = Math.floor(theme.tension * 14);
    const baseBpm = theme.bpm;
    const bpm =
      this.intensity === 'explore'
        ? baseBpm
        : this.intensity === 'combat'
        ? Math.min(148, baseBpm + 8 + tensionBoost)
        : Math.min(158, baseBpm + 14 + tensionBoost);
    return 60 / bpm / 4; // 16th-note step duration
  }

  private orderArpNotes(notes: number[], mode: FloorTheme['arpMode'], barTotal: number): number[] {
    const copy = [...notes];
    switch (mode) {
      case 'down':
        return copy.reverse();
      case 'pendulum': {
        const up = [...copy];
        const down = [...copy].reverse().slice(1, -1);
        return barTotal % 2 === 0 ? up : [...up, ...down];
      }
      case 'broken': {
        const out: number[] = [];
        for (let i = 0; i < copy.length; i += 2) {
          out.push(copy[i]);
          if (i + 1 < copy.length) out.push(copy[i + 1]);
        }
        // Rotate by floor so broken patterns differ per level
        const rot = (this.currentFloorTheme.floor + barTotal) % Math.max(1, out.length);
        return out.slice(rot).concat(out.slice(0, rot));
      }
      case 'up':
      default:
        return copy;
    }
  }

  private playFloorLead(
    dry: GainNode,
    wet: GainNode | null,
    midi: number,
    when: number,
    stepDur: number,
    theme: FloorTheme
  ) {
    if (!this.ctx || !this.wavetables) return;
    const cents = theme.dissonanceCents * (this.intensity === 'explore' ? 0.35 : 1);
    const freq = midiToFreq(midi) * Math.pow(2, cents / 1200);
    const gain =
      this.intensity === 'explore' ? 0.07 : this.intensity === 'combat' ? 0.09 : 0.11;
    const dur = stepDur * (2.8 + theme.tension * 1.4);
    const pan = -0.16 + Math.sin(theme.floor + when) * 0.22;

    switch (theme.leadEngine) {
      case 'karplus':
        playKarplusStrong(
          this.ctx,
          dry,
          wet,
          {
            freq,
            duration: dur * 1.2,
            decay: 0.988 - theme.tension * 0.01,
            brightness: 0.48 + theme.tension * 0.28,
            pickPosition: 0.16 + (theme.floor % 5) * 0.04,
            stiffness: theme.tension * 0.08,
            dampingCutoff: 1800 + theme.tension * 3200,
            gain,
            pan,
            reverbSend: this.ambientReverbEnabled ? 0.32 : 0.06
          },
          when
        );
        break;
      case 'waveguide':
        playWaveguide(
          this.ctx,
          dry,
          wet,
          {
            freq,
            duration: dur * 1.1,
            breath: theme.waveguideBreath,
            reflection: 0.96 - theme.tension * 0.04,
            brightness: 0.4 + theme.tension * 0.35,
            gain: gain * 0.95,
            pan,
            reverbSend: this.ambientReverbEnabled ? 0.38 : 0.06
          },
          when
        );
        break;
      case 'additive':
        playAdditiveBell(
          this.ctx,
          dry,
          wet,
          {
            freq,
            duration: dur * 1.35,
            gain: gain * 0.85,
            pan,
            reverbSend: this.ambientReverbEnabled ? 0.42 : 0.06,
            inharmonicity: 0.008 + theme.tension * 0.03,
            attack: 0.01
          },
          when
        );
        break;
      case 'wavetable':
      default:
        this.wavetables.playNote(dry, wet, {
          freq,
          startTime: when,
          duration: dur,
          timbre: this.intensity === 'boss' ? 'brass' : theme.leadTimbre,
          gain,
          pan,
          reverbSend: this.ambientReverbEnabled ? 0.4 : 0.05,
          vibratoDepthCents: 8 + theme.tension * 10,
          filterCutoffPeak: 2200 + theme.tension * 2200,
          filterCutoffSustain: 800 + theme.tension * 600,
          attack: 0.035,
          release: 0.32
        });
        break;
    }
  }

  private scheduleMusicAhead() {
    if (!this.ctx || !this.musicDryGain || this.isMuted || !this.musicEnabled || this.musicVolume <= 0.01 || this.isMusicPaused) return;
    if (this.ctx.state === 'suspended') return;

    const lookaheadSec = 0.11;
    // Recover gracefully if tab was backgrounded or unpaused
    if (this.nextStepTime < this.ctx.currentTime - 0.25) {
      this.nextStepTime = this.ctx.currentTime + 0.03;
    }

    while (this.nextStepTime < this.ctx.currentTime + lookaheadSec) {
      const stepDur = this.getCurrentStepDurationSec();
      // Subtle human groove swing on odd 16th notes
      const swingOffset = this.step % 2 === 1 ? stepDur * 0.09 : 0;
      this.scheduleBeatStep(this.step, this.nextStepTime + swingOffset, stepDur);
      this.nextStepTime += stepDur;
      this.step++;
    }
  }

  private scheduleBeatStep(globalStep: number, when: number, stepDur: number) {
    if (!this.ctx || !this.musicDryGain || !this.wavetables || !this.granular) return;

    const s = globalStep % 16;
    const barTotal = Math.floor(globalStep / 16);
    const sectionB = Math.floor(barTotal / 4) % 2 === 1;
    const dry = this.musicDryGain;
    const wet = this.musicWetSend;

    // =========================================================================
    // A. MENU — FIXED soundtrack (never uses floor seeds / never plays in dungeon)
    // =========================================================================
    if (this.intensity === 'title') {
      const prog = sectionB ? MENU_PROGRESSION_B : MENU_PROGRESSION_A;
      const chord = prog[barTotal % 4];

      // Soft cello pad every 4 bars
      if (s === 0 && barTotal % 4 === 0) {
        chord.pad.forEach((midi, idx) => {
          this.wavetables!.playNote(dry, wet, {
            freq: midiToFreq(midi),
            startTime: when + idx * 0.06,
            duration: stepDur * 28,
            timbre: 'cello',
            gain: 0.052,
            pan: -0.35 + idx * 0.22,
            reverbSend: this.ambientReverbEnabled ? 0.52 : 0.05,
            vibratoDepthCents: 7,
            filterCutoffPeak: 900,
            filterCutoffSustain: 360,
            attack: 0.7,
            release: 1.2
          });
        });
      }

      // Fixed Karplus-Strong bass pulse on downbeats of even bars
      if (barTotal % 2 === 0 && s === 0) {
        playKarplusStrong(
          this.ctx,
          dry,
          wet,
          {
            freq: midiToFreq(chord.bass[0]),
            duration: stepDur * 6,
            decay: 0.991,
            brightness: 0.42,
            pickPosition: 0.22,
            dampingCutoff: 900,
            gain: 0.11,
            reverbSend: 0.12
          },
          when
        );
      }

      // Fixed additive glass motif (MENU_MELODY) — never procedural per floor
      const melMidi = MENU_MELODY[s + (barTotal % 2) * 16];
      if (melMidi > 0 && (s === 4 || s === 10 || s === 14)) {
        playAdditiveBell(
          this.ctx,
          dry,
          wet,
          {
            freq: midiToFreq(melMidi),
            duration: stepDur * 5,
            gain: 0.055,
            pan: 0.12,
            reverbSend: this.ambientReverbEnabled ? 0.48 : 0.05,
            inharmonicity: 0.01,
            attack: 0.02
          },
          when
        );
      }

      // Sparse pink-noise crypt breeze (fixed, gentle)
      if (s === 0 && barTotal % 8 === 0) {
        playAmbientNoise(
          this.ctx,
          dry,
          wet,
          {
            color: 'pink',
            duration: stepDur * 20,
            gain: 0.028,
            pan: -0.2,
            cutoffStart: 700,
            cutoffEnd: 280,
            lfoRateHz: 0.12,
            lfoDepthHz: 120,
            reverbSend: 0.55
          },
          when
        );
      }
      return;
    }

    // =========================================================================
    // B. PER-FLOOR PROCEDURAL SCORE (unique seed + ascending tension)
    // =========================================================================
    const theme = this.currentFloorTheme;
    const tension = theme.tension;
    const prog = sectionB ? theme.progressionB : theme.progressionA;
    const chord = prog[barTotal % prog.length];
    const combatLike = this.intensity === 'combat' || this.intensity === 'boss';

    // 1. Harmonic pad (every 4 bars; brighter/denser with tension)
    if (s === 0 && barTotal % 4 === 0) {
      const padNotes =
        this.intensity === 'boss'
          ? [chord.pad[0] - 12, chord.pad[1], chord.pad[2], chord.pad[3]]
          : chord.pad;
      padNotes.forEach((midi, idx) => {
        const timbre =
          this.intensity === 'boss' ? (idx === 0 ? 'reese' : 'brass') : theme.padTimbre;
        this.wavetables!.playNote(dry, wet, {
          freq: midiToFreq(midi) * Math.pow(2, (idx === 3 ? theme.dissonanceCents * 0.4 : 0) / 1200),
          startTime: when + idx * 0.035,
          duration: stepDur * (20 + tension * 6),
          timbre,
          gain: (this.intensity === 'explore' ? 0.05 : 0.07) * (1 + tension * 0.25),
          pan: -0.42 + idx * 0.26,
          reverbSend: this.ambientReverbEnabled ? 0.4 + tension * 0.12 : 0.05,
          vibratoDepthCents: 6 + tension * 8,
          filterCutoffPeak: (this.intensity === 'boss' ? 2600 : 1200) + tension * 1600,
          filterCutoffSustain: 480 + tension * 400,
          attack: 0.4,
          release: 0.85
        });
      });
    }

    // 2. Karplus-Strong bass — denser as floors deepen
    const bassEvery =
      this.intensity === 'explore' ? (tension > 0.55 ? 8 : 16) : tension > 0.4 ? 4 : 8;
    if (s % bassEvery === 0) {
      const bassMidi = chord.bass[Math.floor(s / 4) % chord.bass.length];
      playKarplusStrong(
        this.ctx,
        dry,
        wet,
        {
          freq: midiToFreq(bassMidi),
          duration: stepDur * (3.8 + tension),
          decay: 0.988 - tension * 0.012,
          brightness:
            combatLike ? Math.min(0.78, theme.bassBrightness + 0.12) : theme.bassBrightness,
          pickPosition: 0.14 + (theme.floor % 4) * 0.05,
          stiffness: tension * 0.06,
          dampingCutoff: 1000 + tension * 1800,
          gain: 0.12 + tension * 0.05,
          pan: 0,
          reverbSend: 0.08
        },
        when
      );
    }

    // 3. Floor-unique Karplus / waveguide / additive / wavetable lead
    const leadBars = combatLike || tension > 0.6 || barTotal % 2 === 0;
    if (leadBars) {
      const melodyBank = this.intensity === 'explore' ? theme.melodyExplore : theme.melodyCombat;
      const melStep = (globalStep + theme.floor * 5 + barTotal * 3) % melodyBank.length;
      const melMidi = melodyBank[melStep];
      const leadStride = combatLike ? (tension > 0.7 ? 2 : 4) : 4;
      if (melMidi > 0 && s % leadStride === 0) {
        this.playFloorLead(dry, wet, melMidi, when, stepDur, theme);
      }
    }

    // 4. Arpeggio via Karplus-Strong (pattern unique per floor arpMode)
    const arpActive =
      combatLike || (tension > 0.35 && barTotal % 2 === 1) || (s === 0 && barTotal % 4 === 2);
    if (arpActive && s % (combatLike ? 2 : 4) === 0) {
      const ordered = this.orderArpNotes(chord.arp, theme.arpMode, barTotal);
      const arpMidi = ordered[(Math.floor(s / 2) + theme.floor) % ordered.length];
      playKarplusStrong(
        this.ctx,
        dry,
        wet,
        {
          freq: midiToFreq(arpMidi),
          duration: stepDur * 2.4,
          decay: 0.984,
          brightness: 0.55 + tension * 0.25,
          pickPosition: 0.2 + (s % 3) * 0.06,
          stiffness: 0.02 + tension * 0.07,
          dampingCutoff: 2400 + tension * 3000,
          gain: 0.045 + tension * 0.035,
          pan: -0.35 + (s / 16) * 0.7,
          reverbSend: this.ambientReverbEnabled ? 0.28 : 0.05
        },
        when
      );
    }

    // 5. Waveguide tube ghost tones (wind instruments) — rarer early, constant later
    if (s === 6 && (barTotal + theme.floor) % Math.max(1, 4 - Math.floor(tension * 3)) === 0) {
      playWaveguide(
        this.ctx,
        dry,
        wet,
        {
          freq: midiToFreq(chord.pad[1]),
          duration: stepDur * (10 + tension * 8),
          breath: theme.waveguideBreath,
          reflection: 0.975 - tension * 0.05,
          brightness: 0.35 + tension * 0.4,
          gain: 0.04 + tension * 0.04,
          pan: 0.3,
          reverbSend: this.ambientReverbEnabled ? 0.5 : 0.06
        },
        when
      );
    }

    // 6. Granular atmosphere cloud unique per floor source
    if (s === 0 && barTotal % Math.max(2, 5 - Math.floor(tension * 3)) === 0) {
      this.granular.playCloud(dry, wet, {
        source: theme.granularSource,
        startTime: when,
        cloudDuration: stepDur * (12 + tension * 10),
        grainCount: Math.floor(10 + theme.ambientDensity * 22),
        grainSizeSec: 0.028 + tension * 0.02,
        pitchRatio: 0.92 + (theme.floor % 5) * 0.04,
        pitchJitter: 0.06 + tension * 0.08,
        stereoSpread: 0.8,
        lowpassStart: 2800 - tension * 900,
        lowpassEnd: 700 - tension * 250,
        gain: 0.035 + theme.ambientDensity * 0.05,
        reverbSend: this.ambientReverbEnabled ? 0.55 : 0.08
      });
    }

    // 7. Pink/Brown filtered noise — crypt wind intensifies with depth
    if (s === 0 && barTotal % Math.max(1, 6 - Math.floor(tension * 4)) === 0) {
      playAmbientNoise(
        this.ctx,
        dry,
        wet,
        {
          color: theme.noiseColor,
          duration: stepDur * (14 + tension * 12),
          gain: 0.018 + theme.ambientDensity * 0.045,
          pan: ((theme.floor % 2) * 2 - 1) * 0.35,
          cutoffStart: 1100 - tension * 400,
          cutoffEnd: 380 - tension * 160,
          lfoRateHz: 0.1 + tension * 0.25,
          lfoDepthHz: 140 + tension * 220,
          reverbSend: 0.5
        },
        when
      );
    }

    // 8. Percussion groove (modal membrane / waveguide drums) — denser with floor + combat
    const groove = theme.drumGroove;
    let hit = false;
    if (groove === 'driving') hit = s === 0 || s === 8 || (combatLike && s === 4);
    else if (groove === 'syncopated') hit = s === 2 || s === 6 || s === 10 || (combatLike && s === 14);
    else if (groove === 'halftime') hit = s === 0 || (combatLike && s === 12);
    else if (groove === 'tribal') hit = s === 0 || s === 3 || s === 6 || s === 10 || (tension > 0.5 && s === 13);

    // Explore only gets sparse kick on deep floors; combat/boss always
    if (hit && (combatLike || this.intensity === 'boss' || (tension > 0.5 && s === 0))) {
      playModalMembrane(
        this.ctx,
        dry,
        wet,
        {
          baseFreq: theme.kickFreq,
          startFreqMult: 2.0 + tension * 0.6,
          pitchDropTime: 0.04,
          duration: 0.16 + tension * 0.06,
          modes: [1.0, 1.59, 2.14],
          modeWeights: [1.0, 0.28, 0.12],
          noiseBurstGain: 0.05 + tension * 0.06,
          noiseCutoff: 600 + tension * 500,
          filterPeak: 800 + tension * 400,
          filterEnd: 90,
          gain: this.intensity === 'boss' ? 0.24 : 0.14 + tension * 0.08,
          reverbSend: 0.1
        },
        when
      );
    }

    // 9. Boss / high-tension additive alarm bell
    if ((this.intensity === 'boss' || tension > 0.75) && s === 12 && barTotal % 2 === 0) {
      playAdditiveBell(
        this.ctx,
        dry,
        wet,
        {
          freq: midiToFreq(chord.pad[0] + 19),
          duration: stepDur * 6,
          gain: 0.07 + tension * 0.04,
          pan: -0.15,
          reverbSend: 0.45,
          inharmonicity: 0.02 + tension * 0.04
        },
        when
      );
    }
  }

  // =========================================================================
  // UI INTERACTION SOUNDS (Buttons, Modals, Errors, Confirmations)
  // =========================================================================
  public playUI(type: UISoundType = 'click') {
    if (this.isMuted || !this.sfxEnabled || this.sfxVolume <= 0.01) return;
    if (!this.ensureContext() || !this.ctx || !this.sfxDryGain) return;

    const nowMs = performance.now();
    if (type === 'click' && nowMs - this.lastUiSoundMs < 32) return;
    this.lastUiSoundMs = nowMs;

    const now = this.ctx.currentTime;
    const dry = this.sfxDryGain;
    const wet = this.sfxWetSend;

    switch (type) {
      case 'click': {
        // Tactile physical micro-membrane switch + crystal harmonic tap
        playModalMembrane(
          this.ctx,
          dry,
          wet,
          {
            baseFreq: 680 + Math.random() * 140,
            startFreqMult: 1.5,
            pitchDropTime: 0.012,
            duration: 0.045,
            modes: [1.0, 2.15],
            modeWeights: [0.7, 0.3],
            noiseBurstGain: 0.15,
            noiseCutoff: 3600,
            filterPeak: 4200,
            filterEnd: 1100,
            gain: 0.14,
            reverbSend: 0.12
          },
          now
        );
        break;
      }
      case 'confirm': {
        playKarplusStrong(
          this.ctx,
          dry,
          wet,
          { freq: 587.33, duration: 0.18, decay: 0.985, brightness: 0.7, gain: 0.16, reverbSend: 0.25 },
          now
        );
        playKarplusStrong(
          this.ctx,
          dry,
          wet,
          { freq: 880.0, duration: 0.24, decay: 0.988, brightness: 0.78, gain: 0.18, reverbSend: 0.3 },
          now + 0.055
        );
        break;
      }
      case 'open': {
        this.wavetables?.playNote(dry, wet, {
          freq: 440,
          startTime: now,
          duration: 0.14,
          timbre: 'glass',
          gain: 0.1,
          reverbSend: 0.28,
          filterCutoffPeak: 3800,
          filterCutoffSustain: 1200,
          attack: 0.01,
          release: 0.08
        });
        break;
      }
      case 'close': {
        this.wavetables?.playNote(dry, wet, {
          freq: 330,
          startTime: now,
          duration: 0.12,
          timbre: 'glass',
          gain: 0.085,
          reverbSend: 0.22,
          filterCutoffPeak: 2200,
          filterCutoffSustain: 600,
          attack: 0.005,
          release: 0.07
        });
        break;
      }
      case 'error': {
        playKarplusStrong(
          this.ctx,
          dry,
          wet,
          { freq: 138.59, duration: 0.16, decay: 0.95, brightness: 0.35, gain: 0.2, reverbSend: 0.15 },
          now
        );
        playKarplusStrong(
          this.ctx,
          dry,
          wet,
          { freq: 110.0, duration: 0.2, decay: 0.94, brightness: 0.3, gain: 0.22, reverbSend: 0.15 },
          now + 0.07
        );
        break;
      }
    }
  }

  // =========================================================================
  // GAMEPLAY SOUND EFFECTS (Physical Modeling + Wavetables + Granular + Reverb)
  // =========================================================================
  public playSFX(type: SoundEventType) {
    if (this.isMuted || !this.sfxEnabled || this.sfxVolume <= 0.01) return;
    if (!this.ensureContext() || !this.ctx || !this.sfxDryGain) return;

    const now = this.ctx.currentTime;
    const nowMs = performance.now();
    const dry = this.sfxDryGain;
    const wet = this.sfxWetSend;

    switch (type) {
      case 'step': {
        if (nowMs - this.lastStepSoundMs < 45) return;
        this.lastStepSoundMs = nowMs;
        this.footstepLeft = !this.footstepLeft;
        const baseStepF = this.footstepLeft ? 105 : 118;
        // Tactical boot sole hitting brushed metal/stone dungeon floor
        playModalMembrane(
          this.ctx,
          dry,
          wet,
          {
            baseFreq: baseStepF,
            startFreqMult: 1.55,
            pitchDropTime: 0.022,
            duration: 0.085,
            modes: [1.0, 1.47, 2.25],
            modeWeights: [0.85, 0.35, 0.14],
            noiseBurstGain: 0.32,
            noiseCutoff: this.footstepLeft ? 1450 : 1750,
            filterPeak: 2200,
            filterEnd: 320,
            gain: 0.18,
            pan: this.footstepLeft ? -0.14 : 0.14,
            reverbSend: 0.26
          },
          now
        );
        break;
      }

      case 'blocked': {
        playModalMembrane(
          this.ctx,
          dry,
          wet,
          {
            baseFreq: 76,
            startFreqMult: 1.25,
            pitchDropTime: 0.02,
            duration: 0.09,
            modes: [1.0, 1.4],
            modeWeights: [0.9, 0.2],
            noiseBurstGain: 0.14,
            noiseCutoff: 480,
            filterPeak: 600,
            filterEnd: 150,
            gain: 0.16,
            reverbSend: 0.18
          },
          now
        );
        break;
      }

      case 'hit': {
        // Modal weapon impact + high metallic blade ring (Karplus-Strong stiff string)
        playModalMembrane(
          this.ctx,
          dry,
          wet,
          {
            baseFreq: 132,
            startFreqMult: 2.1,
            pitchDropTime: 0.032,
            duration: 0.14,
            modes: [1.0, 1.62, 2.41],
            modeWeights: [1.0, 0.45, 0.22],
            noiseBurstGain: 0.42,
            noiseCutoff: 2400,
            filterPeak: 4200,
            filterEnd: 420,
            gain: 0.32,
            reverbSend: 0.24
          },
          now
        );
        playKarplusStrong(
          this.ctx,
          dry,
          wet,
          {
            freq: 392,
            duration: 0.16,
            decay: 0.96,
            brightness: 0.78,
            stiffness: 0.09,
            gain: 0.18,
            reverbSend: 0.25
          },
          now
        );
        break;
      }

      case 'crit': {
        // Visceral sub-membrane slam + metallic Karplus-Strong slash + granular plasma burst
        playModalMembrane(
          this.ctx,
          dry,
          wet,
          {
            baseFreq: 88,
            startFreqMult: 3.1,
            pitchDropTime: 0.055,
            duration: 0.28,
            modes: [1.0, 1.48, 2.15, 2.9],
            modeWeights: [1.0, 0.55, 0.32, 0.18],
            noiseBurstGain: 0.58,
            noiseCutoff: 3400,
            filterPeak: 7200,
            filterEnd: 520,
            gain: 0.45,
            reverbSend: 0.38
          },
          now
        );
        playKarplusStrong(
          this.ctx,
          dry,
          wet,
          {
            freq: 659.25,
            duration: 0.32,
            decay: 0.985,
            brightness: 0.88,
            stiffness: 0.12,
            gain: 0.26,
            reverbSend: 0.42
          },
          now + 0.008
        );
        this.granular?.playCloud(dry, wet, {
          source: 'plasma_shimmer',
          startTime: now,
          cloudDuration: 0.18,
          grainCount: 10,
          grainSizeSec: 0.024,
          pitchRatio: 1.25,
          pitchJitter: 0.2,
          lowpassStart: 6800,
          lowpassEnd: 1200,
          gain: 0.22,
          reverbSend: 0.45
        });
        break;
      }

      case 'ranged_shot': {
        // Waveguide / wavetable high-velocity pulse bolt
        this.wavetables?.playNote(dry, wet, {
          freq: 720,
          startTime: now,
          duration: 0.14,
          timbre: 'koto',
          gain: 0.22,
          reverbSend: 0.28,
          filterCutoffPeak: 6400,
          filterCutoffSustain: 900,
          attack: 0.004,
          release: 0.09
        });
        playKarplusStrong(
          this.ctx,
          dry,
          wet,
          { freq: 440, duration: 0.13, decay: 0.95, brightness: 0.85, stiffness: 0.08, gain: 0.15, reverbSend: 0.22 },
          now
        );
        break;
      }

      case 'player_hurt': {
        playModalMembrane(
          this.ctx,
          dry,
          wet,
          {
            baseFreq: 74,
            startFreqMult: 1.85,
            pitchDropTime: 0.07,
            duration: 0.24,
            modes: [1.0, 1.38, 1.92],
            modeWeights: [1.0, 0.55, 0.3],
            noiseBurstGain: 0.48,
            noiseCutoff: 1100,
            filterPeak: 2400,
            filterEnd: 190,
            gain: 0.36,
            reverbSend: 0.3
          },
          now
        );
        this.wavetables?.playNote(dry, wet, {
          freq: 108,
          startTime: now,
          duration: 0.2,
          timbre: 'reese',
          gain: 0.16,
          reverbSend: 0.2,
          filterCutoffPeak: 1400,
          filterCutoffSustain: 280,
          attack: 0.005,
          release: 0.12
        });
        break;
      }

      case 'kill': {
        // Descending core implosion + granular scatter
        playModalMembrane(
          this.ctx,
          dry,
          wet,
          {
            baseFreq: 68,
            startFreqMult: 2.8,
            pitchDropTime: 0.18,
            duration: 0.34,
            modes: [1.0, 1.47, 2.21],
            modeWeights: [0.95, 0.45, 0.25],
            noiseBurstGain: 0.4,
            noiseCutoff: 1800,
            filterPeak: 3200,
            filterEnd: 180,
            gain: 0.32,
            reverbSend: 0.4
          },
          now
        );
        this.granular?.playCloud(dry, wet, {
          source: 'plasma_shimmer',
          startTime: now + 0.03,
          cloudDuration: 0.28,
          grainCount: 14,
          grainSizeSec: 0.028,
          pitchRatio: 0.8,
          pitchJitter: 0.28,
          lowpassStart: 4200,
          lowpassEnd: 420,
          gain: 0.2,
          reverbSend: 0.5
        });
        break;
      }

      case 'coin':
      case 'pickup': {
        if (nowMs - this.lastPickupSoundMs < 40) return;
        this.lastPickupSoundMs = nowMs;
        // Metallic Karplus-Strong chime pair
        playKarplusStrong(
          this.ctx,
          dry,
          wet,
          { freq: 880, duration: 0.22, decay: 0.988, brightness: 0.85, stiffness: 0.12, gain: 0.18, reverbSend: 0.32 },
          now
        );
        playKarplusStrong(
          this.ctx,
          dry,
          wet,
          { freq: 1318.51, duration: 0.28, decay: 0.99, brightness: 0.9, stiffness: 0.12, gain: 0.17, reverbSend: 0.36 },
          now + 0.055
        );
        break;
      }

      case 'chest': {
        playModalMembrane(
          this.ctx,
          dry,
          wet,
          {
            baseFreq: 190,
            duration: 0.08,
            modes: [1.0, 1.6],
            modeWeights: [0.7, 0.3],
            noiseBurstGain: 0.2,
            noiseCutoff: 2000,
            gain: 0.18,
            reverbSend: 0.2
          },
          now
        );
        [523.25, 659.25, 783.99].forEach((f, idx) => {
          if (!this.ctx) return;
          playKarplusStrong(
            this.ctx,
            dry,
            wet,
            { freq: f, duration: 0.38, decay: 0.992, brightness: 0.72, gain: 0.16, pan: -0.25 + idx * 0.25, reverbSend: 0.4 },
            now + 0.04 + idx * 0.055
          );
        });
        break;
      }

      case 'checkpoint': {
        [392.0, 587.33, 783.99].forEach((f, idx) => {
          this.wavetables?.playNote(dry, wet, {
            freq: f,
            startTime: now + idx * 0.07,
            duration: 0.45,
            timbre: 'glass',
            gain: 0.15,
            reverbSend: 0.55,
            filterCutoffPeak: 5200,
            filterCutoffSustain: 1800,
            attack: 0.015,
            release: 0.25
          });
        });
        break;
      }

      case 'shrine': {
        this.granular?.playCloud(dry, wet, {
          source: 'crypt_choir',
          startTime: now,
          cloudDuration: 0.6,
          grainCount: 16,
          grainSizeSec: 0.048,
          pitchRatio: 1.5,
          pitchJitter: 0.04,
          lowpassStart: 3800,
          lowpassEnd: 1400,
          gain: 0.22,
          reverbSend: 0.7
        });
        [293.66, 440.0, 587.33, 739.99, 880.0].forEach((f, idx) => {
          if (!this.ctx) return;
          playKarplusStrong(
            this.ctx,
            dry,
            wet,
            { freq: f, duration: 0.85, decay: 0.995, brightness: 0.68, gain: 0.15, pan: -0.4 + idx * 0.2, reverbSend: 0.55 },
            now + idx * 0.06
          );
        });
        break;
      }

      case 'potion_heal': {
        this.granular?.playCloud(dry, wet, {
          source: 'crypt_choir',
          startTime: now,
          cloudDuration: 0.35,
          grainCount: 12,
          grainSizeSec: 0.03,
          pitchRatio: 1.65,
          pitchJitter: 0.12,
          lowpassStart: 4200,
          lowpassEnd: 1800,
          gain: 0.18,
          reverbSend: 0.45
        });
        [440, 554.37, 659.25].forEach((f, idx) => {
          this.wavetables?.playNote(dry, wet, {
            freq: f,
            startTime: now + idx * 0.055,
            duration: 0.28,
            timbre: 'glass',
            gain: 0.12,
            reverbSend: 0.45,
            attack: 0.015,
            release: 0.15
          });
        });
        break;
      }

      case 'potion_energy': {
        this.granular?.playCloud(dry, wet, {
          source: 'plasma_shimmer',
          startTime: now,
          cloudDuration: 0.32,
          grainCount: 14,
          grainSizeSec: 0.022,
          pitchRatio: 1.4,
          pitchJitter: 0.18,
          lowpassStart: 5800,
          lowpassEnd: 2400,
          gain: 0.2,
          reverbSend: 0.42
        });
        break;
      }

      case 'teleport': {
        this.granular?.playCloud(dry, wet, {
          source: 'plasma_shimmer',
          startTime: now,
          cloudDuration: 0.48,
          grainCount: 22,
          grainSizeSec: 0.032,
          startOffsetRatio: 0.1,
          endOffsetRatio: 0.9,
          pitchRatio: 1.15,
          pitchJitter: 0.24,
          lowpassStart: 1200,
          lowpassEnd: 6500,
          gain: 0.24,
          reverbSend: 0.6
        });
        this.wavetables?.playNote(dry, wet, {
          freq: 293.66,
          startTime: now,
          duration: 0.42,
          timbre: 'glass',
          gain: 0.16,
          reverbSend: 0.55,
          filterCutoffPeak: 5800,
          filterCutoffSustain: 1600,
          attack: 0.06,
          release: 0.24
        });
        break;
      }

      case 'forge_success': {
        // Anvil physical metallic ring + ascending victory chime
        playModalMembrane(
          this.ctx,
          dry,
          wet,
          {
            baseFreq: 520,
            duration: 0.42,
            modes: [1.0, 1.47, 2.09, 2.86],
            modeWeights: [0.9, 0.65, 0.45, 0.25],
            noiseBurstGain: 0.32,
            noiseCutoff: 4200,
            filterPeak: 7800,
            filterEnd: 1400,
            gain: 0.32,
            reverbSend: 0.52
          },
          now
        );
        [587.33, 880, 1174.66].forEach((f, idx) => {
          if (!this.ctx) return;
          playKarplusStrong(
            this.ctx,
            dry,
            wet,
            { freq: f, duration: 0.5, decay: 0.994, brightness: 0.85, stiffness: 0.1, gain: 0.18, reverbSend: 0.48 },
            now + 0.07 + idx * 0.07
          );
        });
        break;
      }

      case 'forge_destroy': {
        playModalMembrane(
          this.ctx,
          dry,
          wet,
          {
            baseFreq: 140,
            startFreqMult: 1.6,
            pitchDropTime: 0.14,
            duration: 0.35,
            modes: [1.0, 1.33, 1.91],
            modeWeights: [1.0, 0.5, 0.3],
            noiseBurstGain: 0.55,
            noiseCutoff: 2800,
            filterPeak: 5500,
            filterEnd: 240,
            gain: 0.38,
            reverbSend: 0.4
          },
          now
        );
        this.granular?.playCloud(dry, wet, {
          source: 'plasma_shimmer',
          startTime: now,
          cloudDuration: 0.38,
          grainCount: 18,
          grainSizeSec: 0.02,
          pitchRatio: 0.65,
          pitchJitter: 0.35,
          lowpassStart: 5000,
          lowpassEnd: 350,
          gain: 0.24,
          reverbSend: 0.5
        });
        break;
      }

      case 'level_up': {
        // Multi-instrument epic ascension: Karplus-Strong harp + Wavetable brass/cello + Granular shimmer
        this.granular?.playCloud(dry, wet, {
          source: 'plasma_shimmer',
          startTime: now,
          cloudDuration: 0.72,
          grainCount: 22,
          grainSizeSec: 0.036,
          pitchRatio: 1.35,
          pitchJitter: 0.1,
          lowpassStart: 3200,
          lowpassEnd: 6800,
          gain: 0.2,
          reverbSend: 0.68
        });
        const notes = [293.66, 369.99, 440.0, 587.33, 739.99, 880.0, 1174.66];
        notes.forEach((f, idx) => {
          if (!this.ctx) return;
          playKarplusStrong(
            this.ctx,
            dry,
            wet,
            {
              freq: f,
              duration: 0.9,
              decay: 0.995,
              brightness: 0.78,
              gain: 0.16,
              pan: -0.45 + idx * 0.15,
              reverbSend: 0.5
            },
            now + idx * 0.068
          );
          if (idx >= 3) {
            this.wavetables?.playNote(dry, wet, {
              freq: f * 0.5,
              startTime: now + idx * 0.068,
              duration: 0.65,
              timbre: 'brass',
              gain: 0.12,
              reverbSend: 0.45,
              attack: 0.04,
              release: 0.32
            });
          }
        });
        break;
      }

      case 'death': {
        playModalMembrane(
          this.ctx,
          dry,
          wet,
          {
            baseFreq: 52,
            startFreqMult: 2.0,
            pitchDropTime: 0.22,
            duration: 0.75,
            modes: [1.0, 1.5, 2.05],
            modeWeights: [1.0, 0.45, 0.2],
            noiseBurstGain: 0.35,
            noiseCutoff: 600,
            filterPeak: 950,
            filterEnd: 110,
            gain: 0.42,
            reverbSend: 0.65
          },
          now
        );
        [146.83, 174.61, 207.65].forEach((f, i) => {
          this.wavetables?.playNote(dry, wet, {
            freq: f,
            startTime: now + 0.08 + i * 0.06,
            duration: 1.15,
            timbre: 'cello',
            gain: 0.16,
            reverbSend: 0.72,
            filterCutoffPeak: 1400,
            filterCutoffSustain: 340,
            attack: 0.12,
            release: 0.65
          });
        });
        this.granular?.playCloud(dry, wet, {
          source: 'crypt_choir',
          startTime: now + 0.1,
          cloudDuration: 0.95,
          grainCount: 16,
          grainSizeSec: 0.055,
          pitchRatio: 0.65,
          pitchJitter: 0.08,
          lowpassStart: 1200,
          lowpassEnd: 240,
          gain: 0.22,
          reverbSend: 0.75
        });
        break;
      }

      // ---------------------------------------------------------------------
      // POWERS / SKILLS (Differentiated by Elemental & Kinetic Profile)
      // ---------------------------------------------------------------------
      case 'skill_dash': {
        this.granular?.playCloud(dry, wet, {
          source: 'plasma_shimmer',
          startTime: now,
          cloudDuration: 0.24,
          grainCount: 14,
          grainSizeSec: 0.022,
          pitchRatio: 1.3,
          pitchJitter: 0.22,
          lowpassStart: 5800,
          lowpassEnd: 950,
          gain: 0.24,
          reverbSend: 0.45
        });
        playKarplusStrong(
          this.ctx,
          dry,
          wet,
          { freq: 440, duration: 0.2, decay: 0.97, brightness: 0.82, gain: 0.2, reverbSend: 0.35 },
          now
        );
        break;
      }

      case 'skill_lightning':
      case 'skill_beam': {
        this.granular?.playCloud(dry, wet, {
          source: 'plasma_shimmer',
          startTime: now,
          cloudDuration: 0.34,
          grainCount: 22,
          grainSizeSec: 0.018,
          pitchRatio: 1.65,
          pitchJitter: 0.36,
          lowpassStart: 7800,
          lowpassEnd: 1600,
          gain: 0.28,
          reverbSend: 0.48
        });
        this.wavetables?.playNote(dry, wet, {
          freq: 660,
          startTime: now,
          duration: 0.26,
          timbre: 'reese',
          gain: 0.2,
          reverbSend: 0.4,
          filterCutoffPeak: 7500,
          filterCutoffSustain: 1800,
          attack: 0.005,
          release: 0.15
        });
        break;
      }

      case 'skill_fire': {
        playModalMembrane(
          this.ctx,
          dry,
          wet,
          {
            baseFreq: 62,
            startFreqMult: 2.6,
            pitchDropTime: 0.11,
            duration: 0.45,
            noiseBurstGain: 0.6,
            noiseCutoff: 1300,
            filterPeak: 3800,
            filterEnd: 220,
            gain: 0.42,
            reverbSend: 0.55
          },
          now
        );
        this.granular?.playCloud(dry, wet, {
          source: 'beast_throat',
          startTime: now + 0.02,
          cloudDuration: 0.45,
          grainCount: 20,
          grainSizeSec: 0.032,
          pitchRatio: 1.3,
          pitchJitter: 0.28,
          lowpassStart: 4200,
          lowpassEnd: 480,
          gain: 0.28,
          reverbSend: 0.55
        });
        break;
      }

      case 'skill_frost': {
        [880, 1174.66, 1567.98].forEach((f, i) => {
          this.wavetables?.playNote(dry, wet, {
            freq: f,
            startTime: now + i * 0.03,
            duration: 0.4,
            timbre: 'glass',
            gain: 0.16,
            reverbSend: 0.62,
            filterCutoffPeak: 7200,
            filterCutoffSustain: 2400,
            attack: 0.006,
            release: 0.25
          });
        });
        this.granular?.playCloud(dry, wet, {
          source: 'plasma_shimmer',
          startTime: now,
          cloudDuration: 0.35,
          grainCount: 16,
          grainSizeSec: 0.02,
          pitchRatio: 1.9,
          pitchJitter: 0.16,
          lowpassStart: 8500,
          lowpassEnd: 2800,
          gain: 0.22,
          reverbSend: 0.58
        });
        break;
      }

      case 'skill_heal': {
        [349.23, 440.0, 523.25, 698.46].forEach((f, idx) => {
          if (!this.ctx) return;
          playKarplusStrong(
            this.ctx,
            dry,
            wet,
            { freq: f, duration: 0.52, decay: 0.993, brightness: 0.65, gain: 0.16, pan: -0.3 + idx * 0.2, reverbSend: 0.5 },
            now + idx * 0.055
          );
        });
        this.granular?.playCloud(dry, wet, {
          source: 'crypt_choir',
          startTime: now,
          cloudDuration: 0.42,
          grainCount: 12,
          grainSizeSec: 0.044,
          pitchRatio: 1.5,
          lowpassStart: 3200,
          lowpassEnd: 1200,
          gain: 0.18,
          reverbSend: 0.55
        });
        break;
      }

      case 'skill_shield': {
        playModalMembrane(
          this.ctx,
          dry,
          wet,
          {
            baseFreq: 260,
            duration: 0.36,
            modes: [1.0, 1.47, 2.09],
            modeWeights: [0.8, 0.55, 0.35],
            noiseBurstGain: 0.15,
            filterPeak: 3800,
            filterEnd: 900,
            gain: 0.25,
            reverbSend: 0.45
          },
          now
        );
        this.wavetables?.playNote(dry, wet, {
          freq: 293.66,
          startTime: now,
          duration: 0.38,
          timbre: 'brass',
          gain: 0.16,
          reverbSend: 0.45,
          attack: 0.02,
          release: 0.2
        });
        break;
      }

      case 'skill_aoe':
      case 'skill': {
        playModalMembrane(
          this.ctx,
          dry,
          wet,
          {
            baseFreq: 86,
            startFreqMult: 2.5,
            pitchDropTime: 0.07,
            duration: 0.32,
            noiseBurstGain: 0.42,
            noiseCutoff: 2400,
            filterPeak: 5200,
            filterEnd: 380,
            gain: 0.34,
            reverbSend: 0.45
          },
          now
        );
        this.granular?.playCloud(dry, wet, {
          source: 'plasma_shimmer',
          startTime: now,
          cloudDuration: 0.34,
          grainCount: 18,
          grainSizeSec: 0.026,
          pitchRatio: 1.2,
          pitchJitter: 0.24,
          lowpassStart: 6200,
          lowpassEnd: 900,
          gain: 0.24,
          reverbSend: 0.5
        });
        break;
      }

      // ---------------------------------------------------------------------
      // CREATURE VOCALIZATIONS & ATTACKS (Physical Tube/Throat + Granular)
      // ---------------------------------------------------------------------
      case 'monster_alert': {
        if (nowMs - this.lastAlertSoundMs < 550) return;
        this.lastAlertSoundMs = nowMs;
        this.granular?.playCloud(dry, wet, {
          source: 'beast_throat',
          startTime: now,
          cloudDuration: 0.22,
          grainCount: 8,
          grainSizeSec: 0.028,
          pitchRatio: 1.35 + Math.random() * 0.25,
          pitchJitter: 0.15,
          lowpassStart: 2200,
          lowpassEnd: 650,
          gain: 0.16,
          reverbSend: 0.45
        });
        break;
      }

      case 'monster_windup': {
        this.wavetables?.playNote(dry, wet, {
          freq: 78,
          startTime: now,
          duration: 0.42,
          timbre: 'brass',
          gain: 0.22,
          reverbSend: 0.42,
          filterCutoffPeak: 1400,
          filterCutoffSustain: 420,
          attack: 0.18,
          release: 0.15
        });
        break;
      }

      case 'monster_attack_swarmer': {
        this.granular?.playCloud(dry, wet, {
          source: 'plasma_shimmer',
          startTime: now,
          cloudDuration: 0.14,
          grainCount: 9,
          grainSizeSec: 0.016,
          pitchRatio: 1.8,
          pitchJitter: 0.3,
          lowpassStart: 5400,
          lowpassEnd: 1600,
          gain: 0.18,
          reverbSend: 0.25
        });
        break;
      }

      case 'monster_attack_stalker': {
        this.wavetables?.playNote(dry, wet, {
          freq: 520,
          startTime: now,
          duration: 0.15,
          timbre: 'koto',
          gain: 0.18,
          reverbSend: 0.3,
          filterCutoffPeak: 5800,
          filterCutoffSustain: 950,
          attack: 0.005,
          release: 0.09
        });
        break;
      }

      case 'monster_attack_behemoth': {
        playModalMembrane(
          this.ctx,
          dry,
          wet,
          {
            baseFreq: 54,
            startFreqMult: 2.2,
            pitchDropTime: 0.09,
            duration: 0.34,
            noiseBurstGain: 0.48,
            noiseCutoff: 900,
            filterPeak: 1800,
            filterEnd: 140,
            gain: 0.4,
            reverbSend: 0.45
          },
          now
        );
        this.granular?.playCloud(dry, wet, {
          source: 'beast_throat',
          startTime: now,
          cloudDuration: 0.26,
          grainCount: 10,
          grainSizeSec: 0.036,
          pitchRatio: 0.72,
          pitchJitter: 0.12,
          lowpassStart: 1400,
          lowpassEnd: 320,
          gain: 0.24,
          reverbSend: 0.42
        });
        break;
      }

      case 'monster_attack_disruptor': {
        this.granular?.playCloud(dry, wet, {
          source: 'plasma_shimmer',
          startTime: now,
          cloudDuration: 0.2,
          grainCount: 14,
          grainSizeSec: 0.018,
          pitchRatio: 1.45,
          pitchJitter: 0.38,
          lowpassStart: 6200,
          lowpassEnd: 1100,
          gain: 0.22,
          reverbSend: 0.35
        });
        break;
      }

      case 'monster_attack_boss': {
        playModalMembrane(
          this.ctx,
          dry,
          wet,
          {
            baseFreq: 46,
            startFreqMult: 2.4,
            pitchDropTime: 0.12,
            duration: 0.48,
            noiseBurstGain: 0.5,
            noiseCutoff: 1100,
            filterPeak: 2400,
            filterEnd: 160,
            gain: 0.44,
            reverbSend: 0.6
          },
          now
        );
        this.granular?.playCloud(dry, wet, {
          source: 'beast_throat',
          startTime: now,
          cloudDuration: 0.44,
          grainCount: 18,
          grainSizeSec: 0.042,
          pitchRatio: 0.68,
          pitchJitter: 0.2,
          lowpassStart: 1900,
          lowpassEnd: 350,
          gain: 0.32,
          reverbSend: 0.62
        });
        break;
      }
    }
  }
}

export const soundEngine = new HybridAcousticAudioEngine();
