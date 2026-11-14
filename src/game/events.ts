import { EnvironmentalEvent, GameItem, Player, DungeonState, ItemRarity } from './types';
import {
  createItem,
  BASE_ITEMS,
  getProbabilityStoneCost,
  computeRequiredLevel
} from './items';

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

const RARITY_FLOOR: Record<ItemRarity, number> = {
  common: 1,
  rare: 1,
  epic: 2,
  legendary: 4,
  mythic: 7,
  'cyber-relic': 10
};

function shopRaritiesForFloor(floor: number): ItemRarity[] {
  const allowed = (Object.keys(RARITY_FLOOR) as ItemRarity[]).filter(r => floor >= RARITY_FLOOR[r]);
  // Bias stock toward the best tiers the floor unlocks
  if (floor >= 10) return ['legendary', 'mythic', 'cyber-relic', 'epic'];
  if (floor >= 7) return ['epic', 'legendary', 'mythic'];
  if (floor >= 4) return ['rare', 'epic', 'legendary'];
  if (floor >= 2) return ['rare', 'epic'];
  return allowed.length > 0 ? allowed : ['common', 'rare'];
}

function pickCatalogGearKeys(floor: number, count: number): string[] {
  const rarities = new Set(shopRaritiesForFloor(floor));
  const gearKeys = Object.keys(BASE_ITEMS).filter(k => {
    const it = BASE_ITEMS[k];
    return it.type !== 'consumable' && rarities.has(it.rarity);
  });
  if (gearKeys.length === 0) return [];

  // Prefer a spread of slots so the shop feels like a loadout upgrade, not only weapons
  const byType = new Map<string, string[]>();
  for (const key of gearKeys) {
    const t = BASE_ITEMS[key].type;
    if (!byType.has(t)) byType.set(t, []);
    byType.get(t)!.push(key);
  }
  const types = [...byType.keys()].sort(() => Math.random() - 0.5);
  const picked: string[] = [];
  let ti = 0;
  while (picked.length < count && types.length > 0) {
    const type = types[ti % types.length];
    const pool = byType.get(type) || [];
    if (pool.length === 0) {
      types.splice(ti % types.length, 1);
      continue;
    }
    const idx = Math.floor(Math.random() * pool.length);
    const key = pool.splice(idx, 1)[0];
    picked.push(key);
    ti++;
  }
  return picked;
}

/**
 * Generates NPC Merchant inventory at the start of every floor:
 * - Tiered potions (Vitality, Energy, Dual, Regen Over Time, Igneous Burn, Aegis Shield, Cooldown Reset) in Cyber-Coins
 * - Probability Stone (+60% Forge success) priced at 1000 Coins on Floor 1 scaling by floor
 * - Elite cybernetic weapons & armor in Soul Shards (Diamonds), upgrading with floor depth
 */
