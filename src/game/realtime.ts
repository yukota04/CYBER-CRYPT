/**
 * Free-movement realtime simulation.
 * Entities use continuous (float) tile-space positions and a body size < 1 so they
 * can sit between tiles and occupy multiple cells at once.
 */
import {
  AttackEffect,
  CombatLogEntry,
  DungeonState,
  Monster,
  Player,
  Tile
} from './types';
import {
  applyMonsterDamageToPlayer,
  awardXP,
  calculateHitstopSeconds,
  calculatePlayerDamage,
  collectDeathDropBagsAt,
  dropCoinsAround,
  dropPlayerLoadoutOnDeath,
  getFovRadius,
  getTotalStats
} from './combat';
import { applyEnvironmentalTurnEffects } from './events';
import { SoundEventType } from './audio';
import { updateFOV } from './dungeon';

/** Footprint in tiles — < 1 so an entity can straddle two cells. */
export const ENTITY_BODY = 0.82;
/** Soft collision radius for entity-vs-entity (center-to-center). */
export const ENTITY_RADIUS = ENTITY_BODY * 0.5;

export const PLAYER_SPEED = 5.2; // tiles / second
export const PLAYER_MELEE_RANGE = 0.95;
export const PLAYER_ATTACK_COOLDOWN = 0.38;

/** Status / cooldown "turn" pulse while moving freely */
export const STATUS_TICK_INTERVAL = 0.55;

export interface MoveInput {
  dx: number;
  dy: number;
}

export interface RealtimeClock {
  playerAttackCd: number;
  monsterAttackCd: Record<string, number>;
  statusAcc: number;
  /** Prevent re-triggering one-shot tiles every frame */
  triggeredTiles: Set<string>;
}

export function createRealtimeClock(): RealtimeClock {
  return {
    playerAttackCd: 0,
    monsterAttackCd: {},
    statusAcc: 0,
    triggeredTiles: new Set()
  };
}

export interface RealtimeTickResult {
  player: Player;
  dungeon: DungeonState;
  logs: CombatLogEntry[];
  soundEvents: SoundEventType[];
  floatingTexts: { text: string; x: number; y: number; color: string; isCrit?: boolean }[];
  attackEffects: AttackEffect[];
  screenShake: number;
  hitstopSeconds: number;
  gameOver: boolean;
  floorCompleted: boolean;
  openShop: boolean;
  checkpointTriggered: boolean;
  deathDropCreated: boolean;
  kills: number;
  moved: boolean;
  statusTicks: number;
}

export function entityCenter(x: number, y: number): { cx: number; cy: number } {
  return { cx: x + ENTITY_BODY * 0.5, cy: y + ENTITY_BODY * 0.5 };
}

/** All grid cells overlapped by the entity AABB. */
export function occupiedTiles(x: number, y: number, body = ENTITY_BODY): Array<{ tx: number; ty: number }> {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.floor(x + body - 1e-4);
  const y1 = Math.floor(y + body - 1e-4);
  const out: Array<{ tx: number; ty: number }> = [];
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      out.push({ tx, ty });
    }
  }
  return out;
}

export function tileKey(tx: number, ty: number): string {
  return `${tx},${ty}`;
}

function isWalkableAt(dungeon: DungeonState, tx: number, ty: number): boolean {
  if (tx < 0 || ty < 0 || tx >= dungeon.width || ty >= dungeon.height) return false;
  return !!dungeon.tiles[ty]?.[tx]?.walkable;
}

/** True if the entity body at (x,y) only overlaps walkable tiles. */
export function canOccupy(dungeon: DungeonState, x: number, y: number, body = ENTITY_BODY): boolean {
  const tiles = occupiedTiles(x, y, body);
  if (tiles.length === 0) return false;
  return tiles.every(t => isWalkableAt(dungeon, t.tx, t.ty));
}

function centersOverlap(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  minDist = ENTITY_BODY * 0.72
): boolean {
  const a = entityCenter(ax, ay);
  const b = entityCenter(bx, by);
  const dx = a.cx - b.cx;
  const dy = a.cy - b.cy;
  return dx * dx + dy * dy < minDist * minDist;
}

