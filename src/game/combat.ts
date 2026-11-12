import { CombatLogEntry, DungeonState, GameItem, Monster, Player, Stats, EnvironmentalEvent } from './types';
import { SKILL_DATABASE } from './skills';
import { applyEnvironmentalTurnEffects } from './events';

export interface ActionResult {
  player: Player;
  dungeon: DungeonState;
  logs: CombatLogEntry[];
  soundEvents: ('hit' | 'player_hurt' | 'crit' | 'kill' | 'pickup' | 'chest' | 'shrine' | 'level_up' | 'death' | 'teleport' | 'skill')[];
  gameOver: boolean;
  floorCompleted: boolean;
  screenShake: number; // trauma increment
  floatingTexts: { text: string; x: number; y: number; color: string; isCrit?: boolean }[];
  openShop?: boolean;
}

export function createInitialPlayer(cls: 'striker' | 'technomancer' | 'vanguard', startX = 0, startY = 0): Player {
  const baseStats: Stats = {
    hp: cls === 'vanguard' ? 120 : cls === 'technomancer' ? 80 : 95,
    maxHp: cls === 'vanguard' ? 120 : cls === 'technomancer' ? 80 : 95,
    energy: cls === 'technomancer' ? 70 : 40,
    maxEnergy: cls === 'technomancer' ? 70 : 40,
    attack: cls === 'striker' ? 16 : cls === 'technomancer' ? 12 : 14,
    defense: cls === 'vanguard' ? 8 : 4,
    critRate: cls === 'striker' ? 0.20 : 0.05,
    level: 1,
    exp: 0,
    expToNext: 50,
    skillPoints: 1,
    soulShards: 0
  };

  const defaultStarterSkill = cls === 'striker' ? 'striker_slash' : cls === 'technomancer' ? 'techno_conduit' : 'vanguard_chitin';

  return {
    x: startX,
    y: startY,
    characterClass: cls,
    stats: baseStats,
    equipment: {
      weapon: {
        id: 'start_wep',
        name: cls === 'striker' ? 'Cyber Tanto' : cls === 'technomancer' ? 'Pulse Rod' : 'Alloy Baton',
        type: 'weapon',
        rarity: 'common',
        description: 'Standard issue starting weapon.',
        attackBonus: 4,
        critBonus: 0.04,
        value: 10,
        icon: '🗡️'
      },
      armor: null,
      accessory: null
    },
    inventory: [
      {
        id: 'start_stim_1',
        name: 'Nanite Med-Stim',
        type: 'consumable',
        rarity: 'common',
        description: 'Restores 50 HP immediately.',
        healAmount: 50,
        effectType: 'heal',
        value: 20,
        icon: '🧪'
      },
      {
        id: 'start_cell_1',
        name: 'Plasma Battery',
        type: 'consumable',
        rarity: 'common',
        description: 'Refills 40 points of energy.',
        energyAmount: 40,
        effectType: 'energy',
        value: 20,
        icon: '🔋'
      }
    ],
    maxInventory: 16,
    activeCooldowns: {},
    unlockedSkills: [defaultStarterSkill],
    facing: 'down',
    buffs: {
      overclockTurns: 0,
      shieldAmount: 0
    }
  };
}

export function getTotalStats(player: Player): { attack: number; defense: number; critRate: number; maxHp: number; maxEnergy: number } {
  let atk = player.stats.attack;
  let def = player.stats.defense;
  let crit = player.stats.critRate;
  let maxHp = player.stats.maxHp;
  let maxEnergy = player.stats.maxEnergy;

  // Equipment bonuses
  const { weapon, armor, accessory } = player.equipment;
  if (weapon) {
    if (weapon.attackBonus) atk += weapon.attackBonus;
    if (weapon.critBonus) crit += weapon.critBonus;
    if (weapon.energyBonus) maxEnergy += weapon.energyBonus;
    if (weapon.hpBonus) maxHp += weapon.hpBonus;
  }
  if (armor) {
    if (armor.defenseBonus) def += armor.defenseBonus;
    if (armor.hpBonus) maxHp += armor.hpBonus;
    if (armor.energyBonus) maxEnergy += armor.energyBonus;
  }
  if (accessory) {
    if (accessory.attackBonus) atk += accessory.attackBonus;
    if (accessory.defenseBonus) def += accessory.defenseBonus;
    if (accessory.critBonus) crit += accessory.critBonus;
    if (accessory.energyBonus) maxEnergy += accessory.energyBonus;
  }

  // Active Overclock buff
  if (player.buffs.overclockTurns > 0) {
    atk += 10;
    crit = 1.0;
  }

  return { attack: atk, defense: def, critRate: crit, maxHp, maxEnergy };
}

