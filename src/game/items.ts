import { CharacterClass, EquipSlot, GameItem, PlayerEquipment } from './types';

export const BASE_ITEMS: Record<string, Omit<GameItem, 'id'>> = {
  // === STRIKER WEAPONS (Katanas, Dual Daggers, Pulse Pistols) ===
  'cyber_tanto': {
    name: 'Cyber Tanto',
    type: 'weapon',
    weaponCategory: 'katana',
    allowedClasses: ['striker'],
    rarity: 'common',
    description: 'Compact monomolecular cyber-blade with integrated wrist-dart emitter (Range 3).',
    attackBonus: 6,
    critBonus: 0.06,
    attackRange: 3,
    value: 35,
    icon: '🗡️'
  },
  'katana_neon': {
    name: 'Neon Katana',
    type: 'weapon',
    weaponCategory: 'katana',
    allowedClasses: ['striker'],
    rarity: 'common',
    description: 'A finely tuned vibro-blade projecting short plasma arcs (Range 2).',
    attackBonus: 9,
    critBonus: 0.09,
    attackRange: 2,
    value: 50,
    icon: '🗡️'
  },
  'twin_phantom_daggers': {
    name: 'Twin Phantom Daggers',
    type: 'weapon',
    weaponCategory: 'daggers',
    allowedClasses: ['striker'],
    twoHanded: true,
    rarity: 'rare',
    description: 'Dual phase-shifted daggers delivering blistering critical combos (Range 2).',
    attackBonus: 16,
    critBonus: 0.16,
    attackRange: 2,
    value: 145,
    icon: '⚔️'
  },
  'laser_pistol': {
    name: 'Pulse Blaster Pistol',
    type: 'weapon',
    weaponCategory: 'pistol',
    allowedClasses: ['striker'],
    rarity: 'rare',
    description: 'Long-range high frequency laser sidearm firing up to 5 tiles.',
    attackBonus: 14,
    critBonus: 0.12,
    attackRange: 5,
    value: 120,
    icon: '🔫'
  },
  'void_katana': {
    name: 'Void Horizon Katana',
    type: 'weapon',
    weaponCategory: 'katana',
    allowedClasses: ['striker'],
    rarity: 'epic',
    description: 'Zero-latency carbon katana slicing targets up to 2 tiles away.',
    attackBonus: 24,
    critBonus: 0.20,
    energyBonus: 12,
    attackRange: 2,
    value: 300,
    icon: '⚡'
  },
  'hyperion_pulse_carbine': {
    name: 'Phantom Rail-Carbine',
    type: 'weapon',
    weaponCategory: 'pistol',
    allowedClasses: ['striker'],
    rarity: 'mythic',
    description: 'Mythic hyper-velocity precision carbine piercing armored matrices at 5 tiles.',
    attackBonus: 38,
    critBonus: 0.28,
    energyBonus: 20,
    attackRange: 5,
    value: 920,
    icon: '🔫'
  },
  'relic_singularity_blade': {
    name: 'Aether Singularity Katana',
    type: 'weapon',
    weaponCategory: 'katana',
    allowedClasses: ['striker'],
    rarity: 'cyber-relic',
    description: 'Ancient alien code fused into a superdense matter katana (Range 3).',
    attackBonus: 46,
    critBonus: 0.34,
    energyBonus: 25,
    hpBonus: 25,
    attackRange: 3,
    value: 1100,
    icon: '✨'
  },

  // === VANGUARD WEAPONS (1H Swords + Shields & 2H Greatswords/Espadones & Lances) ===
  'alloy_sword': {
    name: 'Alloy Broadsword',
    type: 'weapon',
    weaponCategory: 'sword',
    allowedClasses: ['vanguard'],
    rarity: 'common',
    description: 'Heavy titanium-carbide blade paired with short kinetic shock reach (Range 2).',
    attackBonus: 7,
    defenseBonus: 3,
    attackRange: 2,
    value: 45,
    icon: '⚔️'
  },
  'plasma_sword': {
    name: 'Hyper-Edge Paladin Sword',
    type: 'weapon',
    weaponCategory: 'sword',
    allowedClasses: ['vanguard'],
    rarity: 'rare',
    description: 'One-handed tactical saber projecting a magnetic parry arc (Range 2).',
    attackBonus: 15,
    defenseBonus: 6,
    hpBonus: 20,
    attackRange: 2,
    value: 150,
    icon: '⚔️'
  },
  'titan_greatsword': {
    name: 'Titan Claymore (Espadón)',
    type: 'weapon',
    weaponCategory: 'greatsword',
    allowedClasses: ['vanguard'],
    twoHanded: true,
    rarity: 'epic',
    description: 'Massive two-handed plasma greatsword that cleaves up to 2 tiles away.',
    attackBonus: 28,
    defenseBonus: 4,
    hpBonus: 35,
    critBonus: 0.08,
    attackRange: 2,
    value: 320,
    icon: '🗡️'
  },
  'vanguard_rail_lance': {
    name: 'Vanguard Rail-Lance',
    type: 'weapon',
    weaponCategory: 'greatsword',
    allowedClasses: ['vanguard'],
    twoHanded: true,
    rarity: 'epic',
    description: 'Long-barrel magnetic siege lance striking targets up to 5 tiles away.',
    attackBonus: 25,
    defenseBonus: 6,
    hpBonus: 45,
    attackRange: 5,
    value: 360,
    icon: '🔱'
  },
  'hyperion_greatsword': {
    name: 'Hyperion Dread-Greatsword',
    type: 'weapon',
    weaponCategory: 'greatsword',
    allowedClasses: ['vanguard'],
    twoHanded: true,
    rarity: 'legendary',
    description: 'Colossal reactor-fed greatsword sweeping up to 3 tiles.',
    attackBonus: 42,
    defenseBonus: 8,
    hpBonus: 65,
    critBonus: 0.14,
    attackRange: 3,
    value: 760,
    icon: '💥'
  },
  'aegis_mythic_halberd': {
    name: 'Eternal Solar Halberd',
    type: 'weapon',
    weaponCategory: 'greatsword',
    allowedClasses: ['vanguard'],
    twoHanded: true,
    rarity: 'mythic',
    description: 'Mythic plasma halberd launching seismic beams up to 4 tiles.',
    attackBonus: 48,
    defenseBonus: 12,
    hpBonus: 90,
    critBonus: 0.16,
    attackRange: 4,
    value: 960,
    icon: '🪓'
  },
  'aegis_kite_shield': {
    name: 'Aegis Kite Shield',
    type: 'offhand',
    weaponCategory: 'shield',
    allowedClasses: ['vanguard'],
    rarity: 'common',
    description: 'Reinforced ballistic shield projecting an active kinetic barrier.',
    defenseBonus: 6,
    hpBonus: 20,
    value: 45,
    icon: '🛡️'
  },
  'bastion_tower_shield': {
    name: 'Bastion Bulwark Shield',
    type: 'offhand',
    weaponCategory: 'shield',
    allowedClasses: ['vanguard'],
    rarity: 'epic',
    description: 'Heavy reactive tower shield absorbing brutal dungeon shockwaves.',
    defenseBonus: 14,
    hpBonus: 55,
    attackBonus: 4,
    value: 290,
    icon: '🛡️'
  },

  // === TECHNOMANCER WEAPONS (Mage Staves & Arcane Foci - Long Ranged 5 Tiles) ===
  'pulse_rod': {
    name: 'Pulse Conduit Staff',
    type: 'weapon',
    weaponCategory: 'staff',
    allowedClasses: ['technomancer'],
    rarity: 'common',
    description: 'Arcane-tech staff firing condensed synth-plasma bolts up to 5 tiles.',
    attackBonus: 6,
    energyBonus: 15,
    attackRange: 5,
    value: 40,
    icon: '🪄'
  },
  'arcane_pulse_staff': {
    name: 'Arcane Resonance Staff',
    type: 'weapon',
    weaponCategory: 'staff',
    allowedClasses: ['technomancer'],
    rarity: 'rare',
    description: 'Twin-coil mage staff amplifying ranged bolts (5 tiles) and capacitor reserves.',
    attackBonus: 14,
    energyBonus: 25,
    critBonus: 0.08,
    attackRange: 5,
    value: 140,
    icon: '🪄'
  },
  'plasma_scythe': {
    name: 'Void Weaver Staff',
    type: 'weapon',
    weaponCategory: 'staff',
    allowedClasses: ['technomancer'],
    rarity: 'epic',
    description: 'Harvests soul energy across 5 tiles directly from breached monster matrices.',
    attackBonus: 22,
    critBonus: 0.16,
    energyBonus: 35,
    attackRange: 5,
    value: 280,
    icon: '⚡'
  },
  'cyber_railgun': {
    name: 'Chronos Singularity Staff',
    type: 'weapon',
    weaponCategory: 'staff',
    allowedClasses: ['technomancer'],
    rarity: 'legendary',
    description: 'Experimental arcane catalyst firing hyper-velocity bolts across 5 tiles.',
    attackBonus: 35,
    critBonus: 0.22,
    energyBonus: 45,
    hpBonus: 20,
    attackRange: 5,
    value: 650,
    icon: '🌌'
  },
  'astral_mythic_staff': {
    name: 'Astral Nexus Arch-Staff',
    type: 'weapon',
    weaponCategory: 'staff',
    allowedClasses: ['technomancer'],
    rarity: 'mythic',
    description: 'Mythic star-forged mage staff projecting lethal plasma lances up to 5 tiles.',
    attackBonus: 44,
    critBonus: 0.26,
    energyBonus: 60,
    hpBonus: 35,
    attackRange: 5,
    value: 940,
    icon: '🔮'
  },
  'prism_focus': {
    name: 'Quantum Prism Focus',
    type: 'offhand',
    weaponCategory: 'focus',
    allowedClasses: ['technomancer'],
    rarity: 'rare',
    description: 'Floating holographic orb that sharpens Technomancer beam refraction.',
    attackBonus: 7,
    energyBonus: 20,
    critBonus: 0.05,
    value: 130,
    icon: '🔮'
  },
  'striker_holo_buckler': {
    name: 'Phase Parrying Dagger',
    type: 'offhand',
    weaponCategory: 'daggers',
    allowedClasses: ['striker'],
    rarity: 'rare',
    description: 'Compact offhand blade tuned for swift counter-slashes.',
    attackBonus: 8,
    critBonus: 0.08,
    defenseBonus: 2,
    value: 135,
    icon: '🗡️'
  },

  // === HELMETS (CASCO) ===
  'recon_visor': {
    name: 'Tactical Recon Visor',
    type: 'helmet',
    rarity: 'common',
    description: 'HUD-linked helmet visor improving target acquisition and cranial armor.',
    defenseBonus: 3,
    critBonus: 0.04,
    hpBonus: 10,
    value: 45,
    icon: '🪖'
  },
  'titanium_helm': {
    name: 'Bastion Assault Helm',
    type: 'helmet',
    rarity: 'rare',
    description: 'Layered composite helmet built to withstand blunt impact.',
    defenseBonus: 7,
    hpBonus: 25,
    value: 125,
    icon: '🪖'
  },
  'arcane_crown': {
    name: 'Neural Diadem Crown',
    type: 'helmet',
    rarity: 'epic',
    description: 'Synaptic circlet boosting combat cognition and energy flow.',
    defenseBonus: 9,
    energyBonus: 25,
    critBonus: 0.07,
    value: 260,
    icon: '👑'
  },

  // === CHEST ARMOR (PECHO) ===
  'cyber_vest': {
    name: 'Kevlar Mesh Vest',
    type: 'chest',
    rarity: 'common',
    description: 'Standard operative chestplate woven with ballistic carbon fibers.',
    defenseBonus: 5,
    hpBonus: 18,
    value: 45,
    icon: '🦺'
  },
  'chitin_carapace': {
    name: 'Exo-Polymer Carapace',
    type: 'chest',
    rarity: 'rare',
    description: 'Lightweight reactive chest armor plating that absorbs shockwaves.',
    defenseBonus: 10,
    hpBonus: 38,
    value: 140,
    icon: '🥋'
  },
  'aegis_nanosuit': {
    name: 'Nanite Battle Harness',
    type: 'chest',
    rarity: 'epic',
    description: 'Active micro-servos continuously seal breaches and reinforce vital circuits.',
    defenseBonus: 16,
    hpBonus: 65,
    energyBonus: 20,
    value: 320,
    icon: '🦺'
  },
  'hyperion_chassis': {
    name: 'Hyperion Bastion Chassis',
    type: 'chest',
    rarity: 'legendary',
    description: 'Military heavy dreadnought chestplate impenetrable to conventional rounds.',
    defenseBonus: 26,
    hpBonus: 110,
    value: 700,
    icon: '🦾'
  },

  // === GLOVES (MANOS) ===
  'tactical_grips': {
    name: 'Carbon Combat Gloves',
    type: 'gloves',
    rarity: 'common',
    description: 'Micro-textured tactical gloves stabilizing weapon recoil and grip.',
    attackBonus: 3,
    defenseBonus: 2,
    critBonus: 0.03,
    value: 40,
    icon: '🧤'
  },
  'kinetic_gauntlets': {
    name: 'Kinetic Pulse Gauntlets',
    type: 'gloves',
    rarity: 'rare',
    description: 'Servo-assisted gauntlets amplifying melee impact velocity.',
    attackBonus: 7,
    defenseBonus: 4,
    critBonus: 0.05,
    value: 135,
    icon: '🧤'
  },
  'synth_handwraps': {
    name: 'Quantum Weaver Gauntlets',
    type: 'gloves',
    rarity: 'epic',
    description: 'Nanofiber handwear accelerating spell triggers and critical strikes.',
    attackBonus: 11,
    defenseBonus: 6,
    critBonus: 0.09,
    energyBonus: 12,
    value: 280,
    icon: '🧤'
  },

  // === LEGS / PANTS (PANTALONES) ===
  'exo_trousers': {
    name: 'Reinforced Exo-Pants',
    type: 'legs',
    rarity: 'common',
    description: 'Articulated tactical legwear lined with flexible Kevlar pads.',
    defenseBonus: 4,
    hpBonus: 16,
    value: 45,
    icon: '👖'
  },
  'carbon_greaves': {
    name: 'Carbon Stride Greaves',
    type: 'legs',
    rarity: 'rare',
    description: 'Powered leg armor enhancing stance stability under heavy assault.',
    defenseBonus: 8,
    hpBonus: 32,
    attackBonus: 3,
    value: 140,
    icon: '👖'
  },
  'titan_legplates': {
    name: 'Titan Hydraulic Legplates',
    type: 'legs',
    rarity: 'epic',
    description: 'Heavy servo-driven leg armor converting kinetic hits into counter power.',
    defenseBonus: 14,
    hpBonus: 55,
    attackBonus: 6,
    value: 310,
    icon: '👖'
  },

  // === BOOTS (PIES) ===
  'mag_boots': {
    name: 'Mag-Grip Combat Boots',
    type: 'boots',
    rarity: 'common',
    description: 'Magnetic-soled boots providing solid footing across slick grid floors.',
    defenseBonus: 3,
    hpBonus: 12,
    value: 40,
    icon: '🥾'
  },
  'strider_thrusters': {
    name: 'Strider Jet-Boots',
    type: 'boots',
    rarity: 'rare',
    description: 'Micro-thruster boots improving dodge agility and critical lunges.',
    defenseBonus: 6,
    critBonus: 0.06,
    energyBonus: 10,
    value: 130,
    icon: '🥾'
  },
  'void_sabatons': {
    name: 'Void-Step Sabatons',
    type: 'boots',
    rarity: 'epic',
    description: 'Gravity-dampened boots engineered for deep cyber-crypt expeditions.',
    defenseBonus: 10,
    hpBonus: 30,
    critBonus: 0.08,
    energyBonus: 15,
    value: 270,
    icon: '🥾'
  },

  // === RINGS (ANILLOS - Ring 1 & Ring 2) ===
  'neural_chip': {
    name: 'Overclock Signet Ring',
    type: 'ring',
    rarity: 'common',
    description: 'Compact biometric ring accelerating synaptic impulse speeds.',
    critBonus: 0.06,
    energyBonus: 10,
    value: 45,
    icon: '💍'
  },
  'quantum_pendant': {
    name: 'Phase Displacement Ring',
    type: 'ring',
    rarity: 'rare',
    description: 'Micro-gravitational ring allowing partial atomic deflection.',
    defenseBonus: 5,
    critBonus: 0.08,
    value: 140,
    icon: '💍'
  },
  'matrix_core': {
    name: 'Sub-Zero Cryo Band',
    type: 'ring',
    rarity: 'epic',
    description: 'Superconducting thermal ring boosting overall system power output.',
    attackBonus: 8,
    defenseBonus: 8,
    energyBonus: 25,
    value: 340,
    icon: '💍'
  },
  'crimson_signet': {
    name: 'Crimson Singularity Ring',
    type: 'ring',
    rarity: 'legendary',
    description: 'Forged from core synthesizer alloys, amplifying lethal precision.',
    attackBonus: 14,
    critBonus: 0.14,
    hpBonus: 30,
    value: 620,
    icon: '💍'
  },

  // === EARRINGS (PENDIENTES) ===
  'synapse_studs': {
    name: 'Synapse Telemetry Studs',
    type: 'earrings',
    rarity: 'common',
    description: 'Sub-dermal audio-neural earrings sharpening tactical focus.',
    critBonus: 0.04,
    energyBonus: 12,
    value: 45,
    icon: '💎'
  },
  'ether_drops': {
    name: 'Aether Wave Earrings',
    type: 'earrings',
    rarity: 'rare',
    description: 'Harmonic crystal earrings resonating with dungeon energy currents.',
    attackBonus: 5,
    energyBonus: 22,
    critBonus: 0.06,
    value: 145,
    icon: '💎'
  },
  'cyber_ear_cuffs': {
    name: 'Neural Overdrive Cuffs',
    type: 'earrings',
    rarity: 'epic',
    description: 'High-bandwidth optic ear cuffs maximizing critical targeting and vigor.',
    attackBonus: 9,
    defenseBonus: 5,
    energyBonus: 28,
    critBonus: 0.09,
    value: 310,
    icon: '💎'
  },

  'mythic_astral_robe': {
    name: 'Solaris Mythic Exo-Mantle',
    type: 'chest',
    rarity: 'mythic',
    description: 'Mythic starlight-woven armor plating channeling extreme energy and durability.',
    defenseBonus: 30,
    hpBonus: 135,
    energyBonus: 35,
    value: 900,
    icon: '🥋'
  },
  'mythic_chronos_ring': {
    name: 'Eternity Chronos Band',
    type: 'ring',
    rarity: 'mythic',
    description: 'Mythic temporal ring amplifying critical strikes and synaptic power.',
    attackBonus: 18,
    defenseBonus: 10,
    critBonus: 0.18,
    energyBonus: 30,
    value: 880,
    icon: '💍'
  },

  // === CONSUMABLES & POTIONS ===
  'stim_pack': {
    name: 'Nanite Med-Stim',
    type: 'consumable',
    rarity: 'common',
    description: 'Instant tissue re-synthesizer restoring 50 HP.',
    healAmount: 50,
    effectType: 'heal',
    currency: 'coins',
    value: 35,
    icon: '🧪'
  },
  'super_stim': {
    name: 'Hyper-Regen Syringe',
    type: 'consumable',
    rarity: 'rare',
    description: 'High-grade military coagulant restoring 130 HP.',
    healAmount: 130,
    effectType: 'heal',
    currency: 'coins',
    value: 90,
    icon: '💉'
  },
  'omega_medkit': {
    name: 'Omega Cellular Gel',
    type: 'consumable',
    rarity: 'epic',
    description: 'Apex trauma reconstructor restoring 260 HP immediately.',
    healAmount: 260,
    effectType: 'heal',
    currency: 'coins',
    value: 185,
    icon: '🩸'
  },
  'energy_cell': {
    name: 'Plasma Battery',
    type: 'consumable',
    rarity: 'common',
    description: 'Refills 40 points of operational energy.',
    energyAmount: 40,
    effectType: 'energy',
    currency: 'coins',
    value: 35,
    icon: '🔋'
  },
  'hyper_cell': {
    name: 'Tachyon Capacitor',
    type: 'consumable',
    rarity: 'rare',
    description: 'Supercharged reactor cell restoring 95 Energy.',
    energyAmount: 95,
    effectType: 'energy',
    currency: 'coins',
    value: 95,
    icon: '⚡'
  },
  'dual_elixir': {
    name: 'Synthwave Vitality Elixir',
    type: 'consumable',
    rarity: 'rare',
    description: 'Dual bio-capacitor potion restoring 85 HP and 50 Energy.',
    healAmount: 85,
    energyAmount: 50,
    effectType: 'dual',
    currency: 'coins',
    value: 115,
    icon: '⚗️'
  },
  'omni_serum': {
    name: 'Quantum Core Elixir',
    type: 'consumable',
    rarity: 'legendary',
    description: 'Masterwork dual tonic restoring 190 HP and 110 Energy.',
    healAmount: 190,
    energyAmount: 110,
    effectType: 'dual',
    currency: 'coins',
    value: 250,
    icon: '🏺'
  },
  'regen_serum': {
    name: 'Bio-Mesh Regen Potion',
    type: 'consumable',
    rarity: 'rare',
    description: 'Sustained nanite infusion regenerating +15 HP & +8 Energy per turn for 6 turns.',
    regenTurns: 6,
    regenHpPerTurn: 15,
    regenEnergyPerTurn: 8,
    effectType: 'regen',
    currency: 'coins',
    value: 120,
    icon: '🌿'
  },
  'grand_regen_serum': {
    name: 'Chrono-Regen Infusion',
    type: 'consumable',
    rarity: 'epic',
    description: 'Extended nanite stream regenerating +30 HP & +14 Energy per turn for 8 turns.',
    regenTurns: 8,
    regenHpPerTurn: 30,
    regenEnergyPerTurn: 14,
    effectType: 'regen',
    currency: 'coins',
    value: 255,
    icon: '💠'
  },
  'igneous_potion': {
    name: 'Igneous Thermite Potion',
    type: 'consumable',
    rarity: 'epic',
    description: 'Detonates a volatile fire wave (4-tile radius) burning nearby enemies for 5 turns.',
    burnTurns: 5,
    burnDamage: 16,
    burnRadius: 4,
    effectType: 'igneous',
    currency: 'coins',
    value: 140,
    icon: '🔥'
  },
  'inferno_potion': {
    name: 'Solar Inferno Flask',
    type: 'consumable',
    rarity: 'legendary',
    description: 'Cataclysmic plasma-fire potion scorching enemies in a 6-tile radius for 6 turns.',
    burnTurns: 6,
    burnDamage: 30,
    burnRadius: 6,
    effectType: 'igneous',
    currency: 'coins',
    value: 290,
    icon: '☄️'
  },
  'aegis_tonic': {
    name: 'Aegis Kinetic Tonic',
    type: 'consumable',
    rarity: 'rare',
    description: 'Projects a reinforced +75 Kinetic Shield barrier around your operative.',
    shieldGrant: 75,
    effectType: 'shield',
    currency: 'coins',
    value: 110,
    icon: '🛡️'
  },
  'berserk_vial': {
    name: 'Synapse Cooldown Vial',
    type: 'consumable',
    rarity: 'epic',
    description: 'Purges all active skill cooldowns instantly and restores 30 Energy.',
    energyAmount: 30,
    effectType: 'cooldown_reset',
    currency: 'coins',
    value: 150,
    icon: '🧬'
  },
  'overclock_serum': {
    name: 'Overclock Elixir',
    type: 'consumable',
    rarity: 'epic',
    description: 'Grants temporary cyber overload (+10 Attack & 100% Crit for 4 turns).',
    effectType: 'buff_overclock',
    currency: 'coins',
    value: 145,
    icon: '⚡'
  },
  'teleport_scroll': {
    name: 'Quantum Warp Capsule',
    type: 'consumable',
    rarity: 'rare',
    description: 'Emergency escape beacon that warps you to a safe distant tile.',
    effectType: 'teleport',
    currency: 'coins',
    value: 90,
    icon: '🌀'
  }
};

