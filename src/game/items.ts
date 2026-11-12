import { GameItem, ItemRarity } from './types';

export const BASE_ITEMS: Record<string, Omit<GameItem, 'id'>> = {
  // WEAPONS
  'katana_neon': {
    name: 'Neon Katana',
    type: 'weapon',
    rarity: 'common',
    description: 'A finely tuned vibro-blade edged with energized cyan plasma.',
    attackBonus: 8,
    critBonus: 0.08,
    value: 50,
    icon: '🗡️'
  },
  'laser_pistol': {
    name: 'Pulse Blaster',
    type: 'weapon',
    rarity: 'rare',
    description: 'High frequency laser sidearm with thermal piercing beam.',
    attackBonus: 14,
    critBonus: 0.12,
    value: 120,
    icon: '🔫'
  },
  'plasma_scythe': {
    name: 'Void Reaper Scythe',
    type: 'weapon',
    rarity: 'epic',
    description: 'Harvests soul energy directly from breached monster matrices.',
    attackBonus: 22,
    critBonus: 0.18,
    energyBonus: 15,
    value: 280,
    icon: '⚡'
  },
  'cyber_railgun': {
    name: 'Chronos Rail-Cannon',
    type: 'weapon',
    rarity: 'legendary',
    description: 'Experimental hyper-velocity accelerator that warps digital spacetime.',
    attackBonus: 35,
    critBonus: 0.25,
    hpBonus: 20,
    value: 650,
    icon: '💥'
  },
  'relic_singularity_blade': {
    name: 'Aether Singularity Edge',
    type: 'weapon',
    rarity: 'cyber-relic',
    description: 'Ancient alien code fused into a superdense matter blade.',
    attackBonus: 50,
    critBonus: 0.35,
    energyBonus: 30,
    hpBonus: 30,
    value: 1200,
    icon: '✨'
  },

  // ARMOR
  'cyber_vest': {
    name: 'Kevlar Mesh Vest',
    type: 'armor',
    rarity: 'common',
    description: 'Standard operative vest woven with ballistic carbon fibers.',
    defenseBonus: 4,
    hpBonus: 15,
    value: 40,
    icon: '🦺'
  },
  'chitin_carapace': {
    name: 'Exo-Polymer Carapace',
    type: 'armor',
    rarity: 'rare',
    description: 'Lightweight reactive armor plating that absorbs shockwaves.',
    defenseBonus: 9,
    hpBonus: 35,
    value: 130,
    icon: '🥋'
  },
  'aegis_nanosuit': {
    name: 'Nanite Battle Harness',
    type: 'armor',
    rarity: 'epic',
    description: 'Active micro-servos continuously seal breaches and reinforce vital circuits.',
    defenseBonus: 16,
    hpBonus: 60,
    energyBonus: 20,
    value: 320,
    icon: '🛡️'
  },
  'hyperion_chassis': {
    name: 'Hyperion Bastion Chassis',
    type: 'armor',
    rarity: 'legendary',
    description: 'Military heavy dreadnought chassis impenetrable to conventional kinetic rounds.',
    defenseBonus: 26,
    hpBonus: 110,
    value: 700,
    icon: '🦾'
  },

  // ACCESSORIES
  'neural_chip': {
    name: 'Overclock Microchip',
    type: 'accessory',
    rarity: 'common',
    description: 'Accelerates synaptic impulses for faster reaction times.',
    critBonus: 0.06,
    energyBonus: 10,
    value: 45,
    icon: '💾'
  },
  'quantum_pendant': {
    name: 'Phase Ring',
    type: 'accessory',
    rarity: 'rare',
    description: 'Micro-gravitational ring allowing partial atomic displacement.',
    defenseBonus: 5,
    critBonus: 0.08,
    value: 140,
    icon: '💍'
  },
  'matrix_core': {
    name: 'Sub-Zero Cryo Coil',
    type: 'accessory',
    rarity: 'epic',
    description: 'Cools thermal dissipation systems, boosting overall power throughput.',
    attackBonus: 8,
    defenseBonus: 8,
    energyBonus: 25,
    value: 340,
    icon: '🔮'
  },

  // CONSUMABLES
  'stim_pack': {
    name: 'Nanite Med-Stim',
    type: 'consumable',
    rarity: 'common',
    description: 'Instant tissue re-synthesizer restoring 50 HP.',
    healAmount: 50,
    effectType: 'heal',
    value: 20,
    icon: '🧪'
  },
  'super_stim': {
    name: 'Hyper-Regen Syringe',
    type: 'consumable',
    rarity: 'rare',
    description: 'High-grade military coagulant restoring 120 HP.',
    healAmount: 120,
    effectType: 'heal',
    value: 50,
    icon: '💉'
  },
  'energy_cell': {
    name: 'Plasma Battery',
    type: 'consumable',
    rarity: 'common',
    description: 'Refills 40 points of operational energy.',
    energyAmount: 40,
    effectType: 'energy',
    value: 20,
    icon: '🔋'
  },
  'overclock_serum': {
    name: 'Overclock Elixir',
    type: 'consumable',
    rarity: 'epic',
    description: 'Grants temporary cyber overload (+10 Attack & 100% Crit for 4 turns).',
    effectType: 'buff_overclock',
    value: 80,
    icon: '⚡'
  },
  'teleport_scroll': {
    name: 'Quantum Warp Capsule',
    type: 'consumable',
    rarity: 'rare',
    description: 'Emergency escape beacon that warps you to a safe distant tile.',
    effectType: 'teleport',
    value: 60,
    icon: '🌀'
  }
};

let itemCounter = 1;

export function createItem(key: string, customId?: string): GameItem {
  const base = BASE_ITEMS[key] || BASE_ITEMS['stim_pack'];
  return {
    ...base,
    id: customId || `item_${key}_${Date.now()}_${itemCounter++}`
  };
}

export function generateRandomLoot(floor: number): GameItem {
  const keys = Object.keys(BASE_ITEMS);
  // Weight higher rarity by floor
  const roll = Math.random();
  let candidateKeys: string[] = [];

  if (floor >= 4 && roll < 0.15) {
    candidateKeys = keys.filter(k => BASE_ITEMS[k].rarity === 'legendary' || BASE_ITEMS[k].rarity === 'cyber-relic');
  } else if (floor >= 2 && roll < 0.40) {
    candidateKeys = keys.filter(k => BASE_ITEMS[k].rarity === 'epic');
  } else if (roll < 0.70) {
    candidateKeys = keys.filter(k => BASE_ITEMS[k].rarity === 'rare');
  } else {
    candidateKeys = keys.filter(k => BASE_ITEMS[k].rarity === 'common');
  }

  if (candidateKeys.length === 0) candidateKeys = keys;
  const picked = candidateKeys[Math.floor(Math.random() * candidateKeys.length)];
  return createItem(picked);
}
