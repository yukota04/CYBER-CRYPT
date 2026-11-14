import React, { useState } from 'react';
import { Player, SkillNode } from '../game/types';
import { getSkillTreesForClass, canUnlockSkill, SKILL_DATABASE } from '../game/skills';
import { Language, t } from '../game/i18n';
import { CanvasButton } from './CanvasButton';
import { X, Check, Lock } from 'lucide-react';

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
  const trees = getSkillTreesForClass(player.characterClass);
  const [activeTreeIdx, setActiveTreeIdx] = useState<1 | 2 | 3 | 4 | 5>(1);
  const currentTree = trees.find(tr => tr.treeIndex === activeTreeIdx) || trees[0];
  const [selectedSkill, setSelectedSkill] = useState<SkillNode>(currentTree.nodes[0]);

  // Keep selected skill valid when switching trees
  const displaySkill =
    currentTree.nodes.find(n => n.id === selectedSkill.id) || currentTree.nodes[0];

  const unlockCheck = canUnlockSkill(
    displaySkill.id,
    player.unlockedSkills,
    player.stats.skillPoints
  );

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none font-mono">
      <div className="w-full max-w-4xl bg-[#0a0718] border border-purple-500/50 rounded-lg shadow-[0_0_35px_rgba(189,0,255,0.3)] p-5 flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between pb-3 border-b border-purple-500/30 gap-2">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-purple-400" />
            <h2 className="text-base font-bold text-white tracking-wider">
              {player.characterClass.toUpperCase()} {t('matrixTitle', language)} (5 {t('skillTreeBranch', language)}S)
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 rounded bg-amber-950/70 border border-amber-500/40 text-amber-300 font-bold text-xs">
              ⚡ {player.stats.skillPoints} {t('pointsAvailable', language)}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex items-center justify-center gap-1.5 min-w-[44px] h-10 sm:h-11 px-3 sm:px-3.5 rounded-lg bg-rose-950/90 hover:bg-rose-600 text-rose-100 hover:text-white border-2 border-rose-400/85 shadow-[0_0_14px_rgba(244,63,94,0.45)] font-bold text-xs uppercase tracking-wider transition cursor-pointer flex-shrink-0"
              aria-label="Close Tech Tree"
            >
              <X className="w-5 h-5 stroke-[2.75]" />
              <span>{t('closeBtn', language)}</span>
            </button>
          </div>
        </div>

        {/* 5 Skill Tree Tabs for Active Class */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3 pb-3 border-b border-slate-800">
          {trees.map(tree => {
            const unlockedCount = tree.nodes.filter(n => player.unlockedSkills.includes(n.id)).length;
            const isActive = activeTreeIdx === tree.treeIndex;

            return (
              <button
                key={tree.treeIndex}
                data-testid={`skill-tree-tab-${tree.treeIndex}`}
                onClick={() => {
                  setActiveTreeIdx(tree.treeIndex);
                  if (tree.nodes[0]) setSelectedSkill(tree.nodes[0]);
                }}
                className={`px-2.5 py-2 rounded-lg border text-left transition cursor-pointer ${
                  isActive
                    ? 'bg-purple-950/80 border-purple-400 text-white shadow-[0_0_12px_rgba(189,0,255,0.35)]'
                    : 'bg-slate-900/50 border-slate-700/70 text-slate-400 hover:border-purple-500/40 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-bold text-purple-300">
                  <span>{t('skillTreeBranch', language)} {tree.treeIndex}</span>
                  <span className="text-emerald-400">{unlockedCount}/{tree.nodes.length}</span>
                </div>
                <div className="text-[11px] font-bold truncate mt-0.5">{tree.subTreeName}</div>
              </button>
            );
          })}
        </div>

        {/* Tree Display & Detail Panel */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
          {/* Active Branch Visualization (2 cols) */}
          <div className="md:col-span-2 flex flex-col justify-between py-3 px-4 rounded-lg bg-[#0d0920] border border-purple-500/20">
            <div className="text-xs font-bold text-center text-cyan-300 uppercase tracking-widest mb-2">
              // {currentTree.subTreeName} //
            </div>
            {currentTree.nodes.map((node, idx) => {
              const isUnlocked = player.unlockedSkills.includes(node.id);
              const isSelected = displaySkill.id === node.id;

              return (
                <div key={node.id} className="flex flex-col items-center my-1.5">
                  <button
                    onClick={() => setSelectedSkill(node)}
                    className={`relative flex items-center gap-3 px-4 py-2.5 rounded-xl border transition cursor-pointer w-full max-w-xs text-left ${
                      isUnlocked
                        ? 'bg-purple-950/60 border-purple-400 text-white shadow-[0_0_12px_rgba(189,0,255,0.4)]'
                        : 'bg-slate-900/60 border-slate-700 text-slate-400 hover:border-purple-500/60'
                    } ${isSelected ? 'ring-2 ring-cyan-400' : ''}`}
                  >
                    <span className="text-2xl">{node.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold truncate">{node.name}</div>
                      <div className="text-[10px] text-purple-300/80 uppercase">
                        TIER {node.tier} · {node.type}
                        {node.vfxType ? ` · VFX: ${node.vfxType}` : ''}
                      </div>
                    </div>
                    <div>
                      {isUnlocked ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-slate-500" />
                      )}
                    </div>
                  </button>

                  {idx < currentTree.nodes.length - 1 && (
                    <div className="w-0.5 h-4 bg-gradient-to-b from-purple-500/70 to-purple-800/20 my-0.5" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Skill Inspector Panel (1 col) */}
          <div className="flex flex-col justify-between p-4 rounded-lg bg-[#0d0920] border border-purple-500/20">
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">{displaySkill.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-purple-950 border border-purple-500/30 text-purple-300">
                      Tier {displaySkill.tier} {displaySkill.type}
                    </span>
                    {displaySkill.energyCost && (
                      <span className="text-[10px] text-cyan-400">
                        {displaySkill.energyCost} Energy
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-3xl">{displaySkill.icon}</span>
              </div>

              <p className="text-xs text-slate-300 mt-4 leading-relaxed border-t border-slate-800 pt-3">
                {displaySkill.description}
              </p>

              <div className="mt-4 flex flex-col gap-1.5 text-xs">
                {displaySkill.effect.range && (
                  <div className="flex justify-between text-cyan-300">
                    <span>{t('attackRangeLabel', language)}:</span>
                    <span className="font-bold">{displaySkill.effect.range} tiles AoE</span>
                  </div>
                )}
                {displaySkill.cooldown && (
                  <div className="flex justify-between text-pink-400">
                    <span>{t('rechargeCd', language)}:</span>
                    <span className="font-bold">{displaySkill.cooldown} turns</span>
                  </div>
                )}
                <div className="flex justify-between text-amber-300">
                  <span>{t('unlockCost', language)}:</span>
                  <span className="font-bold">{displaySkill.pointCost} SP</span>
                </div>
                {displaySkill.prerequisites.length > 0 && (
                  <div className="mt-2 text-[11px] text-slate-400">
                    {t('prereqs', language)}:{' '}
                    <span className="text-cyan-300">
                      {displaySkill.prerequisites.map(p => SKILL_DATABASE[p]?.name || p).join(', ')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-slate-800 flex justify-center">
              {player.unlockedSkills.includes(displaySkill.id) ? (
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
                  onClick={() => onUnlockSkill(displaySkill.id)}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