function distanceCenters(ax: number, ay: number, bx: number, by: number): number {
  const a = entityCenter(ax, ay);
  const b = entityCenter(bx, by);
  return Math.hypot(a.cx - b.cx, a.cy - b.cy);
}

function monsterSpeed(m: Monster): number {
  switch (m.archetype) {
    case 'glitch_swarmer':
      return 3.6;
    case 'neon_stalker':
      return 3.2;
    case 'circuit_disruptor':
      return 2.8;
    case 'cyber_behemoth':
      return 2.1;
    case 'core_synthesizer':
      return 2.4;
    default:
      return 3.0;
  }
}

function monsterAttackCooldown(m: Monster): number {
  switch (m.archetype) {
    case 'glitch_swarmer':
      return 0.7;
    case 'neon_stalker':
      return 1.1;
    case 'circuit_disruptor':
      return 1.25;
    case 'cyber_behemoth':
      return 1.6;
    case 'core_synthesizer':
      return 1.35;
    default:
      return 0.9;
  }
}

function monsterAttackRange(m: Monster): number {
  switch (m.archetype) {
    case 'neon_stalker':
      return 3.6;
    case 'circuit_disruptor':
      return 2.8;
    case 'cyber_behemoth':
      return 1.35;
    default:
      return 1.05;
  }
}

/** Axis-separated slide movement against walls (+ optional solid entities). */
export function moveWithCollision(
  dungeon: DungeonState,
  x: number,
  y: number,
  vx: number,
  vy: number,
  dt: number,
  blockers: Array<{ x: number; y: number; id?: string }>,
  selfId?: string
): { x: number; y: number; hitWall: boolean } {
  let nx = x + vx * dt;
  let ny = y + vy * dt;
  let hitWall = false;

  const blockedByEntity = (px: number, py: number) =>
    blockers.some(b => b.id !== selfId && centersOverlap(px, py, b.x, b.y));

  if (!canOccupy(dungeon, nx, y) || blockedByEntity(nx, y)) {
    nx = x;
    hitWall = true;
  }
  if (!canOccupy(dungeon, nx, ny) || blockedByEntity(nx, ny)) {
    ny = y;
    hitWall = true;
  }

  // Clamp inside map
  nx = Math.max(0, Math.min(dungeon.width - ENTITY_BODY, nx));
  ny = Math.max(0, Math.min(dungeon.height - ENTITY_BODY, ny));

  return { x: nx, y: ny, hitWall };
}

function clonePlayer(player: Player): Player {
  return {
    ...player,
    stats: { ...player.stats },
    buffs: { ...player.buffs },
    activeCooldowns: { ...player.activeCooldowns },
    equipment: { ...player.equipment },
    inventory: [...player.inventory]
  };
}

function cloneDungeon(dungeon: DungeonState): DungeonState {
  return {
    ...dungeon,
    monsters: dungeon.monsters.map(m => ({ ...m })),
    tiles: dungeon.tiles.map(row => row.map(t => ({ ...t }))),
    groundCoins: dungeon.groundCoins ? dungeon.groundCoins.map(c => ({ ...c })) : [],
    checkpoints: dungeon.checkpoints ? dungeon.checkpoints.map(cp => ({ ...cp })) : [],
    deathDrops: dungeon.deathDrops
      ? dungeon.deathDrops.map(d => ({ ...d, items: [...d.items], equipment: { ...d.equipment } }))
      : []
  };
}