let itemCounter = 1;

export function createItem(key: string, customId?: string, itemLevel = 1): GameItem {
  const base = BASE_ITEMS[key] || BASE_ITEMS['stim_pack'];
  const lvl = Math.max(1, itemLevel);
  const isGear = base.type !== 'consumable';
  // Scale base power with item level (floor-scaled drops)
  const levelMult = isGear ? 1 + (lvl - 1) * 0.12 : 1;
  return {
    ...base,
    attackBonus: base.attackBonus ? Math.round(base.attackBonus * levelMult) : base.attackBonus,
    defenseBonus: base.defenseBonus ? Math.round(base.defenseBonus * levelMult) : base.defenseBonus,
    hpBonus: base.hpBonus ? Math.round(base.hpBonus * levelMult) : base.hpBonus,
    energyBonus: base.energyBonus ? Math.round(base.energyBonus * levelMult) : base.energyBonus,
    upgradeLevel: isGear ? 0 : undefined,
    itemLevel: isGear ? lvl : undefined,
    name: isGear && lvl > 1 ? `${base.name} [Lv.${lvl}]` : base.name,
    id: customId || `item_${key}_${Date.now()}_${itemCounter++}`
  };
}

export function canClassEquipItem(cls: CharacterClass, item: GameItem): boolean {
  if (item.type === 'consumable') return false;
  if (item.allowedClasses && item.allowedClasses.length > 0) {
    return item.allowedClasses.includes(cls);
  }
  return true;
}

