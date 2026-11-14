import {
  CharacterClass,
  GameItem,
  ItemRarity,
  ItemType,
  WeaponCategory
} from './types';

export const CATALOG_TARGET_PER_BUCKET = 22;

type ItemDef = Omit<GameItem, 'id'>;

const ROLES: CharacterClass[] = ['striker', 'technomancer', 'vanguard'];
const ARMOR_TYPES: ItemType[] = ['helmet', 'chest', 'gloves', 'legs', 'boots'];

const RARITY_CURVE: ItemRarity[] = [
  'common',
  'common',
  'common',
  'common',
  'common',
  'common',
  'rare',
  'rare',
  'rare',
  'rare',
  'rare',
  'rare',
  'epic',
  'epic',
  'epic',
  'epic',
  'epic',
  'legendary',
  'legendary',
  'legendary',
  'mythic',
  'cyber-relic'
];

const WEAPON_PREFIX: Record<CharacterClass, string[]> = {
  striker: [
    'Neon', 'Phantom', 'Void', 'Pulse', 'Shadow', 'Razor', 'Glitch', 'Chrome',
    'Specter', 'Ion', 'Quark', 'Binary', 'Silent', 'Fever', 'Mirage', 'Flux',
    'Drift', 'Echo', 'Nova', 'Cipher', 'Blade', 'Shard'
  ],
  technomancer: [
    'Arcane', 'Synth', 'Chrono', 'Plasma', 'Hex', 'Rune', 'Astral', 'Vector',
    'Prism', 'Mana', 'Coil', 'Spark', 'Warp', 'Logic', 'Oracle', 'Signal',
    'Lattice', 'Axiom', 'Nebula', 'Core', 'Spell', 'Grid'
  ],
  vanguard: [
    'Bastion', 'Titan', 'Aegis', 'Iron', 'Bulwark', 'Forge', 'Siege', 'Rampart',
    'Heavy', 'Guard', 'Pillar', 'Steel', 'Jugger', 'Anchor', 'Citadel', 'Plate',
    'War', 'Dread', 'Summit', 'Colossus', 'Phalanx', 'Keeper'
  ]
};

const WEAPON_NOUN: Record<CharacterClass, string[]> = {
  striker: [
    'Katana', 'Tanto', 'Saber', 'Daggers', 'Pistol', 'Carbine', 'Ripper', 'Fang',
    'Edge', 'Needle', 'Shiv', 'Cutter', 'Rail', 'Spike', 'Scimitar', 'Dirk',
    'Lanceblade', 'Stiletto', 'Flechette', 'Arcblade', 'Sidearm', 'Skewer'
  ],
  technomancer: [
    'Staff', 'Rod', 'Focus', 'Scepter', 'Wand', 'Catalyst', 'Channel', 'Orb',
    'Spire', 'Crook', 'Caduceus', 'Relic', 'Conduit', 'Glyph', 'Totem', 'Matrix',
    'Antenna', 'Lens', 'Beacon', 'Nexus', 'Monolith', 'Array'
  ],
  vanguard: [
    'Broadsword', 'Claymore', 'Halberd', 'Lance', 'Maul', 'Cleaver', 'Greatsword',
    'Axe', 'Gladius', 'Spear', 'Warblade', 'Sledge', 'Pike', 'Crusher', 'Falchion',
    'Towerblade', 'Buster', 'Rampart Blade', 'Siege Edge', 'Anvil', 'Breaker', 'Guardblade'
  ]
};

