export type CharacterClass = 'striker' | 'technomancer' | 'vanguard';

export type PlayMode = 'offline' | 'online';
export type DifficultyMode = 'normal' | 'hard';

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
  | 'checkpoint'
  | 'trap_hidden'
  | 'trap_revealed'
  /** Void gap — not walkable until a crate is pushed in */
  | 'pit'
  /** Pit sealed by a crate — walkable bridge */
  | 'pit_filled'
  /** Opens linked gates while pressed (player or crate) */
  | 'pressure_plate'
  /** Sealed barrier controlled by pressure plates */
  | 'gate_closed'
  | 'gate_open';

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
  checkpointActivated?: boolean;
}

/** Pushable puzzle crate (tile-aligned). */
export interface PuzzleCrate {
  id: string;
  x: number;
  y: number;
}

export type PuzzleKind = 'crate_pit' | 'button_gate' | 'dual_button' | 'timed_gate';

/** Links plates/crates to gates or pits. */
export interface PuzzleLink {
  id: string;
  kind: PuzzleKind;
  buttonTiles?: Array<{ x: number; y: number }>;
  gateTiles?: Array<{ x: number; y: number }>;
  pitTile?: { x: number; y: number };
  crateId?: string;
  requiredPresses?: number;
  open: boolean;
  /** When true, gate closes if plates are released */
  holdOpen?: boolean;
  openSeconds?: number;
  openTimer?: number;
}

export type ItemRarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic' | 'cyber-relic';

export type ItemType =
  | 'weapon'
  | 'offhand'
  | 'helmet'
  | 'chest'
  | 'gloves'
  | 'legs'
  | 'boots'
  | 'ring'
  | 'earrings'
  | 'consumable';

export type EquipSlot =
  | 'weapon'
  | 'offhand'
  | 'helmet'
  | 'chest'
  | 'gloves'
  | 'legs'
  | 'boots'
  | 'ring1'
  | 'ring2'
  | 'earrings';

export type WeaponCategory =
  | 'sword'
  | 'greatsword'
  | 'shield'
  | 'staff'
  | 'focus'
  | 'katana'
  | 'daggers'
  | 'pistol';

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
  regenTurns?: number;
  regenHpPerTurn?: number;
  regenEnergyPerTurn?: number;
  burnTurns?: number;
  burnDamage?: number;
  burnRadius?: number;
  shieldGrant?: number;
  currency?: 'coins' | 'shards';
  effectType?:
    | 'heal'
    | 'energy'
    | 'dual'
    | 'regen'
    | 'igneous'
    | 'shield'
    | 'cooldown_reset'
    | 'teleport'
    | 'buff_overclock'
    | 'cleanse'
    | 'stone';
  value: number;
  icon: string;
  weaponCategory?: WeaponCategory;
  twoHanded?: boolean;
  allowedClasses?: CharacterClass[];
  upgradeLevel?: number;
  /** Gear power level that scales with dungeon floor when dropped/bought */
  itemLevel?: number;
  /** Minimum player level required to equip this gear */
  requiredLevel?: number;
  attackRange?: number;
  /** Catalog key used for localized name/description lookup */
  baseKey?: string;
}

export type SkillActionType =
  | 'emp_blast'
  | 'phase_dash'
  | 'plasma_cleave'
  | 'nanite_heal'
  | 'aegis_barrier'
  | 'glitch_overcharge'
  | 'shadow_strike'
  | 'blade_tempest'
  | 'meteor_strike'
  | 'plasma_beam'
  | 'chain_lightning'
  | 'earthshatter'
  | 'whirlwind'
  | 'vampiric_drain'
  | 'frost_nova'
  | 'fortify_stance'
  | 'orbital_strike'
  | 'arcane_cataclysm';

export type AttackVfxType =
  | 'slash'
  | 'crit_slash'
  | 'emp_ring'
  | 'nova'
  | 'beam'
  | 'heal'
  | 'shield'
  | 'smash'
  | 'meteor'
  | 'lightning';

export interface AttackEffect {
  id?: string;
  type: AttackVfxType;
  x: number;
  y: number;
  targetX?: number;
  targetY?: number;
  color: string;
  radius?: number;
}

