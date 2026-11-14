import React from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Disc } from 'lucide-react';
import { CanvasButton } from './CanvasButton';
import { DungeonState, Player } from '../game/types';
import { SKILL_DATABASE } from '../game/skills';
import { getEffectiveSkillEnergyCost, getPlayerAttackRange } from '../game/combat';

interface TouchControlsProps {
  player: Player;
  dungeon: DungeonState;
  /** Discrete step (online turn mode) */
  onMove: (dx: number, dy: number) => void;
  /** Hold-to-move for offline free movement */
  onMoveHold?: (dx: number, dy: number, pressed: boolean) => void;
  onWaitTurn: () => void;
  onOpenInventory: () => void;
  onOpenSkillTree: () => void;
  onCastSkill: (skillId: string) => void;
  onRangedAttack: () => void;
  /** When true, hide the D-pad (replaced by VirtualJoystick). */
  hideDpad?: boolean;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  player,
  dungeon,
  onMove,
  onMoveHold,
  onWaitTurn,
  onOpenInventory,
  onOpenSkillTree,
  onCastSkill,
  onRangedAttack,
  hideDpad = false
}) => {
  const attackRange = getPlayerAttackRange(player);
  const classActiveSkills = Object.values(SKILL_DATABASE)
    .filter(s => s.branch === player.characterClass && s.type === 'active')
    .sort((a, b) => {
      const aUn = player.unlockedSkills.includes(a.id) ? 1 : 0;
      const bUn = player.unlockedSkills.includes(b.id) ? 1 : 0;
      return bUn - aUn;
    })
    .slice(0, 4);

  const bindDir = (dx: number, dy: number) => {
    if (!onMoveHold) {
      return {
        onClick: () => onMove(dx, dy)
      };
    }
    return {
      onPointerDown: (e: React.PointerEvent) => {
        e.preventDefault();
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
        onMoveHold(dx, dy, true);
      },
      onPointerUp: (e: React.PointerEvent) => {
        e.preventDefault();
        onMoveHold(dx, dy, false);
      },
      onPointerCancel: () => onMoveHold(dx, dy, false),
      onPointerLeave: (e: React.PointerEvent) => {
        // Only release if we lost capture / left while pressed
        if (e.buttons === 0) onMoveHold(dx, dy, false);
      }
    };
  };

  return (
    <div
      className={`sm:hidden fixed bottom-12 left-2.5 right-2.5 z-20 flex items-end pointer-events-none select-none ${
        hideDpad ? 'justify-end' : 'justify-between'
      }`}
      data-no-joystick
    >
      {/* Virtual D-Pad — hidden when Roblox-style joystick is active */}
      {!hideDpad && (
        <div className="grid grid-cols-3 gap-1 w-32 h-32 p-1.5 rounded-2xl bg-[#0d0920]/85 border border-cyan-500/45 backdrop-blur-sm pointer-events-auto shadow-[0_0_16px_rgba(0,240,255,0.2)]">
          <div />
          <button
            type="button"
            {...bindDir(0, -1)}
            data-no-ui-sfx="true"
            className="flex items-center justify-center rounded-t-lg bg-cyan-950/70 active:bg-cyan-600 text-cyan-300 border border-cyan-500/35 active:scale-95 transition touch-none"
            aria-label="Move Up"
          >
            <ChevronUp className="w-5 h-5" />
          </button>
          <div />

          <button
            type="button"
            {...bindDir(-1, 0)}
            data-no-ui-sfx="true"
            className="flex items-center justify-center rounded-l-lg bg-cyan-950/70 active:bg-cyan-600 text-cyan-300 border border-cyan-500/35 active:scale-95 transition touch-none"
            aria-label="Move Left"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={onWaitTurn}
            data-testid="mobile-wait-btn"
            className="flex flex-col items-center justify-center rounded-md bg-purple-950/85 active:bg-purple-600 text-purple-200 border border-purple-400/60 text-[8px] font-mono font-bold active:scale-95 transition leading-none gap-0.5"
            title="Stop moving / Wait"
            aria-label="Wait"
          >
            <Disc className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} />
            <span>STOP</span>
          </button>

          <button
            type="button"
            {...bindDir(1, 0)}
            data-no-ui-sfx="true"
            className="flex items-center justify-center rounded-r-lg bg-cyan-950/70 active:bg-cyan-600 text-cyan-300 border border-cyan-500/35 active:scale-95 transition touch-none"
            aria-label="Move Right"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <div />
          <button
            type="button"
            {...bindDir(0, 1)}
            data-no-ui-sfx="true"
            className="flex items-center justify-center rounded-b-lg bg-cyan-950/70 active:bg-cyan-600 text-cyan-300 border border-cyan-500/35 active:scale-95 transition touch-none"
            aria-label="Move Down"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
          <div />
        </div>
      )}

      <div className="flex flex-col items-end gap-1.5 pointer-events-auto">
        <div className="flex items-center gap-1 p-1 rounded-lg bg-[#0d0920]/85 border border-cyan-500/35">
          {classActiveSkills.map((skill, idx) => {
            const isUnlocked = player.unlockedSkills.includes(skill.id);
            const cd = player.activeCooldowns[skill.id] || 0;
            const energyNeeded = getEffectiveSkillEnergyCost(skill.energyCost || 15, dungeon.activeEvent);
            const canAfford = player.stats.energy >= energyNeeded;
            const isReady = isUnlocked && cd === 0 && canAfford;

            return (
              <button
                key={skill.id}
                type="button"
                onClick={() => isReady && onCastSkill(skill.id)}
                disabled={!isReady}
                aria-label={`Mobile Skill ${idx + 1}: ${skill.name} (${energyNeeded} NRG)`}
                className={`relative w-9 h-9 rounded border flex items-center justify-center text-sm transition active:scale-95 ${
                  !isUnlocked
                    ? 'opacity-35 border-slate-700 bg-slate-900/60'
                    : isReady
                    ? 'border-cyan-400 bg-cyan-950/70 text-white shadow-[0_0_8px_rgba(0,240,255,0.3)]'
                    : 'opacity-55 border-slate-700 bg-slate-900/70'
                }`}
              >
                <span>{skill.icon}</span>
                {cd > 0 && (
                  <span className="absolute inset-0 bg-black/75 rounded flex items-center justify-center text-[10px] font-bold text-pink-400">
                    {cd}t
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1">
          <CanvasButton
            label={`FIRE ${attackRange}`}
            icon="🎯"
            theme="amber"
            width={68}
            height={42}
            aria-label={`Mobile Ranged Fire (${attackRange} tiles)`}
            onClick={onRangedAttack}
          />
          <CanvasButton
            label="BAG"
            icon="🎒"
            theme="cyan"
            width={60}
            height={42}
            aria-label="Mobile Inventory BAG"
            onClick={onOpenInventory}
          />
          <CanvasButton
            label="TECH"
            icon="⚡"
            theme="purple"
            width={60}
            height={42}
            aria-label="Mobile Tech Tree TECH"
            onClick={onOpenSkillTree}
          />
        </div>
      </div>
    </div>
  );
};