const ARMOR_NOUN: Record<ItemType, string[]> = {
  weapon: [],
  offhand: [],
  helmet: [
    'Helm', 'Visor', 'Mask', 'Crown', 'Hood', 'Casque', 'Dome', 'Circlet',
    'Skullcap', 'Goggles', 'Headset', 'Browplate', 'Diadem', 'Coif', 'Shelter',
    'Peak', 'Crest', 'Halo', 'Cage', 'Lenscap', 'Hardhat', 'Coronet'
  ],
  chest: [
    'Vest', 'Carapace', 'Harness', 'Chassis', 'Plate', 'Jacket', 'Cuirass', 'Mantle',
    'Rig', 'Shell', 'Coat', 'Aegis', 'Frame', 'Mesh', 'Guard', 'Brigandine',
    'Exoshell', 'Coreplate', 'Wrap', 'Bastion', 'Sash', 'Overcoat'
  ],
  gloves: [
    'Gloves', 'Gauntlets', 'Grips', 'Wraps', 'Fists', 'Claws', 'Mitts', 'Bracers',
    'Handguards', 'Digits', 'Talons', 'Pads', 'Knuckles', 'Cuffs', 'Touch',
    'Handles', 'Weavers', 'Drivers', 'Links', 'Palms', 'Shells', 'Guards'
  ],
  legs: [
    'Pants', 'Greaves', 'Legplates', 'Treads', 'Chaps', 'Guards', 'Stride', 'Kilt',
    'Shinguards', 'Runners', 'Plates', 'Trousers', 'Sabatons Legs', 'Skirts', 'Pads',
    'Rails', 'Columns', 'Pistons', 'Brace', 'Shieldlegs', 'Hydraulics', 'Locks'
  ],
  boots: [
    'Boots', 'Sabatons', 'Treads', 'Steppers', 'Solers', 'Thrusters', 'Kickers',
    'Stompers', 'Walkers', 'Pads', 'Anchors', 'Slippers', 'Jets', 'Grips', 'Spurs',
    'Tracks', 'Hikers', 'Dashers', 'Magsoles', 'Heels', 'Clamps', 'Runners'
  ],
  ring: [],
  earrings: [],
  consumable: []
};

const OFFHAND_NOUN: Record<CharacterClass, string[]> = {
  striker: [
    'Buckler', 'Parry Blade', 'Holo Shield', 'Wrist Guard', 'Side Knife', 'Deflector',
    'Riposte Edge', 'Barrier Disc', 'Flash Guard', 'Shadow Plate', 'Counter Fang',
    'Phase Plate', 'Mirror Guard', 'Dart Quiver', 'Pulse Guard', 'Chrome Disc',
    'Silent Plate', 'Edge Cover', 'Flicker Shield', 'Needle Guard', 'Ghost Plate', 'Cut Guard'
  ],
  technomancer: [
    'Focus Orb', 'Prism', 'Codex', 'Battery', 'Glyph Plate', 'Mana Disc',
    'Signal Guard', 'Rune Book', 'Catalyst Cap', 'Lens Array', 'Vector Shield',
    'Spell Tome', 'Arc Cell', 'Logic Plate', 'Warp Disc', 'Oracle Eye',
    'Coil Guard', 'Nexus Chip', 'Astral Plate', 'Hex Mirror', 'Grid Tablet', 'Spark Cell'
  ],
  vanguard: [
    'Kite Shield', 'Tower Shield', 'Bulwark', 'Rampart Door', 'Aegis Plate', 'Wall Disc',
    'Bastion Lid', 'Iron Door', 'Siege Cover', 'Phalanx Guard', 'Citadel Face',
    'Heavy Board', 'Keeper Plate', 'Forge Lid', 'Pillar Shield', 'Steel Gate',
    'Jugger Door', 'Anchor Plate', 'War Board', 'Dread Cover', 'Summit Shield', 'Guard Door'
  ]
};

const RING_NAMES = [
  'Signal Band', 'Pulse Loop', 'Void Seal', 'Chrome Ring', 'Ion Circle', 'Binary Band',
  'Flux Seal', 'Nova Loop', 'Cipher Ring', 'Drift Band', 'Echo Seal', 'Quark Loop',
  'Lattice Ring', 'Axiom Band', 'Nebula Seal', 'Core Loop', 'Prism Circle', 'Warp Band',
  'Oracle Seal', 'Grid Ring', 'Spark Loop', 'Chrono Band'
];

const EARRING_NAMES = [
  'Telemetry Studs', 'Wave Drops', 'Overdrive Cuffs', 'Signal Hooks', 'Pulse Clips',
  'Void Hoops', 'Chrome Studs', 'Ion Drops', 'Binary Cuffs', 'Flux Hooks', 'Nova Clips',
  'Cipher Hoops', 'Drift Studs', 'Echo Drops', 'Quark Cuffs', 'Lattice Hooks',
  'Axiom Clips', 'Nebula Hoops', 'Core Studs', 'Prism Drops', 'Warp Cuffs', 'Oracle Hooks'
];

