import type { AudioConfig } from './audio';

export type PerformanceMode = 'high' | 'balanced' | 'performance';

export interface AppSettings {
  performanceMode: PerformanceMode;
  enableScanlines: boolean;
  enableGlow: boolean;
  enableParticles: boolean;
  /** Heavy post-FX (damage vignette radial, CRT vignette). */
  enablePostFx: boolean;
  /** Simplify monster/player draw calls. */
  simpleEntities: boolean;
  /**
   * Internal render resolution multiplier.
   * ALWAYS 1 — scaling the backing store changes how many tiles fit on screen
   * (looks like zoom) and must never be used as a performance lever.
   */
  canvasScale: 1;
  targetFps: 60 | 30;
  audio: AudioConfig;
}

export const APP_SETTINGS_STORAGE_KEY = 'cyber_crypt_settings_v6';

function detectDefaultPerformanceMode(): PerformanceMode {
  if (typeof window === 'undefined') return 'balanced';
  const coarse = window.matchMedia?.('(pointer: coarse)')?.matches;
  const small = window.matchMedia?.('(max-width: 900px)')?.matches;
  const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4;
  // Phones / weak devices: start on balanced so glow/scanlines don't eat frames
  if (coarse || small || cores <= 4) return 'balanced';
  return 'high';
}

const DEFAULT_PERF = detectDefaultPerformanceMode();

export const DEFAULT_APP_SETTINGS: AppSettings = {
  performanceMode: DEFAULT_PERF,
  enableScanlines: DEFAULT_PERF === 'high',
  enableGlow: DEFAULT_PERF === 'high',
  enableParticles: DEFAULT_PERF !== 'performance',
  enablePostFx: DEFAULT_PERF === 'high',
  simpleEntities: DEFAULT_PERF === 'performance',
  canvasScale: 1,
  targetFps: 60,
  audio: {
    masterMuted: false,
    musicEnabled: true,
    musicVolume: 1.0,
    sfxEnabled: true,
    sfxVolume: 1.0,
    ambientReverbEnabled: DEFAULT_PERF === 'high'
  }
};

export function applyPerformancePreset(mode: PerformanceMode, current: AppSettings): AppSettings {
  if (mode === 'performance') {
    return {
      ...current,
      performanceMode: 'performance',
      enableScanlines: false,
      enableGlow: false,
      enableParticles: false,
      enablePostFx: false,
      simpleEntities: true,
      canvasScale: 1,
      targetFps: 60,
      audio: {
        ...current.audio,
        ambientReverbEnabled: false
      }
    };
  }
  if (mode === 'balanced') {
    return {
      ...current,
      performanceMode: 'balanced',
      enableScanlines: false,
      // Glow/shadowBlur is the #1 canvas cost on mobile — keep off in balanced
      enableGlow: false,
      enableParticles: true,
      enablePostFx: false,
      simpleEntities: false,
      canvasScale: 1,
      targetFps: 60,
      audio: {
        ...current.audio,
        ambientReverbEnabled: false
      }
    };
  }
  return {
    ...current,
    performanceMode: 'high',
    enableScanlines: true,
    enableGlow: true,
    enableParticles: true,
    enablePostFx: true,
    simpleEntities: false,
    canvasScale: 1,
    targetFps: 60,
    audio: {
      ...current.audio,
      ambientReverbEnabled: true
    }
  };
}

export function loadAppSettings(): AppSettings {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return DEFAULT_APP_SETTINGS;
    }
    const raw =
      window.localStorage.getItem(APP_SETTINGS_STORAGE_KEY) ||
      window.localStorage.getItem('cyber_crypt_settings_v5') ||
      window.localStorage.getItem('cyber_crypt_settings_v4');
    if (!raw) return DEFAULT_APP_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AppSettings> & { performanceMode?: string };
    const mode =
      parsed.performanceMode === 'balanced' || parsed.performanceMode === 'performance'
        ? parsed.performanceMode
        : 'high';
    const presetDefaults = applyPerformancePreset(mode, DEFAULT_APP_SETTINGS);
    return {
      performanceMode: mode,
      enableScanlines:
        typeof parsed.enableScanlines === 'boolean'
          ? parsed.enableScanlines
          : presetDefaults.enableScanlines,
      enableGlow:
        typeof parsed.enableGlow === 'boolean' ? parsed.enableGlow : presetDefaults.enableGlow,
      enableParticles:
        typeof parsed.enableParticles === 'boolean'
          ? parsed.enableParticles
          : presetDefaults.enableParticles,
      enablePostFx:
        typeof parsed.enablePostFx === 'boolean'
          ? parsed.enablePostFx
          : presetDefaults.enablePostFx,
      simpleEntities:
        typeof parsed.simpleEntities === 'boolean'
          ? parsed.simpleEntities
          : presetDefaults.simpleEntities,
      // Never honor legacy canvasScale — it zooms the playfield
      canvasScale: 1,
      targetFps:
        parsed.targetFps === 30 && mode === 'performance'
          ? 60
          : parsed.targetFps === 30
            ? 30
            : 60,
      audio: {
        masterMuted:
          typeof parsed.audio?.masterMuted === 'boolean'
            ? parsed.audio.masterMuted
            : DEFAULT_APP_SETTINGS.audio.masterMuted,
        musicEnabled:
          typeof parsed.audio?.musicEnabled === 'boolean'
            ? parsed.audio.musicEnabled
            : DEFAULT_APP_SETTINGS.audio.musicEnabled,
        musicVolume:
          typeof parsed.audio?.musicVolume === 'number'
            ? Math.max(0, Math.min(1, parsed.audio.musicVolume))
            : DEFAULT_APP_SETTINGS.audio.musicVolume,
        sfxEnabled:
          typeof parsed.audio?.sfxEnabled === 'boolean'
            ? parsed.audio.sfxEnabled
            : DEFAULT_APP_SETTINGS.audio.sfxEnabled,
        sfxVolume:
          typeof parsed.audio?.sfxVolume === 'number'
            ? Math.max(0, Math.min(1, parsed.audio.sfxVolume))
            : DEFAULT_APP_SETTINGS.audio.sfxVolume,
        ambientReverbEnabled:
          typeof parsed.audio?.ambientReverbEnabled === 'boolean'
            ? parsed.audio.ambientReverbEnabled
            : presetDefaults.audio.ambientReverbEnabled
      }
    };
  } catch {
    return DEFAULT_APP_SETTINGS;
  }
}

export function saveAppSettings(settings: AppSettings): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(APP_SETTINGS_STORAGE_KEY, JSON.stringify({ ...settings, canvasScale: 1 }));
  } catch {
    // Ignore storage quota / privacy restrictions
  }
}