function applyStatusTick(
  player: Player,
  dungeon: DungeonState,
  turn: number,
  logs: CombatLogEntry[],
  soundEvents: SoundEventType[],
  floatingTexts: RealtimeTickResult['floatingTexts']
) {
  if (player.buffs.overclockTurns > 0) player.buffs.overclockTurns--;
  for (const skillId in player.activeCooldowns) {
    if (player.activeCooldowns[skillId] > 0) player.activeCooldowns[skillId]--;
  }

  if (player.buffs.regenTurns > 0) {
    const totals = getTotalStats(player);
    const hpTick = player.buffs.regenHpPerTurn || 0;
    const nrgTick = player.buffs.regenEnergyPerTurn || 0;
    if (hpTick > 0) {
      player.stats.hp = Math.min(totals.maxHp, player.stats.hp + hpTick);
      floatingTexts.push({ text: `+${hpTick} HP`, x: player.x, y: player.y, color: '#34d399' });
    }
    if (nrgTick > 0) {
      player.stats.energy = Math.min(totals.maxEnergy, player.stats.energy + nrgTick);
    }
    player.buffs.regenTurns--;
    if (player.buffs.regenTurns === 0) {
      player.buffs.regenHpPerTurn = 0;
      player.buffs.regenEnergyPerTurn = 0;
    }
  }

  const baseEnergyRegen = player.characterClass === 'technomancer' ? 3 : 1;
  const empBonus = dungeon.activeEvent?.id === 'emp_surge' ? 3 : 0;
  const totals = getTotalStats(player);
  player.stats.energy = Math.min(totals.maxEnergy, player.stats.energy + baseEnergyRegen + empBonus);

  const envHazard = applyEnvironmentalTurnEffects(player, dungeon, turn);
  if (envHazard.damage > 0) {
    player.stats.hp -= envHazard.damage;
    soundEvents.push('player_hurt');
    floatingTexts.push({ text: `GLITCH -${envHazard.damage}`, x: player.x, y: player.y, color: '#ff0055' });
    if (envHazard.message) {
      logs.unshift({
        id: `log_env_${Date.now()}`,
        text: envHazard.message,
        type: 'info',
        turn
      });
    }
  }

  // Burn DoT on monsters
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
        dropCoinsAround(dungeon, Math.floor(m.x), Math.floor(m.y), dungeon.floor, m.archetype === 'core_synthesizer');
        soundEvents.push('kill');
        const leveled = awardXP(player, m.expReward, logs, turn);
        if (leveled) soundEvents.push('level_up');
      }
    }
  }
}

function tryPlayerMelee(
  player: Player,
  dungeon: DungeonState,
  clock: RealtimeClock,
  turn: number,
  logs: CombatLogEntry[],
  soundEvents: SoundEventType[],
  floatingTexts: RealtimeTickResult['floatingTexts'],
  attackEffects: AttackEffect[]
): { screenShake: number; hitstopSeconds: number; kills: number } {
  let screenShake = 0;
  let hitstopSeconds = 0;
  let kills = 0;
  if (clock.playerAttackCd > 0) return { screenShake, hitstopSeconds, kills };

  let best: Monster | null = null;
  let bestDist = PLAYER_MELEE_RANGE;
  for (const m of dungeon.monsters) {
    const d = distanceCenters(player.x, player.y, m.x, m.y);
    if (d <= bestDist) {
      bestDist = d;
      best = m;
    }
  }
  if (!best) return { screenShake, hitstopSeconds, kills };

  const { damage, isCrit } = calculatePlayerDamage(player, best, dungeon.activeEvent);
  best.hp -= damage;
  best.alerted = true;
  const killed = best.hp <= 0;
  clock.playerAttackCd = PLAYER_ATTACK_COOLDOWN;

  hitstopSeconds = calculateHitstopSeconds(damage, best.maxHp, isCrit, false, killed);
  attackEffects.push({
    type: isCrit ? 'crit_slash' : 'slash',
    x: player.x,
    y: player.y,
    targetX: best.x,
    targetY: best.y,
    color: isCrit ? '#ffe600' : '#00f0ff',
    radius: isCrit ? 1.4 : 1.0
  });
  floatingTexts.push({
    text: isCrit ? `CRIT! -${damage}` : `-${damage}`,
    x: best.x,
    y: best.y,
    color: isCrit ? '#ffe600' : '#00f0ff',
    isCrit
  });
  soundEvents.push(isCrit ? 'crit' : 'hit');
  screenShake = isCrit ? 0.25 : 0.12;
  logs.unshift({
    id: `log_rt_atk_${Date.now()}`,
    text: isCrit
      ? `CRITICAL STRIKE! You strike ${best.name} for ${damage}!`
      : `You strike ${best.name} for ${damage}.`,
    type: isCrit ? 'critical' : 'player_attack',
    turn
  });

  if (killed) {
    const idx = dungeon.monsters.findIndex(m => m.id === best!.id);
    if (idx >= 0) dungeon.monsters.splice(idx, 1);
    const shardMultiplier = dungeon.activeEvent?.id === 'glitch_storm' ? 1.6 : 1.0;
    player.stats.soulShards += Math.floor(best.shardReward * shardMultiplier);
    dropCoinsAround(dungeon, Math.floor(best.x), Math.floor(best.y), dungeon.floor, best.archetype === 'core_synthesizer');
    soundEvents.push('kill');
    kills = 1;
    const leveled = awardXP(player, best.expReward, logs, turn);
    if (leveled) soundEvents.push('level_up');
  }

  return { screenShake, hitstopSeconds, kills };
}