export interface SkillNode {
  id: string;
  name: string;
  branch: CharacterClass;
  treeIndex: 1 | 2 | 3 | 4 | 5;
  subTreeName: string;
  tier: 1 | 2 | 3 | 4;
  type: 'active' | 'passive';
  pointCost: number; // skill points to unlock (1 or 2)
  energyCost?: number; // energy cost to cast in combat
  cooldown?: number; // turns
  description: string;
  prerequisites: string[]; // skill IDs needed
  unlocked: boolean;
  icon: string;
  vfxType?: AttackVfxType;
  effect: {
    statBoost?: Partial<Record<'attack' | 'defense' | 'critRate' | 'maxHp' | 'maxEnergy', number>>;
    actionType?: SkillActionType;
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
  coins: number;
  probabilityStones: number;
}

export type MonsterArchetype =
  | 'glitch_swarmer'
  | 'neon_stalker'
  | 'cyber_behemoth'
  | 'circuit_disruptor'
  | 'core_synthesizer'; // Boss

export interface MonsterVisualVariant {
  seed: number;
  tier: number;
  hueShift: number;
  bodyShape: 'diamond' | 'hex' | 'octo' | 'spiked' | 'serpent' | 'titan' | 'core';
  plates: number;
  spikes: number;
  eyeStyle: 'single' | 'twin' | 'tri' | 'visor' | 'halo';
  auraColor: string;
  secondaryColor: string;
  crown: boolean;
}

export interface Monster {
  id: string;
  name: string;
  level: number;
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
  burnTurns?: number;
  burnDamage?: number;
  color: string;
  symbol: string;
  visualVariant?: MonsterVisualVariant;
}

export interface PlayerEquipment {
  weapon: GameItem | null;
  offhand: GameItem | null;
  helmet: GameItem | null;
  chest: GameItem | null;
  gloves: GameItem | null;
  legs: GameItem | null;
  boots: GameItem | null;
  ring1: GameItem | null;
  ring2: GameItem | null;
  earrings: GameItem | null;
}

export interface Player {
  x: number;
  y: number;
  characterClass: CharacterClass;
  stats: Stats;
  equipment: PlayerEquipment;
  inventory: GameItem[];
  maxInventory: number;
  /** Extra backpack slots unlocked by watching ads (up to 8 → 24 total). */
  inventoryBonusSlots?: number;
  /** Epoch ms when all bonus slots expire together (timer resets on each new unlock). */
  inventoryBonusExpiresAt?: number;
  activeCooldowns: Record<string, number>; // skillId -> remaining turns
  unlockedSkills: string[];
  facing: 'up' | 'down' | 'left' | 'right';
  lastCheckpoint?: { floor: number; x: number; y: number };
  buffs: {
    overclockTurns: number;
    shieldAmount: number;
    regenTurns: number;
    regenHpPerTurn: number;
    regenEnergyPerTurn: number;
  };
}

export interface DeathDropBag {
  id: string;
  ownerId: string;
  ownerName: string;
  x: number;
  y: number;
  items: GameItem[];
  equipment: PlayerEquipment;
  coins: number;
  probabilityStones: number;
  droppedAtTurn: number;
}

export interface SavedPlayerLoadout {
  playerId: string;
  username: string;
  characterClass: CharacterClass | null;
  inventory: GameItem[];
  equipment: PlayerEquipment;
  coins: number;
  probabilityStones: number;
  soulShards: number;
  savedAt: number;
}

export interface GroundCoin {
  id: string;
  x: number;
  y: number;
  value: number;
  tier: 'bronze' | 'silver' | 'gold' | 'quantum';
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

/** Monster blueprint waiting until the player approaches (lazy spawn). */
export interface PendingMonsterSpawn {
  id: string;
  name: string;
  level: number;
  archetype: MonsterArchetype;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  expReward: number;
  shardReward: number;
  color: string;
  symbol: string;
  visualVariant?: MonsterVisualVariant;
}

export interface DungeonState {
  floor: number;
  width: number;
  height: number;
  tiles: Tile[][];
  rooms: Room[];
  monsters: Monster[];
  /** Inactive until player is nearby — keeps far rooms cheap to simulate */
  pendingSpawns?: PendingMonsterSpawn[];
  stairsPos: { x: number; y: number };
  activeEvent?: EnvironmentalEvent | null;
  shopItems?: GameItem[];
  groundCoins: GroundCoin[];
  checkpoints: { x: number; y: number; activated: boolean }[];
  deathDrops: DeathDropBag[];
  /** Pushable crates for pit/button puzzles */
  crates?: PuzzleCrate[];
  /** Pressure-plate / gate / pit wiring */
  puzzleLinks?: PuzzleLink[];
}

export interface CheckpointSnapshot {
  floor: number;
  x: number;
  y: number;
  player: Player;
  dungeon: DungeonState;
  score: number;
  monstersSlain: number;
  turn: number;
  timestamp: number;
}

export interface CoopPlayerSlot {
  playerId: string;
  accountId?: string;
  username: string;
  characterClass: CharacterClass | null;
  ready: boolean;
  movedThisTurn: boolean;
  player?: Player;
  alive: boolean;
  lastCheckpoint?: { floor: number; x: number; y: number };
  preDeathLoadout?: SavedPlayerLoadout;
}

export interface CoopRoomState {
  roomId: string;
  status: 'lobby' | 'playing' | 'gameover';
  turn: number;
  players: CoopPlayerSlot[];
  dungeon: DungeonState | null;
  logs: CombatLogEntry[];
  score: number;
  monstersSlain: number;
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
  coins?: number;
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
