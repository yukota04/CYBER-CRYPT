import React from 'react';
import { AppSettings, applyPerformancePreset, PerformanceMode } from '../game/settings';
import { Language, t } from '../game/i18n';
import { X, Cpu, Volume2, VolumeX, LogOut, Sparkles, Sliders } from 'lucide-react';

interface OptionsModalProps {
  settings: AppSettings;
  onUpdateSettings: (next: AppSettings) => void;
  onLogout: () => void;
  onClose: () => void;
  userProfile: { username: string; role: string } | null;
  language: Language;
}

export const OptionsModal: React.FC<OptionsModalProps> = ({
  settings,
  onUpdateSettings,
  onLogout,
  onClose,
  userProfile,
  language
}) => {
  const handlePreset = (mode: PerformanceMode) => {
    onUpdateSettings(applyPerformancePreset(mode, settings));
  };

  const toggleBool = (key: 'enableScanlines' | 'enableGlow' | 'enableParticles') => {
    onUpdateSettings({
      ...settings,
      [key]: !settings[key]
    });
  };

  const updateAudio = (partial: Partial<AppSettings['audio']>) => {
    onUpdateSettings({
      ...settings,
      audio: {
        ...settings.audio,
        ...partial
      }
    });
  };

  return (
    <div
      data-testid="options-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/80 backdrop-blur-sm font-mono select-none"
    >
      <div className="w-full max-w-2xl bg-[#0a0718] border border-cyan-500/50 rounded-xl shadow-[0_0_40px_rgba(0,240,255,0.28)] flex flex-col max-h-[92dvh] overflow-hidden">
        {/* Header with big, high-contrast close button */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-cyan-500/30 bg-[#100a28]">
          <div className="flex items-center gap-2.5 text-cyan-300">
            <Sliders className="w-5 h-5" />
            <h2 className="text-sm sm:text-base font-bold tracking-wider uppercase">
              {t('optionsTitle', language)}
            </h2>
          </div>
          <button
            data-testid="options-close-btn"
            onClick={onClose}
            aria-label={t('closeBtn', language)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-red-950/75 border-2 border-red-400/75 text-red-100 hover:bg-red-800 hover:border-red-300 font-bold text-xs shadow-[0_0_12px_rgba(248,113,113,0.3)] transition cursor-pointer"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
            <span>{t('closeBtn', language)}</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-5">
          {/* 1. PERFORMANCE & GRAPHICS */}
          <section className="p-4 rounded-xl bg-slate-900/60 border border-cyan-500/30">
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-300 tracking-wider uppercase mb-3">
              <Cpu className="w-4 h-4" />
              <span>{t('perfSectionTitle', language)}</span>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              {(['high', 'balanced', 'performance'] as PerformanceMode[]).map(mode => {
                const active = settings.performanceMode === mode;
                const labelKey =
                  mode === 'high'
                    ? 'perfModeHigh'
                    : mode === 'balanced'
                    ? 'perfModeBalanced'
                    : 'perfModePerformance';
                return (
                  <button
                    key={mode}
                    data-testid={`perf-preset-${mode}`}
                    onClick={() => handlePreset(mode)}
                    className={`px-2.5 py-2.5 rounded-lg border text-xs font-bold transition cursor-pointer ${
                      active
                        ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(0,240,255,0.28)]'
                        : 'bg-slate-950/60 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'
                    }`}
                  >
                    {t(labelKey, language)}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <button
                data-testid="toggle-scanlines-btn"
                onClick={() => toggleBool('enableScanlines')}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg border transition cursor-pointer ${
                  settings.enableScanlines
                    ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                    : 'bg-slate-950/60 border-slate-700 text-slate-400'
                }`}
              >
                <span>{t('perfScanlinesLabel', language)}</span>
                <span className="font-bold">{settings.enableScanlines ? 'ON' : 'OFF'}</span>
              </button>

              <button
                data-testid="toggle-glow-btn"
                onClick={() => toggleBool('enableGlow')}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg border transition cursor-pointer ${
                  settings.enableGlow
                    ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                    : 'bg-slate-950/60 border-slate-700 text-slate-400'
                }`}
              >
                <span>{t('perfGlowLabel', language)}</span>
                <span className="font-bold">{settings.enableGlow ? 'ON' : 'OFF'}</span>
              </button>

              <button
                data-testid="toggle-particles-btn"
                onClick={() => toggleBool('enableParticles')}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg border transition cursor-pointer ${
                  settings.enableParticles
                    ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                    : 'bg-slate-950/60 border-slate-700 text-slate-400'
                }`}
              >
                <span>{t('perfParticlesLabel', language)}</span>
                <span className="font-bold">{settings.enableParticles ? 'ON' : 'OFF'}</span>
              </button>

              <button
                data-testid="toggle-fps-btn"
                onClick={() =>
                  onUpdateSettings({
                    ...settings,
                    targetFps: settings.targetFps === 60 ? 30 : 60
                  })
                }
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg border transition cursor-pointer ${
                  settings.targetFps === 30
                    ? 'bg-amber-950/45 border-amber-400/60 text-amber-200'
                    : 'bg-cyan-950/40 border-cyan-500/45 text-cyan-200'
                }`}
              >
                <span>{t('perfFpsLabel', language)}</span>
                <span className="font-bold">{settings.targetFps} FPS</span>
              </button>
            </div>
          </section>

          {/* 2. AUDIO CONFIGURATION */}
          <section className="p-4 rounded-xl bg-slate-900/60 border border-purple-500/30">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-purple-300 tracking-wider uppercase">
                {settings.audio.masterMuted ? (
                  <VolumeX className="w-4 h-4 text-red-400" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
                <span>{t('audioSectionTitle', language)}</span>
              </div>

              <button
                data-testid="audio-master-mute-btn"
                onClick={() => updateAudio({ masterMuted: !settings.audio.masterMuted })}
                className={`px-3 py-1 rounded border text-[11px] font-bold transition cursor-pointer ${
                  settings.audio.masterMuted
                    ? 'bg-red-950/70 border-red-400 text-red-200'
                    : 'bg-emerald-950/50 border-emerald-400/50 text-emerald-200'
                }`}
              >
                {t('audioMasterMuteLabel', language)}: {settings.audio.masterMuted ? 'ON' : 'OFF'}
              </button>
            </div>

            <div className="flex flex-col gap-3.5 text-xs">
              {/* Music Toggle & Volume */}
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-200 font-bold">{t('audioMusicLabel', language)}</span>
                  <button
                    data-testid="audio-music-toggle"
                    onClick={() => updateAudio({ musicEnabled: !settings.audio.musicEnabled })}
                    className={`px-2.5 py-1 rounded border text-[11px] font-bold cursor-pointer ${
                      settings.audio.musicEnabled
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                        : 'bg-slate-900 border-slate-700 text-slate-500'
                    }`}
                  >
                    {settings.audio.musicEnabled ? 'ON' : 'OFF'}
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-slate-400 w-28 truncate">
                    {t('audioMusicVolLabel', language)}
                  </span>
                  <input
                    data-testid="audio-music-slider"
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(settings.audio.musicVolume * 100)}
                    onChange={e => updateAudio({ musicVolume: Number(e.target.value) / 100 })}
                    className="flex-1 accent-cyan-400 cursor-pointer"
                  />
                  <span className="text-cyan-300 font-bold w-10 text-right tabular-nums">
                    {Math.round(settings.audio.musicVolume * 100)}%
                  </span>
                </div>
              </div>

              {/* SFX Toggle & Volume */}
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-200 font-bold">{t('audioSfxLabel', language)}</span>
                  <button
                    data-testid="audio-sfx-toggle"
                    onClick={() => updateAudio({ sfxEnabled: !settings.audio.sfxEnabled })}
                    className={`px-2.5 py-1 rounded border text-[11px] font-bold cursor-pointer ${
                      settings.audio.sfxEnabled
                        ? 'bg-pink-500/20 border-pink-400 text-pink-200'
                        : 'bg-slate-900 border-slate-700 text-slate-500'
                    }`}
                  >
                    {settings.audio.sfxEnabled ? 'ON' : 'OFF'}
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-slate-400 w-28 truncate">
                    {t('audioSfxVolLabel', language)}
                  </span>
                  <input
                    data-testid="audio-sfx-slider"
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(settings.audio.sfxVolume * 100)}
                    onChange={e => updateAudio({ sfxVolume: Number(e.target.value) / 100 })}
                    className="flex-1 accent-pink-400 cursor-pointer"
                  />
                  <span className="text-pink-300 font-bold w-10 text-right tabular-nums">
                    {Math.round(settings.audio.sfxVolume * 100)}%
                  </span>
                </div>
              </div>

              {/* Acoustic Reverb Toggle */}
              <button
                data-testid="audio-reverb-toggle"
                onClick={() => updateAudio({ ambientReverbEnabled: !settings.audio.ambientReverbEnabled })}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg border transition cursor-pointer ${
                  settings.audio.ambientReverbEnabled
                    ? 'bg-purple-950/45 border-purple-400/50 text-purple-200'
                    : 'bg-slate-950/60 border-slate-700 text-slate-400'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  {t('audioReverbLabel', language)}
                </span>
                <span className="font-bold">{settings.audio.ambientReverbEnabled ? 'ON' : 'OFF'}</span>
              </button>
            </div>
          </section>

          {/* 3. ACCOUNT & SIGN OUT */}
          <section className="p-4 rounded-xl bg-slate-900/60 border border-pink-500/35">
            <div className="text-xs font-bold text-pink-300 tracking-wider uppercase mb-2">
              {t('accountSectionTitle', language)}
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs text-white font-bold">
                  {userProfile?.username || t('guestOperative', language)}{' '}
                  <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30 uppercase">
                    {userProfile?.role || 'PLAYER'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">{t('logoutDesc', language)}</div>
              </div>
              <button
                data-testid="options-logout-btn"
                onClick={onLogout}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-950/80 border border-red-400/75 text-red-100 hover:bg-red-800 hover:border-red-300 font-bold text-xs tracking-wider transition cursor-pointer shrink-0"
              >
                <LogOut className="w-4 h-4" />
                <span>{t('logoutBtn', language)}</span>
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
