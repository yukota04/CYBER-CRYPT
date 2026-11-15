/**
 * Per-floor stair guardians — distinct assassin / mage / tank bosses.
 * Stairs stay locked until the guardian is slain.
 */
import { FloorBossRole, Monster, MonsterArchetype, PendingMonsterSpawn } from './types';

const ROLE_CYCLE: FloorBossRole[] = ['assassin', 'mage', 'tank'];

export function floorBossRoleForFloor(floor: number): FloorBossRole {
  return ROLE_CYCLE[Math.max(0, floor - 1) % ROLE_CYCLE.length];
}

export function isFloorBossArchetype(arch: MonsterArchetype): boolean {
  return arch === 'boss_assassin' || arch === 'boss_mage' || arch === 'boss_tank' || arch === 'core_synthesizer';
}

export function archetypeForBossRole(role: FloorBossRole): MonsterArchetype {
  if (role === 'assassin') return 'boss_assassin';
  if (role === 'mage') return 'boss_mage';
  return 'boss_tank';
}

export interface FloorBossBlueprint {
  role: FloorBossRole;
  archetype: MonsterArchetype;
  name: string;
  symbol: string;
  color: string;
  /** Relative to a normal elite on the same floor */
  hpMult: number;
  atkMult: number;
  defMult: number;
  renderScale: number;
  /** Melee/aggro reach in tiles */
  attackRange: number;
  speed: number;
}

export function getFloorBossBlueprint(floor: number): FloorBossBlueprint {
  const role = floorBossRoleForFloor(floor);
  const mk = Math.max(1, floor);
  if (role === 'assassin') {
    return {
      role,
      archetype: 'boss_assassin',
      name: `NULL BLADE · FLOOR ${mk}`,
      symbol: '⚔',
      color: '#ff3366',
      hpMult: 7.5,
      atkMult: 4.2,
      defMult: 1.4,
      renderScale: 1.55 + Math.min(0.45, floor * 0.03),
      attackRange: 1.7,
      speed: 3.8
    };
  }
  if (role === 'mage') {
    return {
      role,
      archetype: 'boss_mage',
      name: `ARC HEXCORE · FLOOR ${mk}`,
      symbol: '✶',
      color: '#a855f7',
      hpMult: 8.5,
      atkMult: 3.6,
      defMult: 1.8,
      renderScale: 1.75 + Math.min(0.5, floor * 0.035),
      attackRange: 4.2,
      speed: 2.1
    };
  }
  return {
    role,
    archetype: 'boss_tank',
    name: `BULWARK COLOSSUS · FLOOR ${mk}`,
    symbol: '▓',
    color: '#94a3b8',
    hpMult: 14,
    atkMult: 2.8,
    defMult: 3.2,
    renderScale: 2.05 + Math.min(0.55, floor * 0.04),
    attackRange: 1.9,
    speed: 1.25
  };
}

export function buildFloorBossSpawn(
  floor: number,
  id: string,
  x: number,
  y: number,
  baseEliteHp: number,
  baseEliteAtk: number,
  baseEliteDef: number,
  partyAtk: number,
  partyDef: number,
  rewardScale: number,
  shardMult: number,
  visualVariant?: Monster['visualVariant']
): PendingMonsterSpawn {
  const bp = getFloorBossBlueprint(floor);
  const hp = Math.round(baseEliteHp * bp.hpMult);
  return {
    id,
    name: bp.name,
    level: floor + 5,
    archetype: bp.archetype,
    x,
    y,
    hp,
    maxHp: hp,
    attack: Math.round(baseEliteAtk * bp.atkMult * partyAtk),
    defense: Math.round(baseEliteDef * bp.defMult * partyDef),
    expReward: Math.round(220 * rewardScale),
    shardReward: Math.max(2, Math.round(55 * rewardScale * shardMult)),
    color: bp.color,
    symbol: bp.symbol,
    visualVariant,
    renderScale: bp.renderScale,
    isFloorBoss: true,
    bossRole: bp.role
  };
}

export function floorBossStillAlive(monsters: Monster[], floorBossId?: string): boolean {
  if (!floorBossId) {
    return monsters.some(m => m.isFloorBoss && m.hp > 0);
  }
  return monsters.some(m => m.id === floorBossId && m.hp > 0);
}

export function bossMoveSpeed(arch: MonsterArchetype): number {
  switch (arch) {
    case 'boss_assassin':
      return 3.8;
    case 'boss_mage':
      return 2.1;
    case 'boss_tank':
      return 1.25;
    case 'core_synthesizer':
      return 1.05;
    default:
      return 2.2;
  }
}

export function bossAttackRange(arch: MonsterArchetype): number {
  switch (arch) {
    case 'boss_mage':
      return 4.2;
    case 'boss_assassin':
      return 1.7;
    case 'boss_tank':
      return 1.9;
    case 'core_synthesizer':
      return 2.2;
    default:
      return 1.35;
  }
}