export function calculatePlayerDamage(player: Player, monster: Monster, activeEvent?: EnvironmentalEvent | null): { damage: number; isCrit: boolean } {
  const totals = getTotalStats(player);
  let effectiveCrit = totals.critRate;
  if (activeEvent?.id === 'shadow_veil') {
    effectiveCrit = Math.min(1.0, effectiveCrit + 0.20);
  }

  const isCrit = Math.random() < effectiveCrit;
  const baseDmg = Math.max(1, totals.attack - Math.floor(monster.defense * 0.6));
  const variance = Math.floor(Math.random() * 4) - 1; // -1 to +2
  let finalDmg = Math.max(1, baseDmg + variance);

  if (activeEvent?.id === 'gravity_shift') {
    finalDmg = Math.floor(finalDmg * 1.25);
  }

  if (isCrit) {
    finalDmg = Math.floor(finalDmg * 1.85);
  }

  // Cyber Executioner passive bonus
  if (player.unlockedSkills.includes('striker_executioner') && monster.hp <= monster.maxHp * 0.35) {
    finalDmg *= 2;
  }

  return { damage: finalDmg, isCrit };
}

export function awardXP(player: Player, xpGain: number, logs: CombatLogEntry[], turn: number): boolean {
  player.stats.exp += xpGain;
  let leveledUp = false;

  while (player.stats.exp >= player.stats.expToNext) {
    player.stats.exp -= player.stats.expToNext;
    player.stats.level += 1;
    player.stats.expToNext = Math.floor(player.stats.expToNext * 1.5);
    player.stats.skillPoints += 1;
    leveledUp = true;

    // Stat gains on level up
    player.stats.maxHp += 12;
    player.stats.hp = player.stats.maxHp;
    player.stats.maxEnergy += 8;
    player.stats.energy = player.stats.maxEnergy;
    player.stats.attack += 2;
    player.stats.defense += 1;

    logs.unshift({
      id: `log_lvl_${Date.now()}_${Math.random()}`,
      text: `SYSTEM OVERCLOCK: LEVEL ${player.stats.level}! +1 Skill Point gained, HP/Energy restored!`,
      type: 'level_up',
      turn
    });
  }

  return leveledUp;
}