export function getEquipSlotForItem(item: GameItem, equipment: PlayerEquipment): EquipSlot | null {
  switch (item.type) {
    case 'weapon':
      return 'weapon';
    case 'offhand':
      return 'offhand';
    case 'helmet':
      return 'helmet';
    case 'chest':
      return 'chest';
    case 'gloves':
      return 'gloves';
    case 'legs':
      return 'legs';
    case 'boots':
      return 'boots';
    case 'earrings':
      return 'earrings';
    case 'ring':
      if (!equipment.ring1) return 'ring1';
      if (!equipment.ring2) return 'ring2';
      return 'ring1';
    default:
      return null;
  }
}

export function getUpgradeCost(item: GameItem): number {
  const level = item.upgradeLevel || 0;
  const rarityMult =
    item.rarity === 'cyber-relic'
      ? 2.4
      : item.rarity === 'mythic'
      ? 2.15
      : item.rarity === 'legendary'
      ? 1.9
      : item.rarity === 'epic'
      ? 1.5
      : item.rarity === 'rare'
      ? 1.25
      : 1.0;
  return Math.round((25 + level * 24 + level * level * 12) * rarityMult);
}

/**
 * Probability Stone price starts at 1000 Coins on Floor 1 and scales progressively
 * alongside deeper floor coin yields so it stays balanced and rewarding.
 */
