export type CharacterClass = 'striker' | 'technomancer' | 'vanguard';

export type TileType = 
  | 'wall' 
  | 'floor' 
  | 'corridor' 
  | 'door_closed' 
  | 'door_open' 
  | 'stairs_down' 
  | 'chest' 
  | 'shrine' 
  | 'shop'
  | 'trap_hidden' 
  | 'trap_revealed';

export interface Tile {
  x: number;
  y: number;
  type: TileType;
  walkable: boolean;
  transparent: boolean;
  explored: boolean;
  visible: boolean;
  hazard?: 'spikes' | 'glitch_wire' | 'acid_leak';
  item?: GameItem;
}

export type ItemRarity = 'common' | 'rare' | 'epic' | 'legendary' | 'cyber-relic';

export type ItemType = 'weapon' | 'armor' | 'accessory' | 'consumable';

export interface GameItem {
  id: string;
  name: string;
  type: ItemType;
  rarity: ItemRarity;
  description: string;
  attackBonus?: number;
  defenseBonus?: number;
  critBonus?: number; // e.g. 0.08 for +8%
  hpBonus?: number;
  energyBonus?: number;
  healAmount?: number;
  energyAmount?: number;
  effectType?: 'heal' | 'energy' | 'teleport' | 'buff_overclock' | 'cleanse';
  value: number;
  icon: string;
}

export interface SkillNode {
  id: string;
  name: string;
  branch: CharacterClass;
  tier: 1 | 2 | 3 | 4;
  type: 'active' | 'passive';
  pointCost: number; // skill points to unlock (1 or 2)
  energyCost?: number; // energy cost to cast in combat
  cooldown?: number; // turns
  description: string;
  prerequisites: string[]; // skill IDs needed
  unlocked: boolean;
  icon: string;
  effect: {
    statBoost?: Partial<Record<'attack' | 'defense' | 'critRate' | 'maxHp' | 'maxEnergy', number>>;
    actionType?: 'emp_blast' | 'phase_dash' | 'plasma_cleave' | 'nanite_heal' | 'glitch_overcharge';
    power?: number;
    range?: number;
  };
}

export interface Stats {
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  attack: number;
  defense: number;
  critRate: number; // 0 to 1
  level: number;
  exp: number;
  expToNext: number;
  skillPoints: number;
  soulShards: number;
}

export type MonsterArchetype = 
  | 'glitch_swarmer' 
  | 'neon_stalker' 
  | 'cyber_behemoth' 
  | 'circuit_disruptor' 
  | 'core_synthesizer'; // Boss

export interface Monster {
  id: string;
  name: string;
  archetype: MonsterArchetype;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  expReward: number;
  shardReward: number;
  alerted: boolean;
  windupTurn?: boolean; // telegraph flag
  telegraphDirection?: { dx: number; dy: number };
  color: string;
  symbol: string;
}

export interface Player {
  x: number;
  y: number;
  characterClass: CharacterClass;
  stats: Stats;
  equipment: {
    weapon: GameItem | null;
    armor: GameItem | null;
    accessory: GameItem | null;
  };
  inventory: GameItem[];
  maxInventory: number;
  activeCooldowns: Record<string, number>; // skillId -> remaining turns
  unlockedSkills: string[];
  facing: 'up' | 'down' | 'left' | 'right';
  buffs: {
    overclockTurns: number;
    shieldAmount: number;
  };
}

export interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
  centerX: number;
  centerY: number;
}

export type EnvironmentalEventType = 
  | 'glitch_storm' 
  | 'gravity_shift' 
  | 'black_market' 
  | 'emp_surge' 
  | 'shadow_veil';

export interface EnvironmentalEvent {
  id: EnvironmentalEventType;
  name: string;
  description: string;
  icon: string;
  bannerColor: string;
  effectText: string;
  hazardTurns?: number;
}

export interface DungeonState {
  floor: number;
  width: number;
  height: number;
  tiles: Tile[][];
  rooms: Room[];
  monsters: Monster[];
  stairsPos: { x: number; y: number };
  activeEvent?: EnvironmentalEvent | null;
  shopItems?: GameItem[];
}

export interface CombatLogEntry {
  id: string;
  text: string;
  type: 'player_attack' | 'enemy_attack' | 'skill' | 'item' | 'info' | 'critical' | 'defeat' | 'level_up';
  turn: number;
}

export interface RunSnapshot {
  score: number;
  floor: number;
  turns: number;
  monstersSlain: number;
  soulShards: number;
  characterClass: CharacterClass;
  level: number;
  seed: number;
  timestamp: number;
}

export interface UserProfile {
  id: string;
  username: string;
  role: 'player' | 'moderator' | 'admin';
  createdAt: number;
  cloudSaveHash?: string;
  stats: {
    totalRuns: number;
    highestFloor: number;
    totalKills: number;
    bestScore: number;
  };
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: number;
}