function tickMonsters(
  player: Player,
  dungeon: DungeonState,
  clock: RealtimeClock,
  dt: number,
  turn: number,
  logs: CombatLogEntry[],
  soundEvents: SoundEventType[],
  floatingTexts: RealtimeTickResult['floatingTexts']
): { screenShake: number } {
  let screenShake = 0;
  const envDmgMult = dungeon.activeEvent?.id === 'emp_surge' ? 1.15 : 1.0;
  const blockers = [
    { x: player.x, y: player.y, id: 'player' },
    ...dungeon.monsters.map(m => ({ x: m.x, y: m.y, id: m.id }))
  ];

  for (const monster of dungeon.monsters) {
    clock.monsterAttackCd[monster.id] = Math.max(0, (clock.monsterAttackCd[monster.id] || 0) - dt);

    const dist = distanceCenters(monster.x, monster.y, player.x, player.y);
    const tileX = Math.floor(monster.x + ENTITY_BODY * 0.5);
    const tileY = Math.floor(monster.y + ENTITY_BODY * 0.5);
    const isVisible = !!dungeon.tiles[tileY]?.[tileX]?.visible;

    if (!monster.alerted && (isVisible || dist <= 5)) {
      monster.alerted = true;
      soundEvents.push('monster_alert');
    }
    if (!monster.alerted) continue;

    const range = monsterAttackRange(monster);
    const cd = clock.monsterAttackCd[monster.id] || 0;

    // Attack when in range
    if (dist <= range && cd <= 0) {
      const pTotals = getTotalStats(player);
      if (monster.archetype === 'neon_stalker' && dist > 1.2) {
        const baseRanged = Math.max(1, monster.attack - 2 - Math.floor(pTotals.defense * 0.5));
        const rangedDmg = Math.max(1, Math.floor(baseRanged * envDmgMult));
        soundEvents.push('monster_attack_stalker');
        applyMonsterDamageToPlayer(player, rangedDmg, monster.name, logs, soundEvents, floatingTexts, turn);
        clock.monsterAttackCd[monster.id] = monsterAttackCooldown(monster);
        screenShake += 0.1;
        continue;
      }
      if (monster.archetype === 'circuit_disruptor' && dist > 1.15) {
        player.stats.energy = Math.max(0, player.stats.energy - 8);
        const zapDmg = Math.max(1, Math.floor(monster.attack * 0.6 * envDmgMult));
        soundEvents.push('monster_attack_disruptor');
        applyMonsterDamageToPlayer(player, zapDmg, `${monster.name} (EMP Arc)`, logs, soundEvents, floatingTexts, turn);
        clock.monsterAttackCd[monster.id] = monsterAttackCooldown(monster);
        continue;
      }
      if (dist <= 1.25) {
        const mult = monster.archetype === 'cyber_behemoth' ? 2 : 1;
        const baseRaw = Math.max(1, monster.attack * mult - Math.floor(pTotals.defense * 0.6));
        const rawDmg = Math.max(1, Math.floor(baseRaw * envDmgMult));
        soundEvents.push(
          monster.archetype === 'core_synthesizer'
            ? 'monster_attack_boss'
            : monster.archetype === 'cyber_behemoth'
              ? 'monster_attack_behemoth'
              : 'monster_attack_swarmer'
        );
        applyMonsterDamageToPlayer(player, rawDmg, monster.name, logs, soundEvents, floatingTexts, turn);
        clock.monsterAttackCd[monster.id] = monsterAttackCooldown(monster);
        screenShake += 0.12;
        continue;
      }
    }

    // Chase continuously toward player
    if (dist > 0.85) {
      const a = entityCenter(monster.x, monster.y);
      const b = entityCenter(player.x, player.y);
      let vx = b.cx - a.cx;
      let vy = b.cy - a.cy;
      const len = Math.hypot(vx, vy) || 1;
      vx = (vx / len) * monsterSpeed(monster);
      vy = (vy / len) * monsterSpeed(monster);
      const moved = moveWithCollision(dungeon, monster.x, monster.y, vx, vy, dt, blockers, monster.id);
      monster.x = moved.x;
      monster.y = moved.y;
    }
  }

  return { screenShake };
}

