import React, { useMemo, useRef, useState } from 'react';
import { DungeonState, Player } from '../game/types';
import { SKILL_DATABASE } from '../game/skills';
import { getEffectiveSkillEnergyCost, getPlayerAttackRange } from '../game/combat';
import { GameIcon } from './GameIcon';
import { Language, t } from '../game/i18n';

interface TouchControlsProps {
  player: Player;
  dungeon: DungeonState;
  onMove: (dx: number, dy: number) => void;
  onMoveHold?: (dx: number, dy: number, pressed: boolean) => void;
  onWaitTurn: () => void;
  onCastSkill: (skillId: string) => void;
  onRangedAttack: () => void;
  onAttackHold?: (pressed: boolean) => void;
  autoAttack: boolean;
  onAutoAttackChange: (enabled: boolean) => void;
  language: Language;
  hideDpad?: boolean;
}

const SKILL_BUBBLE = 56;
const SKILL_GAP = 10;
const SKILLS_VISIBLE = 3;
const ATK_SIZE = 92;
const AUTO_SIZE = 58;
/** Viewport width for exactly 3 skill bubbles + gaps (no 4th peeking). */
const SKILL_VIEWPORT =
  SKILLS_VISIBLE * SKILL_BUBBLE + (SKILLS_VISIBLE - 1) * SKILL_GAP;

/**
 * Mobile combat: horizontal skill slide (3 visible) + spherical ATK + AUTO toggle.
 */