export function getProbabilityStoneCost(floor: number): number {
  const f = Math.max(1, floor);
  return Math.round(1000 + (f - 1) * 450 + Math.pow(f - 1, 1.35) * 140);
}

/**
 * Risk of item shattering during forge enhancement.
 * +0 -> +1 is 0% (safe), scaling upward up to 75% at +9 -> +10.
 * Slotting a Probability Stone adds +60% success rate (reduces destroy risk by 0.60, min 0).
 */
export function getUpgradeDestroyChance(item: GameItem, useProbabilityStone = false): number {
  const level = item.upgradeLevel || 0;
  if (level <= 0) return 0;
  const baseChance = Math.min(0.75, 0.03 + level * 0.05 + level * level * 0.003);
  const adjusted = useProbabilityStone ? Math.max(0, baseChance - 0.6) : baseChance;
  return Number(adjusted.toFixed(3));
}

export function canUpgradeItem(item: GameItem): boolean {
  return item.type !== 'consumable' && (item.upgradeLevel || 0) < 10;
}

export function getEffectiveItemStats(item: GameItem): {
  attackBonus: number;
  defenseBonus: number;
  critBonus: number;
  hpBonus: number;
  energyBonus: number;
} {
  const up = item.upgradeLevel || 0;
  const ilvl = Math.max(1, item.itemLevel || 1);
  const mult = 1 + up * 0.22;
  const ilvlBonusAtk = item.attackBonus ? Math.floor((ilvl - 1) * 0.8) : 0;
  const ilvlBonusDef = item.defenseBonus ? Math.floor((ilvl - 1) * 0.6) : 0;
  return {
    attackBonus: item.attackBonus ? Math.round(item.attackBonus * mult) + up + ilvlBonusAtk : 0,
    defenseBonus: item.defenseBonus
      ? Math.round(item.defenseBonus * mult) + (up > 0 ? up : 0) + ilvlBonusDef
      : 0,
    critBonus: item.critBonus ? Number((item.critBonus + up * 0.01).toFixed(3)) : 0,
    hpBonus: item.hpBonus ? Math.round(item.hpBonus * mult) + (up > 0 ? up * 4 : 0) + (ilvl - 1) * 3 : 0,
    energyBonus: item.energyBonus
      ? Math.round(item.energyBonus * mult) + (up > 0 ? up * 2 : 0) + (ilvl - 1)
      : 0
  };
}

