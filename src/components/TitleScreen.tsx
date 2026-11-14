import React, { useState } from 'react';
import { CharacterClass, CoopRoomState, DifficultyMode, PlayMode, SavedPlayerLoadout } from '../game/types';
import { getOfflineSaveSlotKey, OfflineSaveSlotKey, OfflineSaveState } from '../game/offlineSave';
import { Language, t } from '../game/i18n';
import { Shield, Zap, Sword, Cloud, Volume2, VolumeX, Wifi, WifiOff, CheckCircle2, Clock, Maximize2, Minimize2, Settings } from 'lucide-react';
import { CanvasButton } from './CanvasButton';
import { GameIcon } from './GameIcon';
import { LanguageSelector } from './LanguageSelector';

interface TitleScreenProps {
  selectedClass: CharacterClass;
  onSelectClass: (cls: CharacterClass) => void;
  playMode: PlayMode;
  onChangePlayMode: (mode: PlayMode) => void;
  difficultyMode: DifficultyMode;
  onChangeDifficultyMode: (mode: DifficultyMode) => void;
  savedOfflineRun: OfflineSaveState | null;
  savedOfflineRuns?: Record<OfflineSaveSlotKey, OfflineSaveState | null>;
  onlineStashes?: Partial<Record<CharacterClass, SavedPlayerLoadout>>;
  onContinueGame: () => void;
  onStartGame: () => void;
  // Online 3-Player Co-Op props
  coopRoom: CoopRoomState | null;
  coopConnected: boolean;
  coopError: string | null;
  localPlayerId: string;
  onJoinCoopRoom: (roomId: string) => void;
  onSelectCoopRole: (cls: CharacterClass) => void;
  onToggleCoopReady: (ready: boolean) => void;
  onStartCoopGame: () => void;
  onOpenLeaderboard: () => void;
  onOpenMultiplayer: () => void;
  onOpenSocial: () => void;
  onOpenAdmin: () => void;
  onOpenOptions: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  userProfile: { username: string; role: string } | null;
  cloudSyncStatus: string;
  language: Language;
  onLanguageChange: (lang: Language) => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  selectedClass,
  onSelectClass,
  playMode,
  onChangePlayMode,
  difficultyMode,
  onChangeDifficultyMode,
  savedOfflineRun,
  savedOfflineRuns,
  onlineStashes,
  onContinueGame,
  onStartGame,
  coopRoom,
  coopConnected,
  coopError,
  localPlayerId,
  onJoinCoopRoom,
  onSelectCoopRole,
  onToggleCoopReady,
  onStartCoopGame,
  onOpenLeaderboard,
  onOpenMultiplayer,
  onOpenSocial,
  onOpenAdmin,
  onOpenOptions,
  isMuted,
  onToggleMute,
  isFullscreen,
  onToggleFullscreen,
  userProfile,
  cloudSyncStatus,
  language,
  onLanguageChange
}) => {
  const [roomInput, setRoomInput] = useState(coopRoom?.roomId || 'ALPHA-1');
  const [titleTapCount, setTitleTapCount] = useState(0);

  const localSlot = coopRoom?.players.find(p => p.playerId === localPlayerId);
  const playerCount = coopRoom?.players.length || 0;
  const hasPlayers = playerCount >= 1 && playerCount <= 3;
  const uniqueRolesValid =
    hasPlayers &&
    coopRoom!.players.every(p => p.characterClass !== null) &&
    new Set(coopRoom!.players.map(p => p.characterClass)).size === playerCount;
  const allPlayersReady =
    uniqueRolesValid && coopRoom!.players.every(p => p.ready);
  const readyCount = coopRoom?.players.filter(p => p.ready).length || 0;

  const classCards: {
    cls: CharacterClass;
    titleKey: string;
    descKey: string;
    weaponNote: string;
    stats: string[];
    icon: React.ReactNode;
    accent: 'cyan' | 'purple' | 'amber';
  }[] = [
    {
      cls: 'striker',
      titleKey: 'classStriker',
      descKey: 'classStrikerDesc',
      weaponNote: 'Katana / Daggers / Pistols',
      stats: ['ATK: 16', 'CRIT: 20%', 'HP: 95'],
      icon: <Sword className="w-5 h-5" />,
      accent: 'cyan'
    },
    {
      cls: 'technomancer',
      titleKey: 'classTechno',
      descKey: 'classTechnoDesc',
      weaponNote: 'Mage Staves / Arcane Foci',
      stats: ['ATK: 12', 'NRG: 70', 'HP: 80'],
      icon: <Zap className="w-5 h-5" />,
      accent: 'purple'
    },
    {
      cls: 'vanguard',
      titleKey: 'classVanguard',
      descKey: 'classVanguardDesc',
      weaponNote: 'Sword+Shield / 2H Greatsword',
      stats: ['DEF: 8', 'HP: 120', 'ATK: 14'],
      icon: <Shield className="w-5 h-5" />,
      accent: 'amber'
    }
  ];

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-between p-4 sm:p-8 select-none overflow-y-auto bg-gradient-to-b from-[#0a0618]/92 via-[#0d0824]/88 to-[#060410]/96 backdrop-blur-[2px]">
      {/* Top Bar: Operative Status, Online/Offline Tabs, Language Selector & System Utilities */}
      <div className="flex flex-wrap items-center justify-between w-full max-w-6xl mx-auto gap-3">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <div className="text-xs font-mono tracking-wider text-cyan-300">
            {t('netStatus', language)}:{' '}
            <span className="text-white font-bold">
              {userProfile ? userProfile.username : t('guestOperative', language)}
            </span>
            <span className="ml-2 px-1.5 py-0.5 text-[10px] uppercase bg-cyan-950/80 border border-cyan-500/30 rounded text-cyan-400">
              {userProfile?.role || 'PLAYER'}
            </span>
          </div>
        </div>

        {/* Top Online / Offline Mode Switcher Tabs */}
        <div
          role="tablist"
          aria-label="Play Mode Switcher"
          className="flex items-center p-1 rounded-lg bg-[#0d0824] border border-cyan-500/40 font-mono"
        >
          <button
            role="tab"
            aria-selected={playMode === 'offline'}
            data-testid="mode-tab-offline"
            onClick={() => onChangePlayMode('offline')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
              playMode === 'offline'
                ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400/60 shadow-[0_0_10px_rgba(0,240,255,0.25)]'
                : 'text-slate-400 hover:text-white border border-transparent'
            }`}
          >
            <WifiOff className="w-3.5 h-3.5" />
            <span>{t('offlineTab', language)}</span>
          </button>

          <button
            role="tab"
            aria-selected={playMode === 'online'}
            data-testid="mode-tab-online"
            onClick={() => onChangePlayMode('online')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
              playMode === 'online'
                ? 'bg-pink-500/25 text-pink-200 border border-pink-400/60 shadow-[0_0_10px_rgba(255,0,127,0.25)]'
                : 'text-slate-400 hover:text-white border border-transparent'
            }`}
          >
            <Wifi className="w-3.5 h-3.5" />
            <span>{t('onlineTab', language)} (1-3P CO-OP)</span>
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          <LanguageSelector currentLanguage={language} onLanguageChange={onLanguageChange} />

          <div className="hidden lg:flex items-center gap-1.5 text-xs font-mono text-purple-300 bg-purple-950/40 border border-purple-500/30 px-2.5 py-1 rounded">
            <Cloud className="w-3.5 h-3.5 text-purple-400" />
            <span>{cloudSyncStatus}</span>
          </div>

          <button
            onClick={onToggleMute}
            className="p-2 rounded bg-slate-900/80 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-950 transition hover:border-cyan-400 cursor-pointer"
            title={t('toggleAudio', language)}
            aria-label={t('toggleAudio', language)}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-cyan-300" />}
          </button>

          <button
            onClick={onOpenOptions}
            data-testid="title-options-btn"
            className="flex items-center gap-1.5 px-2.5 py-2 rounded bg-slate-900/80 border border-purple-500/40 text-purple-300 hover:bg-purple-950 transition hover:border-purple-400 text-xs font-mono font-bold cursor-pointer"
            title={t('optionsBtn', language)}
            aria-label={t('optionsBtn', language)}
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">{t('optionsBtn', language)}</span>
          </button>

          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              data-testid="title-fullscreen-btn"
              className="p-2 rounded bg-slate-900/80 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-950 transition hover:border-cyan-400 cursor-pointer"
              title={t('fullscreenToggle', language)}
              aria-label={t('fullscreenToggle', language)}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Main Centerpiece */}
      <div className="flex flex-col items-center justify-center my-auto w-full max-w-4xl mx-auto text-center py-4">
        <div
          className="mb-3 cursor-pointer"
          data-testid="game-title-secret"
          onClick={() => {
            setTitleTapCount(prev => {
              const next = prev + 1;
              if (next >= 5) {
                onOpenAdmin();
                return 0;
              }
              return next;
            });
          }}
          role="button"
          aria-label="CYBER-CRYPT"
        >
          <svg viewBox="0 0 680 104" className="w-full max-w-lg mx-auto h-auto drop-shadow-[0_0_22px_rgba(0,240,255,0.4)] pointer-events-none">
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
            <path d="M 40 8 L 640 8 L 670 36 L 670 68 L 640 96 L 40 96 L 10 68 L 10 36 Z" fill="rgba(15, 10, 36, 0.72)" stroke="#ff007f" strokeWidth="1.5" />
            <text x="340" y="56" textAnchor="middle" fill="url(#neonCyanPink)" filter="url(#neonGlow)" fontFamily="ui-monospace, monospace" fontSize="40" fontWeight="bold" letterSpacing="6">
              CYBER-CRYPT
            </text>
            <text x="340" y="80" textAnchor="middle" fill="#00f0ff" fontFamily="ui-monospace, monospace" fontSize="11" letterSpacing="4">
              // SYNTHWAVE ROGUELIKE //
            </text>
          </svg>
        </div>

        <p className="text-xs sm:text-sm font-mono text-cyan-200/80 max-w-xl mb-5">
          {t('gameSubtitle', language)}
        </p>

        {playMode === 'offline' ? (
          /* ================= OFFLINE SOLO MODE ================= */
          <>
            {/* Normal (Persistent Checkpoint) vs Hard (Permadeath) Mode Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl mb-5 font-mono">
              <button
                data-testid="difficulty-normal-btn"
                onClick={() => onChangeDifficultyMode('normal')}
                className={`p-3 rounded-lg border text-left transition cursor-pointer ${
                  difficultyMode === 'normal'
                    ? 'bg-emerald-950/60 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                    : 'bg-slate-900/45 border-slate-700/70 hover:border-emerald-500/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-300">◈ {t('normalMode', language)}</span>
                  {difficultyMode === 'normal' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                      ACTIVE
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-300 mt-1 leading-snug">{t('normalModeDesc', language)}</p>
              </button>

              <button
                data-testid="difficulty-hard-btn"
                onClick={() => onChangeDifficultyMode('hard')}
                className={`p-3 rounded-lg border text-left transition cursor-pointer ${
                  difficultyMode === 'hard'
                    ? 'bg-pink-950/60 border-pink-500 shadow-[0_0_15px_rgba(255,0,127,0.3)]'
                    : 'bg-slate-900/45 border-slate-700/70 hover:border-pink-500/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-pink-300">☠️ {t('hardMode', language)}</span>
                  {difficultyMode === 'hard' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-300 border border-pink-400/40">
                      ACTIVE
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-300 mt-1 leading-snug">{t('hardModeDesc', language)}</p>
              </button>
            </div>

            <div className="text-[11px] font-mono text-cyan-300/75 mb-3">
              💾 {t('roleSaveHint', language)}
            </div>

            {/* Class Selector Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full mb-6">
              {classCards.map(card => {
                const selected = selectedClass === card.cls;
                const roleSave = savedOfflineRuns?.[getOfflineSaveSlotKey(difficultyMode, card.cls)] || null;
                const borderStyle =
                  card.accent === 'cyan'
                    ? selected
                      ? 'bg-cyan-950/60 border-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.35)] ring-1 ring-cyan-400'
                      : 'bg-slate-900/40 border-slate-700/60 hover:border-cyan-500/50'
                    : card.accent === 'purple'
                    ? selected
                      ? 'bg-purple-950/60 border-purple-400 shadow-[0_0_15px_rgba(189,0,255,0.35)] ring-1 ring-purple-400'
                      : 'bg-slate-900/40 border-slate-700/60 hover:border-purple-500/50'
                    : selected
                    ? 'bg-amber-950/60 border-amber-400 shadow-[0_0_15px_rgba(255,230,0,0.35)] ring-1 ring-amber-400'
                    : 'bg-slate-900/40 border-slate-700/60 hover:border-amber-500/50';

                return (
                  <button
                    key={card.cls}
                    data-testid={`class-card-${card.cls}`}
                    onClick={() => onSelectClass(card.cls)}
                    className={`flex flex-col items-center p-4 rounded-lg border text-left transition cursor-pointer relative ${borderStyle}`}
                  >
                    {roleSave && (
                      <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-emerald-950/85 border border-emerald-400/50 text-[9px] font-mono font-bold text-emerald-300">
                        💾 Lv.{roleSave.player.stats.level} · P{roleSave.dungeon.floor}
                      </span>
                    )}
                    <div className="p-2.5 rounded-full bg-slate-900/80 border border-white/15 mb-2 text-cyan-300">
                      <GameIcon id={`ui.title.class_${card.cls}`} fallback={card.icon} size={22} />
                    </div>
                    <div className="font-bold text-white text-sm font-mono tracking-wide">
                      {t(card.titleKey, language)}
                    </div>
                    <div className="text-[11px] text-cyan-300 font-mono mt-1 text-center">
                      {t(card.descKey, language)}
                    </div>
                    <div className="text-[10px] text-amber-300/90 font-mono mt-1.5 px-2 py-0.5 rounded bg-black/35 border border-white/10">
                      {card.weaponNote}
                    </div>
                    <div className="mt-2.5 flex items-center gap-2 text-[10px] font-mono text-slate-300">
                      {card.stats.map(s => (
                        <span key={s}>{s}</span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>

            {savedOfflineRun ? (
              <div className="mb-5 w-full max-w-2xl p-3.5 rounded-xl bg-emerald-950/35 border border-emerald-500/45 shadow-[0_0_24px_rgba(16,185,129,0.2)] flex flex-col items-center gap-3 font-mono">
                <div className="flex flex-wrap items-center justify-center gap-2 text-[11px]">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 font-bold uppercase tracking-wider">
                    💾 {t('savedRunBadge', language)} · {savedOfflineRun.difficultyMode.toUpperCase()}
                  </span>
                  <span className="text-cyan-300 font-bold uppercase">
                    {savedOfflineRun.player.characterClass} · LV.{savedOfflineRun.player.stats.level} · F{savedOfflineRun.dungeon.floor}
                  </span>
                  <span className="text-amber-300">
                    <GameIcon id="currency.coins" fallback="🪙" size={14} /> {savedOfflineRun.player.stats.coins} · <GameIcon id="currency.soul_shards" fallback="💎" size={14} /> {savedOfflineRun.player.stats.soulShards}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-snug">{t('continueRunDesc', language)}</p>
                <div className="flex flex-wrap items-center justify-center gap-3 w-full">
                  <CanvasButton
                    label={t('continueRun', language)}
                    icon="▶"
                    theme="emerald"
                    width={290}
                    height={52}
                    data-testid="continue-run-btn"
                    aria-label={t('continueRun', language)}
                    onClick={onContinueGame}
                  />
                  <CanvasButton
                    label={t('startNewRun', language)}
                    icon="🆕"
                    theme="pink"
                    width={290}
                    height={46}
                    data-start="true"
                    data-testid="start-new-run-btn"
                    aria-label={t('startNewRun', language)}
                    onClick={onStartGame}
                  />
                </div>
              </div>
            ) : (
              <div className="mb-5 flex justify-center">
                <CanvasButton
                  label={t('startRun', language)}
                  icon="▶"
                  theme="cyan"
                  width={340}
                  height={54}
                  data-start="true"
                  aria-label={t('startRun', language)}
                  onClick={onStartGame}
                />
              </div>
            )}
          </>
        ) : (
          /* ================= ONLINE 3-PLAYER CO-OP LOBBY ================= */
          <div className="w-full max-w-4xl p-4 sm:p-5 rounded-xl bg-[#0d0920]/90 border border-pink-500/45 shadow-[0_0_30px_rgba(255,0,127,0.2)] font-mono mb-5">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-pink-500/25">
              <div className="text-left">
                <div className="text-sm font-bold text-pink-300 tracking-wider">{t('coopTitle', language)}</div>
                <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                  <span className={`w-2 h-2 rounded-full ${coopConnected ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                  <span>{coopConnected ? `WS SYNCED · ${coopRoom?.roomId || roomInput}` : 'Connecting to /ws...'}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={roomInput}
                  onChange={e => setRoomInput(e.target.value.toUpperCase())}
                  placeholder="ALPHA-1"
                  maxLength={16}
                  className="px-2.5 py-1.5 rounded bg-slate-950 border border-cyan-500/40 text-xs text-white w-28 uppercase"
                />
                <CanvasButton
                  label={t('joinRoomBtn', language)}
                  theme="cyan"
                  width={145}
                  height={34}
                  data-testid="coop-join-btn"
                  onClick={() => onJoinCoopRoom(roomInput)}
                />
              </div>
            </div>

            {coopError && (
              <div className="mt-2 px-3 py-1.5 rounded bg-red-950/60 border border-red-500/40 text-xs text-red-300">
                ⚠ {coopError}
              </div>
            )}

            <div className="mt-2.5 px-3 py-1.5 rounded bg-purple-950/35 border border-purple-500/35 text-[11px] text-purple-200 text-left">
              🎒 {t('onlineStashHint', language)}
            </div>

            {/* Role Selection Casillas (No Duplicates Allowed) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
              {classCards.map(card => {
                const holder = coopRoom?.players.find(p => p.characterClass === card.cls);
                const isMine = holder?.playerId === localPlayerId;
                const takenByOther = !!holder && !isMine;
                const stash = onlineStashes?.[card.cls];
                const stashItemsCount =
                  (stash?.inventory?.length || 0) +
                  (stash?.equipment ? Object.values(stash.equipment).filter(Boolean).length : 0);

                return (
                  <button
                    key={card.cls}
                    data-testid={`coop-role-${card.cls}`}
                    disabled={takenByOther}
                    onClick={() => !takenByOther && onSelectCoopRole(card.cls)}
                    className={`p-3.5 rounded-lg border text-left transition relative ${
                      isMine
                        ? 'bg-cyan-950/70 border-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.3)]'
                        : takenByOther
                        ? 'bg-slate-950/70 border-slate-800 opacity-60 cursor-not-allowed'
                        : 'bg-slate-900/50 border-slate-700 hover:border-pink-400/60 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-cyan-300"><GameIcon id={`ui.title.class_${card.cls}`} fallback={card.icon} size={22} /></span>
                      {holder ? (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                            holder.ready
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                              : 'bg-amber-950 text-amber-300 border border-amber-500/40'
                          }`}
                        >
                          {holder.ready ? `✓ ${t('readyBtn', language)}` : holder.username}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500 uppercase">OPEN SLOT</span>
                      )}
                    </div>
                    <div className="font-bold text-white text-xs">{t(card.titleKey, language)}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{card.weaponNote}</div>
                    {stash && (
                      <div className="mt-1.5 px-1.5 py-0.5 rounded bg-black/45 border border-cyan-500/30 text-[10px] text-cyan-200 flex flex-wrap gap-1.5">
                        <span className="text-amber-300 inline-flex items-center gap-0.5"><GameIcon id="currency.coins" fallback="🪙" size={12} />{stash.coins}</span>
                        <span className="text-cyan-300 inline-flex items-center gap-0.5"><GameIcon id="currency.soul_shards" fallback="💎" size={12} />{stash.soulShards}</span>
                        <span className="text-emerald-300">🎒{stashItemsCount}</span>
                        <span className="text-slate-400">· Lv.1</span>
                      </div>
                    )}
                    {takenByOther && (
                      <div className="text-[10px] text-red-400 font-bold mt-1">
                        🔒 {t('roleTakenLabel', language)}: {holder!.username}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* 3 Squad Slots Status Bar */}
            <div className="grid grid-cols-3 gap-2 mt-4">
              {[0, 1, 2].map(idx => {
                const slot = coopRoom?.players[idx];
                return (
                  <div
                    key={idx}
                    className={`p-2 rounded border text-xs flex items-center justify-between ${
                      slot
                        ? slot.ready
                          ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                          : 'bg-slate-900/70 border-slate-700 text-slate-200'
                        : 'bg-slate-950/40 border-slate-800/70 text-slate-500'
                    }`}
                  >
                    <span className="truncate">
                      {slot ? `${slot.username} (${slot.characterClass || '?'})` : `Slot #${idx + 1} · Waiting`}
                    </span>
                    {slot ? (
                      slot.ready ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                      )
                    ) : null}
                  </div>
                );
              })}
            </div>

            {/* Ready + Start Group Controls (Start stays disabled until all present players 1-3 are Ready!) */}
            <div className="flex flex-wrap items-center justify-center gap-4 mt-5">
              <CanvasButton
                label={localSlot?.ready ? t('notReadyBtn', language) : t('readyBtn', language)}
                icon={localSlot?.ready ? '✖' : '✔'}
                theme={localSlot?.ready ? 'amber' : 'emerald'}
                disabled={!localSlot?.characterClass}
                width={200}
                height={46}
                data-testid="coop-ready-btn"
                onClick={() => onToggleCoopReady(!localSlot?.ready)}
              />

              <CanvasButton
                label={`${t('startGroupBtn', language)} [${readyCount}/${Math.max(1, playerCount)}]`}
                sublabel={!allPlayersReady ? t('waitingReadyPlayers', language) : undefined}
                icon="🚀"
                theme="cyan"
                disabled={!allPlayersReady}
                width={280}
                height={50}
                data-testid="coop-start-btn"
                onClick={onStartCoopGame}
              />
            </div>
          </div>
        )}

        {/* Navigation CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <CanvasButton label={t('leaderboardsBtn', language)} icon="🏆" theme="amber" width={205} height={42} onClick={onOpenLeaderboard} />
          <CanvasButton label={t('multiplayerBtn', language)} icon="⚡" theme="pink" width={205} height={42} onClick={onOpenMultiplayer} />
          <CanvasButton label={t('socialBtn', language)} icon="👥" theme="purple" width={205} height={42} onClick={onOpenSocial} />
        </div>
      </div>

      <div className="text-center text-[11px] font-mono text-cyan-400/70 border-t border-cyan-900/30 pt-2.5">
        {t('controlHints', language)}
      </div>
    </div>
  );
};
