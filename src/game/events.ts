import { EnvironmentalEvent, GameItem, Monster, Player, DungeonState } from './types';
import { createItem, BASE_ITEMS } from './items';

export const ENVIRONMENTAL_EVENTS: EnvironmentalEvent[] = [
  {
    id: 'glitch_storm',
    name: 'GLITCH RADIATION STORM',
    description: 'Corrupted neural radiation leaks across all sectors. Atmospheric discharges inflict damage, but slain hostiles yield +60% Soul Shards.',
    icon: '⚡',
    bannerColor: '#ff0055',
    effectText: '+60% Shard Rewards · Periodic Glitch Hazard',
    hazardTurns: 8
  },
  {
    id: 'gravity_shift',
    name: 'GRAVITY NULL-FIELD / ZERO-G',
    description: 'Local quantum stabilizer collapsed. Low friction amplifies kinetic strikes (+25% ATK) and reduces skill energy costs by 30%.',
    icon: '🌀',
    bannerColor: '#00f0ff',
    effectText: '+25% Kinetic ATK · -30% Skill Energy Cost',
  },
  {
    id: 'black_market',
    name: 'BLACK MARKET SYNAPSE VAULT',
    description: 'A rogue black-market merchant drone has deployed a hidden trading node in this sub-level! Exchange Soul Shards for high-tier cybernetics.',
    icon: '🛒',
    bannerColor: '#ffe600',
    effectText: 'Merchant Node Spawned · Trade Soul Shards for Relics',
  },
  {
    id: 'emp_surge',
    name: 'HIGH-VOLTAGE IONIC SURGE',
    description: 'Sub-level capacitors are overflowing with raw plasma. Operatives regenerate +3 Energy per turn, but rogue AI security units deal +15% damage.',
    icon: '🔋',
    bannerColor: '#bd00ff',
    effectText: '+3 Energy Regen/Turn · Hostiles Deal +15% Damage',
  },
  {
    id: 'shadow_veil',
    name: 'OPTICAL CAMOUFLAGE / SHADOW GRID',
    description: 'Dense sensor dampeners obscure sightlines to 5 tiles, but sensory overclocks increase Critical Strike chance by +20%!',
    icon: '👁️',
    bannerColor: '#10b981',
    effectText: '+20% Critical Chance · Optical Vision Reduced to 5',
  }
];

/**
 * Determines if an environmental event triggers on this floor.
 * Triggers every 5 floors (Floor 5, 10, 15, 20, etc.).
 */
export function getEnvironmentalEventForFloor(floor: number, seed = 0): EnvironmentalEvent | null {
  if (floor <= 0 || floor % 5 !== 0) {
    return null;
  }
  // Deterministic selection based on floor + seed
  const index = Math.abs(Math.floor(floor / 5) + seed) % ENVIRONMENTAL_EVENTS.length;
  return { ...ENVIRONMENTAL_EVENTS[index] };
}

/**
 * Generates high-tier shop inventory for Black Market floors.
 */
export function generateShopItems(floor: number): GameItem[] {
  const shopList: GameItem[] = [
    {
      id: `shop_stim_${floor}_${Math.random().toString(36).substring(2, 6)}`,
      name: 'Hyper-Nanite Surge Injector',
      type: 'consumable',
      rarity: 'rare',
      description: 'Military-grade medical nanites. Instantly restores 85 HP.',
      healAmount: 85,
      effectType: 'heal',
      value: 35, // Soul shards cost
      icon: '💉'
    },
    {
      id: `shop_cell_${floor}_${Math.random().toString(36).substring(2, 6)}`,
      name: 'Supercharged Tachyon Cell',
      type: 'consumable',
      rarity: 'rare',
      description: 'Restores 60 Energy immediately and removes cooldowns.',
      energyAmount: 60,
      effectType: 'energy',
      value: 30, // Soul shards cost
      icon: '🔋'
    },
    {
      id: `shop_wep_${floor}_${Math.random().toString(36).substring(2, 6)}`,
      name: 'Plasma Arc Katana',
      type: 'weapon',
      rarity: 'epic',
      description: 'Superheated energy blade engineered for slicing rogue mainframe cores.',
      attackBonus: 14 + Math.floor(floor * 1.5),
      critBonus: 0.16,
      value: 75, // Soul shards cost
      icon: '⚔️'
    },
    {
      id: `shop_arm_${floor}_${Math.random().toString(36).substring(2, 6)}`,
      name: 'Aegis Carbon Nano-Weave',
      type: 'armor',
      rarity: 'epic',
      description: 'Hardened graphene composite armor with built-in kinetic dissipators.',
      defenseBonus: 10 + Math.floor(floor * 1.2),
      hpBonus: 35,
      value: 80, // Soul shards cost
      icon: '🛡️'
    }
  ];

  return shopList;
}

/**
 * Applies turn-based environmental hazards (e.g. glitch radiation damage every N turns).
 */
export function applyEnvironmentalTurnEffects(
  player: Player,
  dungeon: DungeonState,
  turn: number
): { damage: number; message?: string } {
  if (!dungeon.activeEvent) return { damage: 0 };

  if (dungeon.activeEvent.id === 'glitch_storm') {
    const interval = dungeon.activeEvent.hazardTurns || 8;
    if (turn > 0 && turn % interval === 0) {
      const dmg = Math.max(2, 3 + Math.floor(dungeon.floor * 0.4));
      return {
        damage: dmg,
        message: `GLITCH STORM: Corrupted neural radiation zaps your cyberware for ${dmg} glitch damage!`
      };
    }
  }

  return { damage: 0 };
}