/** Sell price in coins — scales with rarity, upgrade level, and item level. */
export function getItemSellPrice(item: GameItem): number {
  if (item.effectType === 'stone') return Math.max(50, Math.floor(item.value * 0.35));
  const rarityMult =
    item.rarity === 'cyber-relic'
      ? 4.5
      : item.rarity === 'mythic'
      ? 3.6
      : item.rarity === 'legendary'
      ? 2.8
      : item.rarity === 'epic'
      ? 2.0
      : item.rarity === 'rare'
      ? 1.45
      : 1.0;
  const up = item.upgradeLevel || 0;
  const ilvl = Math.max(1, item.itemLevel || 1);
  const base = item.value || 20;
  return Math.max(5, Math.round(base * rarityMult * (1 + up * 0.35) * (0.7 + ilvl * 0.15)));
}

export function upgradeItem(item: GameItem): GameItem {
  if (!canUpgradeItem(item)) return item;
  const nextLevel = (item.upgradeLevel || 0) + 1;
  const baseName = item.name.replace(/\s\+\d+$/, '');
  return {
    ...item,
    upgradeLevel: nextLevel,
    name: `${baseName} +${nextLevel}`
  };
}

export interface UpgradeAttemptResult {
  status: 'success' | 'destroyed';
  item: GameItem | null;
  destroyChance: number;
}