const CONSUMABLE_DEFS: Array<{
  name: string;
  description: string;
  rarity: ItemRarity;
  effectType: NonNullable<GameItem['effectType']>;
  icon: string;
  value: number;
  healAmount?: number;
  energyAmount?: number;
  regenTurns?: number;
  regenHpPerTurn?: number;
  regenEnergyPerTurn?: number;
  burnTurns?: number;
  burnDamage?: number;
  burnRadius?: number;
  shieldGrant?: number;
}> = [
  { name: 'Micro Stim Patch', description: 'Quick field patch restoring 35 HP.', rarity: 'common', effectType: 'heal', icon: '🩹', value: 25, healAmount: 35 },
  { name: 'Field Battery Sliver', description: 'Tiny cell restoring 25 Energy.', rarity: 'common', effectType: 'energy', icon: '🔋', value: 25, energyAmount: 25 },
  { name: 'Glow Tonic', description: 'Restores 45 HP and 20 Energy.', rarity: 'common', effectType: 'dual', icon: '🧪', value: 40, healAmount: 45, energyAmount: 20 },
  { name: 'Mesh Foam Spray', description: 'Regenerates +8 HP/turn for 4 turns.', rarity: 'common', effectType: 'regen', icon: '🧴', value: 35, regenTurns: 4, regenHpPerTurn: 8, regenEnergyPerTurn: 2 },
  { name: 'Spark Cap', description: 'Restores 55 Energy instantly.', rarity: 'rare', effectType: 'energy', icon: '⚡', value: 55, energyAmount: 55 },
  { name: 'Trauma Foam', description: 'Restores 90 HP instantly.', rarity: 'rare', effectType: 'heal', icon: '💉', value: 60, healAmount: 90 },
  { name: 'Twin Capacitor Draught', description: 'Restores 70 HP and 40 Energy.', rarity: 'rare', effectType: 'dual', icon: '🧉', value: 70, healAmount: 70, energyAmount: 40 },
  { name: 'Napalm Bead', description: 'Burns foes in a 3-tile radius for 4 turns.', rarity: 'rare', effectType: 'igneous', icon: '🔥', value: 75, burnTurns: 4, burnDamage: 8, burnRadius: 3 },
  { name: 'Kinetic Bubble', description: 'Grants +40 Kinetic Shield.', rarity: 'rare', effectType: 'shield', icon: '🛡️', value: 65, shieldGrant: 40 },
  { name: 'Synapse Flush', description: 'Resets cooldowns and restores 20 Energy.', rarity: 'rare', effectType: 'cooldown_reset', icon: '🧬', value: 80 },
  { name: 'Adrenal Spike', description: '+8 ATK and 100% crit for 3 turns.', rarity: 'epic', effectType: 'buff_overclock', icon: '💥', value: 95 },
  { name: 'Warp Bead', description: 'Emergency warp to a safer tile.', rarity: 'epic', effectType: 'teleport', icon: '🌀', value: 100 },
  { name: 'Deep Tissue Gel', description: 'Restores 160 HP instantly.', rarity: 'epic', effectType: 'heal', icon: '🧫', value: 110, healAmount: 160 },
  { name: 'Reactor Siphon', description: 'Restores 120 Energy.', rarity: 'epic', effectType: 'energy', icon: '🧲', value: 110, energyAmount: 120 },
  { name: 'Omni Draught+', description: 'Restores 140 HP and 80 Energy.', rarity: 'epic', effectType: 'dual', icon: '🍷', value: 130, healAmount: 140, energyAmount: 80 },
  { name: 'Bio Loom Serum', description: '+22 HP & +10 Energy/turn for 7 turns.', rarity: 'epic', effectType: 'regen', icon: '🌿', value: 120, regenTurns: 7, regenHpPerTurn: 22, regenEnergyPerTurn: 10 },
  { name: 'Thermite Bloom', description: '5-tile fire storm for 5 turns.', rarity: 'legendary', effectType: 'igneous', icon: '🌋', value: 150, burnTurns: 5, burnDamage: 14, burnRadius: 5 },
  { name: 'Aegis Dome Flask', description: 'Grants +110 Kinetic Shield.', rarity: 'legendary', effectType: 'shield', icon: '🏰', value: 150, shieldGrant: 110 },
  { name: 'Prime Med Matrix', description: 'Restores 240 HP instantly.', rarity: 'legendary', effectType: 'heal', icon: '❤️', value: 170, healAmount: 240 },
  { name: 'Tachyon Flood', description: 'Restores 160 Energy.', rarity: 'legendary', effectType: 'energy', icon: '💠', value: 170, energyAmount: 160 },
  { name: 'Singularity Tonic', description: 'Restores 220 HP and 140 Energy.', rarity: 'mythic', effectType: 'dual', icon: '✨', value: 220, healAmount: 220, energyAmount: 140 },
  { name: 'Relic Cleanse Vial', description: 'Purges cooldowns, restores 50 Energy, grants brief overclock.', rarity: 'cyber-relic', effectType: 'cooldown_reset', icon: '🧿', value: 280 }
];

