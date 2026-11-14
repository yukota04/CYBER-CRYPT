import React from 'react';
import { Language, t } from '../game/i18n';

export type LoadingScreenKind = 'boot' | 'run' | 'ad' | 'menu';

interface LoadingScreenProps {
  kind: LoadingScreenKind;
  language: Language;
  progress?: number; // 0–100 when known
  detail?: string;
  testId?: string;
}

const TITLES: Record<LoadingScreenKind, string> = {
  boot: 'bootLoadingTitle',
  run: 'runLoadingTitle',
  ad: 'adLoadingTitle',
  menu: 'menuLoadingTitle'
};

const DESCS: Record<LoadingScreenKind, string> = {
  boot: 'bootLoadingDesc',
  run: 'runLoadingDesc',
  ad: 'adLoadingDesc',
  menu: 'menuLoadingDesc'
};

/** Full-screen real-load gate (boot / start run / ads / menu teardown). */
export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  kind,
  language,
  progress,
  detail,
  testId = `loading-screen-${kind}`
}) => {
  const pct = typeof progress === 'number' ? Math.max(0, Math.min(100, progress)) : null;

  return (
    <div
      data-testid={testId}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-[#060410] text-cyan-100 font-mono select-none"
    >
      <div className="text-cyan-400 text-xs tracking-[0.35em] uppercase opacity-80">CYBER-CRYPT</div>
      <h1 className="text-lg sm:text-xl font-bold tracking-wide text-center px-6">
        {t(TITLES[kind], language)}
      </h1>
      <p className="text-xs text-slate-400 text-center max-w-sm px-6">
        {detail || t(DESCS[kind], language)}
      </p>
      <div className="w-[min(70vw,280px)] h-2.5 rounded-full bg-slate-900 border border-cyan-500/40 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-[width] duration-150"
          style={{
            width: pct != null ? `${pct}%` : '40%',
            animation: pct == null ? 'ccLoadPulse 1.1s ease-in-out infinite' : undefined
          }}
        />
      </div>
      {pct != null && (
        <div className="text-[11px] text-cyan-300/90 font-bold tabular-nums">{Math.round(pct)}%</div>
      )}
      <style>{`
        @keyframes ccLoadPulse {
          0%, 100% { opacity: 0.45; transform: translateX(-30%); }
          50% { opacity: 1; transform: translateX(80%); }
        }
      `}</style>
    </div>
  );
};