export function attemptUpgradeItem(
  item: GameItem,
  roll = Math.random(),
  useProbabilityStone = false
): UpgradeAttemptResult {
  const destroyChance = getUpgradeDestroyChance(item, useProbabilityStone);
  if (roll < destroyChance) {
    return {
      status: 'destroyed',
      item: null,
      destroyChance
    };
  }
  return {
    status: 'success',
    item: upgradeItem(item),
    destroyChance
  };
}

export function generateRandomLoot(floor: number): GameItem {
  const keys = Object.keys(BASE_ITEMS);
  const roll = Math.random();
  let candidateKeys: string[] = [];

  if (floor >= 5 && roll < 0.14) {
    candidateKeys = keys.filter(
      k => BASE_ITEMS[k].rarity === 'mythic' || BASE_ITEMS[k].rarity === 'cyber-relic'
    );
  } else if (floor >= 3 && roll < 0.26) {
    candidateKeys = keys.filter(k => BASE_ITEMS[k].rarity === 'legendary');
  } else if (floor >= 2 && roll < 0.50) {
    candidateKeys = keys.filter(k => BASE_ITEMS[k].rarity === 'epic');
  } else if (roll < 0.78) {
    candidateKeys = keys.filter(k => BASE_ITEMS[k].rarity === 'rare');
  } else {
    candidateKeys = keys.filter(k => BASE_ITEMS[k].rarity === 'common');
  }

  if (candidateKeys.length === 0) candidateKeys = keys;
  const picked = candidateKeys[Math.floor(Math.random() * candidateKeys.length)];
  // Item level tracks dungeon depth so deeper floors drop stronger gear
  const itemLevel = Math.max(1, floor + Math.floor(Math.random() * 2));
  return createItem(picked, undefined, itemLevel);
}