export function resolveStepOrAttack(
  player: Player,
  dungeon: DungeonState,
  dx: number,
  dy: number,
  turn: number
): ActionResult {
  const newPlayer = { ...player, stats: { ...player.stats }, buffs: { ...player.buffs } };
  const newDungeon = {
    ...dungeon,
    monsters: dungeon.monsters.map(m => ({ ...m })),
    tiles: dungeon.tiles.map(row => row.map(t => ({ ...t })))
  };

  const logs: CombatLogEntry[] = [];
  const soundEvents: ActionResult['soundEvents'] = [];
  const floatingTexts: ActionResult['floatingTexts'] = [];
  let screenShake = 0;
  let gameOver = false;
  let floorCompleted = false;
  let openShop = false;

  // Set facing direction
  if (dx === 1) newPlayer.facing = 'right';
  else if (dx === -1) newPlayer.facing = 'left';
  else if (dy === 1) newPlayer.facing = 'down';
  else if (dy === -1) newPlayer.facing = 'up';

  const targetX = newPlayer.x + dx;
  const targetY = newPlayer.y + dy;

  // Check bounds
  if (targetX < 0 || targetX >= dungeon.width || targetY < 0 || targetY >= dungeon.height) {
    return { player, dungeon, logs, soundEvents, gameOver, floorCompleted, screenShake, floatingTexts };
  }

  // Check if monster at target
  const targetMonsterIndex = newDungeon.monsters.findIndex(m => m.x === targetX && m.y === targetY);

  if (targetMonsterIndex !== -1) {
    // Attack Monster
    const targetMonster = newDungeon.monsters[targetMonsterIndex];
    const { damage, isCrit } = calculatePlayerDamage(newPlayer, targetMonster, newDungeon.activeEvent);
    targetMonster.hp -= damage;
    targetMonster.alerted = true;

    floatingTexts.push({
      text: isCrit ? `CRIT! -${damage}` : `-${damage}`,
      x: targetX,
      y: targetY,
      color: isCrit ? '#ffe600' : '#00f0ff',
      isCrit
    });

    if (isCrit) {
      soundEvents.push('crit');
      screenShake += 0.25;
      logs.unshift({
        id: `log_${Date.now()}_1`,
        text: `CRITICAL STRIKE! You strike ${targetMonster.name} for ${damage} plasma damage!`,
        type: 'critical',
        turn
      });
    } else {
      soundEvents.push('hit');
      screenShake += 0.10;
      logs.unshift({
        id: `log_${Date.now()}_2`,
        text: `You hit ${targetMonster.name} for ${damage} damage.`,
        type: 'player_attack',
        turn
      });
    }

    // Check if monster died
    if (targetMonster.hp <= 0) {
      newDungeon.monsters.splice(targetMonsterIndex, 1);
      const shardMultiplier = newDungeon.activeEvent?.id === 'glitch_storm' ? 1.6 : 1.0;
      const shardsGained = Math.floor(targetMonster.shardReward * shardMultiplier);
      newPlayer.stats.soulShards += shardsGained;
      soundEvents.push('kill');
      screenShake += 0.35;

      logs.unshift({
        id: `log_${Date.now()}_3`,
        text: `${targetMonster.name} disintegrated! +${targetMonster.expReward} EXP, +${targetMonster.shardReward} Soul Shards.`,
        type: 'defeat',
        turn
      });

      const leveled = awardXP(newPlayer, targetMonster.expReward, logs, turn);
      if (leveled) soundEvents.push('level_up');
    }
  } else {
    // Movement / Tile interaction
    const targetTile = newDungeon.tiles[targetY][targetX];

    if (!targetTile.walkable) {
      return { player, dungeon, logs, soundEvents, gameOver, floorCompleted, screenShake, floatingTexts };
    }

    // Move player
    newPlayer.x = targetX;
    newPlayer.y = targetY;

    // Check stairs
    if (targetTile.type === 'stairs_down') {
      floorCompleted = true;
      soundEvents.push('teleport');
      logs.unshift({
        id: `log_${Date.now()}_stairs`,
        text: `Accessing quantum elevator to Cyber-Crypt Sub-Level ${dungeon.floor + 1}...`,
        type: 'info',
        turn
      });
      return { player: newPlayer, dungeon: newDungeon, logs, soundEvents, gameOver, floorCompleted, screenShake, floatingTexts };
    }

    // Check Chest
    if (targetTile.type === 'chest') {
      const loot = targetTile.item;
      targetTile.type = 'floor';
      delete targetTile.item;
      soundEvents.push('chest');

      if (loot) {
        if (newPlayer.inventory.length < newPlayer.maxInventory) {
          newPlayer.inventory.push(loot);
          logs.unshift({
            id: `log_${Date.now()}_loot`,
            text: `Decrypted Data Cache: Found [${loot.name}] (${loot.rarity.toUpperCase()})!`,
            type: 'item',
            turn
          });
        } else {
          logs.unshift({
            id: `log_${Date.now()}_loot_full`,
            text: `Decrypted Data Cache: [${loot.name}], but inventory is full!`,
            type: 'info',
            turn
          });
        }
      }
    }

    // Check Shrine
    if (targetTile.type === 'shrine') {
      targetTile.type = 'floor';
      soundEvents.push('shrine');
      const healAmt = Math.floor(newPlayer.stats.maxHp * 0.5);
      newPlayer.stats.hp = Math.min(newPlayer.stats.maxHp, newPlayer.stats.hp + healAmt);
      newPlayer.stats.energy = newPlayer.stats.maxEnergy;
      logs.unshift({
        id: `log_${Date.now()}_shrine`,
        text: `Cyber Shrine activated! Restored ${healAmt} HP and refilled energy capacitors.`,
        type: 'info',
        turn
      });
    }

    // Check Black Market Shop Terminal
    if (targetTile.type === 'shop') {
      openShop = true;
      soundEvents.push('pickup');
      logs.unshift({
        id: `log_${Date.now()}_shop`,
        text: `BLACK MARKET TERMINAL: Accessed synapse trading terminal! Exchange Soul Shards for high-grade cyber-mods.`,
        type: 'info',
        turn
      });
    }

    // Check Trap Hazard
    if (targetTile.hazard) {
      const trapDmg = 8 + dungeon.floor * 3;
      newPlayer.stats.hp -= trapDmg;
      targetTile.hazard = undefined;
      soundEvents.push('player_hurt');
      screenShake += 0.3;
      logs.unshift({
        id: `log_${Date.now()}_trap`,
        text: `TRAP TRIGGERED! Glitch wire discharges for ${trapDmg} electrical damage!`,
        type: 'enemy_attack',
        turn
      });
      floatingTexts.push({ text: `-${trapDmg}`, x: targetX, y: targetY, color: '#ff0055' });

      if (newPlayer.stats.hp <= 0) {
        gameOver = true;
        soundEvents.push('death');
        return { player: newPlayer, dungeon: newDungeon, logs, soundEvents, gameOver, floorCompleted, screenShake, floatingTexts, openShop };
      }
    }
  }

  // Turn bookkeeping: Decrement cooldowns & buff durations
  if (newPlayer.buffs.overclockTurns > 0) newPlayer.buffs.overclockTurns--;
  for (const skillId in newPlayer.activeCooldowns) {
    if (newPlayer.activeCooldowns[skillId] > 0) {
      newPlayer.activeCooldowns[skillId]--;
    }
  }

  // Energy natural regeneration (+1 per turn, +3 for Technomancer, +3 for EMP Surge event)
  const baseEnergyRegen = newPlayer.characterClass === 'technomancer' ? 3 : 1;
  const empBonus = newDungeon.activeEvent?.id === 'emp_surge' ? 3 : 0;
  const energyRegen = baseEnergyRegen + empBonus;
  const totals = getTotalStats(newPlayer);
  newPlayer.stats.energy = Math.min(totals.maxEnergy, newPlayer.stats.energy + energyRegen);

  // Environmental Hazard turn effect (e.g. Glitch Storm radiation damage)
  const envHazard = applyEnvironmentalTurnEffects(newPlayer, newDungeon, turn);
  if (envHazard.damage > 0) {
    newPlayer.stats.hp -= envHazard.damage;
    soundEvents.push('player_hurt');
    screenShake += 0.2;
    floatingTexts.push({ text: `GLITCH -${envHazard.damage}`, x: newPlayer.x, y: newPlayer.y, color: '#ff0055' });
    if (envHazard.message) {
      logs.unshift({
        id: `log_env_${Date.now()}`,
        text: envHazard.message,
        type: 'info',
        turn
      });
    }
  }

  // MONSTERS TURN
  resolveMonsterTurns(newPlayer, newDungeon, logs, soundEvents, floatingTexts, turn);

  if (newPlayer.stats.hp <= 0) {
    newPlayer.stats.hp = 0;
    gameOver = true;
    soundEvents.push('death');
    logs.unshift({
      id: `log_${Date.now()}_gameover`,
      text: `FATAL ERROR: Operative biometric feed flatlined. PERMANENT DEATH RECORDED.`,
      type: 'defeat',
      turn
    });
  }

  return {
    player: newPlayer,
    dungeon: newDungeon,
    logs,
    soundEvents,
    gameOver,
    floorCompleted,
    screenShake,
    floatingTexts,
    openShop
  };
}

