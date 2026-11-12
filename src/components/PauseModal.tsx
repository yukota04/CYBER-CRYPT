import React from 'react';
import { Language, t } from '../game/i18n';
import { CanvasButton } from './CanvasButton';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onReturnToTitle: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  floor: number;
  language: Language;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onReturnToTitle,
  isMuted,
  onToggleMute,
  floor,
  language
}) => {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none font-mono">
      <div className="w-full max-w-sm bg-[#0a0718] border border-cyan-500/50 rounded-xl shadow-[0_0_30px_rgba(0,240,255,0.3)] p-6 text-center flex flex-col items-center">
        <h2 className="text-xl font-bold text-white tracking-widest uppercase mb-1">
          {t('simSuspended', language)}
        </h2>
        <p className="text-xs text-cyan-400 mb-6">{t('floor', language)} {floor}</p>

        <div className="flex flex-col gap-3 w-full items-center">
          <CanvasButton
            label={t('resumeOp', language)}
            icon="▶"
            theme="cyan"
            width={280}
            height={48}
            onClick={onResume}
          />

          <CanvasButton
            label={isMuted ? t('unmuteSynth', language) : t('muteSynth', language)}
            icon={isMuted ? '🔇' : '🔊'}
            theme="amber"
            width={280}
            height={44}
            onClick={onToggleMute}
          />

          <CanvasButton
            label={t('restartMission', language)}
            icon="🔄"
            theme="pink"
            width={280}
            height={44}
            onClick={onRestart}
          />

          <CanvasButton
            label={t('abortHub', language)}
            icon="🏠"
            theme="purple"
            width={280}
            height={44}
            onClick={onReturnToTitle}
          />
        </div>
      </div>
    </div>
  );
};
