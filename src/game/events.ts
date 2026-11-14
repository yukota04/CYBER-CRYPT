import { EnvironmentalEvent, GameItem, Monster, Player, DungeonState } from './types';
import { createItem, BASE_ITEMS, getProbabilityStoneCost } from './items';

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
 * Generates NPC Merchant inventory at the start of every floor:
 * - Tiered potions (Vitality, Energy, Dual, Regen Over Time, Igneous Burn, Aegis Shield, Cooldown Reset) in Cyber-Coins
 * - Probability Stone (+60% Forge success) priced at 1000 Coins on Floor 1 scaling by floor
 * - Elite cybernetic weapons & armor in Soul Shards (Diamonds)
 */
export function generateShopItems(floor: number, includeBlackMarketBonus = false): GameItem[] {
  const uid = (tag: string) => `shop_${tag}_f${floor}_${Math.random().toString(36).substring(2, 6)}`;
  const coinScale = 1 + Math.max(0, floor - 1) * 0.14;
  const stoneCost = getProbabilityStoneCost(floor);

  const potionKeys = [
    'stim_pack',
    'energy_cell',
    'super_stim',
    'hyper_cell',
    'dual_elixir',
    'regen_serum',
    'igneous_potion',
    'aegis_tonic',
    'berserk_vial',
    ...(floor >= 3 ? ['omega_medkit', 'grand_regen_serum', 'inferno_potion', 'omni_serum'] : ['overclock_serum'])
  ];

  const potions: GameItem[] = potionKeys.map(key => {
    const item = createItem(key, uid(key));
    return {
      ...item,
      currency: 'coins',
      value: Math.round(item.value * coinScale)
    };
  });

  const stoneItem: GameItem = {
    id: uid('prob_stone'),
    name: 'Probability Stone (+60%)',
    type: 'consumable',
    rarity: 'legendary',
    description: 'Insert into the Forge upgrade slot to boost success rate by +60% (40%+ becomes 100% safe!).',
    effectType: 'stone',
    currency: 'coins',
    value: stoneCost,
    icon: '🔮'
  };

  const gearLevel = Math.max(1, floor);
  const shardGear: GameItem[] = [
    {
      id: uid('wep'),
      name: `${floor >= 5 ? 'Void-Edge Plasma Katana' : 'Plasma Arc Katana'} [Lv.${gearLevel}]`,
      type: 'weapon',
      weaponCategory: 'katana',
      allowedClasses: ['striker'],
      rarity: floor >= 5 ? 'legendary' : 'epic',
      description: 'Superheated energy blade engineered for slicing rogue mainframe cores.',
      attackBonus: 14 + Math.floor(floor * 1.6),
      critBonus: 0.16,
      currency: 'shards',
      value: 65 + floor * 6,
      icon: '⚔️',
      upgradeLevel: 0,
      itemLevel: gearLevel
    },
    {
      id: uid('arm'),
      name: `Aegis Carbon Nano-Weave [Lv.${gearLevel}]`,
      type: 'chest',
      rarity: floor >= 5 ? 'legendary' : 'epic',
      description: 'Hardened graphene composite armor with built-in kinetic dissipators.',
      defenseBonus: 10 + Math.floor(floor * 1.3),
      hpBonus: 35 + floor * 5,
      currency: 'shards',
      value: 70 + floor * 6,
      icon: '🛡️',
      upgradeLevel: 0,
      itemLevel: gearLevel
    }
  ];

  if (includeBlackMarketBonus) {
    const bonusRelic = createItem(
      floor >= 4 ? 'mythic_chronos_ring' : 'crimson_signet',
      uid('bm_relic'),
      gearLevel
    );
    shardGear.push({
      ...bonusRelic,
      currency: 'shards',
      value: 95 + floor * 8
    });
  }

  return [stoneItem, ...potions, ...shardGear];
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
