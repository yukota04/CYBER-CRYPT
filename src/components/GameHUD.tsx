import React from 'react';
import { CombatLogEntry, CoopRoomState, DifficultyMode, DungeonState, Player } from '../game/types';
import { getTotalStats, getEffectiveSkillEnergyCost, getPlayerAttackRange } from '../game/combat';
import { SKILL_DATABASE } from '../game/skills';
import { Language, t } from '../game/i18n';
import {
  Volume2,
  VolumeX,
  Pause,
  Backpack,
  Sparkles,
  Compass,
  Crosshair,
} from 'lucide-react';
import { GameIcon } from './GameIcon';

interface GameHUDProps {
  player: Player;
  dungeon: DungeonState;
  combatLogs: CombatLogEntry[];
  turn: number;
  isMuted: boolean;
  showMinimap: boolean;
  difficultyMode: DifficultyMode;
  coopRoom?: CoopRoomState | null;
  localPlayerId?: string;
  fps?: number;
  onToggleMinimap: () => void;
  onToggleMute: () => void;
  onOpenInventory: () => void;
  onOpenSkillTree: () => void;
  onPause: () => void;
  onCastSkill: (skillId: string) => void;
  onRangedAttack: () => void;
  autoAttack: boolean;
  onAutoAttackChange: (enabled: boolean) => void;
  onAttackHold?: (pressed: boolean) => void;
  language: Language;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  player,
  dungeon,
  combatLogs,
  isMuted,
  showMinimap,
  difficultyMode,
  coopRoom,
  localPlayerId,
  fps = 0,
  onToggleMinimap,
  onToggleMute,
  onOpenInventory,
  onOpenSkillTree,
  onPause,
  onCastSkill,
  onRangedAttack,
  autoAttack,
  onAutoAttackChange,
  onAttackHold,
  language
}) => {
  const totals = getTotalStats(player);
  const attackRange = getPlayerAttackRange(player);
  const hpPercent = Math.max(0, Math.min(1, player.stats.hp / totals.maxHp));
  const energyPercent = Math.max(0, Math.min(1, player.stats.energy / totals.maxEnergy));
  const expPercent = Math.max(0, Math.min(1, player.stats.exp / player.stats.expToNext));

  // Unlocked active skills only — slide rail shows 3 at a time
  const classActiveSkills = Object.values(SKILL_DATABASE)
    .filter(s => s.branch === player.characterClass && s.type === 'active')
    .filter(s => player.unlockedSkills.includes(s.id))
    .sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name));

  const localCoopSlot = coopRoom?.players.find(p => p.playerId === localPlayerId);
  const aliveCount = coopRoom?.players.filter(p => p.alive).length || 0;

  return (
    <div className="fixed inset-0 pointer-events-none z-20 flex flex-col justify-between p-2 sm:p-5 select-none cc-font">
      {/* TOP BAR */}
      <div className="flex items-start justify-between w-full gap-1.5 sm:gap-2">
        {/* Top-Left Status Cluster */}
        <div className="cc-panel flex flex-col gap-1 sm:gap-1.5 p-2 sm:p-3 pointer-events-auto max-w-[200px] sm:max-w-sm">
          <div className="flex items-center justify-between text-xs text-cyan-300 gap-2">
            <span className="font-bold tracking-wider uppercase text-white flex items-center gap-1.5 truncate">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              {t('level', language)} {player.stats.level} {player.characterClass}
            </span>
            <div className="flex items-center gap-1">
              <span
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                  coopRoom
                    ? 'bg-pink-950/70 border-pink-500/40 text-pink-300'
                    : difficultyMode === 'normal'
                    ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300'
                    : 'bg-red-950/70 border-red-500/40 text-red-300'
                }`}
              >
                {coopRoom ? 'CO-OP 3P' : difficultyMode === 'normal' ? 'NORMAL' : 'HARD'}
              </span>
              <span className="text-[11px] text-pink-400 font-bold bg-pink-950/60 px-1.5 py-0.5 rounded border border-pink-500/30">
                {t('floor', language)} {dungeon.floor}
              </span>
            </div>
          </div>

          {/* Health Bar */}
          <div>
            <div className="flex items-center justify-between text-[11px] mb-0.5">
              <span className="text-pink-400 font-bold tracking-wider">{t('vitality', language)}</span>
              <span className="text-white font-mono tabular-nums text-xs">
                {player.stats.hp} / {totals.maxHp} HP
              </span>
            </div>
            <div className="cc-bar w-full h-3 rounded-sm border-pink-500/40 relative">
              <div
                className="cc-bar-fill bg-gradient-to-r from-red-600 via-pink-500 to-fuchsia-400 shadow-[0_0_8px_rgba(255,0,127,0.55)]"
                style={{ width: `${hpPercent * 100}%` }}
              />
              {player.buffs.shieldAmount > 0 && (
                <div
                  className="absolute inset-y-0 left-0 bg-cyan-400/50 border-r-2 border-cyan-300"
                  style={{ width: `${Math.min(100, (player.buffs.shieldAmount / totals.maxHp) * 100)}%` }}
                />
              )}
            </div>
          </div>

          {/* Energy Bar */}
          <div>
            <div className="flex items-center justify-between text-[11px] mb-0.5">
              <span className="text-cyan-400 font-bold tracking-wider">{t('energy', language)}</span>
              <span className="text-white font-mono tabular-nums text-xs">
                {player.stats.energy} / {totals.maxEnergy} NRG
              </span>
            </div>
            <div className="cc-bar w-full h-2.5 rounded-sm border-cyan-500/40">
              <div
                className="cc-bar-fill bg-gradient-to-r from-cyan-700 via-cyan-400 to-sky-200 shadow-[0_0_8px_rgba(0,240,255,0.55)]"
                style={{ width: `${energyPercent * 100}%` }}
              />
            </div>
          </div>

          {/* EXP + Coins + Shards */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[10px] text-slate-300 gap-2">
            <div className="flex items-center gap-1.5 flex-1">
              <span className="text-purple-400">{t('exp', language)}</span>
              <div className="cc-bar w-full h-1.5 rounded">
                <div className="cc-bar-fill bg-gradient-to-r from-purple-600 to-fuchsia-400" style={{ width: `${expPercent * 100}%` }} />
              </div>
            </div>
            <div data-testid="hud-coins" className="text-yellow-300 font-bold whitespace-nowrap flex items-center gap-1">
              <GameIcon id="currency.coins" fallback="🪙" size={14} /> {player.stats.coins}
            </div>
            <div className="text-cyan-300 font-bold whitespace-nowrap flex items-center gap-1">
              <GameIcon id="currency.soul_shards" fallback="💎" size={14} /> {player.stats.soulShards}
            </div>
          </div>

          {/* Online squad status — free-move (no turn lock) */}
          {coopRoom && coopRoom.status === 'playing' && (
            <div
              data-testid="coop-turn-banner"
              className="mt-1 px-2 py-1 rounded border text-[10px] font-bold flex items-center justify-between bg-emerald-950/60 border-emerald-500/50 text-emerald-300"
            >
              <span className="flex items-center gap-1 truncate">
                <span>
                  {localCoopSlot?.alive === false
                    ? t('yourTurnLocked', language)
                    : `CO-OP FREE-MOVE · ${aliveCount} UP`}
                </span>
              </span>
              <span className="ml-2 flex-shrink-0">F{dungeon.floor}</span>
            </div>
          )}

          {/* Active Regen / Overclock Buffs */}
          {(player.buffs.regenTurns > 0 || player.buffs.overclockTurns > 0) && (
            <div className="flex flex-wrap gap-1 text-[9px] font-bold">
              {player.buffs.regenTurns > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-emerald-950/75 border border-emerald-400/50 text-emerald-300">
                  <><GameIcon id="status.regen" fallback="🌿" size={12} /> +{player.buffs.regenHpPerTurn}HP ({player.buffs.regenTurns}T)</>
                </span>
              )}
              {player.buffs.overclockTurns > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-pink-950/75 border border-pink-400/50 text-pink-300">
                  <><GameIcon id="status.overclock" fallback="⚡" size={12} /> CRIT 100% ({player.buffs.overclockTurns}T)</>
                </span>
              )}
            </div>
          )}

          {/* Active Environmental Event */}
          {dungeon.activeEvent && (
            <div
              role="status"
              data-testid="environmental-event-banner"
              className="mt-0.5 px-2 py-1 rounded border text-[9px] sm:text-[10px] leading-tight"
              style={{
                backgroundColor: `${dungeon.activeEvent.bannerColor}18`,
                borderColor: `${dungeon.activeEvent.bannerColor}66`,
                color: dungeon.activeEvent.bannerColor
              }}
            >
              <div className="font-bold flex items-center gap-1 uppercase tracking-wide">
                <GameIcon id={`event.${dungeon.activeEvent.id}`} fallback={dungeon.activeEvent.icon} size={14} />
                <span className="truncate">{dungeon.activeEvent.name}</span>
              </div>
              <div className="text-slate-200 text-[8px] sm:text-[9px] mt-0.5 hidden sm:block">{dungeon.activeEvent.effectText}</div>
            </div>
          )}
        </div>

        {/* Top-Right Quick Controls — larger icons; options live in Pause only */}
        <div className="grid grid-cols-3 sm:flex items-center gap-2 sm:gap-2.5 pointer-events-auto">
          <div
            data-testid="fps-counter"
            className="col-span-3 sm:col-span-1 sm:order-first px-2 py-1 rounded bg-black/50 border border-slate-700 text-[10px] font-mono text-emerald-300 tabular-nums text-center"
            title="Frames per second"
          >
            {Math.round(fps)} FPS
          </div>
          <button
            onClick={onToggleMinimap}
            data-testid="minimap-toggle-btn"
            className={`p-3 sm:p-3.5 rounded-xl border transition cursor-pointer ${
              showMinimap
                ? 'bg-cyan-950/90 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                : 'bg-[#0a0718]/85 border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
            title={t('toggleMinimap', language)}
            aria-label="Toggle Minimap"
            aria-pressed={showMinimap}
          >
            <GameIcon id="ui.hud.minimap" fallback={<Compass className="w-6 h-6" />} size={24} />
          </button>

          <button
            onClick={onOpenInventory}
            className="cc-btn p-2.5 sm:p-3 rounded-xl text-cyan-300 relative"
            title={`${t('inventoryTitle', language)} [I]`}
            aria-label="Open Inventory"
          >
            <GameIcon id="ui.hud.inventory" fallback={<Backpack className="w-6 h-6" />} size={24} />
            {player.inventory.length > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 text-[10px] font-bold bg-pink-600 text-white rounded-full">
                {player.inventory.length}
              </span>
            )}
          </button>

          <button
            onClick={onOpenSkillTree}
            className="cc-btn cc-btn-magenta p-2.5 sm:p-3 rounded-xl text-purple-300 relative"
            title={`${t('techTreeTitle', language)} [K]`}
            aria-label="Open Skill Tree"
          >
            <GameIcon id="ui.hud.skill_tree" fallback={<Sparkles className="w-6 h-6" />} size={24} />
            {player.stats.skillPoints > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 text-[10px] font-bold bg-amber-500 text-black rounded-full animate-bounce">
                +{player.stats.skillPoints}
              </span>
            )}
          </button>

          <button
            onClick={onToggleMute}
            className="cc-btn p-2.5 sm:p-3 rounded-xl text-slate-300"
            title={`${t('toggleAudio', language)} [N]`}
            aria-label="Toggle Sound"
          >
            {isMuted ? <GameIcon id="ui.hud.mute" fallback={<VolumeX className="w-6 h-6 text-red-400" />} size={24} /> : <GameIcon id="ui.hud.unmute" fallback={<Volume2 className="w-6 h-6 text-cyan-400" />} size={24} />}
          </button>

          <button
            onClick={onPause}
            className="cc-btn p-2.5 sm:p-3 rounded-xl text-slate-300"
            title={`${t('pauseTitle', language)} [Esc / P]`}
            aria-label="Pause Game"
          >
            <GameIcon id="ui.hud.pause" fallback={<Pause className="w-6 h-6 text-slate-200" />} size={24} />
          </button>
        </div>
      </div>

      {/* BOTTOM CLUSTER */}
      <div className="flex flex-col sm:flex-row items-end justify-between w-full gap-3">
        <div
          className="cc-panel hidden sm:flex items-center gap-3 pointer-events-auto px-3 py-3 min-h-[96px]"
          data-testid="desktop-combat-hotbar"
        >
          <button
            data-testid="hud-auto-attack-btn"
            type="button"
            onClick={() => onAutoAttackChange(!autoAttack)}
            aria-pressed={autoAttack}
            title={autoAttack ? t('autoAttackOn', language) : t('autoAttackOff', language)}
            aria-label={autoAttack ? t('autoAttackOn', language) : t('autoAttackOff', language)}
            className={`relative flex flex-col items-center justify-center w-16 h-16 rounded-full border-2 transition cursor-pointer active:scale-90 shrink-0 ${
              autoAttack
                ? 'border-emerald-300 bg-emerald-950/70 text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.35)]'
                : 'border-slate-600 bg-slate-900/70 text-slate-400'
            }`}
          >
            <span className="text-[10px] font-bold leading-none tracking-wider">{t('autoAttackBtn', language)}</span>
            <span className="text-[8px] font-mono mt-0.5">{autoAttack ? 'ON' : 'OFF'}</span>
          </button>

          <button
            data-testid="hud-ranged-btn"
            onClick={() => localCoopSlot?.alive !== false && onRangedAttack()}
            onPointerDown={e => {
              if (localCoopSlot?.alive === false) return;
              e.currentTarget.setPointerCapture?.(e.pointerId);
              onAttackHold?.(true);
            }}
            onPointerUp={() => onAttackHold?.(false)}
            onPointerCancel={() => onAttackHold?.(false)}
            disabled={localCoopSlot?.alive === false}
            title={`${t('rangedStrikeBtn', language)} (${attackRange} tiles) — Click enemy or press F`}
            aria-label={`Ranged Attack (${attackRange} tiles)`}
            className={`relative flex flex-col items-center justify-center w-[4.5rem] h-[4.5rem] rounded-full border-2 transition cursor-pointer active:scale-[0.86] active:brightness-125 shrink-0 ${
              localCoopSlot?.alive === false
                ? 'opacity-50 border-slate-700 bg-slate-900/60 cursor-not-allowed'
                : 'border-amber-400 bg-amber-950/70 text-amber-200 shadow-[0_0_14px_rgba(255,230,0,0.35)]'
            }`}
          >
            <span className="text-[9px] font-bold text-amber-300 leading-none">[F]</span>
            <GameIcon id="ui.hud.ranged" fallback={<Crosshair className="w-4 h-4 my-0.5 text-amber-300" />} size={22} className="my-0.5" />
            <span className="text-[9px] font-bold leading-none">RNG {attackRange}</span>
          </button>

          <div
            className="overflow-x-auto overscroll-x-contain"
            data-testid="desktop-skill-slide"
            style={{
              width: 'calc(3 * 3.75rem + 2 * 0.5rem)',
              scrollbarWidth: 'thin'
            }}
            title={t('skillSlideHint', language)}
          >
            <div className="flex items-center gap-2 min-h-[4.25rem] pr-1">
              {classActiveSkills.length === 0 && (
                <div className="text-[10px] text-slate-500 font-mono px-2">—</div>
              )}
              {classActiveSkills.map((skill, index) => {
                const cd = player.activeCooldowns[skill.id] || 0;
                const energyNeeded = getEffectiveSkillEnergyCost(skill.energyCost || 15, dungeon.activeEvent);
                const canAfford = player.stats.energy >= energyNeeded;
                const isReady = cd === 0 && canAfford && localCoopSlot?.alive !== false;

                return (
                  <button
                    key={skill.id}
                    type="button"
                    onPointerDown={e => {
                      if (!isReady) return;
                      if (e.pointerType === 'touch' || e.pointerType === 'pen') {
                        e.preventDefault();
                        onCastSkill(skill.id);
                      }
                    }}
                    onClick={() => isReady && onCastSkill(skill.id)}
                    disabled={!isReady}
                    aria-label={`${skill.name} (${energyNeeded} NRG)`}
                    data-ready={isReady ? 'true' : 'false'}
                    className={`cc-hotbar-slot relative w-[3.75rem] h-[4.25rem] rounded cursor-pointer active:scale-90 active:brightness-125 shrink-0 ${
                      isReady ? 'skill-ready-glow' : 'cursor-not-allowed'
                    }`}
                    style={
                      isReady
                        ? { animation: 'skillReadyPulse 1.6s ease-in-out infinite' }
                        : undefined
                    }
                    title={`${skill.name} (${energyNeeded} NRG) - ${skill.description}`}
                  >
                    <span className="absolute top-1 left-1 text-[9px] font-bold text-cyan-300">
                      [{index + 1}]
                    </span>
                    <span className="absolute top-1 right-1 text-[9px] font-mono text-cyan-400">
                      {energyNeeded}e
                    </span>
                    <GameIcon id={skill.id} fallback={skill.icon} size={28} className="mt-1" />
                    {cd > 0 && (
                      <div className="absolute inset-0 bg-black/75 rounded flex items-center justify-center font-bold text-pink-400 text-sm">
                        {cd}t
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="cc-panel w-full sm:max-w-md h-9 sm:h-24 overflow-hidden px-2 py-1 sm:p-2.5 text-[10px] sm:text-[11px] leading-relaxed flex flex-col-reverse justify-start pointer-events-auto">
          {combatLogs.slice(0, 4).map((log, i) => {
            let color = 'text-slate-300';
            if (log.type === 'critical') color = 'text-pink-400 font-bold';
            else if (log.type === 'defeat') color = 'text-emerald-400 font-bold';
            else if (log.type === 'enemy_attack') color = 'text-red-400';
            else if (log.type === 'item') color = 'text-amber-400';
            else if (log.type === 'skill') color = 'text-cyan-300';
            else if (log.type === 'level_up') color = 'text-purple-300 font-bold';

            return (
              <div key={log.id} className={`${color} truncate ${i > 0 ? 'hidden sm:block' : ''}`}>
                <span className="text-slate-400 mr-1.5">[T{log.turn}]</span>
                {log.text}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
