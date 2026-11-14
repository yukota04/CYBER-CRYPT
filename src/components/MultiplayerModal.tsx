import React, { useState, useEffect } from 'react';
import { Language, t } from '../game/i18n';
import { CanvasButton } from './CanvasButton';
import { X, Zap, Swords, ShieldCheck, Flame, Radio } from 'lucide-react';

interface MultiplayerModalProps {
  onClose: () => void;
  userToken: string;
  username: string;
  playerScore: number;
  playerFloor: number;
  language: Language;
}

export const MultiplayerModal: React.FC<MultiplayerModalProps> = ({
  onClose,
  userToken,
  username,
  playerScore,
  playerFloor,
  language
}) => {
  const [status, setStatus] = useState<'idle' | 'searching' | 'matched' | 'in_duel'>('idle');
  const [opponent, setOpponent] = useState<{ username: string; score: number; floor: number } | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [duelTimeLeft, setDuelTimeLeft] = useState(60);

  // Track timeouts safely for unmount cleanup
  useEffect(() => {
    if (status !== 'searching') return;
    const controller = new AbortController();
    let botTimer: ReturnType<typeof setTimeout> | null = null;
    let enterTimer: ReturnType<typeof setTimeout> | null = null;

    fetch('/api/matchmaking/join', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`
      },
      signal: controller.signal
    })
      .then(res => res.json())
      .then(data => {
        if (data.matchFound) {
          setStatus('matched');
          setMatchId(data.matchId);
          setOpponent({ username: data.opponent.username, score: 0, floor: 1 });
          enterTimer = setTimeout(() => setStatus('in_duel'), 1500);
        } else {
          // Simulated opponent discovery fallback when no second live operative is queued
          botTimer = setTimeout(() => {
            const bots = ['ViperMatrix', 'CyberNova', 'GlitchSpecter', 'CircuitQueen'];
            const botName = bots[Math.floor(Math.random() * bots.length)];
            setStatus('matched');
            setMatchId(`sim_match_${Date.now()}`);
            setOpponent({ username: botName, score: 850, floor: 1 });
            enterTimer = setTimeout(() => setStatus('in_duel'), 1500);
          }, 2000);
        }
      })
      .catch(err => {
        if (err.name !== 'AbortError') setStatus('idle');
      });

    return () => {
      controller.abort();
      if (botTimer) clearTimeout(botTimer);
      if (enterTimer) clearTimeout(enterTimer);
    };
  }, [status, userToken]);

  const startMatchmaking = () => {
    setDuelTimeLeft(60);
    setStatus('searching');
  };

  // Live duel synchronization (real backend polling + score submission or bot simulation fallback)
  useEffect(() => {
    if (status !== 'in_duel') return;

    const isServerMatch = Boolean(matchId && !matchId.startsWith('sim_match_'));

    const interval = setInterval(() => {
      setDuelTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });

      if (isServerMatch && matchId) {
        fetch('/api/matchmaking/score', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${userToken}`
          },
          body: JSON.stringify({ matchId, score: playerScore, floor: playerFloor })
        }).catch(() => {});

        fetch(`/api/matchmaking/status/${matchId}`, {
          headers: { Authorization: `Bearer ${userToken}` }
        })
          .then(res => res.json())
          .then(data => {
            const s = data.session;
            if (s && s.player1 && s.player2) {
              const other = s.player1.username === username ? s.player2 : s.player1;
              setOpponent({ username: other.username, score: other.score, floor: other.floor });
            }
          })
          .catch(() => {});
      } else {
        setOpponent(prev => {
          if (!prev) return null;
          return {
            ...prev,
            score: prev.score + Math.floor(Math.random() * 90 + 30),
            floor: Math.min(6, prev.floor + (Math.random() > 0.85 ? 1 : 0))
          };
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [status, matchId, userToken, username, playerScore, playerFloor]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none font-mono">
      <div className="w-full max-w-xl bg-[#0a0718] border border-pink-500/50 rounded-lg shadow-[0_0_35px_rgba(255,0,128,0.25)] p-5 flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-pink-500/30">
          <div className="flex items-center gap-2">
            <Swords className="w-5 h-5 text-pink-400" />
            <h2 className="text-base font-bold text-white tracking-wider">
              {t('duelTitle', language)}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center gap-1.5 min-w-[44px] h-10 sm:h-11 px-3 sm:px-3.5 rounded-lg bg-rose-950/90 hover:bg-rose-600 text-rose-100 hover:text-white border-2 border-rose-400/85 shadow-[0_0_14px_rgba(244,63,94,0.45)] font-bold text-xs uppercase tracking-wider transition cursor-pointer flex-shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5 stroke-[2.75]" />
            <span>{t('closeBtn', language)}</span>
          </button>
        </div>

        {/* Status Views */}
        <div className="py-6 flex flex-col items-center justify-center text-center">
          {status === 'idle' && (
            <div className="flex flex-col items-center">
              <div className="p-4 rounded-full bg-pink-950/40 border border-pink-500/40 mb-4 text-pink-400 animate-pulse">
                <Zap className="w-10 h-10" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">{t('duelSubtitle', language)}</h3>
              <p className="text-xs text-slate-300 max-w-md mb-6 leading-relaxed">
                {t('duelDesc', language)}
              </p>
              <CanvasButton
                label={t('findOpponent', language)}
                icon="⚔"
                theme="pink"
                width={260}
                height={50}
                onClick={startMatchmaking}
              />
            </div>
          )}

          {status === 'searching' && (
            <div className="flex flex-col items-center py-6">
              <div className="w-12 h-12 rounded-full border-4 border-pink-500 border-t-transparent animate-spin mb-4" />
              <div className="text-sm font-bold text-pink-400 tracking-wider">{t('searchingGrid', language)}</div>
              <p className="text-xs text-slate-400 mt-2">Checking regional low-latency nodes (E-Rank Tier)</p>
            </div>
          )}

          {status === 'matched' && opponent && (
            <div className="flex flex-col items-center py-4">
              <div className="text-xs text-emerald-400 font-bold uppercase tracking-widest mb-2">
                {t('matchFound', language)}
              </div>
              <div className="flex items-center gap-8 my-4">
                <div className="p-4 rounded-lg bg-cyan-950/60 border border-cyan-400 text-cyan-300 w-36 text-center">
                  <div className="text-[10px] text-slate-400">{t('you', language)}</div>
                  <div className="font-bold text-white text-sm truncate">{username}</div>
                </div>
                <div className="text-2xl font-bold text-pink-400 animate-bounce">VS</div>
                <div className="p-4 rounded-lg bg-pink-950/60 border border-pink-400 text-pink-300 w-36 text-center">
                  <div className="text-[10px] text-slate-400">{t('opponent', language)}</div>
                  <div className="font-bold text-white text-sm truncate">{opponent.username}</div>
                </div>
              </div>
            </div>
          )}

          {status === 'in_duel' && opponent && (
            <div className="w-full flex flex-col gap-4">
              {/* Timer Bar */}
              <div className="flex items-center justify-between px-4 py-2 rounded bg-slate-900 border border-pink-500/30">
                <div className="flex items-center gap-2 text-xs text-pink-400 font-bold">
                  <Radio className="w-4 h-4 text-emerald-400 animate-ping" />
                  {t('liveTelemetry', language)}
                </div>
                <div className="text-sm font-bold text-white font-mono tabular-nums">
                  {t('remaining', language)}: {duelTimeLeft}s
                </div>
              </div>

              {/* Head to Head Duel Metrics */}
              <div className="grid grid-cols-2 gap-4">
                {/* Your Stats */}
                <div className="p-4 rounded-lg bg-[#0d0920] border border-cyan-400/60 text-left">
                  <div className="text-[10px] text-cyan-400 font-bold">{t('you', language)} ({username})</div>
                  <div className="text-2xl font-bold text-white my-1 tabular-nums">{playerScore} pts</div>
                  <div className="text-xs text-cyan-300">{t('floor', language)} {playerFloor}</div>
                </div>

                {/* Opponent Stats */}
                <div className="p-4 rounded-lg bg-[#0d0920] border border-pink-400/60 text-left">
                  <div className="text-[10px] text-pink-400 font-bold">{t('opponent', language)} ({opponent.username})</div>
                  <div className="text-2xl font-bold text-white my-1 tabular-nums">{opponent.score} pts</div>
                  <div className="text-xs text-pink-300">{t('floor', language)} {opponent.floor}</div>
                </div>
              </div>

              {/* Status Outcome Ticker */}
              <div className="text-xs text-center font-bold mt-2">
                {playerScore >= opponent.score ? (
                  <span className="text-emerald-400">🔥 {t('youLead', language)} (+{playerScore - opponent.score} PTS)</span>
                ) : (
                  <span className="text-pink-400">⚠️ {t('oppLead', language)} (-{opponent.score - playerScore} PTS)</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
