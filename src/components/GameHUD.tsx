import { CombatLogEntry, DungeonState, Player } from '../game/types';
import { getTotalStats } from '../game/combat';
import { SKILL_DATABASE } from '../game/skills';
import { Language, t } from '../game/i18n';
import { Volume2, VolumeX, Pause, Backpack, Sparkles } from 'lucide-react';

interface GameHUDProps {
  player: Player;
  dungeon: DungeonState;
  combatLogs: CombatLogEntry[];
  turn: number;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenInventory: () => void;
  onOpenSkillTree: () => void;
  onPause: () => void;
  onCastSkill: (skillId: string) => void;
  language: Language;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  player,
  dungeon,
  combatLogs,
  turn,
  isMuted,
  onToggleMute,
  onOpenInventory,
  onOpenSkillTree,
  onPause,
  onCastSkill,
  language
}) => {
  const totals = getTotalStats(player);
  const hpPercent = Math.max(0, Math.min(1, player.stats.hp / totals.maxHp));
  const energyPercent = Math.max(0, Math.min(1, player.stats.energy / totals.maxEnergy));
  const expPercent = Math.max(0, Math.min(1, player.stats.exp / player.stats.expToNext));

  // Determine active skills for player's class
  const classActiveSkills = Object.values(SKILL_DATABASE).filter(
    s => s.branch === player.characterClass && s.type === 'active'
  );

  return (
    <div className="fixed inset-0 pointer-events-none z-20 flex flex-col justify-between p-3 sm:p-5 select-none font-mono">
      {/* TOP BAR: Player Vitality Cluster & Controls */}
      <div className="flex items-start justify-between w-full">
        {/* Top-Left: HP Pips, Energy Bar, Level */}
        <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-[#0a0718]/85 border border-cyan-500/30 shadow-[0_4px_12px_rgba(0,0,0,0.5)] pointer-events-auto max-w-[280px] sm:max-w-sm">
          {/* Header Row: Class & Floor */}
          <div className="flex items-center justify-between text-xs text-cyan-300">
            <span className="font-bold tracking-wider uppercase text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              {t('level', language)} {player.stats.level} {player.characterClass}
            </span>
            <span className="text-[11px] text-pink-400 font-bold bg-pink-950/60 px-1.5 py-0.5 rounded border border-pink-500/30">
              {t('floor', language)} {dungeon.floor}
            </span>
          </div>

          {/* Health Bar with Vitality Numerals */}
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
              {/* Kinetic Shield Overlay */}
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

          {/* EXP Bar & Soul Shards */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[10px] text-slate-300">
            <div className="flex items-center gap-1.5 flex-1 mr-3">
              <span className="text-purple-400">{t('exp', language)}</span>
              <div className="w-full h-1.5 bg-slate-900 rounded overflow-hidden">
                <div className="h-full bg-purple-500" style={{ width: `${expPercent * 100}%` }} />
              </div>
            </div>
            <div className="text-amber-400 font-bold whitespace-nowrap">
              💎 {player.stats.soulShards} {t('shards', language)}
            </div>
          </div>
        </div>

        {/* Top-Right: Quick Utility Controls */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Inventory Button */}
          <button
            onClick={onOpenInventory}
            className="p-2.5 rounded-lg bg-[#0a0718]/85 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-950/80 hover:border-cyan-300 transition cursor-pointer relative"
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

          {/* Skill Tree Button */}
          <button
            onClick={onOpenSkillTree}
            className="p-2.5 rounded-lg bg-[#0a0718]/85 border border-purple-500/40 text-purple-300 hover:bg-purple-950/80 hover:border-purple-300 transition cursor-pointer relative"
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

          {/* Mute Toggle */}
          <button
            onClick={onToggleMute}
            className="p-2.5 rounded-lg bg-[#0a0718]/85 border border-slate-700 text-slate-300 hover:bg-slate-800 transition cursor-pointer"
            title="Toggle Mute [M]"
            aria-label="Toggle Sound"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>

          {/* Pause Button */}
          <button
            onClick={onPause}
            className="p-2.5 rounded-lg bg-[#0a0718]/85 border border-slate-700 text-slate-300 hover:bg-slate-800 transition cursor-pointer"
            title={`${t('pauseTitle', language)} [Esc / P]`}
            aria-label="Pause Game"
          >
            <Pause className="w-4 h-4 text-slate-200" />
          </button>
        </div>
      </div>

      {/* BOTTOM CLUSTER: Active Skills Bar & Combat Log */}
      <div className="flex flex-col sm:flex-row items-end justify-between w-full gap-3">
        {/* Active Skills Bar */}
        <div className="flex items-center gap-2 pointer-events-auto p-2 rounded-lg bg-[#0a0718]/85 border border-cyan-500/30">
          {classActiveSkills.map((skill, index) => {
            const isUnlocked = player.unlockedSkills.includes(skill.id);
            const cd = player.activeCooldowns[skill.id] || 0;
            const energyNeeded = skill.energyCost || 15;
            const canAfford = player.stats.energy >= energyNeeded;
            const isReady = isUnlocked && cd === 0 && canAfford;

            return (
              <button
                key={skill.id}
                onClick={() => isReady && onCastSkill(skill.id)}
                disabled={!isReady}
                className={`relative flex flex-col items-center justify-center w-14 h-14 rounded border transition cursor-pointer ${
                  !isUnlocked
                    ? 'opacity-40 border-slate-700 bg-slate-900/50 cursor-not-allowed'
                    : isReady
                    ? 'border-cyan-400 bg-cyan-950/50 hover:bg-cyan-900/80 shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                    : 'opacity-60 border-slate-700 bg-slate-900/60 cursor-not-allowed'
                }`}
                title={`${skill.name} - ${skill.description}`}
              >
                {/* Hotkey Badge */}
                <span className="absolute top-0.5 left-1 text-[9px] font-bold text-cyan-300">
                  [{index + 1}]
                </span>

                {/* Energy Cost */}
                <span className="absolute top-0.5 right-1 text-[9px] font-mono text-cyan-400">
                  {energyNeeded}e
                </span>

                <span className="text-xl mt-1">{skill.icon}</span>

                {/* Cooldown Overlay */}
                {cd > 0 && (
                  <div className="absolute inset-0 bg-black/75 rounded flex items-center justify-center font-bold text-pink-400 text-sm">
                    {cd}t
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Combat Log Ticker (Bottom Right) */}
        <div className="w-full sm:max-w-md h-24 overflow-hidden p-2.5 rounded-lg bg-[#0a0718]/90 border border-slate-700/60 text-[11px] leading-relaxed flex flex-col-reverse justify-start pointer-events-auto">
          {combatLogs.slice(0, 4).map(log => {
            let color = 'text-slate-300';
            if (log.type === 'critical') color = 'text-pink-400 font-bold';
            else if (log.type === 'defeat') color = 'text-emerald-400 font-bold';
            else if (log.type === 'enemy_attack') color = 'text-red-400';
            else if (log.type === 'item') color = 'text-amber-400';
            else if (log.type === 'skill') color = 'text-cyan-300';
            else if (log.type === 'level_up') color = 'text-purple-300 font-bold';

            return (
              <div key={log.id} className={`${color} truncate`}>
                <span className="text-slate-500 mr-1.5">[T{log.turn}]</span>
                {log.text}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