function interactOccupiedTiles(
  player: Player,
  dungeon: DungeonState,
  clock: RealtimeClock,
  turn: number,
  logs: CombatLogEntry[],
  soundEvents: SoundEventType[],
  floatingTexts: RealtimeTickResult['floatingTexts']
): {
  floorCompleted: boolean;
  openShop: boolean;
  checkpointTriggered: boolean;
  gameOver: boolean;
  deathDropCreated: boolean;
  screenShake: number;
  hitstopSeconds: number;
} {
  let floorCompleted = false;
  let openShop = false;
  let checkpointTriggered = false;
  let gameOver = false;
  let deathDropCreated = false;
  let screenShake = 0;
  let hitstopSeconds = 0;

  const tiles = occupiedTiles(player.x, player.y);

  // Coins on any overlapped tile
  const beforeCoins = dungeon.groundCoins.length;
  let gainedCoins = 0;
  dungeon.groundCoins = dungeon.groundCoins.filter(c => {
    const onTile = tiles.some(t => t.tx === c.x && t.ty === c.y);
    if (onTile) {
      gainedCoins += c.value;
      return false;
    }
    return true;
  });
  if (gainedCoins > 0) {
    player.stats.coins += gainedCoins;
    soundEvents.push('coin');
    floatingTexts.push({ text: `+${gainedCoins} 🪙`, x: player.x, y: player.y, color: '#fbbf24' });
  } else if (beforeCoins !== dungeon.groundCoins.length) {
    // no-op
  }

  const recovered = collectDeathDropBagsAt(player, dungeon, 'solo');
  if (recovered.recoveredBags > 0) {
    soundEvents.push('chest');
    floatingTexts.push({ text: `☠️ GEAR RECOVERED!`, x: player.x, y: player.y, color: '#ffe600', isCrit: true });
  }

  for (const { tx, ty } of tiles) {
    const tile: Tile | undefined = dungeon.tiles[ty]?.[tx];
    if (!tile) continue;
    const key = tileKey(tx, ty);

    if (tile.type === 'stairs_down') {
      floorCompleted = true;
      soundEvents.push('teleport');
      logs.unshift({
        id: `log_stairs_${Date.now()}`,
        text: `Accessing quantum elevator to Cyber-Crypt Sub-Level ${dungeon.floor + 1}...`,
        type: 'info',
        turn
      });
      return { floorCompleted, openShop, checkpointTriggered, gameOver, deathDropCreated, screenShake, hitstopSeconds };
    }

    if (tile.type === 'checkpoint' && !clock.triggeredTiles.has(`cp:${key}`)) {
      clock.triggeredTiles.add(`cp:${key}`);
      checkpointTriggered = true;
      const wasActive = !!tile.checkpointActivated;
      tile.checkpointActivated = true;
      const cp = dungeon.checkpoints.find(c => c.x === tx && c.y === ty);
      if (cp) cp.activated = true;
      player.lastCheckpoint = { floor: dungeon.floor, x: tx, y: ty };
      const totals = getTotalStats(player);
      if (!wasActive) {
        const healAmt = Math.max(10, Math.floor(totals.maxHp * 0.2));
        player.stats.hp = Math.min(totals.maxHp, player.stats.hp + healAmt);
        soundEvents.push('checkpoint');
      } else {
        soundEvents.push('pickup');
      }
      floatingTexts.push({ text: 'CHECKPOINT SAVED!', x: tx, y: ty, color: '#10b981' });
    }

    if (tile.type === 'chest' && !clock.triggeredTiles.has(`chest:${key}`)) {
      clock.triggeredTiles.add(`chest:${key}`);
      const loot = tile.item;
      tile.type = 'floor';
      delete tile.item;
      soundEvents.push('chest');
      if (loot) {
        if (player.inventory.length < player.maxInventory) {
          player.inventory.push(loot);
          logs.unshift({
            id: `log_loot_${Date.now()}`,
            text: `Decrypted Data Cache: Found [${loot.name}]!`,
            type: 'item',
            turn
          });
        }
      }
    }

    if (tile.type === 'shrine' && !clock.triggeredTiles.has(`shrine:${key}`)) {
      clock.triggeredTiles.add(`shrine:${key}`);
      tile.type = 'floor';
      soundEvents.push('shrine');
      const totals = getTotalStats(player);
      const healAmt = Math.floor(totals.maxHp * 0.5);
      player.stats.hp = Math.min(totals.maxHp, player.stats.hp + healAmt);
      player.stats.energy = totals.maxEnergy;
      logs.unshift({
        id: `log_shrine_${Date.now()}`,
        text: `Cyber Shrine activated! Restored ${healAmt} HP and refilled energy.`,
        type: 'info',
        turn
      });
    }

    if (tile.type === 'shop' && !clock.triggeredTiles.has(`shop:${key}`)) {
      clock.triggeredTiles.add(`shop:${key}`);
      openShop = true;
      soundEvents.push('pickup');
    }

    if (tile.hazard && !clock.triggeredTiles.has(`trap:${key}`)) {
      clock.triggeredTiles.add(`trap:${key}`);
      const trapDmg = 8 + dungeon.floor * 3;
      player.stats.hp -= trapDmg;
      tile.hazard = undefined;
      soundEvents.push('player_hurt');
      screenShake += 0.3;
      hitstopSeconds = 0.06;
      floatingTexts.push({ text: `-${trapDmg}`, x: tx, y: ty, color: '#ff0055' });
      if (player.stats.hp <= 0) {
        player.stats.hp = 0;
        gameOver = true;
        soundEvents.push('death');
        const dropped = dropPlayerLoadoutOnDeath(player, dungeon, 'solo', 'Operative', turn);
        deathDropCreated = !!dropped;
      }
    }
  }

  return { floorCompleted, openShop, checkpointTriggered, gameOver, deathDropCreated, screenShake, hitstopSeconds };
}

