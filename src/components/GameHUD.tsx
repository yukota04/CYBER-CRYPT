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
  Lock,
  Crosshair,
  Maximize2,
  Minimize2,
  Settings
} from 'lucide-react';

interface GameHUDProps {
  player: Player;
  dungeon: DungeonState;
  combatLogs: CombatLogEntry[];
  turn: number;
  isMuted: boolean;
  showMinimap: boolean;
  isFullscreen?: boolean;
  difficultyMode: DifficultyMode;
  coopRoom?: CoopRoomState | null;
  localPlayerId?: string;
  onToggleMinimap: () => void;
  onToggleMute: () => void;
  onToggleFullscreen?: () => void;
  onOpenInventory: () => void;
  onOpenSkillTree: () => void;
  onOpenOptions: () => void;
  onPause: () => void;
  onCastSkill: (skillId: string) => void;
  onRangedAttack: () => void;
  language: Language;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  player,
  dungeon,
  combatLogs,
  isMuted,
  showMinimap,
  isFullscreen,
  difficultyMode,
  coopRoom,
  localPlayerId,
  onToggleMinimap,
  onToggleMute,
  onToggleFullscreen,
  onOpenInventory,
  onOpenSkillTree,
  onOpenOptions,
  onPause,
  onCastSkill,
  onRangedAttack,
  language
}) => {
  const totals = getTotalStats(player);
  const attackRange = getPlayerAttackRange(player);
  const hpPercent = Math.max(0, Math.min(1, player.stats.hp / totals.maxHp));
  const energyPercent = Math.max(0, Math.min(1, player.stats.energy / totals.maxEnergy));
  const expPercent = Math.max(0, Math.min(1, player.stats.exp / player.stats.expToNext));

  // Prioritize unlocked active skills across all 5 trees (up to 8 hotbar buttons)
  const classActiveSkills = Object.values(SKILL_DATABASE)
    .filter(s => s.branch === player.characterClass && s.type === 'active')
    .sort((a, b) => {
      const aUn = player.unlockedSkills.includes(a.id) ? 1 : 0;
      const bUn = player.unlockedSkills.includes(b.id) ? 1 : 0;
      return bUn - aUn;
    })
    .slice(0, 8);

  const localCoopSlot = coopRoom?.players.find(p => p.playerId === localPlayerId);
  const movedCount = coopRoom?.players.filter(p => p.alive && p.movedThisTurn).length || 0;
  const aliveCount = coopRoom?.players.filter(p => p.alive).length || 0;

  return (
    <div className="fixed inset-0 pointer-events-none z-20 flex flex-col justify-between p-2 sm:p-5 select-none font-mono">
      {/* TOP BAR */}
      <div className="flex items-start justify-between w-full gap-1.5 sm:gap-2">
        {/* Top-Left Status Cluster */}
        <div className="flex flex-col gap-1 sm:gap-1.5 p-2 sm:p-3 rounded-lg bg-[#0a0718]/85 border border-cyan-500/30 shadow-[0_4px_12px_rgba(0,0,0,0.5)] pointer-events-auto max-w-[192px] sm:max-w-sm">
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
            <div className="w-full h-3 bg-slate-900 rounded-sm overflow-hidden border border-pink-500/30 relative">
              <div
                className="h-full bg-gradient-to-r from-red-500 to-pink-500 transition-all duration-200"
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
            <div className="w-full h-2.5 bg-slate-900 rounded-sm overflow-hidden border border-cyan-500/30">
              <div
                className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all duration-200"
                style={{ width: `${energyPercent * 100}%` }}
              />
            </div>
          </div>

          {/* EXP + Coins + Shards */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[10px] text-slate-300 gap-2">
            <div className="flex items-center gap-1.5 flex-1">
              <span className="text-purple-400">{t('exp', language)}</span>
              <div className="w-full h-1.5 bg-slate-900 rounded overflow-hidden">
                <div className="h-full bg-purple-500" style={{ width: `${expPercent * 100}%` }} />
              </div>
            </div>
            <div data-testid="hud-coins" className="text-yellow-300 font-bold whitespace-nowrap">
              🪙 {player.stats.coins}
            </div>
            <div className="text-cyan-300 font-bold whitespace-nowrap">
              💎 {player.stats.soulShards}
            </div>
          </div>

          {/* 3P Co-Op Turn-Sync Banner */}
          {coopRoom && coopRoom.status === 'playing' && (
            <div
              data-testid="coop-turn-banner"
              className={`mt-1 px-2 py-1 rounded border text-[10px] font-bold flex items-center justify-between ${
                localCoopSlot?.movedThisTurn
                  ? 'bg-amber-950/70 border-amber-500/50 text-amber-300'
                  : 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
              }`}
            >
              <span className="flex items-center gap-1 truncate">
                {localCoopSlot?.movedThisTurn && <Lock className="w-3 h-3 flex-shrink-0" />}
                <span>
                  {localCoopSlot?.movedThisTurn
                    ? t('yourTurnLocked', language)
                    : `${t('squadTurnProgress', language)} T${coopRoom.turn}`}
                </span>
              </span>
              <span className="ml-2 flex-shrink-0">
                {movedCount}/{aliveCount}
              </span>
            </div>
          )}

          {/* Active Regen / Overclock Buffs */}
          {(player.buffs.regenTurns > 0 || player.buffs.overclockTurns > 0) && (
            <div className="flex flex-wrap gap-1 text-[9px] font-bold">
              {player.buffs.regenTurns > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-emerald-950/75 border border-emerald-400/50 text-emerald-300">
                  🌿 +{player.buffs.regenHpPerTurn}HP ({player.buffs.regenTurns}T)
                </span>
              )}
              {player.buffs.overclockTurns > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-pink-950/75 border border-pink-400/50 text-pink-300">
                  ⚡ CRIT 100% ({player.buffs.overclockTurns}T)
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
                <span>{dungeon.activeEvent.icon}</span>
                <span className="truncate">{dungeon.activeEvent.name}</span>
              </div>
              <div className="text-slate-200 text-[8px] sm:text-[9px] mt-0.5 hidden sm:block">{dungeon.activeEvent.effectText}</div>
            </div>
          )}
        </div>

        {/* Top-Right Quick Controls (Compact grid on mobile, inline on desktop) */}
        <div className="grid grid-cols-3 sm:flex items-center gap-1.5 sm:gap-2 pointer-events-auto">
          <button
            onClick={onToggleMinimap}
            data-testid="minimap-toggle-btn"
            className={`p-2 sm:p-2.5 rounded-lg border transition cursor-pointer ${
              showMinimap
                ? 'bg-cyan-950/90 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                : 'bg-[#0a0718]/85 border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
            title={t('toggleMinimap', language)}
            aria-label="Toggle Minimap"
            aria-pressed={showMinimap}
          >
            <Compass className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenInventory}
            className="p-2 sm:p-2.5 rounded-lg bg-[#0a0718]/85 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-950/80 hover:border-cyan-300 transition cursor-pointer relative"
            title={`${t('inventoryTitle', language)} [I]`}
            aria-label="Open Inventory"
          >
            <Backpack className="w-4 h-4" />
            {player.inventory.length > 0 && (
              <span className="absolute -top-1 -right-1 px-1 text-[9px] font-bold bg-pink-600 text-white rounded-full">
                {player.inventory.length}
              </span>
            )}
          </button>

          <button
            onClick={onOpenSkillTree}
            className="p-2 sm:p-2.5 rounded-lg bg-[#0a0718]/85 border border-purple-500/40 text-purple-300 hover:bg-purple-950/80 hover:border-purple-300 transition cursor-pointer relative"
            title={`${t('techTreeTitle', language)} [K]`}
            aria-label="Open Skill Tree"
          >
            <Sparkles className="w-4 h-4" />
            {player.stats.skillPoints > 0 && (
              <span className="absolute -top-1 -right-1 px-1 text-[9px] font-bold bg-amber-500 text-black rounded-full animate-bounce">
                +{player.stats.skillPoints}
              </span>
            )}
          </button>

          <button
            onClick={onToggleMute}
            className="p-2 sm:p-2.5 rounded-lg bg-[#0a0718]/85 border border-slate-700 text-slate-300 hover:bg-slate-800 transition cursor-pointer"
            title={`${t('toggleAudio', language)} [N]`}
            aria-label="Toggle Sound"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>

          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              data-testid="hud-fullscreen-btn"
              className="p-2 sm:p-2.5 rounded-lg bg-[#0a0718]/85 border border-slate-700 text-cyan-300 hover:bg-slate-800 transition cursor-pointer"
              title={t('fullscreenToggle', language)}
              aria-label={t('fullscreenToggle', language)}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}

          <button
            onClick={onOpenOptions}
            data-testid="hud-options-btn"
            className="p-2 sm:p-2.5 rounded-lg bg-[#0a0718]/85 border border-purple-500/40 text-purple-300 hover:bg-purple-950/80 transition cursor-pointer"
            title={t('optionsBtn', language)}
            aria-label={t('optionsBtn', language)}
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            onClick={onPause}
            className="p-2 sm:p-2.5 rounded-lg bg-[#0a0718]/85 border border-slate-700 text-slate-300 hover:bg-slate-800 transition cursor-pointer"
            title={`${t('pauseTitle', language)} [Esc / P]`}
            aria-label="Pause Game"
          >
            <Pause className="w-4 h-4 text-slate-200" />
          </button>
        </div>
      </div>

      {/* BOTTOM CLUSTER */}
      <div className="flex flex-col sm:flex-row items-end justify-between w-full gap-3">
        <div className="hidden sm:flex items-center gap-1.5 pointer-events-auto p-2 rounded-lg bg-[#0a0718]/85 border border-cyan-500/30">
          <button
            data-testid="hud-ranged-btn"
            onClick={() => !localCoopSlot?.movedThisTurn && onRangedAttack()}
            disabled={!!localCoopSlot?.movedThisTurn}
            title={`${t('rangedStrikeBtn', language)} (${attackRange} tiles) — Click enemy or press F`}
            aria-label={`Ranged Attack (${attackRange} tiles)`}
            className={`relative flex flex-col items-center justify-center w-16 h-14 rounded border transition cursor-pointer ${
              localCoopSlot?.movedThisTurn
                ? 'opacity-50 border-slate-700 bg-slate-900/60 cursor-not-allowed'
                : 'border-amber-400 bg-amber-950/60 hover:bg-amber-900/80 text-amber-200 shadow-[0_0_12px_rgba(255,230,0,0.3)]'
            }`}
          >
            <span className="text-[9px] font-bold text-amber-300 leading-none">[F]</span>
            <Crosshair className="w-4 h-4 my-0.5 text-amber-300" />
            <span className="text-[9px] font-bold leading-none">RNG {attackRange}</span>
          </button>

          {classActiveSkills.map((skill, index) => {
            const isUnlocked = player.unlockedSkills.includes(skill.id);
            const cd = player.activeCooldowns[skill.id] || 0;
            const energyNeeded = getEffectiveSkillEnergyCost(skill.energyCost || 15, dungeon.activeEvent);
            const canAfford = player.stats.energy >= energyNeeded;
            const isReady = isUnlocked && cd === 0 && canAfford && !localCoopSlot?.movedThisTurn;

            return (
              <button
                key={skill.id}
                onClick={() => isReady && onCastSkill(skill.id)}
                disabled={!isReady}
                aria-label={`${skill.name} (${energyNeeded} NRG)`}
                className={`relative flex flex-col items-center justify-center w-13 h-14 rounded border transition cursor-pointer ${
                  !isUnlocked
                    ? 'opacity-40 border-slate-700 bg-slate-900/50 cursor-not-allowed'
                    : isReady
                    ? 'border-cyan-400 bg-cyan-950/50 hover:bg-cyan-900/80 shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                    : 'opacity-60 border-slate-700 bg-slate-900/60 cursor-not-allowed'
                }`}
                title={`${skill.name} (${energyNeeded} NRG) - ${skill.description}`}
              >
                <span className="absolute top-0.5 left-1 text-[9px] font-bold text-cyan-300">
                  [{index + 1}]
                </span>
                <span className="absolute top-0.5 right-1 text-[9px] font-mono text-cyan-400">
                  {energyNeeded}e
                </span>
                <span className="text-xl mt-1">{skill.icon}</span>
                {cd > 0 && (
                  <div className="absolute inset-0 bg-black/75 rounded flex items-center justify-center font-bold text-pink-400 text-sm">
                    {cd}t
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="w-full sm:max-w-md h-9 sm:h-24 overflow-hidden px-2 py-1 sm:p-2.5 rounded-lg bg-[#0a0718]/90 border border-slate-700/60 text-[10px] sm:text-[11px] leading-relaxed flex flex-col-reverse justify-start pointer-events-auto">
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
