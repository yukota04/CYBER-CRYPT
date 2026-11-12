import React from 'react';
import { CharacterClass } from '../game/types';
import { Language, t } from '../game/i18n';
import { Shield, Zap, Sword, Cloud, Volume2, VolumeX } from 'lucide-react';
import { CanvasButton } from './CanvasButton';
import { LanguageSelector } from './LanguageSelector';

interface TitleScreenProps {
  selectedClass: CharacterClass;
  onSelectClass: (cls: CharacterClass) => void;
  onStartGame: () => void;
  onOpenLeaderboard: () => void;
  onOpenMultiplayer: () => void;
  onOpenSocial: () => void;
  onOpenAdmin: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  userProfile: { username: string; role: string } | null;
  cloudSyncStatus: string;
  language: Language;
  onLanguageChange: (lang: Language) => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  selectedClass,
  onSelectClass,
  onStartGame,
  onOpenLeaderboard,
  onOpenMultiplayer,
  onOpenSocial,
  onOpenAdmin,
  isMuted,
  onToggleMute,
  userProfile,
  cloudSyncStatus,
  language,
  onLanguageChange
}) => {
  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-between p-6 sm:p-10 select-none overflow-y-auto bg-gradient-to-b from-[#0a0618]/90 via-[#0d0824]/85 to-[#060410]/95 backdrop-blur-[2px]">
      {/* Top Bar: Operative Status, Language Selector & System Utilities */}
      <div className="flex flex-wrap items-center justify-between w-full max-w-6xl mx-auto gap-3">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <div className="text-xs font-mono tracking-wider text-cyan-300">
            {t('netStatus', language)}: <span className="text-white font-bold">{userProfile ? userProfile.username : t('guestOperative', language)}</span>
            <span className="ml-2 px-1.5 py-0.5 text-[10px] uppercase bg-cyan-950/80 border border-cyan-500/30 rounded text-cyan-400">
              {userProfile?.role || 'PLAYER'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* 5-Language Selector Widget */}
          <LanguageSelector currentLanguage={language} onLanguageChange={onLanguageChange} />

          {/* Cloud Sync Status */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-purple-300 bg-purple-950/40 border border-purple-500/30 px-2.5 py-1 rounded">
            <Cloud className="w-3.5 h-3.5 text-purple-400" />
            <span>{cloudSyncStatus}</span>
          </div>

          {/* Audio Mute Toggle */}
          <button
            onClick={onToggleMute}
            className="p-2 rounded bg-slate-900/80 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-950 transition hover:border-cyan-400 cursor-pointer"
            title={t('toggleAudio', language)}
            aria-label={t('toggleAudio', language)}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-cyan-300" />}
          </button>
        </div>
      </div>

      {/* Main Centerpiece: Title Lockup & Character Selection */}
      <div className="flex flex-col items-center justify-center my-auto w-full max-w-4xl mx-auto text-center py-6">
        {/* Bespoke Inline SVG Logo Lockup */}
        <div className="mb-6">
          <svg viewBox="0 0 680 110" className="w-full max-w-xl mx-auto h-auto drop-shadow-[0_0_25px_rgba(0,240,255,0.45)]">
            <defs>
              <linearGradient id="neonCyanPink" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#00f0ff" />
                <stop offset="50%" stopColor="#ff00a0" />
                <stop offset="100%" stopColor="#ffe600" />
              </linearGradient>
              <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Background Cyber Octagons */}
            <path d="M 40 10 L 640 10 L 670 40 L 670 70 L 640 100 L 40 100 L 10 70 L 10 40 Z" fill="rgba(15, 10, 36, 0.7)" stroke="#ff007f" strokeWidth="1.5" />
            <line x1="30" y1="20" x2="650" y2="20" stroke="rgba(0, 240, 255, 0.3)" strokeWidth="1" strokeDasharray="6,4" />
            <line x1="30" y1="90" x2="650" y2="90" stroke="rgba(0, 240, 255, 0.3)" strokeWidth="1" strokeDasharray="6,4" />

            {/* Glowing Main Typography */}
            <text x="340" y="58" textAnchor="middle" fill="url(#neonCyanPink)" filter="url(#neonGlow)" fontFamily="ui-monospace, monospace" fontSize="42" fontWeight="bold" letterSpacing="6">
              CYBER-CRYPT
            </text>
            <text x="340" y="82" textAnchor="middle" fill="#00f0ff" fontFamily="ui-monospace, monospace" fontSize="12" letterSpacing="4">
              // SYNTHWAVE ROGUELIKE //
            </text>
          </svg>
        </div>

        {/* Subtitle Lore */}
        <p className="text-sm font-mono text-cyan-200/80 max-w-lg mb-8">
          {t('gameSubtitle', language)}
        </p>

        {/* Class Selector Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full mb-8">
          {/* Cyber Striker */}
          <button
            onClick={() => onSelectClass('striker')}
            className={`flex flex-col items-center p-4 rounded-lg border text-left transition cursor-pointer relative overflow-hidden ${
              selectedClass === 'striker'
                ? 'bg-cyan-950/60 border-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.35)] ring-1 ring-cyan-400'
                : 'bg-slate-900/40 border-slate-700/60 hover:border-cyan-500/50 hover:bg-slate-800/40'
            }`}
          >
            <div className="p-3 rounded-full bg-cyan-900/50 border border-cyan-400/40 mb-3 text-cyan-400">
              <Sword className="w-6 h-6" />
            </div>
            <div className="font-bold text-white text-sm font-mono tracking-wide">{t('classStriker', language)}</div>
            <div className="text-[11px] text-cyan-300 font-mono mt-1 text-center">{t('classStrikerDesc', language)}</div>
            <div className="mt-3 flex items-center gap-2 text-[10px] font-mono text-slate-300">
              <span className="text-cyan-400">ATK: 16</span>
              <span className="text-pink-400">CRIT: 20%</span>
              <span className="text-emerald-400">HP: 95</span>
            </div>
          </button>

          {/* Technomancer */}
          <button
            onClick={() => onSelectClass('technomancer')}
            className={`flex flex-col items-center p-4 rounded-lg border text-left transition cursor-pointer relative overflow-hidden ${
              selectedClass === 'technomancer'
                ? 'bg-purple-950/60 border-purple-400 shadow-[0_0_15px_rgba(189,0,255,0.35)] ring-1 ring-purple-400'
                : 'bg-slate-900/40 border-slate-700/60 hover:border-purple-500/50 hover:bg-slate-800/40'
            }`}
          >
            <div className="p-3 rounded-full bg-purple-900/50 border border-purple-400/40 mb-3 text-purple-400">
              <Zap className="w-6 h-6" />
            </div>
            <div className="font-bold text-white text-sm font-mono tracking-wide">{t('classTechno', language)}</div>
            <div className="text-[11px] text-purple-300 font-mono mt-1 text-center">{t('classTechnoDesc', language)}</div>
            <div className="mt-3 flex items-center gap-2 text-[10px] font-mono text-slate-300">
              <span className="text-purple-400">ATK: 12</span>
              <span className="text-cyan-400">NRG: 70</span>
              <span className="text-emerald-400">HP: 80</span>
            </div>
          </button>

          {/* Aegis Vanguard */}
          <button
            onClick={() => onSelectClass('vanguard')}
            className={`flex flex-col items-center p-4 rounded-lg border text-left transition cursor-pointer relative overflow-hidden ${
              selectedClass === 'vanguard'
                ? 'bg-amber-950/60 border-amber-400 shadow-[0_0_15px_rgba(255,230,0,0.35)] ring-1 ring-amber-400'
                : 'bg-slate-900/40 border-slate-700/60 hover:border-amber-500/50 hover:bg-slate-800/40'
            }`}
          >
            <div className="p-3 rounded-full bg-amber-900/50 border border-amber-400/40 mb-3 text-amber-400">
              <Shield className="w-6 h-6" />
            </div>
            <div className="font-bold text-white text-sm font-mono tracking-wide">{t('classVanguard', language)}</div>
            <div className="text-[11px] text-amber-300 font-mono mt-1 text-center">{t('classVanguardDesc', language)}</div>
            <div className="mt-3 flex items-center gap-2 text-[10px] font-mono text-slate-300">
              <span className="text-amber-400">DEF: 8</span>
              <span className="text-emerald-400">HP: 120</span>
              <span className="text-cyan-400">ATK: 14</span>
            </div>
          </button>
        </div>

        {/* Primary Start CTA Button Realized with Vibrant Canvas Rendering */}
        <div className="mb-6 flex justify-center">
          <CanvasButton
            label={t('startRun', language)}
            icon="▶"
            theme="cyan"
            width={340}
            height={58}
            data-start="true"
            aria-label={t('startRun', language)}
            onClick={onStartGame}
          />
        </div>

        {/* Navigation CTAs to Social, Matchmaking, Leaderboards, Admin with Canvas Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <CanvasButton
            label={t('leaderboardsBtn', language)}
            icon="🏆"
            theme="amber"
            width={210}
            height={44}
            onClick={onOpenLeaderboard}
          />
          <CanvasButton
            label={t('multiplayerBtn', language)}
            icon="⚡"
            theme="pink"
            width={210}
            height={44}
            onClick={onOpenMultiplayer}
          />
          <CanvasButton
            label={t('socialBtn', language)}
            icon="👥"
            theme="purple"
            width={210}
            height={44}
            onClick={onOpenSocial}
          />
          <CanvasButton
            label={t('adminBtn', language)}
            icon="🛡️"
            theme="pink"
            width={230}
            height={44}
            onClick={onOpenAdmin}
          />
        </div>
      </div>

      {/* Flat Control Hints in Bottom Margin */}
      <div className="text-center text-[11px] font-mono text-cyan-400/70 border-t border-cyan-900/30 pt-3">
        {t('controlHints', language)}
      </div>
    </div>
  );
};
