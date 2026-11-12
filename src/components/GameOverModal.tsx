import React from 'react';
import { RunSnapshot } from '../game/types';
import { Language, t } from '../game/i18n';
import { CanvasButton } from './CanvasButton';
import { Skull, RotateCcw, Home } from 'lucide-react';

interface GameOverModalProps {
  snapshot: RunSnapshot;
  onRestart: () => void;
  onReturnToTitle: () => void;
  language: Language;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  snapshot,
  onRestart,
  onReturnToTitle,
  language
}) => {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm select-none font-mono">
      <div className="w-full max-w-md bg-[#0a0614] border border-red-500/60 rounded-xl shadow-[0_0_40px_rgba(255,0,85,0.4)] p-6 text-center flex flex-col items-center">
        {/* Skull Icon */}
        <div className="p-4 rounded-full bg-red-950/60 border border-red-500/50 mb-3 text-red-500 animate-pulse">
          <Skull className="w-10 h-10" />
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-white tracking-widest uppercase">
          {t('permDeath', language)}
        </h2>
        <p className="text-xs text-red-400 mt-1 mb-6">
          {t('deathDesc', language)} {snapshot.floor}.
        </p>

        {/* Run Mastery / Progress Metrics */}
        <div className="grid grid-cols-2 gap-3 w-full mb-6">
          <div className="p-3 rounded-lg bg-[#0e0a20] border border-red-500/20 text-left">
            <span className="text-[10px] text-slate-400 uppercase font-bold">{t('totalScore', language)}</span>
            <div className="text-lg font-bold text-amber-400 tabular-nums">
              {snapshot.score.toLocaleString()}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#0e0a20] border border-red-500/20 text-left">
            <span className="text-[10px] text-slate-400 uppercase font-bold">{t('deepestFloor', language)}</span>
            <div className="text-lg font-bold text-cyan-400 tabular-nums">
              Sub-Level {snapshot.floor}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#0e0a20] border border-red-500/20 text-left">
            <span className="text-[10px] text-slate-400 uppercase font-bold">{t('hostilesBreached', language)}</span>
            <div className="text-lg font-bold text-pink-400 tabular-nums">
              {snapshot.monstersSlain} slain
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#0e0a20] border border-red-500/20 text-left">
            <span className="text-[10px] text-slate-400 uppercase font-bold">{t('soulShards', language)}</span>
            <div className="text-lg font-bold text-emerald-400 tabular-nums">
              {snapshot.soulShards} collected
            </div>
          </div>
        </div>

        {/* Primary Action Buttons via CanvasButton */}
        <div className="flex flex-col gap-3 w-full items-center">
          <CanvasButton
            label={t('initNewOperative', language)}
            icon="🔄"
            theme="cyan"
            width={340}
            height={50}
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
      </div>
    </div>
  );
};
