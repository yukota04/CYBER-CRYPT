import React, { useMemo, useRef, useState } from 'react';
import { CanvasButton } from './CanvasButton';
import { DungeonState, Player } from '../game/types';
import { SKILL_DATABASE } from '../game/skills';
import { getEffectiveSkillEnergyCost, getPlayerAttackRange } from '../game/combat';
import { GameIcon } from './GameIcon';

interface TouchControlsProps {
  player: Player;
  dungeon: DungeonState;
  onMove: (dx: number, dy: number) => void;
  onMoveHold?: (dx: number, dy: number, pressed: boolean) => void;
  onWaitTurn: () => void;
  onCastSkill: (skillId: string) => void;
  onRangedAttack: () => void;
  hideDpad?: boolean;
}

const ORBIT_R = 78;
const BUBBLE = 56;
const VISIBLE = 3;

/**
 * Mobile combat cluster: big FIRE button with a rotatable skill orbit (3 visible).
 * BAG / TECH removed — inventory & skill tree stay on the top HUD.
 */
export const TouchControls: React.FC<TouchControlsProps> = ({
  player,
  dungeon,
  onCastSkill,
  onRangedAttack
}) => {
  const attackRange = getPlayerAttackRange(player);
  const [orbitOffset, setOrbitOffset] = useState(0);
  const [pressFx, setPressFx] = useState<{ id: string; key: number } | null>(null);
  const dragRef = useRef<{ x: number; active: boolean } | null>(null);
  const pressKeyRef = useRef(0);

  const unlockedSkills = useMemo(() => {
    return Object.values(SKILL_DATABASE)
      .filter(s => s.branch === player.characterClass && s.type === 'active')
      .filter(s => player.unlockedSkills.includes(s.id))
      .sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name));
  }, [player.characterClass, player.unlockedSkills]);

  const n = Math.max(1, unlockedSkills.length);
  const start = ((orbitOffset % n) + n) % n;

  const visible = useMemo(() => {
    if (unlockedSkills.length === 0) return [];
    const out = [];
    for (let i = 0; i < Math.min(VISIBLE, unlockedSkills.length); i++) {
      out.push(unlockedSkills[(start + i) % unlockedSkills.length]);
    }
    return out;
  }, [unlockedSkills, start]);

  const triggerPressFx = (id: string) => {
    pressKeyRef.current += 1;
    setPressFx({ id, key: pressKeyRef.current });
    window.setTimeout(() => {
      setPressFx(prev => (prev?.key === pressKeyRef.current ? null : prev));
    }, 280);
  };

  const onOrbitPointerDown = (e: React.PointerEvent) => {
    dragRef.current = { x: e.clientX, active: true };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onOrbitPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current?.active || unlockedSkills.length <= VISIBLE) return;
    const dx = e.clientX - dragRef.current.x;
    if (Math.abs(dx) > 36) {
      setOrbitOffset(prev => prev + (dx > 0 ? -1 : 1));
      dragRef.current.x = e.clientX;
    }
  };
  const onOrbitPointerUp = () => {
    dragRef.current = null;
  };

  // Angles for 3 bubbles around the attack button (upper arc)
  const angles = [-110, -70, -30].map(d => (d * Math.PI) / 180);

  return (
    <div
      className="sm:hidden fixed bottom-10 right-2 z-20 pointer-events-none select-none"
      data-no-joystick
      data-testid="mobile-combat-cluster"
    >
      <style>{`
        @keyframes skillReadyPulse {
          0%, 100% { box-shadow: 0 0 10px rgba(0,240,255,0.35), 0 0 0 0 rgba(0,240,255,0.45); }
          50% { box-shadow: 0 0 18px rgba(0,240,255,0.75), 0 0 0 8px rgba(0,240,255,0); }
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
      <div
        className="relative pointer-events-auto touch-none"
        style={{ width: 168, height: 168 }}
        onPointerDown={onOrbitPointerDown}
        onPointerMove={onOrbitPointerMove}
        onPointerUp={onOrbitPointerUp}
        onPointerCancel={onOrbitPointerUp}
      >
        {visible.map((skill, idx) => {
          const ang = angles[idx] ?? angles[angles.length - 1];
          const cx = 84 + Math.cos(ang) * ORBIT_R;
          const cy = 84 + Math.sin(ang) * ORBIT_R;
          const cd = player.activeCooldowns[skill.id] || 0;
          const energyNeeded = getEffectiveSkillEnergyCost(skill.energyCost || 15, dungeon.activeEvent);
          const canAfford = player.stats.energy >= energyNeeded;
          const isReady = cd <= 0 && canAfford;
          const cdSec = Math.max(0, cd);
          const showImpact = pressFx?.id === skill.id;

          return (
            <button
              key={`${skill.id}_${idx}`}
              type="button"
              data-testid={`orbit-skill-${skill.id}`}
              onPointerDown={e => {
                e.stopPropagation();
                if (!isReady) return;
                triggerPressFx(skill.id);
              }}
              onClick={e => {
                e.stopPropagation();
                if (isReady) onCastSkill(skill.id);
              }}
              disabled={!isReady}
              aria-label={`Skill ${skill.name}${cd > 0 ? ` cooldown ${cd}` : ''}`}
              className={`absolute flex items-center justify-center rounded-full border-2 text-xl transition-transform duration-100 active:scale-90 ${
                isReady
                  ? 'bg-cyan-950/90 border-cyan-300 text-white'
                  : 'bg-slate-950/90 border-slate-600 text-slate-400 opacity-80'
              }`}
              style={{
                width: BUBBLE,
                height: BUBBLE,
                left: cx - BUBBLE / 2,
                top: cy - BUBBLE / 2,
                animation: isReady ? 'skillReadyPulse 1.6s ease-in-out infinite' : undefined
              }}
            >
              <GameIcon id={skill.id} fallback={skill.icon} size={28} className="relative z-[1]" />
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

        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="relative">
            <CanvasButton
              label={`ATK ${attackRange}`}
              icon="🎯"
              theme="amber"
              width={88}
              height={88}
              aria-label={`Mobile Attack (${attackRange} tiles)`}
              onClick={() => {
                triggerPressFx('atk');
                onRangedAttack();
              }}
            />
            {pressFx?.id === 'atk' && (
              <>
                <span
                  className="absolute inset-0 rounded-full border-2 border-amber-200 pointer-events-none"
                  style={{ animation: 'touchImpactRing 0.28s ease-out forwards' }}
                />
                <span
                  className="absolute inset-0 rounded-full bg-amber-300/35 pointer-events-none"
                  style={{ animation: 'touchImpactFlash 0.22s ease-out forwards' }}
                />
              </>
            )}
          </div>
        </div>

        {unlockedSkills.length > VISIBLE && (
          <div className="absolute bottom-1 left-0 right-0 text-center text-[9px] text-cyan-400/80 font-mono pointer-events-none">
            ← slide skills →
          </div>
        )}
      </div>
    </div>
  );
};