function scaleForRarity(r: ItemRarity): number {
  switch (r) {
    case 'common':
      return 1;
    case 'rare':
      return 1.45;
    case 'epic':
      return 2.0;
    case 'legendary':
      return 2.8;
    case 'mythic':
      return 3.6;
    case 'cyber-relic':
      return 4.5;
    default:
      return 1;
  }
}

function weaponCategoryFor(role: CharacterClass, index: number): WeaponCategory {
  if (role === 'striker') {
    const opts: WeaponCategory[] = ['katana', 'daggers', 'pistol'];
    return opts[index % opts.length];
  }
  if (role === 'technomancer') return index % 5 === 0 ? 'focus' : 'staff';
  const opts: WeaponCategory[] = ['sword', 'greatsword', 'sword'];
  return opts[index % opts.length];
}

function weaponIcon(role: CharacterClass, cat: WeaponCategory): string {
  if (cat === 'pistol') return '🔫';
  if (cat === 'staff' || cat === 'focus') return '🪄';
  if (cat === 'greatsword') return '⚔️';
  if (cat === 'daggers') return '🗡️';
  if (role === 'vanguard') return '🗡️';
  return '⚔️';
}

function armorIcon(type: ItemType): string {
  switch (type) {
    case 'helmet':
      return '🪖';
    case 'chest':
      return '🦺';
    case 'gloves':
      return '🧤';
    case 'legs':
      return '👖';
    case 'boots':
      return '🥾';
    default:
      return '🛡️';
  }
}

function countMatching(
  catalog: Record<string, ItemDef>,
  pred: (item: ItemDef) => boolean
): number {
  let n = 0;
  for (const item of Object.values(catalog)) {
    if (pred(item)) n++;
  }
  return n;
}

function nextIndex(existing: number): number {
  return existing; // 0-based index for naming among generated fill
}

