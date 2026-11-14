import {
  AttackEffect,
  CharacterClass,
  CombatLogEntry,
  DeathDropBag,
  DungeonState,
  EnvironmentalEvent,
  EquipSlot,
  GameItem,
  GroundCoin,
  Monster,
  Player,
  PlayerEquipment,
  SavedPlayerLoadout,
  Stats
} from './types';
import { SKILL_DATABASE } from './skills';
import { applyEnvironmentalTurnEffects } from './events';
import { canClassEquipItem, createItem, getEffectiveItemStats } from './items';
import { SoundEventType } from './audio';

export interface ActionResult {
  player: Player;
  dungeon: DungeonState;
  logs: CombatLogEntry[];
  soundEvents: SoundEventType[];
  gameOver: boolean;
  floorCompleted: boolean;
  screenShake: number; // trauma increment
  hitstopSeconds: number; // 0 or [0.03, 0.25] seconds freeze frames
  attackEffects: AttackEffect[];
  floatingTexts: { text: string; x: number; y: number; color: string; isCrit?: boolean }[];
  openShop?: boolean;
  checkpointTriggered?: boolean;
  deathDropCreated?: boolean;
  deathDropRecovered?: boolean;
}

const EQUIP_SLOTS: EquipSlot[] = [
  'weapon',
  'offhand',
  'helmet',
  'chest',
  'gloves',
  'legs',
  'boots',
  'ring1',
  'ring2',
  'earrings'
];

export function emptyEquipmentSnapshot(): PlayerEquipment {
  return {
    weapon: null,
    offhand: null,
    helmet: null,
    chest: null,
    gloves: null,
    legs: null,
    boots: null,
    ring1: null,
    ring2: null,
    earrings: null
  };
}

export function snapshotPlayerLoadout(
  player: Player,
  playerId: string,
  username: string
): SavedPlayerLoadout {
  const eq = emptyEquipmentSnapshot();
  for (const slot of EQUIP_SLOTS) {
    const it = player.equipment[slot];
    eq[slot] = it ? { ...it } : null;
  }
  return {
    playerId,
    username,
    characterClass: player.characterClass,
    inventory: player.inventory.map(item => ({ ...item })),
    equipment: eq,
    coins: player.stats.coins || 0,
    probabilityStones: player.stats.probabilityStones || 0,
    soulShards: player.stats.soulShards || 0,
    savedAt: Date.now()
  };
}

/**
 * Builds an online-safe exit stash without mutating the live player:
 * - Preserves only loot & currencies (coins, diamonds/soulShards, probabilityStones, items/armor).
 * - Unequips all worn armor & weapons and moves them into the inventory bag.
 * - Drops dungeon floor, character level, EXP, and skill tree progress (next match starts Lv.1).
 */
export function buildOnlineExitStash(
  player: Player,
  accountId: string,
  username: string,
  extraBags: DeathDropBag[] = []
): SavedPlayerLoadout {
  const bagItems: GameItem[] = player.inventory.map(item => ({ ...item }));
  let coins = player.stats.coins || 0;
  let probabilityStones = player.stats.probabilityStones || 0;
  const soulShards = player.stats.soulShards || 0;

  for (const slot of EQUIP_SLOTS) {
    const equipped = player.equipment[slot];
    if (equipped) {
      bagItems.push({ ...equipped });
    }
  }

  // Also rescue any uncollected Floating Skull death drop bags belonging to this operative
  for (const bag of extraBags) {
    coins += bag.coins || 0;
    probabilityStones += bag.probabilityStones || 0;
    for (const slot of EQUIP_SLOTS) {
      const eq = bag.equipment?.[slot];
      if (eq) bagItems.push({ ...eq });
    }
    for (const it of bag.items || []) {
      bagItems.push({ ...it });
    }
  }

  return {
    playerId: accountId,
    username,
    characterClass: player.characterClass,
    inventory: bagItems,
    equipment: emptyEquipmentSnapshot(),
    coins,
    probabilityStones,
    soulShards,
    savedAt: Date.now()
  };
}

/**
 * Starts an online operative strictly at Level 1 (base stats & starter skill tree),
 * restoring saved coins, diamonds, probability stones, and all saved items/armor into inventory.
 */
export function restoreOnlineStashToLevel1Player(
  characterClass: CharacterClass,
  startX = 0,
  startY = 0,
  stash?: SavedPlayerLoadout | null
): Player {
  const fresh = createInitialPlayer(characterClass, startX, startY);
  if (!stash) return fresh;

  const restoredInventory: GameItem[] = [];
  for (const item of stash.inventory || []) {
    restoredInventory.push({ ...item });
  }
  if (stash.equipment) {
    for (const slot of EQUIP_SLOTS) {
      const eq = stash.equipment[slot];
      if (eq) restoredInventory.push({ ...eq });
    }
  }

  fresh.stats.coins = stash.coins || 0;
  fresh.stats.soulShards = stash.soulShards || 0;
  fresh.stats.probabilityStones = stash.probabilityStones || 0;

  // All saved armor & items remain inside inventory rather than auto-equipped
  if (restoredInventory.length > 0) {
    fresh.inventory = restoredInventory;
    const hasSavedWeapon = restoredInventory.some(i => i.type === 'weapon');
    const hasSavedOffhand = restoredInventory.some(
      i => i.type === 'offhand' || (i.type === 'weapon' && i.twoHanded)
    );
    if (hasSavedWeapon) {
      fresh.equipment.weapon = null;
    }
    if (hasSavedOffhand) {
      fresh.equipment.offhand = null;
    }
  }

  fresh.maxInventory = Math.max(fresh.maxInventory, fresh.inventory.length + 4);
  return fresh;
}

export function dropPlayerLoadoutOnDeath(
  player: Player,
  dungeon: DungeonState,
  ownerId = 'solo',
  ownerName = 'Operative',
  turn = 1
): DeathDropBag | null {
  if (!Array.isArray(dungeon.deathDrops)) {
    dungeon.deathDrops = [];
  }

  const equippedSnap = emptyEquipmentSnapshot();
  let equippedCount = 0;
  for (const slot of EQUIP_SLOTS) {
    const it = player.equipment[slot];
    if (it) {
      equippedSnap[slot] = { ...it };
      player.equipment[slot] = null;
      equippedCount++;
    }
  }

  const droppedItems = player.inventory.map(i => ({ ...i }));
  const droppedCoins = player.stats.coins || 0;
  const droppedStones = player.stats.probabilityStones || 0;

  player.inventory = [];
  player.stats.coins = 0;
  player.stats.probabilityStones = 0;

  if (droppedItems.length === 0 && equippedCount === 0 && droppedCoins === 0 && droppedStones === 0) {
    return null;
  }

  const bag: DeathDropBag = {
    id: `skull_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    ownerId,
    ownerName,
    x: player.x,
    y: player.y,
    items: droppedItems,
    equipment: equippedSnap,
    coins: droppedCoins,
    probabilityStones: droppedStones,
    droppedAtTurn: turn
  };

  dungeon.deathDrops.push(bag);
  return bag;
}

export function collectDeathDropBagsAt(
  player: Player,
  dungeon: DungeonState,
  ownerId?: string
): { recoveredBags: number; totalItems: number; totalCoins: number; totalStones: number } {
  if (!Array.isArray(dungeon.deathDrops) || dungeon.deathDrops.length === 0) {
    return { recoveredBags: 0, totalItems: 0, totalCoins: 0, totalStones: 0 };
  }

  const remaining: DeathDropBag[] = [];
  let recoveredBags = 0;
  let totalItems = 0;
  let totalCoins = 0;
  let totalStones = 0;

  for (const bag of dungeon.deathDrops) {
    const matchesPos = bag.x === player.x && bag.y === player.y;
    const matchesOwner = !ownerId || bag.ownerId === ownerId;
    if (!matchesPos || !matchesOwner) {
      remaining.push(bag);
      continue;
    }

    recoveredBags++;
    totalCoins += bag.coins || 0;
    totalStones += bag.probabilityStones || 0;
    player.stats.coins = (player.stats.coins || 0) + (bag.coins || 0);
    player.stats.probabilityStones = (player.stats.probabilityStones || 0) + (bag.probabilityStones || 0);

    for (const slot of EQUIP_SLOTS) {
      const eqItem = bag.equipment?.[slot];
      if (!eqItem) continue;
      totalItems++;
      const twoHandBlocked = slot === 'offhand' && player.equipment.weapon?.twoHanded;
      if (!player.equipment[slot] && !twoHandBlocked && canClassEquipItem(player.characterClass, eqItem)) {
        player.equipment[slot] = { ...eqItem };
      } else {
        player.inventory.push({ ...eqItem });
      }
    }

    for (const invItem of bag.items || []) {
      totalItems++;
      player.inventory.push({ ...invItem });
    }
  }

  dungeon.deathDrops = remaining;
  if (player.inventory.length > player.maxInventory) {
    player.maxInventory = player.inventory.length;
  }

  return { recoveredBags, totalItems, totalCoins, totalStones };
}

export function calculateHitstopSeconds(
  damage: number,
  targetMaxHp: number,
  isCrit: boolean,
  isSkill: boolean,
  killed: boolean
): number {
  const ratio = Math.min(1, damage / Math.max(1, targetMaxHp));
  let duration = 0.035 + ratio * 0.045;
  if (isSkill) duration += 0.04;
  if (killed) duration += 0.045;
  if (isCrit) duration = Math.max(duration + 0.08, 0.16);
  return Number(Math.max(0.03, Math.min(0.25, duration)).toFixed(3));
}

export function dropCoinsAround(
  dungeon: DungeonState,
  originX: number,
  originY: number,
  floor: number,
  isBoss = false
) {
  const count = isBoss ? 5 : 2 + Math.floor(Math.random() * 2); // 2-3 normal, 5 boss
  const candidateOffsets = [
    { dx: 0, dy: 0 },
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 },
    { dx: 1, dy: 1 },
    { dx: -1, dy: -1 },
    { dx: 1, dy: -1 },
    { dx: -1, dy: 1 }
  ];

  // Shuffle offsets for natural scatter
  for (let i = candidateOffsets.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidateOffsets[i], candidateOffsets[j]] = [candidateOffsets[j], candidateOffsets[i]];
  }

  let dropped = 0;
  for (const offset of candidateOffsets) {
    if (dropped >= count) break;
    const tx = originX + offset.dx;
    const ty = originY + offset.dy;
    const tile = dungeon.tiles[ty]?.[tx];
    if (!tile || !tile.walkable || tile.type === 'stairs_down') continue;
    if (dungeon.groundCoins.some(c => c.x === tx && c.y === ty)) continue;

    const roll = Math.random() + (isBoss ? 0.35 : 0) + floor * 0.025;
    let tier: GroundCoin['tier'] = 'bronze';
    let baseVal = 4 + floor * 2;

    if (roll > 1.05) {
      tier = 'quantum';
      baseVal = 30 + floor * 9;
    } else if (roll > 0.78) {
      tier = 'gold';
      baseVal = 16 + floor * 5;
    } else if (roll > 0.42) {
      tier = 'silver';
      baseVal = 9 + floor * 3;
    }

    const variance = Math.floor(Math.random() * Math.max(2, Math.floor(baseVal * 0.3)));
    dungeon.groundCoins.push({
      id: `coin_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      x: tx,
      y: ty,
      value: baseVal + variance,
      tier
    });
    dropped++;
  }
}