export const TouchControls: React.FC<TouchControlsProps> = ({
  player,
  dungeon,
  onCastSkill,
  onRangedAttack,
  onAttackHold,
  autoAttack,
  onAutoAttackChange,
  language
}) => {
  const attackRange = getPlayerAttackRange(player);
  const [atkPressed, setAtkPressed] = useState(false);
  const [pressFx, setPressFx] = useState<{ id: string; key: number } | null>(null);
  const pressKeyRef = useRef(0);
  const castLockRef = useRef<Set<string>>(new Set());

  const unlockedSkills = useMemo(() => {
    return Object.values(SKILL_DATABASE)
      .filter(s => s.branch === player.characterClass && s.type === 'active')
      .filter(s => player.unlockedSkills.includes(s.id))
      .sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name));
  }, [player.characterClass, player.unlockedSkills]);

  const triggerPressFx = (id: string) => {
    pressKeyRef.current += 1;
    setPressFx({ id, key: pressKeyRef.current });
    window.setTimeout(() => {
      setPressFx(prev => (prev?.key === pressKeyRef.current ? null : prev));
    }, 280);
  };

  const castSkillNow = (skillId: string, isReady: boolean) => {
    if (!isReady) return;
    if (castLockRef.current.has(skillId)) return;
    castLockRef.current.add(skillId);
    window.setTimeout(() => castLockRef.current.delete(skillId), 220);
    triggerPressFx(skillId);
    onCastSkill(skillId);
  };

  const releaseAttack = () => {
    setAtkPressed(false);
    onAttackHold?.(false);
  };

  return (
    <div
      className="sm:hidden fixed z-20 pointer-events-none select-none"
      style={{
        right: 8,
        bottom: 'max(1.25rem, env(safe-area-inset-bottom, 0px))'
      }}
      data-no-joystick
      data-testid="mobile-combat-cluster"
    >
      <style>{`
        @keyframes skillReadyPulse {
          0%, 100% { box-shadow: 0 0 10px rgba(0,240,255,0.35); }
          50% { box-shadow: 0 0 18px rgba(0,240,255,0.75); }
        }
        @keyframes touchImpactRing {
          0% { transform: scale(0.55); opacity: 0.85; }
          100% { transform: scale(1.55); opacity: 0; }
        }
        @keyframes touchImpactFlash {
          0% { opacity: 0.55; }
          100% { opacity: 0; }
        }
      `}</style>

      <div className="pointer-events-auto flex flex-col items-end gap-3">
        <div
          className="rounded-2xl bg-[#0a0818]/80 backdrop-blur-sm px-2.5 pt-2.5 pb-2"
          data-testid="skill-slide-rail"
          style={{ width: SKILL_VIEWPORT + 20 }}
        >
          <div
            className="overflow-x-auto overscroll-x-contain touch-pan-x"
            style={{
              width: SKILL_VIEWPORT,
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none'
            }}
          >
            <div className="flex items-center" style={{ gap: SKILL_GAP, minHeight: SKILL_BUBBLE + 4 }}>
              {unlockedSkills.length === 0 && (
                <div className="text-[10px] text-slate-500 font-mono px-2 py-3 whitespace-nowrap">—</div>
              )}
              {unlockedSkills.map(skill => {
                const cd = player.activeCooldowns[skill.id] || 0;
                const energyNeeded = getEffectiveSkillEnergyCost(skill.energyCost || 15, dungeon.activeEvent);
                const canAfford = player.stats.energy >= energyNeeded;
                const isReady = cd <= 0 && canAfford;
                const cdSec = Math.max(0, cd);
                const showImpact = pressFx?.id === skill.id;

                return (
                  <button
                    key={skill.id}
                    type="button"
                    data-testid={`orbit-skill-${skill.id}`}
                    data-no-ui-sfx="true"
                    onPointerDown={e => {
                      e.stopPropagation();
                      e.preventDefault();
                      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
                      castSkillNow(skill.id, isReady);
                    }}
                    onClick={e => {
                      e.stopPropagation();
                      castSkillNow(skill.id, isReady);
                    }}
                    aria-disabled={!isReady}
                    aria-label={`Skill ${skill.name}${cd > 0 ? ` cooldown ${cd}` : ''}`}
                    className={`relative shrink-0 flex items-center justify-center rounded-full transition-transform duration-75 ${
                      isReady
                        ? 'bg-cyan-950/90 text-white active:scale-[0.85]'
                        : 'bg-slate-950/80 text-slate-400 opacity-70'
                    }`}
                    style={{
                      width: SKILL_BUBBLE,
                      height: SKILL_BUBBLE,
                      animation: isReady ? 'skillReadyPulse 1.6s ease-in-out infinite' : undefined,
                      transform: showImpact ? 'scale(0.86)' : undefined
                    }}
                  >
                    <GameIcon id={skill.id} fallback={skill.icon} size={26} className="relative z-[1]" />
                    {cdSec > 0 && (
                      <span className="absolute inset-0 rounded-full bg-black/70 flex items-center justify-center text-[12px] font-bold text-pink-300 z-[2]">
                        {cdSec}
                      </span>
                    )}
                    {showImpact && (
                      <>
                        <span
                          className="absolute inset-0 rounded-full border-2 border-cyan-200 pointer-events-none z-[3]"
                          style={{ animation: 'touchImpactRing 0.28s ease-out forwards' }}
                        />
                        <span
                          className="absolute inset-0 rounded-full bg-cyan-300/40 pointer-events-none z-[3]"
                          style={{ animation: 'touchImpactFlash 0.22s ease-out forwards' }}
                        />
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          <div
            className="text-center text-[9px] text-cyan-300/90 font-mono tracking-wide pt-1.5 pb-0.5 pointer-events-none"
            data-testid="skill-slide-hint"
          >
            {t('skillSlideHint', language)}
          </div>
        </div>

        <div
          className="flex items-center gap-3 pr-0.5 min-h-[96px]"
          data-testid="mobile-attack-row"
        >
          <button
            type="button"
            data-testid="auto-attack-toggle"
            data-no-ui-sfx="true"
            aria-pressed={autoAttack}
            aria-label={autoAttack ? t('autoAttackOn', language) : t('autoAttackOff', language)}
            onClick={() => onAutoAttackChange(!autoAttack)}
            className={`relative flex flex-col items-center justify-center rounded-full border-2 font-mono font-bold transition-transform duration-100 active:scale-90 ${
              autoAttack
                ? 'bg-emerald-950/95 border-emerald-300 text-emerald-200 shadow-[0_0_14px_rgba(16,185,129,0.45)]'
                : 'bg-slate-950/90 border-slate-500 text-slate-400'
            }`}
            style={{ width: AUTO_SIZE, height: AUTO_SIZE }}
          >
            <span className="text-[10px] leading-none tracking-wider">{t('autoAttackBtn', language)}</span>
            <span className={`text-[8px] leading-none mt-0.5 ${autoAttack ? 'text-emerald-300' : 'text-slate-500'}`}>
              {autoAttack ? 'ON' : 'OFF'}
            </span>
          </button>

          <button
            type="button"
            data-testid="mobile-attack-sphere"
            data-no-ui-sfx="true"
            aria-label={`${t('attackBtnLabel', language)} (${attackRange})`}
            onPointerDown={e => {
              e.preventDefault();
              e.stopPropagation();
              (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
              setAtkPressed(true);
              triggerPressFx('atk');
              onAttackHold?.(true);
              onRangedAttack();
            }}
            onPointerUp={releaseAttack}
            onPointerCancel={releaseAttack}
            onPointerLeave={e => {
              if (e.buttons === 0) releaseAttack();
            }}
            className={`relative flex flex-col items-center justify-center rounded-full border-[3px] font-mono font-bold text-amber-100 transition-[transform,box-shadow] duration-75 ${
              atkPressed
                ? 'bg-amber-700/95 border-amber-200 shadow-[0_0_22px_rgba(255,230,0,0.65)]'
                : 'bg-amber-950/95 border-amber-400 shadow-[0_0_18px_rgba(255,230,0,0.4)]'
            }`}
            style={{
              width: ATK_SIZE,
              height: ATK_SIZE,
              transform: atkPressed ? 'scale(0.86)' : 'scale(1)'
            }}
          >
            <span className="text-sm leading-tight tracking-wide">{t('attackBtnLabel', language)}</span>
            <span className="text-[9px] text-amber-300/90 leading-none mt-1">RNG {attackRange}</span>
            {pressFx?.id === 'atk' && (
              <>
                <span
                  className="absolute inset-0 rounded-full border-2 border-amber-100 pointer-events-none"
                  style={{ animation: 'touchImpactRing 0.28s ease-out forwards' }}
                />
                <span
                  className="absolute inset-0 rounded-full bg-amber-200/35 pointer-events-none"
                  style={{ animation: 'touchImpactFlash 0.22s ease-out forwards' }}
                />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