/** Expand catalog so each role has 22 weapons/armor/offhands; shared pools hit 22 too. */
export function expandItemCatalog(base: Record<string, ItemDef>): Record<string, ItemDef> {
  const catalog: Record<string, ItemDef> = { ...base };

  for (const role of ROLES) {
    // Weapons
    let wCount = countMatching(
      catalog,
      i => i.type === 'weapon' && !!i.allowedClasses?.includes(role)
    );
    let gen = 0;
    while (wCount < CATALOG_TARGET_PER_BUCKET) {
      const idx = nextIndex(wCount);
      const rarity = RARITY_CURVE[Math.min(idx, RARITY_CURVE.length - 1)];
      const mult = scaleForRarity(rarity);
      const cat = weaponCategoryFor(role, idx);
      const twoHanded = cat === 'greatsword' || cat === 'daggers' || (cat === 'staff' && idx % 4 === 3);
      const prefix = WEAPON_PREFIX[role][idx % WEAPON_PREFIX[role].length];
      const noun = WEAPON_NOUN[role][idx % WEAPON_NOUN[role].length];
      const key = `gen_${role}_weapon_${String(idx).padStart(2, '0')}`;
      if (!catalog[key]) {
        const range =
          cat === 'pistol' || cat === 'staff' || cat === 'focus'
            ? 4 + (idx % 2)
            : cat === 'sword' && role === 'vanguard' && idx % 3 === 2
            ? 5
            : 2 + (idx % 2);
        catalog[key] = {
          name: `${prefix} ${noun}`,
          type: 'weapon',
          weaponCategory: cat,
          allowedClasses: [role],
          twoHanded: twoHanded || undefined,
          rarity,
          description: `Custom ${role} armament Mk-${idx + 1} tuned for deep-crypt operations (Range ${range}).`,
          attackBonus: Math.round((8 + idx * 1.7) * mult),
          critBonus: Number((0.05 + idx * 0.008 + (rarity === 'mythic' || rarity === 'cyber-relic' ? 0.08 : 0)).toFixed(3)),
          attackRange: range,
          energyBonus: role === 'technomancer' ? Math.round(6 + idx * 1.2) : idx > 10 ? Math.round(4 + idx * 0.4) : undefined,
          hpBonus: role === 'vanguard' ? Math.round(8 + idx * 1.5) : undefined,
          value: Math.round((40 + idx * 28) * mult),
          icon: weaponIcon(role, cat)
        };
        wCount++;
      }
      gen++;
      if (gen > 40) break;
    }

    // Offhands
    let oCount = countMatching(
      catalog,
      i => i.type === 'offhand' && !!i.allowedClasses?.includes(role)
    );
    gen = 0;
    while (oCount < CATALOG_TARGET_PER_BUCKET) {
      const idx = nextIndex(oCount);
      const rarity = RARITY_CURVE[Math.min(idx, RARITY_CURVE.length - 1)];
      const mult = scaleForRarity(rarity);
      const noun = OFFHAND_NOUN[role][idx % OFFHAND_NOUN[role].length];
      const key = `gen_${role}_offhand_${String(idx).padStart(2, '0')}`;
      if (!catalog[key]) {
        catalog[key] = {
          name: `${WEAPON_PREFIX[role][idx % WEAPON_PREFIX[role].length]} ${noun}`,
          type: 'offhand',
          weaponCategory: role === 'vanguard' ? 'shield' : role === 'technomancer' ? 'focus' : 'daggers',
          allowedClasses: [role],
          rarity,
          description: `Secondary ${role} gear Mk-${idx + 1} for layered defense and tempo.`,
          defenseBonus: Math.round((3 + idx * 0.9) * mult),
          attackBonus: role === 'striker' ? Math.round((2 + idx * 0.6) * mult) : undefined,
          critBonus: role !== 'vanguard' ? Number((0.02 + idx * 0.004).toFixed(3)) : undefined,
          energyBonus: role === 'technomancer' ? Math.round(5 + idx) : undefined,
          hpBonus: role === 'vanguard' ? Math.round(10 + idx * 2) : undefined,
          value: Math.round((35 + idx * 22) * mult),
          icon: role === 'vanguard' ? '🛡️' : role === 'technomancer' ? '🔮' : '🗡️'
        };
        oCount++;
      }
      gen++;
      if (gen > 40) break;
    }

    // Armor slots
    for (const slot of ARMOR_TYPES) {
      let aCount = countMatching(
        catalog,
        i => i.type === slot && !!i.allowedClasses?.includes(role)
      );
      // Also count unclassed legacy armor once toward each role? No — leave legacy as universal;
      // only count class-locked toward per-role quota. Add class-locked until 22.
      gen = 0;
      while (aCount < CATALOG_TARGET_PER_BUCKET) {
        const idx = nextIndex(aCount);
        const rarity = RARITY_CURVE[Math.min(idx, RARITY_CURVE.length - 1)];
        const mult = scaleForRarity(rarity);
        const noun = ARMOR_NOUN[slot][idx % ARMOR_NOUN[slot].length];
        const prefix = WEAPON_PREFIX[role][idx % WEAPON_PREFIX[role].length];
        const key = `gen_${role}_${slot}_${String(idx).padStart(2, '0')}`;
        if (!catalog[key]) {
          const def: ItemDef = {
            name: `${prefix} ${noun}`,
            type: slot,
            allowedClasses: [role],
            rarity,
            description: `${role} ${slot} plating Mk-${idx + 1} forged for late-floor pressure.`,
            defenseBonus: Math.round((2 + idx * 0.85 + (slot === 'chest' ? 3 : 0)) * mult),
            value: Math.round((30 + idx * 20) * mult),
            icon: armorIcon(slot)
          };
          if (slot === 'helmet' || slot === 'chest' || slot === 'legs' || slot === 'boots') {
            def.hpBonus = Math.round((8 + idx * 2.2 + (slot === 'chest' ? 10 : 0)) * (0.7 + mult * 0.3));
          }
          if (slot === 'gloves' || slot === 'helmet') {
            def.critBonus = Number((0.02 + idx * 0.004).toFixed(3));
          }
          if (slot === 'gloves') {
            def.attackBonus = Math.round((2 + idx * 0.7) * mult);
          }
          if (role === 'technomancer' && (slot === 'helmet' || slot === 'chest' || slot === 'gloves')) {
            def.energyBonus = Math.round(6 + idx * 1.1);
          }
          if (role === 'striker' && (slot === 'gloves' || slot === 'boots')) {
            def.attackBonus = Math.round((3 + idx * 0.8) * mult);
          }
          catalog[key] = def;
          aCount++;
        }
        gen++;
        if (gen > 40) break;
      }
    }
  }

  // Shared rings
  let ringCount = countMatching(catalog, i => i.type === 'ring');
  let gen = 0;
  while (ringCount < CATALOG_TARGET_PER_BUCKET) {
    const idx = nextIndex(ringCount);
    const rarity = RARITY_CURVE[Math.min(idx, RARITY_CURVE.length - 1)];
    const mult = scaleForRarity(rarity);
    const key = `gen_shared_ring_${String(idx).padStart(2, '0')}`;
    if (!catalog[key]) {
      catalog[key] = {
        name: RING_NAMES[idx % RING_NAMES.length],
        type: 'ring',
        rarity,
        description: `Encrypted signet Mk-${idx + 1} amplifying operative output.`,
        attackBonus: Math.round((2 + idx * 0.55) * mult),
        defenseBonus: Math.round((2 + idx * 0.45) * mult),
        critBonus: Number((0.03 + idx * 0.005).toFixed(3)),
        energyBonus: Math.round(4 + idx * 0.9),
        hpBonus: idx > 8 ? Math.round(6 + idx) : undefined,
        value: Math.round((35 + idx * 24) * mult),
        icon: '💍'
      };
      ringCount++;
    }
    gen++;
    if (gen > 40) break;
  }

  // Shared earrings
  let earCount = countMatching(catalog, i => i.type === 'earrings');
  gen = 0;
  while (earCount < CATALOG_TARGET_PER_BUCKET) {
    const idx = nextIndex(earCount);
    const rarity = RARITY_CURVE[Math.min(idx, RARITY_CURVE.length - 1)];
    const mult = scaleForRarity(rarity);
    const key = `gen_shared_earrings_${String(idx).padStart(2, '0')}`;
    if (!catalog[key]) {
      catalog[key] = {
        name: EARRING_NAMES[idx % EARRING_NAMES.length],
        type: 'earrings',
        rarity,
        description: `Neural jewelry Mk-${idx + 1} sharpening focus and vigor.`,
        attackBonus: Math.round((1 + idx * 0.45) * mult),
        critBonus: Number((0.025 + idx * 0.0045).toFixed(3)),
        energyBonus: Math.round(8 + idx * 1.2),
        defenseBonus: idx > 10 ? Math.round(2 + idx * 0.3) : undefined,
        value: Math.round((35 + idx * 22) * mult),
        icon: '💎'
      };
      earCount++;
    }
    gen++;
    if (gen > 40) break;
  }

  // Consumables
  let cCount = countMatching(catalog, i => i.type === 'consumable');
  gen = 0;
  while (cCount < CATALOG_TARGET_PER_BUCKET) {
    const idx = nextIndex(cCount);
    const def = CONSUMABLE_DEFS[idx % CONSUMABLE_DEFS.length];
    const key = `gen_shared_consumable_${String(idx).padStart(2, '0')}`;
    if (!catalog[key]) {
      catalog[key] = {
        name: def.name,
        type: 'consumable',
        rarity: def.rarity,
        description: def.description,
        effectType: def.effectType,
        currency: 'coins',
        value: def.value,
        icon: def.icon,
        healAmount: def.healAmount,
        energyAmount: def.energyAmount,
        regenTurns: def.regenTurns,
        regenHpPerTurn: def.regenHpPerTurn,
        regenEnergyPerTurn: def.regenEnergyPerTurn,
        burnTurns: def.burnTurns,
        burnDamage: def.burnDamage,
        burnRadius: def.burnRadius,
        shieldGrant: def.shieldGrant
      };
      cCount++;
    }
    gen++;
    if (gen > 40) break;
  }

  return catalog;
}

/** Assign class tags to legacy universal armor so each role still sees full 22+ options via gens. */
export function catalogStats(catalog: Record<string, ItemDef>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of Object.values(catalog)) {
    const roles = item.allowedClasses?.length ? item.allowedClasses : ['shared'];
    for (const role of roles) {
      const key = `${role}:${item.type}`;
      out[key] = (out[key] || 0) + 1;
    }
  }
  return out;
}