export function resolveMonsterTurns(
  player: Player,
  dungeon: DungeonState,
  logs: CombatLogEntry[],
  soundEvents: ActionResult['soundEvents'],
  floatingTexts: ActionResult['floatingTexts'],
  turn: number
) {
  const pTotals = getTotalStats(player);

  for (const monster of dungeon.monsters) {
    const dist = Math.abs(monster.x - player.x) + Math.abs(monster.y - player.y);

    // Wake up if player is within 7 tiles
    if (dist <= 7) monster.alerted = true;
    if (!monster.alerted) continue;

    // Archetype behaviors
    if (monster.archetype === 'cyber_behemoth') {
      // Windup telegraph logic
      const inLineX = monster.x === player.x;
      const inLineY = monster.y === player.y;

      if (!monster.windupTurn && (inLineX || inLineY) && dist <= 4) {
        monster.windupTurn = true;
        monster.telegraphDirection = {
          dx: Math.sign(player.x - monster.x),
          dy: Math.sign(player.y - monster.y)
        };
        logs.unshift({
          id: `log_${Date.now()}_behemoth_windup`,
          text: `WARNING: ${monster.name} coils pneumatic thrusters for a devastating heavy smash!`,
          type: 'info',
          turn
        });
        continue;
      }

      if (monster.windupTurn) {
        monster.windupTurn = false;
        // Deliver charged attack if still adjacent/near
        if (dist <= 2) {
          const rawDmg = Math.max(2, monster.attack * 2 - Math.floor(pTotals.defense * 0.7));
          applyMonsterDamageToPlayer(player, rawDmg, monster.name, logs, soundEvents, floatingTexts, turn);
          continue;
        }
      }
    }

    if (dist === 1) {
      // Melee attack
      const rawDmg = Math.max(1, monster.attack - Math.floor(pTotals.defense * 0.6));
      applyMonsterDamageToPlayer(player, rawDmg, monster.name, logs, soundEvents, floatingTexts, turn);
    } else if (monster.archetype === 'neon_stalker' && dist <= 4 && dist >= 2) {
      // Ranged beam shot
      const rangedDmg = Math.max(1, monster.attack - 2 - Math.floor(pTotals.defense * 0.5));
      logs.unshift({
        id: `log_${Date.now()}_ranged`,
        text: `${monster.name} fires a pinpoint laser beam! -${rangedDmg} HP`,
        type: 'enemy_attack',
        turn
      });
      applyMonsterDamageToPlayer(player, rangedDmg, monster.name, logs, soundEvents, floatingTexts, turn);
    } else if (monster.archetype === 'circuit_disruptor' && dist <= 3) {
      // EMP Drain
      player.stats.energy = Math.max(0, player.stats.energy - 8);
      const zapDmg = Math.max(1, Math.floor(monster.attack * 0.6));
      applyMonsterDamageToPlayer(player, zapDmg, `${monster.name} (EMP Arc)`, logs, soundEvents, floatingTexts, turn);
    } else {
      // Move towards player
      const stepX = Math.sign(player.x - monster.x);
      const stepY = Math.sign(player.y - monster.y);

      // Try preferred direction first
      let nextX = monster.x + stepX;
      let nextY = monster.y;

      if (!canMonsterMoveTo(nextX, nextY, dungeon, player)) {
        nextX = monster.x;
        nextY = monster.y + stepY;
      }

      if (canMonsterMoveTo(nextX, nextY, dungeon, player)) {
        monster.x = nextX;
        monster.y = nextY;
      }
    }
  }
}

