import React, { useState } from 'react';
import { Player, SkillNode } from '../game/types';
import { getSkillsForClass, canUnlockSkill, SKILL_DATABASE } from '../game/skills';
import { Language, t } from '../game/i18n';
import { CanvasButton } from './CanvasButton';
import { X, Sparkles, Check, Lock, ChevronRight } from 'lucide-react';

interface SkillTreeModalProps {
  player: Player;
  onClose: () => void;
  onUnlockSkill: (skillId: string) => void;
  language: Language;
}

export const SkillTreeModal: React.FC<SkillTreeModalProps> = ({
  player,
  onClose,
  onUnlockSkill,
  language
}) => {
  const skills = getSkillsForClass(player.characterClass);
  const [selectedSkill, setSelectedSkill] = useState<SkillNode>(skills[0]);

  // Group skills by Tier
  const tier1 = skills.filter(s => s.tier === 1);
  const tier2 = skills.filter(s => s.tier === 2);
  const tier3 = skills.filter(s => s.tier === 3);
  const tier4 = skills.filter(s => s.tier === 4);

  const unlockCheck = canUnlockSkill(
    selectedSkill.id,
    player.unlockedSkills,
    player.stats.skillPoints
  );

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none font-mono">
      <div className="w-full max-w-3xl bg-[#0a0718] border border-purple-500/50 rounded-lg shadow-[0_0_35px_rgba(189,0,255,0.3)] p-5 flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-purple-500/30">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-purple-400" />
            <h2 className="text-base font-bold text-white tracking-wider">
              {player.characterClass.toUpperCase()} {t('matrixTitle', language)}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 rounded bg-amber-950/70 border border-amber-500/40 text-amber-300 font-bold text-xs">
              ⚡ {player.stats.skillPoints} {t('pointsAvailable', language)}
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              aria-label="Close Tech Tree"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tree Display & Detail Panel */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
          {/* Branching Tree Visualization (2 cols) */}
          <div className="md:col-span-2 flex flex-col justify-between py-2 px-4 rounded-lg bg-[#0d0920] border border-purple-500/20">
            {[tier1, tier2, tier3, tier4].map((tierNodes, tierIdx) => (
              <div key={tierIdx} className="flex flex-col items-center my-2">
                <div className="text-[10px] text-purple-400/80 font-bold tracking-widest mb-1.5 uppercase">
                  TIER {tierIdx + 1}
                </div>
                <div className="flex items-center justify-center gap-6">
                  {tierNodes.map(node => {
                    const isUnlocked = player.unlockedSkills.includes(node.id);
                    const isSelected = selectedSkill.id === node.id;

                    return (
                      <button
                        key={node.id}
                        onClick={() => setSelectedSkill(node)}
                        className={`relative flex flex-col items-center p-3 rounded-xl border transition cursor-pointer w-28 text-center ${
                          isUnlocked
                            ? 'bg-purple-950/60 border-purple-400 text-white shadow-[0_0_12px_rgba(189,0,255,0.4)]'
                            : 'bg-slate-900/60 border-slate-700 text-slate-400 hover:border-purple-500/60'
                        } ${isSelected ? 'ring-2 ring-cyan-400' : ''}`}
                      >
                        <span className="text-2xl mb-1">{node.icon}</span>
                        <span className="text-[10px] font-bold truncate max-w-full leading-tight">
                          {node.name}
                        </span>

                        {/* Status Icon */}
                        <div className="absolute top-1 right-1">
                          {isUnlocked ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Lock className="w-3 h-3 text-slate-500" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {tierIdx < 3 && (
                  <div className="w-0.5 h-5 bg-gradient-to-b from-purple-500/60 to-purple-800/20 my-1" />
                )}
              </div>
            ))}
          </div>

          {/* Skill Inspector Panel (1 col) */}
          <div className="flex flex-col justify-between p-4 rounded-lg bg-[#0d0920] border border-purple-500/20">
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">{selectedSkill.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-purple-950 border border-purple-500/30 text-purple-300">
                      Tier {selectedSkill.tier} {selectedSkill.type}
                    </span>
                    {selectedSkill.energyCost && (
                      <span className="text-[10px] text-cyan-400">
                        {selectedSkill.energyCost} Energy
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-3xl">{selectedSkill.icon}</span>
              </div>

              <p className="text-xs text-slate-300 mt-4 leading-relaxed border-t border-slate-800 pt-3">
                {selectedSkill.description}
              </p>

              {/* Cooldown or Stat bonuses */}
              <div className="mt-4 flex flex-col gap-1.5 text-xs">
                {selectedSkill.cooldown && (
                  <div className="flex justify-between text-pink-400">
                    <span>{t('rechargeCd', language)}:</span>
                    <span className="font-bold">{selectedSkill.cooldown} turns</span>
                  </div>
                )}
                <div className="flex justify-between text-amber-300">
                  <span>{t('unlockCost', language)}:</span>
                  <span className="font-bold">{selectedSkill.pointCost} SP</span>
                </div>
                {selectedSkill.prerequisites.length > 0 && (
                  <div className="mt-2 text-[11px] text-slate-400">
                    {t('prereqs', language)}:{' '}
                    <span className="text-cyan-300">
                      {selectedSkill.prerequisites.map(p => SKILL_DATABASE[p]?.name || p).join(', ')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Unlock Action Button */}
            <div className="mt-6 pt-3 border-t border-slate-800 flex justify-center">
              {player.unlockedSkills.includes(selectedSkill.id) ? (
                <div className="w-full py-2.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 font-bold text-xs text-center flex items-center justify-center gap-2">
                  <Check className="w-4 h-4" />
                  {t('protocolActive', language)}
                </div>
              ) : (
                <CanvasButton
                  label={unlockCheck.canUnlock ? t('unlockBtn', language) : (unlockCheck.reason || '')}
                  icon="⚡"
                  theme="purple"
                  width={240}
                  height={44}
                  disabled={!unlockCheck.canUnlock}
                  onClick={() => onUnlockSkill(selectedSkill.id)}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
