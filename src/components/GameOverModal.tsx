import React, { useEffect, useState } from 'react';
import { DifficultyMode, RunSnapshot } from '../game/types';
import { Language, t } from '../game/i18n';
import { CanvasButton } from './CanvasButton';
import { Skull, ShieldCheck, Tv } from 'lucide-react';

interface GameOverModalProps {
  snapshot: RunSnapshot;
  difficultyMode: DifficultyMode;
  hasCheckpoint: boolean;
  isOnlineCoop?: boolean;
  hasDeathDrop?: boolean;
  canReviveWithAd: boolean;
  onReviveInPlace: () => void;
  onReviveCheckpoint: () => void;
  onRestart: () => void;
  onReturnToTitle: () => void;
  language: Language;
}

const SPONSOR_ADS = [
  { brand: 'HYPERION BIOTECH', tagline: 'Quantum Nanite Tissue Reconstructor v9.2' },
  { brand: 'CHRONOS ENERGY CORP', tagline: 'Zero-Latency Neural Capacitor Boost' },
  { brand: 'AETHER-GRID SYNDICATE', tagline: 'Tactical Field Defibrillator Uplinks' }
];

export const GameOverModal: React.FC<GameOverModalProps> = ({
  snapshot,
  difficultyMode,
  hasCheckpoint,
  isOnlineCoop = false,
  hasDeathDrop = false,
  canReviveWithAd,
  onReviveInPlace,
  onReviveCheckpoint,
  onRestart,
  onReturnToTitle,
  language
}) => {
  const canReviveCheckpoint = (difficultyMode === 'normal' || isOnlineCoop) && hasCheckpoint;
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const [adProgress, setAdProgress] = useState(0);
  const [sponsorIdx, setSponsorIdx] = useState(0);

  useEffect(() => {
    if (!isWatchingAd) return;

    const interval = setInterval(() => {
      setAdProgress(prev => {
        const next = Math.min(100, prev + 6);
        if (next >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsWatchingAd(false);
            setAdProgress(0);
            onReviveInPlace();
          }, 150);
        }
        return next;
      });
    }, 90);

    return () => clearInterval(interval);
  }, [isWatchingAd, onReviveInPlace]);

  const handleStartAdRevive = () => {
    if (isWatchingAd) return;
    setSponsorIdx(prev => (prev + 1) % SPONSOR_ADS.length);
    setAdProgress(0);
    setIsWatchingAd(true);
  };

  const sponsor = SPONSOR_ADS[sponsorIdx];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm select-none font-mono">
      <div
        className={`w-full max-w-md bg-[#0a0614] border rounded-xl p-6 text-center flex flex-col items-center relative overflow-hidden ${
          canReviveCheckpoint
            ? 'border-emerald-500/60 shadow-[0_0_40px_rgba(16,185,129,0.35)]'
            : 'border-red-500/60 shadow-[0_0_40px_rgba(255,0,85,0.4)]'
        }`}
      >
        {isWatchingAd ? (
          <div
            data-testid="ad-loading-overlay"
            className="w-full py-6 flex flex-col items-center gap-4"
          >
            <div className="p-4 rounded-full bg-amber-950/70 border border-amber-400/60 text-amber-300 animate-pulse">
              <Tv className="w-10 h-10" />
            </div>

            <div className="text-xs uppercase tracking-widest font-bold text-amber-300">
              {t('adLoadingTitle', language)}
            </div>

            <div className="w-full p-4 rounded-xl bg-gradient-to-br from-amber-950/50 via-[#120d26] to-cyan-950/50 border border-amber-400/40">
              <div className="text-[10px] text-cyan-300 uppercase tracking-widest mb-1">
                SPONSORED TRANSMISSION
              </div>
              <div className="text-base font-bold text-white tracking-wider">
                {sponsor.brand}
              </div>
              <div className="text-xs text-slate-300 mt-1">{sponsor.tagline}</div>
            </div>

            <p className="text-xs text-slate-300">{t('adLoadingDesc', language)}</p>

            <div className="w-full">
              <div className="flex justify-between text-[11px] font-bold text-amber-300 mb-1">
                <span>AD STREAM</span>
                <span>{adProgress}%</span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-900 border border-amber-500/40 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-400 transition-all duration-75"
                  style={{ width: `${adProgress}%` }}
                />
              </div>
            </div>
          </div>
        ) : (
          <>
            <div
              className={`p-4 rounded-full border mb-3 animate-pulse ${
                canReviveCheckpoint
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-400'
                  : 'bg-red-950/60 border-red-500/50 text-red-500'
              }`}
            >
              {canReviveCheckpoint ? <ShieldCheck className="w-10 h-10" /> : <Skull className="w-10 h-10" />}
            </div>

            <h2 className="text-xl font-bold text-white tracking-widest uppercase">
              {canReviveCheckpoint ? t('checkpointAvailable', language) : t('permDeath', language)}
            </h2>
            <p className={`text-xs mt-1 mb-6 ${canReviveCheckpoint ? 'text-emerald-300' : 'text-red-400'}`}>
              {t('deathDesc', language)} {snapshot.floor}.
            </p>

            <div className="grid grid-cols-2 gap-3 w-full mb-6">
              <div className="p-3 rounded-lg bg-[#0e0a20] border border-cyan-500/20 text-left">
                <span className="text-[10px] text-slate-400 uppercase font-bold">{t('totalScore', language)}</span>
                <div className="text-lg font-bold text-amber-400 tabular-nums">
                  {snapshot.score.toLocaleString()}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#0e0a20] border border-cyan-500/20 text-left">
                <span className="text-[10px] text-slate-400 uppercase font-bold">{t('deepestFloor', language)}</span>
                <div className="text-lg font-bold text-cyan-400 tabular-nums">
                  Sub-Level {snapshot.floor}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#0e0a20] border border-cyan-500/20 text-left">
                <span className="text-[10px] text-slate-400 uppercase font-bold">{t('hostilesBreached', language)}</span>
                <div className="text-lg font-bold text-pink-400 tabular-nums">
                  {snapshot.monstersSlain} slain
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#0e0a20] border border-cyan-500/20 text-left">
                <span className="text-[10px] text-slate-400 uppercase font-bold">{t('coins', language)} / {t('shards', language)}</span>
                <div className="text-sm font-bold text-yellow-300 tabular-nums">
                  🪙 {snapshot.coins || 0} · 💎 {snapshot.soulShards}
                </div>
              </div>
            </div>

            {hasDeathDrop && (
              <div className="w-full mb-4 px-3 py-2 rounded-lg bg-amber-950/50 border border-amber-400/50 text-[11px] text-amber-200 leading-snug text-left">
                💀 {t('deathDropHint', language)}
              </div>
            )}

            <div className="flex flex-col gap-3 w-full items-center">
              {canReviveWithAd && (
                <div className="flex flex-col items-center gap-1 w-full">
                  <CanvasButton
                    label={t('reviveAdBtn', language)}
                    sublabel={t('adUnlimitedBadge', language)}
                    icon="📺"
                    theme="amber"
                    width={340}
                    height={54}
                    data-testid="revive-ad-btn"
                    onClick={handleStartAdRevive}
                  />
                </div>
              )}

              {canReviveCheckpoint && (
                <CanvasButton
                  label={isOnlineCoop ? t('coopReviveCheckpointBtn', language) : t('reviveCheckpointBtn', language)}
                  icon="◈"
                  theme="emerald"
                  width={340}
                  height={48}
                  data-testid="revive-checkpoint-btn"
                  onClick={onReviveCheckpoint}
                />
              )}

              <CanvasButton
                label={t('initNewOperative', language)}
                icon="🔄"
                theme="cyan"
                width={340}
                height={46}
                data-start="true"
                onClick={onRestart}
              />

              <CanvasButton
                label={t('returnHub', language)}
                icon="🏠"
                theme="purple"
                width={340}
                height={42}
                onClick={onReturnToTitle}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