/**
 * Advance one realtime simulation frame for offline free-movement mode.
 */
export function tickRealtime(
  playerIn: Player,
  dungeonIn: DungeonState,
  input: MoveInput,
  dt: number,
  turn: number,
  clock: RealtimeClock
): RealtimeTickResult {
  const player = clonePlayer(playerIn);
  const dungeon = cloneDungeon(dungeonIn);
  const logs: CombatLogEntry[] = [];
  const soundEvents: SoundEventType[] = [];
  const floatingTexts: RealtimeTickResult['floatingTexts'] = [];
  const attackEffects: AttackEffect[] = [];
  let screenShake = 0;
  let hitstopSeconds = 0;
  let gameOver = false;
  let floorCompleted = false;
  let openShop = false;
  let checkpointTriggered = false;
  let deathDropCreated = false;
  let kills = 0;
  let moved = false;
  let statusTicks = 0;

  clock.playerAttackCd = Math.max(0, clock.playerAttackCd - dt);

  // Normalize input
  let ix = input.dx;
  let iy = input.dy;
  const inputLen = Math.hypot(ix, iy);
  if (inputLen > 1e-6) {
    ix /= inputLen;
    iy /= inputLen;
    if (Math.abs(ix) >= Math.abs(iy)) {
      player.facing = ix >= 0 ? 'right' : 'left';
    } else {
      player.facing = iy >= 0 ? 'down' : 'up';
    }

    const blockers = dungeon.monsters.map(m => ({ x: m.x, y: m.y, id: m.id }));
    const next = moveWithCollision(
      dungeon,
      player.x,
      player.y,
      ix * PLAYER_SPEED,
      iy * PLAYER_SPEED,
      dt,
      blockers,
      'player'
    );
    if (next.x !== player.x || next.y !== player.y) {
      player.x = next.x;
      player.y = next.y;
      moved = true;
    }

    // Auto-melee when pressing into / near enemies
    const melee = tryPlayerMelee(player, dungeon, clock, turn, logs, soundEvents, floatingTexts, attackEffects);
    screenShake += melee.screenShake;
    hitstopSeconds = Math.max(hitstopSeconds, melee.hitstopSeconds);
    kills += melee.kills;
  } else {
    // Standing still still allows melee if overlapping an enemy (auto swing)
    const nearEnemy = dungeon.monsters.some(
      m => distanceCenters(player.x, player.y, m.x, m.y) <= PLAYER_MELEE_RANGE * 0.85
    );
    if (nearEnemy) {
      const melee = tryPlayerMelee(player, dungeon, clock, turn, logs, soundEvents, floatingTexts, attackEffects);
      screenShake += melee.screenShake;
      hitstopSeconds = Math.max(hitstopSeconds, melee.hitstopSeconds);
      kills += melee.kills;
    }
  }

  const interact = interactOccupiedTiles(player, dungeon, clock, turn, logs, soundEvents, floatingTexts);
  floorCompleted = interact.floorCompleted;
  openShop = interact.openShop;
  checkpointTriggered = interact.checkpointTriggered;
  screenShake += interact.screenShake;
  hitstopSeconds = Math.max(hitstopSeconds, interact.hitstopSeconds);
  if (interact.gameOver) {
    gameOver = true;
    deathDropCreated = interact.deathDropCreated;
  }

  if (!floorCompleted && !gameOver) {
    const mon = tickMonsters(player, dungeon, clock, dt, turn, logs, soundEvents, floatingTexts);
    screenShake += mon.screenShake;
  }

  clock.statusAcc += dt;
  while (clock.statusAcc >= STATUS_TICK_INTERVAL) {
    clock.statusAcc -= STATUS_TICK_INTERVAL;
    statusTicks++;
    applyStatusTick(player, dungeon, turn + statusTicks, logs, soundEvents, floatingTexts);
  }

  // FOV from continuous position (floor of center)
  const center = entityCenter(player.x, player.y);
  updateFOV(dungeon.tiles, Math.floor(center.cx), Math.floor(center.cy), getFovRadius(dungeon));

  if (!gameOver && player.stats.hp <= 0) {
    player.stats.hp = 0;
    gameOver = true;
    soundEvents.push('death');
    const dropped = dropPlayerLoadoutOnDeath(player, dungeon, 'solo', 'Operative', turn);
    deathDropCreated = !!dropped;
  }

  return {
    player,
    dungeon,
    logs,
    soundEvents,
    floatingTexts,
    attackEffects,
    screenShake,
    hitstopSeconds,
    gameOver,
    floorCompleted,
    openShop,
    checkpointTriggered,
    deathDropCreated,
    kills,
    moved,
    statusTicks
  };
}
