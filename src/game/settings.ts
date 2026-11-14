import type { AudioConfig } from './audio';

export type PerformanceMode = 'high' | 'balanced' | 'performance';

export interface AppSettings {
  performanceMode: PerformanceMode;
  enableScanlines: boolean;
  enableGlow: boolean;
  enableParticles: boolean;
  targetFps: 60 | 30;
  audio: AudioConfig;
}

export const APP_SETTINGS_STORAGE_KEY = 'cyber_crypt_settings_v3';

export const DEFAULT_APP_SETTINGS: AppSettings = {
  performanceMode: 'high',
  enableScanlines: true,
  enableGlow: true,
  enableParticles: true,
  targetFps: 60,
  audio: {
    masterMuted: false,
    musicEnabled: true,
    musicVolume: 0.7,
    sfxEnabled: true,
    sfxVolume: 0.85,
    ambientReverbEnabled: true
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
      targetFps: 30
    };
  }
  if (mode === 'balanced') {
    return {
      ...current,
      performanceMode: 'balanced',
      enableScanlines: false,
      enableGlow: true,
      enableParticles: true,
      targetFps: 60
    };
  }
  return {
    ...current,
    performanceMode: 'high',
    enableScanlines: true,
    enableGlow: true,
    enableParticles: true,
    targetFps: 60
  };
}

export function loadAppSettings(): AppSettings {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return DEFAULT_APP_SETTINGS;
    }
    const raw = window.localStorage.getItem(APP_SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_APP_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      performanceMode:
        parsed.performanceMode === 'balanced' || parsed.performanceMode === 'performance'
          ? parsed.performanceMode
          : 'high',
      enableScanlines:
        typeof parsed.enableScanlines === 'boolean'
          ? parsed.enableScanlines
          : DEFAULT_APP_SETTINGS.enableScanlines,
      enableGlow:
        typeof parsed.enableGlow === 'boolean'
          ? parsed.enableGlow
          : DEFAULT_APP_SETTINGS.enableGlow,
      enableParticles:
        typeof parsed.enableParticles === 'boolean'
          ? parsed.enableParticles
          : DEFAULT_APP_SETTINGS.enableParticles,
      targetFps: parsed.targetFps === 30 ? 30 : 60,
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
            : DEFAULT_APP_SETTINGS.audio.ambientReverbEnabled
      }
    };
  } catch {
    return DEFAULT_APP_SETTINGS;
  }
}

export function saveAppSettings(settings: AppSettings): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(APP_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage quota / privacy restrictions
  }
}