function canMonsterMoveTo(x: number, y: number, dungeon: DungeonState, player: Player): boolean {
  if (x < 0 || x >= dungeon.width || y < 0 || y >= dungeon.height) return false;
  if (!dungeon.tiles[y][x].walkable) return false;
  if (player.x === x && player.y === y) return false;
  if (dungeon.monsters.some(m => m.x === x && m.y === y)) return false;
  return true;
}

function applyMonsterDamageToPlayer(
  player: Player,
  dmg: number,
  sourceName: string,
  logs: CombatLogEntry[],
  soundEvents: ActionResult['soundEvents'],
  floatingTexts: ActionResult['floatingTexts'],
  turn: number
) {
  let effectiveDmg = dmg;

  // Kinetic shield absorption
  if (player.buffs.shieldAmount > 0) {
    if (player.buffs.shieldAmount >= effectiveDmg) {
      player.buffs.shieldAmount -= effectiveDmg;
      effectiveDmg = 0;
      logs.unshift({
        id: `log_${Date.now()}_shield`,
        text: `Aegis Barrier absorbs all incoming damage from ${sourceName}!`,
        type: 'info',
        turn
      });
      return;
    } else {
      effectiveDmg -= player.buffs.shieldAmount;
      player.buffs.shieldAmount = 0;
    }
  }

  player.stats.hp -= effectiveDmg;
  soundEvents.push('player_hurt');
  floatingTexts.push({ text: `-${effectiveDmg}`, x: player.x, y: player.y, color: '#ff3366' });

  logs.unshift({
    id: `log_${Date.now()}_hurt`,
    text: `${sourceName} strikes you for ${effectiveDmg} physical damage.`,
    type: 'enemy_attack',
    turn
  });
}