export function createInitialPlayer(cls: 'striker' | 'technomancer' | 'vanguard', startX = 0, startY = 0): Player {
  const baseStats: Stats = {
    hp: cls === 'vanguard' ? 120 : cls === 'technomancer' ? 80 : 95,
    maxHp: cls === 'vanguard' ? 120 : cls === 'technomancer' ? 80 : 95,
    energy: cls === 'technomancer' ? 70 : 40,
    maxEnergy: cls === 'technomancer' ? 70 : 40,
    attack: cls === 'striker' ? 16 : cls === 'technomancer' ? 12 : 14,
    defense: cls === 'vanguard' ? 8 : 4,
    critRate: cls === 'striker' ? 0.20 : 0.06,
    level: 1,
    exp: 0,
    expToNext: 50,
    skillPoints: 1,
    soulShards: 0,
    coins: 0,
    probabilityStones: 0
  };

  const defaultStarterSkill =
    cls === 'striker'
      ? 'striker_slash'
      : cls === 'technomancer'
      ? 'techno_conduit'
      : 'vanguard_chitin';

  const starterWeapon =
    cls === 'striker'
      ? createItem('cyber_tanto', 'start_wep')
      : cls === 'technomancer'
      ? createItem('pulse_rod', 'start_wep')
      : createItem('alloy_sword', 'start_wep');

  const starterOffhand =
    cls === 'vanguard' ? createItem('aegis_kite_shield', 'start_offhand') : null;

  return {
    x: startX,
    y: startY,
    characterClass: cls,
    stats: baseStats,
    equipment: {
      weapon: starterWeapon,
      offhand: starterOffhand,
      helmet: null,
      chest: null,
      gloves: null,
      legs: null,
      boots: null,
      ring1: null,
      ring2: null,
      earrings: null
    },
    inventory: [
      createItem('stim_pack', 'start_stim_1'),
      createItem('energy_cell', 'start_cell_1')
    ],
    maxInventory: 16,
    activeCooldowns: {},
    unlockedSkills: [defaultStarterSkill],
    facing: 'down',
    buffs: {
      overclockTurns: 0,
      shieldAmount: 0,
      regenTurns: 0,
      regenHpPerTurn: 0,
      regenEnergyPerTurn: 0
    }
  };
}

export function getTotalStats(player: Player): {
  attack: number;
  defense: number;
  critRate: number;
  maxHp: number;
  maxEnergy: number;
} {
  let atk = player.stats.attack;
  let def = player.stats.defense;
  let crit = player.stats.critRate;
  let maxHp = player.stats.maxHp;
  let maxEnergy = player.stats.maxEnergy;

  const equipItems = Object.values(player.equipment);
  for (const item of equipItems) {
    if (!item) continue;
    const eff = getEffectiveItemStats(item);
    atk += eff.attackBonus;
    def += eff.defenseBonus;
    crit += eff.critBonus;
    maxHp += eff.hpBonus;
    maxEnergy += eff.energyBonus;
  }

  // Active Overclock buff
  if (player.buffs.overclockTurns > 0) {
    atk += 10;
    crit = 1.0;
  }

  return {
    attack: atk,
    defense: def,
    critRate: Math.min(1.0, crit),
    maxHp,
    maxEnergy
  };
}

export function getPlayerAttackRange(player: Player): number {
  return Math.max(1, Math.min(5, player.equipment.weapon?.attackRange || 1));
}

export function hasLineOfSight(
  dungeon: DungeonState,
  x0: number,
  y0: number,
  x1: number,
  y1: number
): boolean {
  let cx = x0;
  let cy = y0;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  while (cx !== x1 || cy !== y1) {
    if (!(cx === x0 && cy === y0)) {
      const tile = dungeon.tiles[cy]?.[cx];
      if (!tile || !tile.transparent) return false;
    }
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      cx += sx;
    }
    if (e2 < dx) {
      err += dx;
      cy += sy;
    }
  }
  return true;
}

export function calculatePlayerDamage(
  player: Player,
  monster: Monster,
  activeEvent?: EnvironmentalEvent | null
): { damage: number; isCrit: boolean } {
  const totals = getTotalStats(player);
  let effectiveCrit = totals.critRate;
  if (activeEvent?.id === 'shadow_veil') {
    effectiveCrit = Math.min(1.0, effectiveCrit + 0.20);
  }

  const isCrit = Math.random() < effectiveCrit;
  const mLevel = monster.level || 1;
  const levelDiff = player.stats.level - mLevel;
  const levelScale = Math.max(0.6, Math.min(1.4, 1 + levelDiff * 0.06));
  const effectiveDef = Math.floor(monster.defense * 0.5 + mLevel * 0.65);

  const baseDmg = Math.max(1, Math.round((totals.attack - effectiveDef) * levelScale));
  const variance = Math.floor(Math.random() * 4) - 1; // -1 to +2
  let finalDmg = Math.max(1, baseDmg + variance);

  if (activeEvent?.id === 'gravity_shift') {
    finalDmg = Math.floor(finalDmg * 1.25);
  }

  if (isCrit) {
    finalDmg = Math.floor(finalDmg * 1.85);
  }

  if (player.unlockedSkills.includes('striker_executioner') && monster.hp <= monster.maxHp * 0.35) {
    finalDmg *= 2;
  }

  return { damage: Math.max(1, finalDmg), isCrit };
}

export function getFovRadius(dungeon: DungeonState): number {
  return dungeon.activeEvent?.id === 'shadow_veil' ? 5 : 7;
}

export function getEffectiveSkillEnergyCost(baseCost: number, activeEvent?: EnvironmentalEvent | null): number {
  if (activeEvent?.id === 'gravity_shift') {
    return Math.max(1, Math.floor(baseCost * 0.7));
  }
  return baseCost;
}

export function computeSkillDamage(
  player: Player,
  monster: Monster,
  powerMultiplier: number,
  activeEvent?: EnvironmentalEvent | null
): number {
  const pTotals = getTotalStats(player);
  const mLevel = monster.level || 1;
  const levelDiff = player.stats.level - mLevel;
  // Damage explicitly scales against target enemy level & armor
  const levelScale = Math.max(0.55, Math.min(1.45, 1 + levelDiff * 0.06));
  const levelMitigation = Math.floor(monster.defense * 0.35 + mLevel * 0.55);

  let dmg = Math.floor((pTotals.attack * powerMultiplier - levelMitigation) * levelScale);

  if (activeEvent?.id === 'gravity_shift') {
    dmg = Math.floor(dmg * 1.25);
  }

  if (player.unlockedSkills.includes('striker_executioner') && monster.hp <= monster.maxHp * 0.35) {
    dmg *= 2;
  }

  return Math.max(1, dmg);
}