export function generateShopItems(floor: number, includeBlackMarketBonus = false): GameItem[] {
  const uid = (tag: string) => `shop_${tag}_f${floor}_${Math.random().toString(36).substring(2, 6)}`;
  const coinScale = 1 + Math.max(0, floor - 1) * 0.14;
  const stoneCost = getProbabilityStoneCost(floor);
  const gearLevel = Math.max(1, floor);

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
    ...(floor >= 3 ? ['omega_medkit', 'grand_regen_serum', 'inferno_potion', 'omni_serum'] : ['overclock_serum']),
    ...(floor >= 6 ? ['teleport_scroll'] : []),
    ...(floor >= 9 ? ['overclock_serum'] : [])
  ];

  const potions: GameItem[] = [...new Set(potionKeys)].map(key => {
    const item = createItem(key, uid(key));
    return {
      ...item,
      currency: 'coins',
      value: Math.round(item.value * coinScale)
    };
  });

  const stoneItem: GameItem = {
    id: uid('prob_stone'),
    baseKey: 'probability_stone',
    name: 'Probability Stone (+60%)',
    type: 'consumable',
    rarity: 'legendary',
    description: 'Insert into the Forge upgrade slot to boost success rate by +60% (40%+ becomes 100% safe!).',
    effectType: 'stone',
    currency: 'coins',
    value: stoneCost,
    icon: '🔮'
  };

  // Signature shop pieces — power and rarity climb with floor
  const wepKey = floor >= 10 ? 'shop_void_katana' : floor >= 5 ? 'shop_void_katana' : 'shop_plasma_katana';
  const wepRarity: ItemRarity = floor >= 10 ? 'mythic' : floor >= 5 ? 'legendary' : 'epic';
  const armorRarity: ItemRarity = floor >= 10 ? 'mythic' : floor >= 5 ? 'legendary' : 'epic';
  const signatureGear: GameItem[] = [
    {
      id: uid('wep'),
      baseKey: wepKey,
      name: floor >= 5 ? 'Void-Edge Plasma Katana' : 'Plasma Arc Katana',
      type: 'weapon',
      weaponCategory: 'katana',
      allowedClasses: ['striker'],
      rarity: wepRarity,
      description: 'Superheated energy blade engineered for slicing rogue mainframe cores.',
      attackBonus: 14 + Math.floor(floor * 1.6) + Math.floor(Math.max(0, floor - 5) * 1.2),
      critBonus: 0.16 + Math.min(0.08, floor * 0.004),
      currency: 'shards',
      value: 65 + floor * 8 + Math.max(0, floor - 5) * 6,
      icon: '⚔️',
      upgradeLevel: 0,
      itemLevel: gearLevel,
      requiredLevel: computeRequiredLevel(gearLevel, wepRarity)
    },
    {
      id: uid('arm'),
      baseKey: 'shop_aegis_armor',
      name: floor >= 8 ? 'Aegis Quantum Carapace' : 'Aegis Carbon Nano-Weave',
      type: 'chest',
      rarity: armorRarity,
      description: 'Hardened graphene composite armor with built-in kinetic dissipators.',
      defenseBonus: 10 + Math.floor(floor * 1.3) + Math.floor(Math.max(0, floor - 5) * 0.9),
      hpBonus: 35 + floor * 5 + Math.max(0, floor - 5) * 4,
      currency: 'shards',
      value: 70 + floor * 8 + Math.max(0, floor - 5) * 6,
      icon: '🛡️',
      upgradeLevel: 0,
      itemLevel: gearLevel,
      requiredLevel: computeRequiredLevel(gearLevel, armorRarity)
    }
  ];

  // Extra catalog gear — more slots unlock deeper in the run
  const extraSlots = Math.min(5, 1 + Math.floor((floor - 1) / 2) + (floor >= 8 ? 1 : 0));
  const catalogKeys = pickCatalogGearKeys(floor, extraSlots);
  const catalogGear: GameItem[] = catalogKeys.map((key, i) => {
    const item = createItem(key, uid(`cat_${i}`), gearLevel + (floor >= 6 ? 1 : 0));
    const rarityMult =
      item.rarity === 'cyber-relic'
        ? 3.2
        : item.rarity === 'mythic'
        ? 2.6
        : item.rarity === 'legendary'
        ? 2.1
        : item.rarity === 'epic'
        ? 1.6
        : 1.25;
    return {
      ...item,
      currency: 'shards' as const,
      value: Math.max(40, Math.round((item.value || 30) * rarityMult + floor * 5))
    };
  });

  const shardGear = [...signatureGear, ...catalogGear];

  if (includeBlackMarketBonus) {
    const bonusKey = floor >= 8 ? 'mythic_chronos_ring' : floor >= 4 ? 'mythic_chronos_ring' : 'crimson_signet';
    const bonusRelic = createItem(bonusKey, uid('bm_relic'), gearLevel + 1);
    shardGear.push({
      ...bonusRelic,
      currency: 'shards',
      value: 95 + floor * 10
    });
  }

  // Deep floors: second weapon for another class so the shop stays relevant for every role
  if (floor >= 3) {
    const classWeapons: Array<{ key: string; floorMin: number }> = [
      { key: 'arcane_pulse_staff', floorMin: 3 },
      { key: 'titan_greatsword', floorMin: 3 },
      { key: 'katana_neon', floorMin: 4 }
    ];
    for (const entry of classWeapons) {
      if (floor < entry.floorMin) continue;
      if (!BASE_ITEMS[entry.key]) continue;
      const already = shardGear.some(g => g.baseKey === entry.key);
      if (already) continue;
      const w = createItem(entry.key, uid(`cls_${entry.key}`), gearLevel);
      shardGear.push({
        ...w,
        currency: 'shards',
        value: Math.max(55, Math.round((w.value || 40) * 1.8 + floor * 6))
      });
    }
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