// Active skill execution
export function executeSkill(
  player: Player,
  dungeon: DungeonState,
  skillId: string,
  turn: number
): ActionResult {
  const skill = SKILL_DATABASE[skillId];
  if (!skill) return { player, dungeon, logs: [], soundEvents: [], gameOver: false, floorCompleted: false, screenShake: 0, floatingTexts: [] };

  const currentCd = player.activeCooldowns[skillId] || 0;
  if (currentCd > 0) {
    return {
      player,
      dungeon,
      logs: [{ id: `cd_${Date.now()}`, text: `${skill.name} is on cooldown (${currentCd} turns left).`, type: 'info', turn }],
      soundEvents: [],
      gameOver: false,
      floorCompleted: false,
      screenShake: 0,
      floatingTexts: []
    };
  }

  const energyCost = skill.energyCost || 15;
  if (player.stats.energy < energyCost) {
    return {
      player,
      dungeon,
      logs: [{ id: `mana_${Date.now()}`, text: `Insufficient energy for ${skill.name} (${energyCost} needed).`, type: 'info', turn }],
      soundEvents: [],
      gameOver: false,
      floorCompleted: false,
      screenShake: 0,
      floatingTexts: []
    };
  }

  const newPlayer = { ...player, stats: { ...player.stats }, buffs: { ...player.buffs } };
  const newDungeon = {
    ...dungeon,
    monsters: dungeon.monsters.map(m => ({ ...m })),
    tiles: dungeon.tiles.map(row => row.map(t => ({ ...t })))
  };

  newPlayer.stats.energy -= energyCost;
  newPlayer.activeCooldowns[skillId] = skill.cooldown || 3;

  const logs: CombatLogEntry[] = [];
  const soundEvents: ActionResult['soundEvents'] = ['skill'];
  const floatingTexts: ActionResult['floatingTexts'] = [];
  let screenShake = 0.2;

  const pTotals = getTotalStats(newPlayer);

  if (skill.effect.actionType === 'phase_dash') {
    // Dash 3 tiles forward
    let dx = 0;
    let dy = 0;
    if (newPlayer.facing === 'left') dx = -1;
    if (newPlayer.facing === 'right') dx = 1;
    if (newPlayer.facing === 'up') dy = -1;
    if (newPlayer.facing === 'down') dy = 1;

    for (let step = 1; step <= (skill.effect.range || 3); step++) {
      const stepX = newPlayer.x + dx;
      const stepY = newPlayer.y + dy;

      if (stepX < 0 || stepX >= dungeon.width || stepY < 0 || stepY >= dungeon.height) break;
      if (!newDungeon.tiles[stepY][stepX].walkable) break;

      newPlayer.x = stepX;
      newPlayer.y = stepY;

      // Hit any monster passed
      const hitMonster = newDungeon.monsters.find(m => m.x === stepX && m.y === stepY);
      if (hitMonster) {
        const dmg = Math.floor(pTotals.attack * (skill.effect.power || 1.8));
        hitMonster.hp -= dmg;
        floatingTexts.push({ text: `PHASE -${dmg}`, x: stepX, y: stepY, color: '#00f0ff' });
      }
    }

    logs.unshift({
      id: `skill_${Date.now()}`,
      text: `PHASE DASH! Warped through spacetime, shredding intercepted enemy circuits!`,
      type: 'skill',
      turn
    });
  } else if (skill.effect.actionType === 'emp_blast') {
    // 360 shockwave to adjacent tiles
    let hits = 0;
    for (let i = newDungeon.monsters.length - 1; i >= 0; i--) {
      const m = newDungeon.monsters[i];
      if (Math.abs(m.x - newPlayer.x) <= 1 && Math.abs(m.y - newPlayer.y) <= 1) {
        const dmg = Math.floor(pTotals.attack * (skill.effect.power || 2.2));
        m.hp -= dmg;
        hits++;
        floatingTexts.push({ text: `EMP -${dmg}`, x: m.x, y: m.y, color: '#bd00ff' });
        if (m.hp <= 0) {
          newDungeon.monsters.splice(i, 1);
          newPlayer.stats.soulShards += m.shardReward;
          awardXP(newPlayer, m.expReward, logs, turn);
        }
      }
    }
    screenShake = 0.4;
    logs.unshift({
      id: `skill_${Date.now()}`,
      text: `EMP SURGE unleashed! Shockwave electrified ${hits} surrounding hostiles!`,
      type: 'skill',
      turn
    });
  } else if (skill.effect.actionType === 'nanite_heal') {
    if (newPlayer.characterClass === 'vanguard') {
      newPlayer.buffs.shieldAmount = 45;
      logs.unshift({
        id: `skill_${Date.now()}`,
        text: `AEGIS BARRIER activated: 45 Kinetic Shield points deployed!`,
        type: 'skill',
        turn
      });
    } else {
      const healAmt = Math.floor(pTotals.maxHp * (skill.effect.power || 0.45));
      newPlayer.stats.hp = Math.min(pTotals.maxHp, newPlayer.stats.hp + healAmt);
      logs.unshift({
        id: `skill_${Date.now()}`,
        text: `NANITE INFUSION: Restored ${healAmt} HP to core biological systems!`,
        type: 'skill',
        turn
      });
    }
  } else if (skill.effect.actionType === 'plasma_cleave') {
    // Cleave 3 tiles in front of player
    let hits = 0;
    const targets: { x: number; y: number }[] = [];
    if (newPlayer.facing === 'right') {
      targets.push({ x: newPlayer.x + 1, y: newPlayer.y - 1 });
      targets.push({ x: newPlayer.x + 1, y: newPlayer.y });
      targets.push({ x: newPlayer.x + 1, y: newPlayer.y + 1 });
    } else if (newPlayer.facing === 'left') {
      targets.push({ x: newPlayer.x - 1, y: newPlayer.y - 1 });
      targets.push({ x: newPlayer.x - 1, y: newPlayer.y });
      targets.push({ x: newPlayer.x - 1, y: newPlayer.y + 1 });
    } else if (newPlayer.facing === 'up') {
      targets.push({ x: newPlayer.x - 1, y: newPlayer.y - 1 });
      targets.push({ x: newPlayer.x, y: newPlayer.y - 1 });
      targets.push({ x: newPlayer.x + 1, y: newPlayer.y - 1 });
    } else {
      targets.push({ x: newPlayer.x - 1, y: newPlayer.y + 1 });
      targets.push({ x: newPlayer.x, y: newPlayer.y + 1 });
      targets.push({ x: newPlayer.x + 1, y: newPlayer.y + 1 });
    }

    for (const target of targets) {
      for (let i = newDungeon.monsters.length - 1; i >= 0; i--) {
        const m = newDungeon.monsters[i];
        if (m.x === target.x && m.y === target.y) {
          const dmg = Math.floor(pTotals.attack * (skill.effect.power || 1.9));
          m.hp -= dmg;
          hits++;
          floatingTexts.push({ text: `CLEAVE -${dmg}`, x: m.x, y: m.y, color: '#ffe600' });
          if (m.hp <= 0) {
            newDungeon.monsters.splice(i, 1);
            newPlayer.stats.soulShards += m.shardReward;
            awardXP(newPlayer, m.expReward, logs, turn);
          }
        }
      }
    }
    screenShake = 0.35;
    logs.unshift({
      id: `skill_${Date.now()}`,
      text: `PLASMA CLEAVE! Swept a wide energy arc hitting ${hits} targets!`,
      type: 'skill',
      turn
    });
  } else if (skill.effect.actionType === 'glitch_overcharge') {
    newPlayer.buffs.overclockTurns = 4;
    logs.unshift({
      id: `skill_${Date.now()}`,
      text: `ADRENALINE MATRIX ENGAGED: 100% Critical Hit rate active for 4 turns!`,
      type: 'skill',
      turn
    });
  }

  // Monsters turn after skill cast
  resolveMonsterTurns(newPlayer, newDungeon, logs, soundEvents, floatingTexts, turn);

  return {
    player: newPlayer,
    dungeon: newDungeon,
    logs,
    soundEvents,
    gameOver: newPlayer.stats.hp <= 0,
    floorCompleted: false,
    screenShake,
    floatingTexts
  };
}