export function awardXP(player: Player, xpGain: number, logs: CombatLogEntry[], turn: number): boolean {
  player.stats.exp += xpGain;
  let leveledUp = false;

  while (player.stats.exp >= player.stats.expToNext) {
    player.stats.exp -= player.stats.expToNext;
    player.stats.level += 1;
    player.stats.expToNext = Math.floor(player.stats.expToNext * 1.45);
    player.stats.skillPoints += 1;
    leveledUp = true;

    player.stats.maxHp += 14;
    player.stats.hp = player.stats.maxHp;
    player.stats.maxEnergy += 8;
    player.stats.energy = player.stats.maxEnergy;
    player.stats.attack += 3;
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
  const newPlayer: Player = {
    ...player,
    stats: { ...player.stats },
    buffs: { ...player.buffs },
    activeCooldowns: { ...player.activeCooldowns },
    equipment: { ...player.equipment },
    inventory: [...player.inventory]
  };
  const newDungeon: DungeonState = {
    ...dungeon,
    monsters: dungeon.monsters.map(m => ({ ...m })),
    tiles: dungeon.tiles.map(row => row.map(t => ({ ...t }))),
    groundCoins: dungeon.groundCoins ? dungeon.groundCoins.map(c => ({ ...c })) : [],
    checkpoints: dungeon.checkpoints ? dungeon.checkpoints.map(cp => ({ ...cp })) : [],
    deathDrops: dungeon.deathDrops
      ? dungeon.deathDrops.map(d => ({ ...d, items: [...d.items], equipment: { ...d.equipment } }))
      : []
  };

  const logs: CombatLogEntry[] = [];
  const soundEvents: ActionResult['soundEvents'] = [];
  const floatingTexts: ActionResult['floatingTexts'] = [];
  const attackEffects: AttackEffect[] = [];
  let screenShake = 0;
  let hitstopSeconds = 0;
  let gameOver = false;
  let floorCompleted = false;
  let openShop = false;
  let checkpointTriggered = false;

  if (dx === 1) newPlayer.facing = 'right';
  else if (dx === -1) newPlayer.facing = 'left';
  else if (dy === 1) newPlayer.facing = 'down';
  else if (dy === -1) newPlayer.facing = 'up';

  const targetX = newPlayer.x + dx;
  const targetY = newPlayer.y + dy;

  if (targetX < 0 || targetX >= dungeon.width || targetY < 0 || targetY >= dungeon.height) {
    return {
      player,
      dungeon,
      logs,
      soundEvents,
      gameOver,
      floorCompleted,
      screenShake,
      hitstopSeconds,
      attackEffects,
      floatingTexts
    };
  }

  const targetMonsterIndex = newDungeon.monsters.findIndex(m => m.x === targetX && m.y === targetY);

  if (targetMonsterIndex !== -1) {
    const targetMonster = newDungeon.monsters[targetMonsterIndex];
    const { damage, isCrit } = calculatePlayerDamage(newPlayer, targetMonster, newDungeon.activeEvent);
    targetMonster.hp -= damage;
    targetMonster.alerted = true;
    const killed = targetMonster.hp <= 0;

    hitstopSeconds = calculateHitstopSeconds(damage, targetMonster.maxHp, isCrit, false, killed);
    attackEffects.push({
      type: isCrit ? 'crit_slash' : 'slash',
      x: newPlayer.x,
      y: newPlayer.y,
      targetX,
      targetY,
      color: isCrit ? '#ffe600' : '#00f0ff',
      radius: isCrit ? 1.4 : 1.0
    });

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
      screenShake += 0.12;
      logs.unshift({
        id: `log_${Date.now()}_2`,
        text: `You hit ${targetMonster.name} for ${damage} damage.`,
        type: 'player_attack',
        turn
      });
    }

    if (killed) {
      newDungeon.monsters.splice(targetMonsterIndex, 1);
      const shardMultiplier = newDungeon.activeEvent?.id === 'glitch_storm' ? 1.6 : 1.0;
      const shardsGained = Math.floor(targetMonster.shardReward * shardMultiplier);
      newPlayer.stats.soulShards += shardsGained;
      dropCoinsAround(
        newDungeon,
        targetX,
        targetY,
        newDungeon.floor,
        targetMonster.archetype === 'core_synthesizer'
      );
      soundEvents.push('kill');
      screenShake += 0.35;

      logs.unshift({
        id: `log_${Date.now()}_3`,
        text: `${targetMonster.name} disintegrated! +${targetMonster.expReward} EXP, +${shardsGained} Soul Shards, coins dropped!`,
        type: 'defeat',
        turn
      });

      const leveled = awardXP(newPlayer, targetMonster.expReward, logs, turn);
      if (leveled) soundEvents.push('level_up');
    }
  } else {
    const targetTile = newDungeon.tiles[targetY][targetX];

    if (!targetTile.walkable) {
      soundEvents.push('blocked');
      return {
        player,
        dungeon,
        logs,
        soundEvents,
        gameOver,
        floorCompleted,
        screenShake,
        hitstopSeconds,
        attackEffects,
        floatingTexts
      };
    }

    newPlayer.x = targetX;
    newPlayer.y = targetY;
    if (dx !== 0 || dy !== 0) {
      soundEvents.push('step');
    }

    // Collect Ground Coins if present on tile
    const coinsAtTile = newDungeon.groundCoins.filter(c => c.x === targetX && c.y === targetY);
    if (coinsAtTile.length > 0) {
      const gainedCoins = coinsAtTile.reduce((sum, c) => sum + c.value, 0);
      newPlayer.stats.coins += gainedCoins;
      newDungeon.groundCoins = newDungeon.groundCoins.filter(c => !(c.x === targetX && c.y === targetY));
      soundEvents.push('coin');
      floatingTexts.push({
        text: `+${gainedCoins} 🪙`,
        x: targetX,
        y: targetY,
        color: '#fbbf24'
      });
      logs.unshift({
        id: `log_${Date.now()}_coins`,
        text: `Picked up ${gainedCoins} Cyber-Coins!`,
        type: 'item',
        turn
      });
    }

    // Collect Floating Skull / Death Drop Bag if present on tile
    const recovered = collectDeathDropBagsAt(newPlayer, newDungeon, 'solo');
    if (recovered.recoveredBags > 0) {
      soundEvents.push('chest');
      floatingTexts.push({
        text: `☠️ GEAR RECOVERED!`,
        x: targetX,
        y: targetY,
        color: '#ffe600',
        isCrit: true
      });
      logs.unshift({
        id: `log_${Date.now()}_skull_rec`,
        text: `☠️ RECOVERED DEATH CACHE: Restored ${recovered.totalItems} items, ${recovered.totalCoins} coins, and ${recovered.totalStones} stones!`,
        type: 'level_up',
        turn
      });
    }

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
      return {
        player: newPlayer,
        dungeon: newDungeon,
        logs,
        soundEvents,
        gameOver,
        floorCompleted,
        screenShake,
        hitstopSeconds,
        attackEffects,
        floatingTexts
      };
    }

    // Check Checkpoint Tile
    if (targetTile.type === 'checkpoint') {
      checkpointTriggered = true;
      const wasActive = !!targetTile.checkpointActivated;
      targetTile.checkpointActivated = true;
      const cp = newDungeon.checkpoints.find(c => c.x === targetX && c.y === targetY);
      if (cp) cp.activated = true;
      newPlayer.lastCheckpoint = { floor: newDungeon.floor, x: targetX, y: targetY };

      const totals = getTotalStats(newPlayer);
      if (!wasActive) {
        const healAmt = Math.max(10, Math.floor(totals.maxHp * 0.2));
        newPlayer.stats.hp = Math.min(totals.maxHp, newPlayer.stats.hp + healAmt);
        soundEvents.push('checkpoint');
      } else {
        soundEvents.push('pickup');
      }

      floatingTexts.push({
        text: 'CHECKPOINT SAVED!',
        x: targetX,
        y: targetY,
        color: '#10b981'
      });
      logs.unshift({
        id: `log_${Date.now()}_cp`,
        text: `NEURAL CHECKPOINT SYNCHRONIZED at Floor ${newDungeon.floor} (${targetX}, ${targetY}).`,
        type: 'info',
        turn
      });
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
      const totals = getTotalStats(newPlayer);
      const healAmt = Math.floor(totals.maxHp * 0.5);
      newPlayer.stats.hp = Math.min(totals.maxHp, newPlayer.stats.hp + healAmt);
      newPlayer.stats.energy = totals.maxEnergy;
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
      hitstopSeconds = Math.max(hitstopSeconds, 0.06);
      logs.unshift({
        id: `log_${Date.now()}_trap`,
        text: `TRAP TRIGGERED! Glitch wire discharges for ${trapDmg} electrical damage!`,
        type: 'enemy_attack',
        turn
      });
      floatingTexts.push({ text: `-${trapDmg}`, x: targetX, y: targetY, color: '#ff0055' });

      if (newPlayer.stats.hp <= 0) {
        newPlayer.stats.hp = 0;
        gameOver = true;
        soundEvents.push('death');
        const droppedBag = dropPlayerLoadoutOnDeath(newPlayer, newDungeon, 'solo', 'Operative', turn);
        if (droppedBag) {
          logs.unshift({
            id: `log_${Date.now()}_drop`,
            text: `☠️ DEATH DROP: Equipment, inventory & ${droppedBag.coins} coins dropped at (${droppedBag.x}, ${droppedBag.y})!`,
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
          hitstopSeconds,
          attackEffects,
          floatingTexts,
          openShop,
          checkpointTriggered,
          deathDropCreated: !!droppedBag
        };
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

  // Energy natural regeneration
  const baseEnergyRegen = newPlayer.characterClass === 'technomancer' ? 3 : 1;
  const empBonus = newDungeon.activeEvent?.id === 'emp_surge' ? 3 : 0;
  const energyRegen = baseEnergyRegen + empBonus;
  const totals = getTotalStats(newPlayer);
  newPlayer.stats.energy = Math.min(totals.maxEnergy, newPlayer.stats.energy + energyRegen);

  // Environmental Hazard turn effect
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

  let deathDropCreated = false;
  if (newPlayer.stats.hp <= 0) {
    newPlayer.stats.hp = 0;
    gameOver = true;
    soundEvents.push('death');
    const droppedBag = dropPlayerLoadoutOnDeath(newPlayer, newDungeon, 'solo', 'Operative', turn);
    deathDropCreated = !!droppedBag;
    logs.unshift({
      id: `log_${Date.now()}_gameover`,
      text: droppedBag
        ? `FATAL ERROR: Flatlined! All equipment, backpack & ${droppedBag.coins} coins dropped at (${droppedBag.x}, ${droppedBag.y}).`
        : `FATAL ERROR: Operative biometric feed flatlined.`,
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
    hitstopSeconds,
    attackEffects,
    floatingTexts,
    openShop,
    checkpointTriggered,
    deathDropCreated
  };
}

export function resolveRangedAttack(
  player: Player,
  dungeon: DungeonState,
  targetX: number | undefined,
  targetY: number | undefined,
  turn: number
): ActionResult {
  const maxRange = getPlayerAttackRange(player);
  let targetIdx = -1;

  if (typeof targetX === 'number' && typeof targetY === 'number') {
    targetIdx = dungeon.monsters.findIndex(m => m.x === targetX && m.y === targetY);
  } else {
    // Auto-select nearest visible enemy within weapon range (1..5 tiles) in line of sight
    let bestScore = Infinity;
    dungeon.monsters.forEach((m, idx) => {
      const dist = Math.max(Math.abs(m.x - player.x), Math.abs(m.y - player.y));
      if (dist >= 1 && dist <= maxRange && hasLineOfSight(dungeon, player.x, player.y, m.x, m.y)) {
        const alignBonus =
          (player.facing === 'right' && m.x > player.x) ||
          (player.facing === 'left' && m.x < player.x) ||
          (player.facing === 'down' && m.y > player.y) ||
          (player.facing === 'up' && m.y < player.y)
            ? -0.5
            : 0;
        const score = dist + alignBonus;
        if (score < bestScore) {
          bestScore = score;
          targetIdx = idx;
        }
      }
    });
  }

  if (targetIdx === -1) {
    return {
      player,
      dungeon,
      logs: [{ id: `rng_none_${Date.now()}`, text: `No hostile target in ranged weapon reach (${maxRange} tiles).`, type: 'info', turn }],
      soundEvents: [],
      gameOver: false,
      floorCompleted: false,
      screenShake: 0,
      hitstopSeconds: 0,
      attackEffects: [],
      floatingTexts: []
    };
  }

  const candidate = dungeon.monsters[targetIdx];
  const dist = Math.max(Math.abs(candidate.x - player.x), Math.abs(candidate.y - player.y));
  if (dist < 1 || dist > maxRange || !hasLineOfSight(dungeon, player.x, player.y, candidate.x, candidate.y)) {
    return {
      player,
      dungeon,
      logs: [{ id: `rng_los_${Date.now()}`, text: `Target out of range (${dist}/${maxRange} tiles) or blocked by wall!`, type: 'info', turn }],
      soundEvents: [],
      gameOver: false,
      floorCompleted: false,
      screenShake: 0,
      hitstopSeconds: 0,
      attackEffects: [],
      floatingTexts: []
    };
  }

  const newPlayer: Player = {
    ...player,
    stats: { ...player.stats },
    buffs: { ...player.buffs },
    activeCooldowns: { ...player.activeCooldowns },
    equipment: { ...player.equipment },
    inventory: [...player.inventory]
  };
  const newDungeon: DungeonState = {
    ...dungeon,
    monsters: dungeon.monsters.map(m => ({ ...m })),
    tiles: dungeon.tiles.map(row => row.map(t => ({ ...t }))),
    groundCoins: dungeon.groundCoins ? dungeon.groundCoins.map(c => ({ ...c })) : [],
    checkpoints: dungeon.checkpoints ? dungeon.checkpoints.map(cp => ({ ...cp })) : [],
    deathDrops: dungeon.deathDrops
      ? dungeon.deathDrops.map(d => ({ ...d, items: [...d.items], equipment: { ...d.equipment } }))
      : []
  };

  const dx = candidate.x - newPlayer.x;
  const dy = candidate.y - newPlayer.y;
  if (Math.abs(dx) >= Math.abs(dy)) newPlayer.facing = dx >= 0 ? 'right' : 'left';
  else newPlayer.facing = dy >= 0 ? 'down' : 'up';

  const targetMonster = newDungeon.monsters[targetIdx];
  const { damage, isCrit } = calculatePlayerDamage(newPlayer, targetMonster, newDungeon.activeEvent);
  targetMonster.hp -= damage;
  targetMonster.alerted = true;
  const killed = targetMonster.hp <= 0;

  const logs: CombatLogEntry[] = [];
  const soundEvents: ActionResult['soundEvents'] = [];
  const floatingTexts: ActionResult['floatingTexts'] = [];
  const attackEffects: AttackEffect[] = [];

  const hitstopSeconds = calculateHitstopSeconds(damage, targetMonster.maxHp, isCrit, false, killed);
  const vfxColor =
    newPlayer.characterClass === 'technomancer'
      ? '#bd00ff'
      : isCrit
      ? '#ffe600'
      : '#00f0ff';

  attackEffects.push({
    type: dist <= 1 ? (isCrit ? 'crit_slash' : 'slash') : 'beam',
    x: newPlayer.x,
    y: newPlayer.y,
    targetX: targetMonster.x,
    targetY: targetMonster.y,
    color: vfxColor,
    radius: isCrit ? 1.5 : 1.0
  });

  floatingTexts.push({
    text: isCrit ? `CRIT! -${damage}` : `-${damage}`,
    x: targetMonster.x,
    y: targetMonster.y,
    color: isCrit ? '#ffe600' : vfxColor,
    isCrit
  });

  if (dist > 1) {
    soundEvents.push('ranged_shot');
  }
  soundEvents.push(isCrit ? 'crit' : 'hit');
  let screenShake = isCrit ? 0.25 : 0.14;

  logs.unshift({
    id: `rng_atk_${Date.now()}`,
    text: `RANGED STRIKE (${dist}t): Hit Lv.${targetMonster.level} ${targetMonster.name} for ${damage} damage${isCrit ? ' (CRIT!)' : ''}!`,
    type: isCrit ? 'critical' : 'player_attack',
    turn
  });

  if (killed) {
    newDungeon.monsters.splice(targetIdx, 1);
    const shardMultiplier = newDungeon.activeEvent?.id === 'glitch_storm' ? 1.6 : 1.0;
    const shardsGained = Math.floor(targetMonster.shardReward * shardMultiplier);
    newPlayer.stats.soulShards += shardsGained;
    dropCoinsAround(
      newDungeon,
      targetMonster.x,
      targetMonster.y,
      newDungeon.floor,
      targetMonster.archetype === 'core_synthesizer'
    );
    soundEvents.push('kill');
    screenShake += 0.3;
    const leveled = awardXP(newPlayer, targetMonster.expReward, logs, turn);
    if (leveled) soundEvents.push('level_up');
  }

  // Turn bookkeeping
  if (newPlayer.buffs.overclockTurns > 0) newPlayer.buffs.overclockTurns--;
  for (const sid in newPlayer.activeCooldowns) {
    if (newPlayer.activeCooldowns[sid] > 0) newPlayer.activeCooldowns[sid]--;
  }
  const baseEnergyRegen = newPlayer.characterClass === 'technomancer' ? 3 : 1;
  const empBonus = newDungeon.activeEvent?.id === 'emp_surge' ? 3 : 0;
  const totals = getTotalStats(newPlayer);
  newPlayer.stats.energy = Math.min(totals.maxEnergy, newPlayer.stats.energy + baseEnergyRegen + empBonus);

  resolveMonsterTurns(newPlayer, newDungeon, logs, soundEvents, floatingTexts, turn);

  const gameOver = newPlayer.stats.hp <= 0;
  let deathDropCreated = false;
  if (gameOver) {
    newPlayer.stats.hp = 0;
    soundEvents.push('death');
    const droppedBag = dropPlayerLoadoutOnDeath(newPlayer, newDungeon, 'solo', 'Operative', turn);
    deathDropCreated = !!droppedBag;
    if (droppedBag) {
      logs.unshift({
        id: `log_${Date.now()}_rng_drop`,
        text: `☠️ DEATH DROP: Equipment, backpack & ${droppedBag.coins} coins dropped at (${droppedBag.x}, ${droppedBag.y})!`,
        type: 'defeat',
        turn
      });
    }
  }

  return {
    player: newPlayer,
    dungeon: newDungeon,
    logs,
    soundEvents,
    gameOver,
    floorCompleted: false,
    screenShake,
    hitstopSeconds,
    attackEffects,
    floatingTexts,
    deathDropCreated
  };
}

export function resolveMonsterTurns(
  player: Player,
  dungeon: DungeonState,
  logs: CombatLogEntry[],
  soundEvents: ActionResult['soundEvents'],
  floatingTexts: ActionResult['floatingTexts'],
  turn: number,
  allPlayers?: Player[]
) {
  const envDmgMult = dungeon.activeEvent?.id === 'emp_surge' ? 1.15 : 1.0;
  const targets = allPlayers && allPlayers.length > 0 ? allPlayers.filter(p => p.stats.hp > 0) : [player];
  if (targets.length === 0) return;

  // Apply over-time Regeneration ticks on living players
  for (const p of targets) {
    if (p.buffs.regenTurns > 0) {
      const pTotals = getTotalStats(p);
      const hpTick = p.buffs.regenHpPerTurn || 0;
      const nrgTick = p.buffs.regenEnergyPerTurn || 0;
      if (hpTick > 0) {
        p.stats.hp = Math.min(pTotals.maxHp, p.stats.hp + hpTick);
        floatingTexts.push({ text: `+${hpTick} HP`, x: p.x, y: p.y, color: '#34d399' });
      }
      if (nrgTick > 0) {
        p.stats.energy = Math.min(pTotals.maxEnergy, p.stats.energy + nrgTick);
      }
      p.buffs.regenTurns--;
      if (p.buffs.regenTurns === 0) {
        p.buffs.regenHpPerTurn = 0;
        p.buffs.regenEnergyPerTurn = 0;
      }
    }
  }

  // Apply Igneous Burn DoT ticks on burning monsters before they act
  const shardMultiplier = dungeon.activeEvent?.id === 'glitch_storm' ? 1.6 : 1.0;
  for (let i = dungeon.monsters.length - 1; i >= 0; i--) {
    const m = dungeon.monsters[i];
    if (m.burnTurns && m.burnTurns > 0) {
      const burnDmg = Math.max(1, m.burnDamage || 10);
      m.hp -= burnDmg;
      m.burnTurns--;
      floatingTexts.push({ text: `🔥 -${burnDmg}`, x: m.x, y: m.y, color: '#f97316' });
      if (m.hp <= 0) {
        dungeon.monsters.splice(i, 1);
        player.stats.soulShards += Math.floor(m.shardReward * shardMultiplier);
        dropCoinsAround(dungeon, m.x, m.y, dungeon.floor, m.archetype === 'core_synthesizer');
        soundEvents.push('kill');
        const leveled = awardXP(player, m.expReward, logs, turn);
        if (leveled) soundEvents.push('level_up');
        logs.unshift({
          id: `log_burn_kill_${Date.now()}_${m.id}`,
          text: `🔥 ${m.name} burned to ashes! +${m.expReward} EXP`,
          type: 'defeat',
          turn
        });
      }
    }
  }

  for (const monster of dungeon.monsters) {
    // Pick nearest living player
    let targetPlayer = targets[0];
    let minDist = Math.abs(monster.x - targetPlayer.x) + Math.abs(monster.y - targetPlayer.y);
    for (let i = 1; i < targets.length; i++) {
      const d = Math.abs(monster.x - targets[i].x) + Math.abs(monster.y - targets[i].y);
      if (d < minDist) {
        minDist = d;
        targetPlayer = targets[i];
      }
    }

    const pTotals = getTotalStats(targetPlayer);
    const dist = minDist;
    const isVisibleToPlayer = !!dungeon.tiles[monster.y]?.[monster.x]?.visible;

    if (!monster.alerted && (isVisibleToPlayer || dist <= 4)) {
      monster.alerted = true;
      soundEvents.push('monster_alert');
    }
    if (!monster.alerted) continue;

    if (monster.archetype === 'cyber_behemoth') {
      const inLineX = monster.x === targetPlayer.x;
      const inLineY = monster.y === targetPlayer.y;

      if (!monster.windupTurn && (inLineX || inLineY) && dist <= 4) {
        monster.windupTurn = true;
        monster.telegraphDirection = {
          dx: Math.sign(targetPlayer.x - monster.x),
          dy: Math.sign(targetPlayer.y - monster.y)
        };
        soundEvents.push('monster_windup');
        logs.unshift({
          id: `log_${Date.now()}_behemoth_windup_${monster.id}`,
          text: `WARNING: ${monster.name} coils pneumatic thrusters for a devastating heavy smash!`,
          type: 'info',
          turn
        });
        continue;
      }

      if (monster.windupTurn) {
        monster.windupTurn = false;
        if (dist <= 2) {
          const baseRaw = Math.max(2, monster.attack * 2 - Math.floor(pTotals.defense * 0.7));
          const rawDmg = Math.max(2, Math.floor(baseRaw * envDmgMult));
          soundEvents.push('monster_attack_behemoth');
          applyMonsterDamageToPlayer(targetPlayer, rawDmg, monster.name, logs, soundEvents, floatingTexts, turn);
          continue;
        }
      }
    }

    const monsterAttackSound: SoundEventType =
      monster.archetype === 'core_synthesizer'
        ? 'monster_attack_boss'
        : monster.archetype === 'cyber_behemoth'
        ? 'monster_attack_behemoth'
        : monster.archetype === 'neon_stalker'
        ? 'monster_attack_stalker'
        : monster.archetype === 'circuit_disruptor'
        ? 'monster_attack_disruptor'
        : 'monster_attack_swarmer';

    if (dist === 1) {
      const baseRaw = Math.max(1, monster.attack - Math.floor(pTotals.defense * 0.6));
      const rawDmg = Math.max(1, Math.floor(baseRaw * envDmgMult));
      soundEvents.push(monsterAttackSound);
      applyMonsterDamageToPlayer(targetPlayer, rawDmg, monster.name, logs, soundEvents, floatingTexts, turn);
    } else if (monster.archetype === 'neon_stalker' && dist <= 4 && dist >= 2) {
      const baseRanged = Math.max(1, monster.attack - 2 - Math.floor(pTotals.defense * 0.5));
      const rangedDmg = Math.max(1, Math.floor(baseRanged * envDmgMult));
      soundEvents.push('monster_attack_stalker');
      logs.unshift({
        id: `log_${Date.now()}_ranged_${monster.id}`,
        text: `${monster.name} fires a pinpoint laser beam! -${rangedDmg} HP`,
        type: 'enemy_attack',
        turn
      });
      applyMonsterDamageToPlayer(targetPlayer, rangedDmg, monster.name, logs, soundEvents, floatingTexts, turn);
    } else if (monster.archetype === 'circuit_disruptor' && dist <= 3) {
      targetPlayer.stats.energy = Math.max(0, targetPlayer.stats.energy - 8);
      const baseZap = Math.max(1, Math.floor(monster.attack * 0.6));
      const zapDmg = Math.max(1, Math.floor(baseZap * envDmgMult));
      soundEvents.push('monster_attack_disruptor');
      applyMonsterDamageToPlayer(targetPlayer, zapDmg, `${monster.name} (EMP Arc)`, logs, soundEvents, floatingTexts, turn);
    } else {
      const stepX = Math.sign(targetPlayer.x - monster.x);
      const stepY = Math.sign(targetPlayer.y - monster.y);

      let nextX = monster.x + stepX;
      let nextY = monster.y;

      if (!canMonsterMoveTo(nextX, nextY, dungeon, targets)) {
        nextX = monster.x;
        nextY = monster.y + stepY;
      }

      if (canMonsterMoveTo(nextX, nextY, dungeon, targets)) {
        monster.x = nextX;
        monster.y = nextY;
      }
    }
  }
}

function canMonsterMoveTo(x: number, y: number, dungeon: DungeonState, players: Player[]): boolean {
  if (x < 0 || x >= dungeon.width || y < 0 || y >= dungeon.height) return false;
  if (!dungeon.tiles[y][x].walkable) return false;
  if (players.some(p => p.x === x && p.y === y)) return false;
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

  if (player.unlockedSkills.includes('vanguard_immortal')) {
    effectiveDmg = Math.max(1, Math.floor(effectiveDmg * 0.75));
  }

  if (player.buffs.shieldAmount > 0) {
    if (player.buffs.shieldAmount >= effectiveDmg) {
      player.buffs.shieldAmount -= effectiveDmg;
      logs.unshift({
        id: `log_${Date.now()}_shield_${Math.random()}`,
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
    id: `log_${Date.now()}_hurt_${Math.random()}`,
    text: `${sourceName} strikes you for ${effectiveDmg} physical damage.`,
    type: 'enemy_attack',
    turn
  });
}

// Active skill execution supporting all 15 skill trees
export function executeSkill(
  player: Player,
  dungeon: DungeonState,
  skillId: string,
  turn: number
): ActionResult {
  const skill = SKILL_DATABASE[skillId];
  if (!skill) {
    return {
      player,
      dungeon,
      logs: [],
      soundEvents: [],
      gameOver: false,
      floorCompleted: false,
      screenShake: 0,
      hitstopSeconds: 0,
      attackEffects: [],
      floatingTexts: []
    };
  }

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
      hitstopSeconds: 0,
      attackEffects: [],
      floatingTexts: []
    };
  }

  const energyCost = getEffectiveSkillEnergyCost(skill.energyCost || 15, dungeon.activeEvent);
  if (player.stats.energy < energyCost) {
    return {
      player,
      dungeon,
      logs: [{ id: `mana_${Date.now()}`, text: `Insufficient energy for ${skill.name} (${energyCost} needed).`, type: 'info', turn }],
      soundEvents: [],
      gameOver: false,
      floorCompleted: false,
      screenShake: 0,
      hitstopSeconds: 0,
      attackEffects: [],
      floatingTexts: []
    };
  }

  const newPlayer: Player = {
    ...player,
    stats: { ...player.stats },
    buffs: { ...player.buffs },
    activeCooldowns: { ...player.activeCooldowns },
    equipment: { ...player.equipment },
    inventory: [...player.inventory]
  };
  const newDungeon: DungeonState = {
    ...dungeon,
    monsters: dungeon.monsters.map(m => ({ ...m })),
    tiles: dungeon.tiles.map(row => row.map(t => ({ ...t }))),
    groundCoins: dungeon.groundCoins ? dungeon.groundCoins.map(c => ({ ...c })) : [],
    checkpoints: dungeon.checkpoints ? dungeon.checkpoints.map(cp => ({ ...cp })) : [],
    deathDrops: dungeon.deathDrops
      ? dungeon.deathDrops.map(d => ({ ...d, items: [...d.items], equipment: { ...d.equipment } }))
      : []
  };

  newPlayer.stats.energy -= energyCost;
  newPlayer.activeCooldowns[skillId] = skill.cooldown || 3;

  const actionType = skill.effect.actionType;
  const skillSound: SoundEventType =
    actionType === 'phase_dash' || actionType === 'shadow_strike'
      ? 'skill_dash'
      : actionType === 'chain_lightning' || actionType === 'plasma_beam' || actionType === 'orbital_strike'
      ? 'skill_lightning'
      : actionType === 'meteor_strike'
      ? 'skill_fire'
      : actionType === 'frost_nova'
      ? 'skill_frost'
      : actionType === 'nanite_heal' || actionType === 'vampiric_drain'
      ? 'skill_heal'
      : actionType === 'aegis_barrier' || actionType === 'fortify_stance' || actionType === 'glitch_overcharge'
      ? 'skill_shield'
      : 'skill_aoe';

  const logs: CombatLogEntry[] = [];
  const soundEvents: ActionResult['soundEvents'] = [skillSound];
  const floatingTexts: ActionResult['floatingTexts'] = [];
  const attackEffects: AttackEffect[] = [];
  let screenShake = 0.25;
  let hitstopSeconds = 0.08;
  let skillKills = 0;

  const pTotals = getTotalStats(newPlayer);
  const shardMultiplier = newDungeon.activeEvent?.id === 'glitch_storm' ? 1.6 : 1.0;

  const handleMonsterKillFromSkill = (m: Monster, idx: number) => {
    newDungeon.monsters.splice(idx, 1);
    const shards = Math.floor(m.shardReward * shardMultiplier);
    newPlayer.stats.soulShards += shards;
    dropCoinsAround(newDungeon, m.x, m.y, newDungeon.floor, m.archetype === 'core_synthesizer');
    soundEvents.push('kill');
    skillKills++;
    const leveled = awardXP(newPlayer, m.expReward, logs, turn);
    if (leveled) soundEvents.push('level_up');
  };

  if (actionType === 'phase_dash') {
    let dx = 0;
    let dy = 0;
    if (newPlayer.facing === 'left') dx = -1;
    if (newPlayer.facing === 'right') dx = 1;
    if (newPlayer.facing === 'up') dy = -1;
    if (newPlayer.facing === 'down') dy = 1;

    const originX = newPlayer.x;
    const originY = newPlayer.y;
    for (let step = 1; step <= (skill.effect.range || 3); step++) {
      const stepX = newPlayer.x + dx;
      const stepY = newPlayer.y + dy;
      if (stepX < 0 || stepX >= dungeon.width || stepY < 0 || stepY >= dungeon.height) break;
      if (!newDungeon.tiles[stepY][stepX].walkable) break;
      newPlayer.x = stepX;
      newPlayer.y = stepY;

      const hitIdx = newDungeon.monsters.findIndex(m => m.x === stepX && m.y === stepY);
      if (hitIdx !== -1) {
        const hitMonster = newDungeon.monsters[hitIdx];
        const dmg = computeSkillDamage(newPlayer, hitMonster, skill.effect.power || 1.8, newDungeon.activeEvent);
        hitMonster.hp -= dmg;
        hitMonster.alerted = true;
        floatingTexts.push({ text: `PHASE -${dmg}`, x: stepX, y: stepY, color: '#00f0ff', isCrit: true });
        hitstopSeconds = Math.max(hitstopSeconds, calculateHitstopSeconds(dmg, hitMonster.maxHp, true, true, hitMonster.hp <= 0));
        if (hitMonster.hp <= 0) handleMonsterKillFromSkill(hitMonster, hitIdx);
      }
    }
    attackEffects.push({ type: 'beam', x: originX, y: originY, targetX: newPlayer.x, targetY: newPlayer.y, color: '#00f0ff' });
    logs.unshift({ id: `skill_${Date.now()}`, text: `PHASE DASH! Warped through spacetime, shredding intercepted targets!`, type: 'skill', turn });
  } else if (
    actionType === 'emp_blast' ||
    actionType === 'blade_tempest' ||
    actionType === 'whirlwind' ||
    actionType === 'earthshatter' ||
    actionType === 'frost_nova' ||
    actionType === 'arcane_cataclysm'
  ) {
    const range = skill.effect.range || 1;
    let hits = 0;
    const fxColor =
      actionType === 'earthshatter'
        ? '#f59e0b'
        : actionType === 'frost_nova'
        ? '#38bdf8'
        : actionType === 'arcane_cataclysm'
        ? '#ff00aa'
        : '#bd00ff';

    for (let i = newDungeon.monsters.length - 1; i >= 0; i--) {
      const m = newDungeon.monsters[i];
      const euclidDist = Math.hypot(m.x - newPlayer.x, m.y - newPlayer.y);
      if (euclidDist <= range + 0.35) {
        const dmg = computeSkillDamage(newPlayer, m, skill.effect.power || 2.0, newDungeon.activeEvent);
        m.hp -= dmg;
        m.alerted = true;
        hits++;
        const killed = m.hp <= 0;
        hitstopSeconds = Math.max(
          hitstopSeconds,
          calculateHitstopSeconds(dmg, m.maxHp, actionType === 'blade_tempest' || actionType === 'arcane_cataclysm', true, killed)
        );
        floatingTexts.push({
          text: `${skill.name.toUpperCase()} -${dmg}`,
          x: m.x,
          y: m.y,
          color: fxColor,
          isCrit: actionType === 'arcane_cataclysm'
        });
        if (range >= 4) {
          attackEffects.push({
            type: 'lightning',
            x: newPlayer.x,
            y: newPlayer.y,
            targetX: m.x,
            targetY: m.y,
            color: fxColor
          });
        }
        if (killed) handleMonsterKillFromSkill(m, i);
      }
    }
    if (actionType === 'frost_nova') {
      newPlayer.buffs.shieldAmount = Math.max(newPlayer.buffs.shieldAmount, 30);
    }
    attackEffects.push({
      type: skill.vfxType || 'emp_ring',
      x: newPlayer.x,
      y: newPlayer.y,
      color: fxColor,
      radius: range + 0.6
    });
    screenShake = range >= 6 ? 0.55 : 0.4;
    logs.unshift({
      id: `skill_${Date.now()}`,
      text: `${skill.name.toUpperCase()} (${range}t AoE) unleashed! Struck ${hits} hostiles in radius!`,
      type: 'skill',
      turn
    });
  } else if (actionType === 'aegis_barrier' || actionType === 'fortify_stance') {
    const shieldPower = skill.effect.power || 40;
    newPlayer.buffs.shieldAmount = Math.max(newPlayer.buffs.shieldAmount, shieldPower);
    if (actionType === 'fortify_stance') {
      newPlayer.buffs.overclockTurns = Math.max(newPlayer.buffs.overclockTurns, 2);
    }
    hitstopSeconds = 0.05;
    attackEffects.push({ type: 'shield', x: newPlayer.x, y: newPlayer.y, color: '#ffe600', radius: 1.5 });
    floatingTexts.push({ text: `+${shieldPower} SHIELD`, x: newPlayer.x, y: newPlayer.y, color: '#ffe600' });
    logs.unshift({ id: `skill_${Date.now()}`, text: `${skill.name.toUpperCase()} activated: ${shieldPower} Kinetic Shield deployed!`, type: 'skill', turn });
  } else if (actionType === 'nanite_heal') {
    const healAmt = Math.floor(pTotals.maxHp * (skill.effect.power || 0.45));
    newPlayer.stats.hp = Math.min(pTotals.maxHp, newPlayer.stats.hp + healAmt);
    hitstopSeconds = 0.04;
    attackEffects.push({ type: 'heal', x: newPlayer.x, y: newPlayer.y, color: '#10b981', radius: 1.4 });
    floatingTexts.push({ text: `+${healAmt} HP`, x: newPlayer.x, y: newPlayer.y, color: '#10b981' });
    logs.unshift({ id: `skill_${Date.now()}`, text: `${skill.name.toUpperCase()}: Restored ${healAmt} HP to core systems!`, type: 'skill', turn });
  } else if (actionType === 'plasma_cleave') {
    let hits = 0;
    const targets: { x: number; y: number }[] = [];
    if (newPlayer.facing === 'right') {
      targets.push({ x: newPlayer.x + 1, y: newPlayer.y - 1 }, { x: newPlayer.x + 1, y: newPlayer.y }, { x: newPlayer.x + 1, y: newPlayer.y + 1 });
    } else if (newPlayer.facing === 'left') {
      targets.push({ x: newPlayer.x - 1, y: newPlayer.y - 1 }, { x: newPlayer.x - 1, y: newPlayer.y }, { x: newPlayer.x - 1, y: newPlayer.y + 1 });
    } else if (newPlayer.facing === 'up') {
      targets.push({ x: newPlayer.x - 1, y: newPlayer.y - 1 }, { x: newPlayer.x, y: newPlayer.y - 1 }, { x: newPlayer.x + 1, y: newPlayer.y - 1 });
    } else {
      targets.push({ x: newPlayer.x - 1, y: newPlayer.y + 1 }, { x: newPlayer.x, y: newPlayer.y + 1 }, { x: newPlayer.x + 1, y: newPlayer.y + 1 });
    }

    for (const target of targets) {
      for (let i = newDungeon.monsters.length - 1; i >= 0; i--) {
        const m = newDungeon.monsters[i];
        if (m.x === target.x && m.y === target.y) {
          const dmg = computeSkillDamage(newPlayer, m, skill.effect.power || 1.9, newDungeon.activeEvent);
          m.hp -= dmg;
          m.alerted = true;
          hits++;
          hitstopSeconds = Math.max(hitstopSeconds, calculateHitstopSeconds(dmg, m.maxHp, false, true, m.hp <= 0));
          floatingTexts.push({ text: `CLEAVE -${dmg}`, x: m.x, y: m.y, color: '#ffe600' });
          attackEffects.push({ type: 'slash', x: newPlayer.x, y: newPlayer.y, targetX: m.x, targetY: m.y, color: '#ffe600' });
          if (m.hp <= 0) handleMonsterKillFromSkill(m, i);
        }
      }
    }
    screenShake = 0.35;
    logs.unshift({ id: `skill_${Date.now()}`, text: `PLASMA CLEAVE! Swept a wide energy arc hitting ${hits} targets!`, type: 'skill', turn });
  } else if (actionType === 'glitch_overcharge') {
    newPlayer.buffs.overclockTurns = 4;
    hitstopSeconds = 0.06;
    attackEffects.push({ type: 'nova', x: newPlayer.x, y: newPlayer.y, color: '#ff007f', radius: 1.5 });
    floatingTexts.push({ text: `OVERCLOCK!`, x: newPlayer.x, y: newPlayer.y, color: '#ff007f' });
    logs.unshift({ id: `skill_${Date.now()}`, text: `ADRENALINE MATRIX ENGAGED: 100% Critical Hit rate active for 4 turns!`, type: 'skill', turn });
  } else if (actionType === 'plasma_beam') {
    let dx = 0;
    let dy = 0;
    if (newPlayer.facing === 'left') dx = -1;
    else if (newPlayer.facing === 'right') dx = 1;
    else if (newPlayer.facing === 'up') dy = -1;
    else dy = 1;

    let endX = newPlayer.x;
    let endY = newPlayer.y;
    const range = skill.effect.range || 6;
    for (let s = 1; s <= range; s++) {
      const tx = newPlayer.x + dx * s;
      const ty = newPlayer.y + dy * s;
      if (!newDungeon.tiles[ty]?.[tx]?.walkable) break;
      endX = tx;
      endY = ty;
      for (let i = newDungeon.monsters.length - 1; i >= 0; i--) {
        const m = newDungeon.monsters[i];
        if (m.x === tx && m.y === ty) {
          const dmg = computeSkillDamage(newPlayer, m, skill.effect.power || 2.1, newDungeon.activeEvent);
          m.hp -= dmg;
          m.alerted = true;
          hitstopSeconds = Math.max(hitstopSeconds, calculateHitstopSeconds(dmg, m.maxHp, true, true, m.hp <= 0));
          floatingTexts.push({ text: `BEAM -${dmg}`, x: m.x, y: m.y, color: '#00f0ff', isCrit: true });
          if (m.hp <= 0) handleMonsterKillFromSkill(m, i);
        }
      }
    }
    attackEffects.push({ type: 'beam', x: newPlayer.x, y: newPlayer.y, targetX: endX, targetY: endY, color: '#00f0ff' });
    logs.unshift({ id: `skill_${Date.now()}`, text: `RAIL-BEAM PIERCER fired across the corridor!`, type: 'skill', turn });
  } else if (actionType === 'shadow_strike' || actionType === 'orbital_strike' || actionType === 'meteor_strike') {
    const range = skill.effect.range || 5;
    const inRange = newDungeon.monsters.filter(m => Math.hypot(m.x - newPlayer.x, m.y - newPlayer.y) <= range + 0.35);
    if (inRange.length > 0) {
      // Pick strongest / nearest
      inRange.sort((a, b) =>
        actionType === 'orbital_strike'
          ? b.hp - a.hp
          : Math.hypot(a.x - newPlayer.x, a.y - newPlayer.y) - Math.hypot(b.x - newPlayer.x, b.y - newPlayer.y)
      );
      const primary = inRange[0];
      const px = primary.x;
      const py = primary.y;
      const splashRadius = actionType === 'meteor_strike' ? 3 : 0;

      for (let i = newDungeon.monsters.length - 1; i >= 0; i--) {
        const m = newDungeon.monsters[i];
        if (Math.hypot(m.x - px, m.y - py) <= splashRadius + 0.35) {
          const dmg = computeSkillDamage(newPlayer, m, skill.effect.power || 2.4, newDungeon.activeEvent);
          m.hp -= dmg;
          m.alerted = true;
          hitstopSeconds = Math.max(hitstopSeconds, calculateHitstopSeconds(dmg, m.maxHp, true, true, m.hp <= 0));
          floatingTexts.push({ text: `CRIT! -${dmg}`, x: m.x, y: m.y, color: '#ff007f', isCrit: true });
          if (m.hp <= 0) handleMonsterKillFromSkill(m, i);
        }
      }
      attackEffects.push({
        type: actionType === 'meteor_strike' ? 'meteor' : actionType === 'orbital_strike' ? 'beam' : 'crit_slash',
        x: newPlayer.x,
        y: newPlayer.y,
        targetX: px,
        targetY: py,
        color: actionType === 'meteor_strike' ? '#f97316' : '#ff007f',
        radius: actionType === 'meteor_strike' ? 3.2 : 1.8
      });
      screenShake = 0.45;
      logs.unshift({ id: `skill_${Date.now()}`, text: `${skill.name.toUpperCase()} locked on and obliterated target coordinates!`, type: 'skill', turn });
    } else {
      logs.unshift({ id: `skill_${Date.now()}`, text: `${skill.name}: No hostiles within sensor range (${range} tiles).`, type: 'info', turn });
    }
  } else if (actionType === 'chain_lightning') {
    const range = skill.effect.range || 7;
    const candidates = newDungeon.monsters
      .filter(m => Math.hypot(m.x - newPlayer.x, m.y - newPlayer.y) <= range + 0.35)
      .slice(0, 6);
    for (const target of candidates) {
      const idx = newDungeon.monsters.findIndex(m => m.id === target.id);
      if (idx === -1) continue;
      const m = newDungeon.monsters[idx];
      const dmg = computeSkillDamage(newPlayer, m, skill.effect.power || 2.1, newDungeon.activeEvent);
      m.hp -= dmg;
      m.alerted = true;
      hitstopSeconds = Math.max(hitstopSeconds, calculateHitstopSeconds(dmg, m.maxHp, false, true, m.hp <= 0));
      floatingTexts.push({ text: `ARC -${dmg}`, x: m.x, y: m.y, color: '#38bdf8' });
      attackEffects.push({ type: 'lightning', x: newPlayer.x, y: newPlayer.y, targetX: m.x, targetY: m.y, color: '#38bdf8' });
      if (m.hp <= 0) handleMonsterKillFromSkill(m, idx);
    }
    screenShake = 0.35;
    logs.unshift({ id: `skill_${Date.now()}`, text: `CHAIN LIGHTNING arced across ${candidates.length} targets!`, type: 'skill', turn });
  } else if (actionType === 'vampiric_drain') {
    let totalDrained = 0;
    for (let i = newDungeon.monsters.length - 1; i >= 0; i--) {
      const m = newDungeon.monsters[i];
      if (Math.abs(m.x - newPlayer.x) <= 1 && Math.abs(m.y - newPlayer.y) <= 1) {
        const dmg = computeSkillDamage(newPlayer, m, skill.effect.power || 1.7, newDungeon.activeEvent);
        m.hp -= dmg;
        m.alerted = true;
        totalDrained += Math.floor(dmg * 0.4);
        hitstopSeconds = Math.max(hitstopSeconds, calculateHitstopSeconds(dmg, m.maxHp, false, true, m.hp <= 0));
        floatingTexts.push({ text: `DRAIN -${dmg}`, x: m.x, y: m.y, color: '#fb7185' });
        if (m.hp <= 0) handleMonsterKillFromSkill(m, i);
      }
    }
    if (totalDrained > 0) {
      newPlayer.stats.hp = Math.min(pTotals.maxHp, newPlayer.stats.hp + totalDrained);
      floatingTexts.push({ text: `+${totalDrained} HP`, x: newPlayer.x, y: newPlayer.y, color: '#10b981' });
    }
    attackEffects.push({ type: 'heal', x: newPlayer.x, y: newPlayer.y, color: '#fb7185', radius: 1.4 });
    logs.unshift({ id: `skill_${Date.now()}`, text: `VAMPIRIC BYTE drained ${totalDrained} vitality!`, type: 'skill', turn });
  }

  // Synth Singularity passive: refund 30% energy on skill kill
  if (skillKills > 0 && newPlayer.unlockedSkills.includes('techno_singularity')) {
    const refund = Math.floor(energyCost * 0.3);
    newPlayer.stats.energy = Math.min(pTotals.maxEnergy, newPlayer.stats.energy + refund);
  }

  resolveMonsterTurns(newPlayer, newDungeon, logs, soundEvents, floatingTexts, turn);

  const gameOver = newPlayer.stats.hp <= 0;
  let deathDropCreated = false;
  if (gameOver) {
    newPlayer.stats.hp = 0;
    soundEvents.push('death');
    const droppedBag = dropPlayerLoadoutOnDeath(newPlayer, newDungeon, 'solo', 'Operative', turn);
    deathDropCreated = !!droppedBag;
    if (droppedBag) {
      logs.unshift({
        id: `log_${Date.now()}_sk_drop`,
        text: `☠️ DEATH DROP: Equipment, backpack & ${droppedBag.coins} coins dropped at (${droppedBag.x}, ${droppedBag.y})!`,
        type: 'defeat',
        turn
      });
    }
  }

  return {
    player: newPlayer,
    dungeon: newDungeon,
    logs,
    soundEvents,
    gameOver,
    floorCompleted: false,
    screenShake,
    hitstopSeconds,
    attackEffects,
    floatingTexts,
    deathDropCreated
  };
}

export function useConsumableItem(
  player: Player,
  dungeon: DungeonState,
  item: GameItem,
  turn: number
): ActionResult {
  const newPlayer: Player = {
    ...player,
    stats: { ...player.stats },
    buffs: { ...player.buffs },
    activeCooldowns: { ...player.activeCooldowns },
    equipment: { ...player.equipment },
    inventory: player.inventory.filter(i => i.id !== item.id)
  };
  const newDungeon: DungeonState = {
    ...dungeon,
    monsters: dungeon.monsters.map(m => ({ ...m })),
    tiles: dungeon.tiles.map(row => row.map(t => ({ ...t }))),
    groundCoins: dungeon.groundCoins ? dungeon.groundCoins.map(c => ({ ...c })) : [],
    checkpoints: dungeon.checkpoints ? dungeon.checkpoints.map(cp => ({ ...cp })) : [],
    deathDrops: dungeon.deathDrops
      ? dungeon.deathDrops.map(d => ({ ...d, items: [...d.items], equipment: { ...d.equipment } }))
      : []
  };

  const totals = getTotalStats(newPlayer);
  const logs: CombatLogEntry[] = [];
  const soundEvents: ActionResult['soundEvents'] = [];
  const floatingTexts: ActionResult['floatingTexts'] = [];
  const attackEffects: AttackEffect[] = [];
  let screenShake = 0;

  if (item.healAmount && item.healAmount > 0) {
    newPlayer.stats.hp = Math.min(totals.maxHp, newPlayer.stats.hp + item.healAmount);
    floatingTexts.push({ text: `+${item.healAmount} HP`, x: newPlayer.x, y: newPlayer.y, color: '#10b981' });
    attackEffects.push({ type: 'heal', x: newPlayer.x, y: newPlayer.y, color: '#10b981', radius: 1.4 });
    soundEvents.push('potion_heal');
  }

  if (item.energyAmount && item.energyAmount > 0) {
    newPlayer.stats.energy = Math.min(totals.maxEnergy, newPlayer.stats.energy + item.energyAmount);
    floatingTexts.push({ text: `+${item.energyAmount} NRG`, x: newPlayer.x, y: newPlayer.y, color: '#00f0ff' });
    soundEvents.push('potion_energy');
  }

  if (item.effectType === 'regen' && item.regenTurns) {
    newPlayer.buffs.regenTurns = Math.max(newPlayer.buffs.regenTurns, item.regenTurns);
    newPlayer.buffs.regenHpPerTurn = Math.max(newPlayer.buffs.regenHpPerTurn, item.regenHpPerTurn || 15);
    newPlayer.buffs.regenEnergyPerTurn = Math.max(newPlayer.buffs.regenEnergyPerTurn, item.regenEnergyPerTurn || 8);
    floatingTexts.push({ text: `REGEN ${item.regenTurns}T`, x: newPlayer.x, y: newPlayer.y, color: '#34d399' });
    attackEffects.push({ type: 'heal', x: newPlayer.x, y: newPlayer.y, color: '#34d399', radius: 1.8 });
    soundEvents.push('shrine');
    logs.unshift({
      id: `pot_regen_${Date.now()}`,
      text: `🌿 ${item.name}: Regenerating +${newPlayer.buffs.regenHpPerTurn} HP & +${newPlayer.buffs.regenEnergyPerTurn} NRG/turn for ${item.regenTurns} turns!`,
      type: 'item',
      turn
    });
  } else if (item.effectType === 'igneous') {
    const radius = item.burnRadius || 4;
    const burnTurns = item.burnTurns || 5;
    const baseBurnDmg = (item.burnDamage || 16) + Math.floor(newDungeon.floor * 2.5) + Math.floor(newPlayer.stats.level * 1.5);
    const initialBlast = Math.round(baseBurnDmg * 1.4);
    const shardMultiplier = newDungeon.activeEvent?.id === 'glitch_storm' ? 1.6 : 1.0;

    let hitCount = 0;
    for (let i = newDungeon.monsters.length - 1; i >= 0; i--) {
      const m = newDungeon.monsters[i];
      const dist = Math.hypot(m.x - newPlayer.x, m.y - newPlayer.y);
      if (dist <= radius + 0.35) {
        hitCount++;
        m.hp -= initialBlast;
        m.alerted = true;
        m.burnTurns = burnTurns;
        m.burnDamage = baseBurnDmg;
        floatingTexts.push({ text: `🔥 -${initialBlast}`, x: m.x, y: m.y, color: '#f97316', isCrit: true });
        if (m.hp <= 0) {
          newDungeon.monsters.splice(i, 1);
          newPlayer.stats.soulShards += Math.floor(m.shardReward * shardMultiplier);
          dropCoinsAround(newDungeon, m.x, m.y, newDungeon.floor, m.archetype === 'core_synthesizer');
          soundEvents.push('kill');
          const leveled = awardXP(newPlayer, m.expReward, logs, turn);
          if (leveled) soundEvents.push('level_up');
        }
      }
    }
    attackEffects.push({ type: 'nova', x: newPlayer.x, y: newPlayer.y, color: '#f97316', radius: radius + 0.4 });
    soundEvents.push('skill_fire');
    screenShake = 0.4;
    logs.unshift({
      id: `pot_fire_${Date.now()}`,
      text: `🔥 ${item.name}: Engulfed ${hitCount} enemies in ${radius}-tile fire blast (${baseBurnDmg} burn/turn × ${burnTurns}T)!`,
      type: 'skill',
      turn
    });
  } else if (item.effectType === 'shield') {
    const shieldAmt = item.shieldGrant || 75;
    newPlayer.buffs.shieldAmount += shieldAmt;
    floatingTexts.push({ text: `+${shieldAmt} SHIELD`, x: newPlayer.x, y: newPlayer.y, color: '#ffe600' });
    attackEffects.push({ type: 'shield', x: newPlayer.x, y: newPlayer.y, color: '#ffe600', radius: 1.6 });
    soundEvents.push('skill_shield');
    logs.unshift({ id: `pot_shd_${Date.now()}`, text: `🛡️ ${item.name}: +${shieldAmt} Kinetic Shield active!`, type: 'item', turn });
  } else if (item.effectType === 'cooldown_reset') {
    for (const sid in newPlayer.activeCooldowns) {
      newPlayer.activeCooldowns[sid] = 0;
    }
    floatingTexts.push({ text: 'CD RESET!', x: newPlayer.x, y: newPlayer.y, color: '#bd00ff' });
    attackEffects.push({ type: 'emp_ring', x: newPlayer.x, y: newPlayer.y, color: '#bd00ff', radius: 1.8 });
    soundEvents.push('skill_lightning');
    logs.unshift({ id: `pot_cd_${Date.now()}`, text: `🧬 ${item.name}: All skill cooldowns reset!`, type: 'item', turn });
  } else if (item.effectType === 'buff_overclock') {
    newPlayer.buffs.overclockTurns = Math.max(newPlayer.buffs.overclockTurns, 4);
    floatingTexts.push({ text: 'OVERCLOCK!', x: newPlayer.x, y: newPlayer.y, color: '#ff007f' });
    attackEffects.push({ type: 'nova', x: newPlayer.x, y: newPlayer.y, color: '#ff007f', radius: 1.5 });
    soundEvents.push('skill_shield');
    logs.unshift({ id: `pot_oc_${Date.now()}`, text: `⚡ ${item.name}: +10 ATK & 100% Crit for 4 turns!`, type: 'item', turn });
  } else if (item.effectType === 'teleport') {
    const candidates: { x: number; y: number }[] = [];
    for (let y = 0; y < newDungeon.height; y++) {
      for (let x = 0; x < newDungeon.width; x++) {
        const t = newDungeon.tiles[y]?.[x];
        if (
          t &&
          t.walkable &&
          !t.hazard &&
          !newDungeon.monsters.some(m => m.x === x && m.y === y) &&
          Math.hypot(x - newPlayer.x, y - newPlayer.y) >= 6
        ) {
          candidates.push({ x, y });
        }
      }
    }
    if (candidates.length > 0) {
      const dest = candidates[Math.floor(Math.random() * candidates.length)];
      newPlayer.x = dest.x;
      newPlayer.y = dest.y;
    }
    attackEffects.push({ type: 'emp_ring', x: newPlayer.x, y: newPlayer.y, color: '#00f0ff', radius: 1.8 });
    floatingTexts.push({ text: 'WARPED!', x: newPlayer.x, y: newPlayer.y, color: '#00f0ff' });
    soundEvents.push('teleport');
    logs.unshift({ id: `pot_tp_${Date.now()}`, text: `🌀 ${item.name}: Emergency quantum warp complete!`, type: 'info', turn });
  } else if (logs.length === 0) {
    logs.unshift({ id: `pot_use_${Date.now()}`, text: `Consumed [${item.name}].`, type: 'item', turn });
  }

  return {
    player: newPlayer,
    dungeon: newDungeon,
    logs,
    soundEvents,
    gameOver: false,
    floorCompleted: false,
    screenShake,
    hitstopSeconds: 0,
    attackEffects,
    floatingTexts
  };
}
