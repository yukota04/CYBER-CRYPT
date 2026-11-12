import React, { useState, useEffect } from 'react';
import { Language, t } from '../game/i18n';
import { X, Trophy, Medal, Award, Flame, User } from 'lucide-react';
import { Achievement } from '../game/types';

interface LeaderboardEntry {
  rank: number;
  username: string;
  characterClass: string;
  floor: number;
  score: number;
  timeSec: number;
  platform: string;
}

interface LeaderboardModalProps {
  onClose: () => void;
  achievements: Achievement[];
  userStats: { highestFloor: number; totalKills: number; bestScore: number };
  language: Language;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  onClose,
  achievements,
  userStats,
  language
}) => {
  const [tab, setTab] = useState<'leaderboard' | 'achievements'>('leaderboard');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/leaderboard')
      .then(res => res.json())
      .then(data => {
        setEntries(data.leaderboard || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none font-mono">
      <div className="w-full max-w-3xl bg-[#0a0718] border border-amber-500/50 rounded-lg shadow-[0_0_35px_rgba(255,230,0,0.25)] p-5 flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-amber-500/30">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-white tracking-wider">
              {t('rankingsTitle', language)}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2 my-4 border-b border-slate-800 pb-2">
          <button
            onClick={() => setTab('leaderboard')}
            className={`px-4 py-1.5 rounded text-xs font-bold transition cursor-pointer ${
              tab === 'leaderboard'
                ? 'bg-amber-500 text-black shadow-[0_0_10px_rgba(255,230,0,0.4)]'
                : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            {t('globalTab', language)}
          </button>
          <button
            onClick={() => setTab('achievements')}
            className={`px-4 py-1.5 rounded text-xs font-bold transition cursor-pointer ${
              tab === 'achievements'
                ? 'bg-amber-500 text-black shadow-[0_0_10px_rgba(255,230,0,0.4)]'
                : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            {t('milestonesTab', language)} ({achievements.filter(a => a.unlocked).length}/{achievements.length})
          </button>
        </div>

        {/* Tab 1: Leaderboard Table */}
        {tab === 'leaderboard' && (
          <div className="flex flex-col gap-4">
            {/* Quick Personal Stat Bar */}
            <div className="grid grid-cols-3 gap-3 p-3 rounded bg-[#0d0920] border border-amber-500/20 text-center">
              <div>
                <div className="text-[10px] text-slate-400">{t('bestScore', language)}</div>
                <div className="text-sm font-bold text-amber-400">{userStats.bestScore}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">{t('highestFloor', language)}</div>
                <div className="text-sm font-bold text-cyan-400">{t('floor', language)} {userStats.highestFloor}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">{t('matrixKills', language)}</div>
                <div className="text-sm font-bold text-pink-400">{userStats.totalKills}</div>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-10 text-slate-400 text-xs">Querying leaderboard matrix...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase">
                      <th className="py-2 px-3">Rank</th>
                      <th className="py-2 px-3">Operative</th>
                      <th className="py-2 px-3">Class</th>
                      <th className="py-2 px-3">Floor</th>
                      <th className="py-2 px-3">Time</th>
                      <th className="py-2 px-3 text-right">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry, idx) => (
                      <tr
                        key={idx}
                        className={`border-b border-slate-900/60 transition ${
                          idx === 0
                            ? 'bg-amber-950/30 text-amber-300 font-bold'
                            : idx === 1
                            ? 'bg-slate-850/40 text-slate-200'
                            : idx === 2
                            ? 'bg-orange-950/20 text-orange-200'
                            : 'text-slate-400 hover:bg-slate-900/40'
                        }`}
                      >
                        <td className="py-2 px-3">
                          {idx === 0 ? '🥇 #1' : idx === 1 ? '🥈 #2' : idx === 2 ? '🥉 #3' : `#${entry.rank}`}
                        </td>
                        <td className="py-2 px-3 font-semibold text-white flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-cyan-400" />
                          {entry.username}
                        </td>
                        <td className="py-2 px-3 uppercase text-[10px]">{entry.characterClass}</td>
                        <td className="py-2 px-3 text-cyan-400">F{entry.floor}</td>
                        <td className="py-2 px-3 text-slate-400">{Math.floor(entry.timeSec / 60)}m {entry.timeSec % 60}s</td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums text-amber-400">
                          {entry.score.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Achievements */}
        {tab === 'achievements' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {achievements.map(ach => (
              <div
                key={ach.id}
                className={`p-3 rounded-lg border flex items-start gap-3 transition ${
                  ach.unlocked
                    ? 'bg-amber-950/40 border-amber-500/40 shadow-[0_0_10px_rgba(255,230,0,0.15)]'
                    : 'bg-slate-950/40 border-slate-800 opacity-50'
                }`}
              >
                <span className="text-2xl">{ach.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className={`text-xs font-bold ${ach.unlocked ? 'text-amber-300' : 'text-slate-400'}`}>
                      {ach.title}
                    </h4>
                    {ach.unlocked && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-500/40 text-emerald-400 font-bold">
                        COMPLETED
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1">{ach.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
