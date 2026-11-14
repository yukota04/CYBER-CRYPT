import { CharacterClass, SkillNode } from './types';

export const SKILL_DATABASE: Record<string, SkillNode> = {
  // =========================================================================
  // STRIKER — 5 SKILL TREES
  // =========================================================================

  // TREE 1: Shadow Blade (Core Mobility & Overclock)
  'striker_slash': {
    id: 'striker_slash',
    name: 'Neon Edge',
    branch: 'striker',
    treeIndex: 1,
    subTreeName: 'Shadow Blade',
    tier: 1,
    type: 'passive',
    pointCost: 1,
    description: 'Increases critical strike chance by +12% and base attack by +4.',
    prerequisites: [],
    unlocked: true,
    icon: '🗡️',
    effect: { statBoost: { critRate: 0.12, attack: 4 } }
  },
  'striker_phase_dash': {
    id: 'striker_phase_dash',
    name: 'Phase Dash',
    branch: 'striker',
    treeIndex: 1,
    subTreeName: 'Shadow Blade',
    tier: 2,
    type: 'active',
    pointCost: 1,
    energyCost: 15,
    cooldown: 4,
    description: 'Teleport 3 tiles in facing direction, passing through enemies and dealing 180% damage to bypassed targets.',
    prerequisites: ['striker_slash'],
    unlocked: false,
    icon: '⚡',
    vfxType: 'slash',
    effect: { actionType: 'phase_dash', power: 1.8, range: 3 }
  },
  'striker_overclock': {
    id: 'striker_overclock',
    name: 'Adrenaline Matrix',
    branch: 'striker',
    treeIndex: 1,
    subTreeName: 'Shadow Blade',
    tier: 3,
    type: 'active',
    pointCost: 1,
    energyCost: 25,
    cooldown: 6,
    description: 'Enter Overclock state for 4 turns: 100% Critical hit rate and +10 attack.',
    prerequisites: ['striker_phase_dash'],
    unlocked: false,
    icon: '🔥',
    vfxType: 'nova',
    effect: { actionType: 'glitch_overcharge', power: 2.0 }
  },
  'striker_executioner': {
    id: 'striker_executioner',
    name: 'Cyber Executioner',
    branch: 'striker',
    treeIndex: 1,
    subTreeName: 'Shadow Blade',
    tier: 4,
    type: 'passive',
    pointCost: 2,
    description: 'Enemies below 35% HP instantly take double damage. Max Energy +20.',
    prerequisites: ['striker_overclock'],
    unlocked: false,
    icon: '☠️',
    effect: { statBoost: { maxEnergy: 20 } }
  },

  // TREE 2: Phantom Tempest (AoE Blades)
  'striker_t2_grip': {
    id: 'striker_t2_grip',
    name: 'Twin-Grip Calibration',
    branch: 'striker',
    treeIndex: 2,
    subTreeName: 'Phantom Tempest',
    tier: 1,
    type: 'passive',
    pointCost: 1,
    description: 'Gain +5 Attack and +5% Critical strike probability.',
    prerequisites: [],
    unlocked: false,
    icon: '⚔️',
    effect: { statBoost: { attack: 5, critRate: 0.05 } }
  },
  'striker_t2_tempest': {
    id: 'striker_t2_tempest',
    name: 'Blade Tempest',
    branch: 'striker',
    treeIndex: 2,
    subTreeName: 'Phantom Tempest',
    tier: 2,
    type: 'active',
    pointCost: 1,
    energyCost: 20,
    cooldown: 4,
    description: 'Unleash a razor cyclone slashing every enemy within 2 tiles for 195% damage.',
    prerequisites: ['striker_t2_grip'],
    unlocked: false,
    icon: '🌀',
    vfxType: 'crit_slash',
    effect: { actionType: 'blade_tempest', power: 1.95, range: 2 }
  },
  'striker_t2_mastery': {
    id: 'striker_t2_mastery',
    name: 'Spectral Edge',
    branch: 'striker',
    treeIndex: 2,
    subTreeName: 'Phantom Tempest',
    tier: 3,
    type: 'passive',
    pointCost: 1,
    description: 'Permanently amplifies Attack by +10 and Max HP by +20.',
    prerequisites: ['striker_t2_tempest'],
    unlocked: false,
    icon: '💫',
    effect: { statBoost: { attack: 10, maxHp: 20 } }
  },

  // TREE 3: Viper Protocol (Precision Burst)
  'striker_t3_optics': {
    id: 'striker_t3_optics',
    name: 'Thermal Optics',
    branch: 'striker',
    treeIndex: 3,
    subTreeName: 'Viper Protocol',
    tier: 1,
    type: 'passive',
    pointCost: 1,
    description: 'Critical chance +10%, Max Energy +10.',
    prerequisites: [],
    unlocked: false,
    icon: '🎯',
    effect: { statBoost: { critRate: 0.10, maxEnergy: 10 } }
  },
  'striker_t3_shadow_strike': {
    id: 'striker_t3_shadow_strike',
    name: 'Shadow Lunge',
    branch: 'striker',
    treeIndex: 3,
    subTreeName: 'Viper Protocol',
    tier: 2,
    type: 'active',
    pointCost: 1,
    energyCost: 18,
    cooldown: 3,
    description: 'Strike the nearest visible hostile within 4 tiles for a guaranteed 240% precision strike.',
    prerequisites: ['striker_t3_optics'],
    unlocked: false,
    icon: '🦂',
    vfxType: 'crit_slash',
    effect: { actionType: 'shadow_strike', power: 2.4, range: 4 }
  },
  'striker_t3_apex': {
    id: 'striker_t3_apex',
    name: 'Lethal Overdrive',
    branch: 'striker',
    treeIndex: 3,
    subTreeName: 'Viper Protocol',
    tier: 3,
    type: 'passive',
    pointCost: 2,
    description: 'Attack +12 and Critical Strike rate +12%.',
    prerequisites: ['striker_t3_shadow_strike'],
    unlocked: false,
    icon: '🩸',
    effect: { statBoost: { attack: 12, critRate: 0.12 } }
  },

  // TREE 4: Crimson Siphon (Sustain & Evasion)
  'striker_t4_reflex': {
    id: 'striker_t4_reflex',
    name: 'Nano-Fiber Reflex',
    branch: 'striker',
    treeIndex: 4,
    subTreeName: 'Crimson Siphon',
    tier: 1,
    type: 'passive',
    pointCost: 1,
    description: 'Reinforces agility with +4 Defense and +18 Max HP.',
    prerequisites: [],
    unlocked: false,
    icon: '🦇',
    effect: { statBoost: { defense: 4, maxHp: 18 } }
  },
  'striker_t4_siphon': {
    id: 'striker_t4_siphon',
    name: 'Vampiric Byte',
    branch: 'striker',
    treeIndex: 4,
    subTreeName: 'Crimson Siphon',
    tier: 2,
    type: 'active',
    pointCost: 1,
    energyCost: 20,
    cooldown: 4,
    description: 'Slice adjacent enemies for 170% damage and drain 40% of damage dealt as HP.',
    prerequisites: ['striker_t4_reflex'],
    unlocked: false,
    icon: '💉',
    vfxType: 'heal',
    effect: { actionType: 'vampiric_drain', power: 1.7, range: 1 }
  },
  'striker_t4_immortal': {
    id: 'striker_t4_immortal',
    name: 'Ghost Carapace',
    branch: 'striker',
    treeIndex: 4,
    subTreeName: 'Crimson Siphon',
    tier: 3,
    type: 'passive',
    pointCost: 1,
    description: 'Defense +6 and Max HP +30.',
    prerequisites: ['striker_t4_siphon'],
    unlocked: false,
    icon: '🩻',
    effect: { statBoost: { defense: 6, maxHp: 30 } }
  },

  // TREE 5: Volt-Gunner (Ranged Plasma Beams)
  'striker_t5_capacitor': {
    id: 'striker_t5_capacitor',
    name: 'Plasma Capacitor',
    branch: 'striker',
    treeIndex: 5,
    subTreeName: 'Volt-Gunner',
    tier: 1,
    type: 'passive',
    pointCost: 1,
    description: 'Max Energy +20 and Attack +4.',
    prerequisites: [],
    unlocked: false,
    icon: '🔫',
    effect: { statBoost: { maxEnergy: 20, attack: 4 } }
  },
  'striker_t5_beam': {
    id: 'striker_t5_beam',
    name: 'Rail-Beam Piercer',
    branch: 'striker',
    treeIndex: 5,
    subTreeName: 'Volt-Gunner',
    tier: 2,
    type: 'active',
    pointCost: 1,
    energyCost: 22,
    cooldown: 3,
    description: 'Fire a penetrating cyber-laser in facing direction up to 6 tiles dealing 210% damage.',
    prerequisites: ['striker_t5_capacitor'],
    unlocked: false,
    icon: '🔆',
    vfxType: 'beam',
    effect: { actionType: 'plasma_beam', power: 2.1, range: 6 }
  },
  'striker_t5_core': {
    id: 'striker_t5_core',
    name: 'Hyper-Velocity Core',
    branch: 'striker',
    treeIndex: 5,
    subTreeName: 'Volt-Gunner',
    tier: 3,
    type: 'passive',
    pointCost: 2,
    description: 'Attack +10, Crit +8%, Max Energy +20.',
    prerequisites: ['striker_t5_beam'],
    unlocked: false,
    icon: '⚡',
    effect: { statBoost: { attack: 10, critRate: 0.08, maxEnergy: 20 } }
  },

  // =========================================================================
  // TECHNOMANCER — 5 SKILL TREES
  // =========================================================================

  // TREE 1: EMP Conduit
  'techno_conduit': {
    id: 'techno_conduit',
    name: 'Power Conduit',
    branch: 'technomancer',
    treeIndex: 1,
    subTreeName: 'EMP Conduit',
    tier: 1,
    type: 'passive',
    pointCost: 1,
    description: 'Increases Max Energy by +35 and Energy recovery per turn.',
    prerequisites: [],
    unlocked: true,
    icon: '🔋',
    effect: { statBoost: { maxEnergy: 35 } }
  },
  'techno_emp_blast': {
    id: 'techno_emp_blast',
    name: 'EMP Surge',
    branch: 'technomancer',
    treeIndex: 1,
    subTreeName: 'EMP Conduit',
    tier: 2,
    type: 'active',
    pointCost: 1,
    energyCost: 20,
    cooldown: 3,
    description: 'Release a 360-degree AoE shockwave hitting all enemies within 3 tiles (220% dmg, scaled by enemy level).',
    prerequisites: ['techno_conduit'],
    unlocked: false,
    icon: '🌐',
    vfxType: 'emp_ring',
    effect: { actionType: 'emp_blast', power: 2.2, range: 3 }
  },
  'techno_nanite_heal': {
    id: 'techno_nanite_heal',
    name: 'Nanite Infusion',
    branch: 'technomancer',
    treeIndex: 1,
    subTreeName: 'EMP Conduit',
    tier: 3,
    type: 'active',
    pointCost: 1,
    energyCost: 30,
    cooldown: 5,
    description: 'Emergency nanite matrix immediately restores 45% of maximum HP.',
    prerequisites: ['techno_emp_blast'],
    unlocked: false,
    icon: '💉',
    vfxType: 'heal',
    effect: { actionType: 'nanite_heal', power: 0.45 }
  },
  'techno_singularity': {
    id: 'techno_singularity',
    name: 'Synth Singularity',
    branch: 'technomancer',
    treeIndex: 1,
    subTreeName: 'EMP Conduit',
    tier: 4,
    type: 'passive',
    pointCost: 2,
    description: 'All spells refund 30% of energy on kill. Attack increased by +8.',
    prerequisites: ['techno_nanite_heal'],
    unlocked: false,
    icon: '🌌',
    effect: { statBoost: { attack: 8 } }
  },

  // TREE 2: Pyro-Reactor (Meteor & Solar Supernova AoE up to 8 tiles)
  'techno_t2_ignite': {
    id: 'techno_t2_ignite',
    name: 'Thermal Reactor',
    branch: 'technomancer',
    treeIndex: 2,
    subTreeName: 'Pyro-Reactor',
    tier: 1,
    type: 'passive',
    pointCost: 1,
    description: 'Boosts Attack power by +6 and Critical strike rate by +5%.',
    prerequisites: [],
    unlocked: false,
    icon: '🔥',
    effect: { statBoost: { attack: 6, critRate: 0.05 } }
  },
  'techno_t2_meteor': {
    id: 'techno_t2_meteor',
    name: 'Plasma Meteor',
    branch: 'technomancer',
    treeIndex: 2,
    subTreeName: 'Pyro-Reactor',
    tier: 2,
    type: 'active',
    pointCost: 1,
    energyCost: 28,
    cooldown: 4,
    description: 'Drop an orbital meteor up to 6 tiles away, scorching a 3-tile splash AoE for 250% dmg.',
    prerequisites: ['techno_t2_ignite'],
    unlocked: false,
    icon: '☄️',
    vfxType: 'meteor',
    effect: { actionType: 'meteor_strike', power: 2.5, range: 6 }
  },
  'techno_t2_nova': {
    id: 'techno_t2_nova',
    name: 'Solar Amplifier',
    branch: 'technomancer',
    treeIndex: 2,
    subTreeName: 'Pyro-Reactor',
    tier: 3,
    type: 'passive',
    pointCost: 1,
    description: 'Attack +12 and Max Energy +25.',
    prerequisites: ['techno_t2_meteor'],
    unlocked: false,
    icon: '☀️',
    effect: { statBoost: { attack: 12, maxEnergy: 25 } }
  },
  'techno_t2_supernova': {
    id: 'techno_t2_supernova',
    name: 'Solar Supernova',
    branch: 'technomancer',
    treeIndex: 2,
    subTreeName: 'Pyro-Reactor',
    tier: 4,
    type: 'active',
    pointCost: 2,
    energyCost: 36,
    cooldown: 5,
    description: 'Detonate a massive 8-tile radius solar shockwave hitting all visible & nearby enemies (245% dmg, scaled by enemy level).',
    prerequisites: ['techno_t2_nova'],
    unlocked: false,
    icon: '💥',
    vfxType: 'meteor',
    effect: { actionType: 'arcane_cataclysm', power: 2.45, range: 8 }
  },

  // TREE 3: Cryo-Matrix (Wide 5-Tile Freeze AoE & Shielding)
  'techno_t3_cryo_core': {
    id: 'techno_t3_cryo_core',
    name: 'Cryo Coolants',
    branch: 'technomancer',
    treeIndex: 3,
    subTreeName: 'Cryo-Matrix',
    tier: 1,
    type: 'passive',
    pointCost: 1,
    description: 'Defense +4 and Max HP +20.',
    prerequisites: [],
    unlocked: false,
    icon: '❄️',
    effect: { statBoost: { defense: 4, maxHp: 20 } }
  },
  'techno_t3_frost_nova': {
    id: 'techno_t3_frost_nova',
    name: 'Zero-Kelvin Nova',
    branch: 'technomancer',
    treeIndex: 3,
    subTreeName: 'Cryo-Matrix',
    tier: 2,
    type: 'active',
    pointCost: 1,
    energyCost: 24,
    cooldown: 4,
    description: 'Freeze a wide 5-tile radius all around for 195% damage (scaled by enemy level) and gain 30 Shield.',
    prerequisites: ['techno_t3_cryo_core'],
    unlocked: false,
    icon: '🧊',
    vfxType: 'nova',
    effect: { actionType: 'frost_nova', power: 1.95, range: 5 }
  },
  'techno_t3_glacial': {
    id: 'techno_t3_glacial',
    name: 'Sub-Zero Ward',
    branch: 'technomancer',
    treeIndex: 3,
    subTreeName: 'Cryo-Matrix',
    tier: 3,
    type: 'passive',
    pointCost: 1,
    description: 'Defense +7 and Max Energy +20.',
    prerequisites: ['techno_t3_frost_nova'],
    unlocked: false,
    icon: '💎',
    effect: { statBoost: { defense: 7, maxEnergy: 20 } }
  },

  // TREE 4: Arc-Storm (Wide 7-Tile Chain Lightning)
  'techno_t4_coil': {
    id: 'techno_t4_coil',
    name: 'Tesla Inductor',
    branch: 'technomancer',
    treeIndex: 4,
    subTreeName: 'Arc-Storm',
    tier: 1,
    type: 'passive',
    pointCost: 1,
    description: 'Max Energy +25 and Crit Rate +7%.',
    prerequisites: [],
    unlocked: false,
    icon: '🌩️',
    effect: { statBoost: { maxEnergy: 25, critRate: 0.07 } }
  },
  'techno_t4_chain': {
    id: 'techno_t4_chain',
    name: 'Chain Lightning',
    branch: 'technomancer',
    treeIndex: 4,
    subTreeName: 'Arc-Storm',
    tier: 2,
    type: 'active',
    pointCost: 1,
    energyCost: 24,
    cooldown: 3,
    description: 'Arc high-voltage lightning across up to 6 enemies within 7 tiles for 210% damage.',
    prerequisites: ['techno_t4_coil'],
    unlocked: false,
    icon: '⚡',
    vfxType: 'lightning',
    effect: { actionType: 'chain_lightning', power: 2.1, range: 7 }
  },
  'techno_t4_stormlord': {
    id: 'techno_t4_stormlord',
    name: 'Ion Overcharge',
    branch: 'technomancer',
    treeIndex: 4,
    subTreeName: 'Arc-Storm',
    tier: 3,
    type: 'passive',
    pointCost: 2,
    description: 'Attack +9, Crit +10%, Max Energy +25.',
    prerequisites: ['techno_t4_chain'],
    unlocked: false,
    icon: '🔱',
    effect: { statBoost: { attack: 9, critRate: 0.10, maxEnergy: 25 } }
  },

  // TREE 5: Orbital Synapse (10-Tile Radius Cataclysm AoE)
  'techno_t5_uplink': {
    id: 'techno_t5_uplink',
    name: 'Satellite Uplink',
    branch: 'technomancer',
    treeIndex: 5,
    subTreeName: 'Orbital Synapse',
    tier: 1,
    type: 'passive',
    pointCost: 1,
    description: 'Attack +5 and Max HP +15.',
    prerequisites: [],
    unlocked: false,
    icon: '🛰️',
    effect: { statBoost: { attack: 5, maxHp: 15 } }
  },
  'techno_t5_orbital': {
    id: 'techno_t5_orbital',
    name: 'Orbital Laser Strike',
    branch: 'technomancer',
    treeIndex: 5,
    subTreeName: 'Orbital Synapse',
    tier: 2,
    type: 'active',
    pointCost: 1,
    energyCost: 30,
    cooldown: 4,
    description: 'Lock onto the highest-HP threat within 7 tiles and incinerate it with a 310% orbital beam.',
    prerequisites: ['techno_t5_uplink'],
    unlocked: false,
    icon: '📡',
    vfxType: 'beam',
    effect: { actionType: 'orbital_strike', power: 3.1, range: 7 }
  },
  'techno_t5_omni': {
    id: 'techno_t5_omni',
    name: 'Quantum Archmage',
    branch: 'technomancer',
    treeIndex: 5,
    subTreeName: 'Orbital Synapse',
    tier: 3,
    type: 'passive',
    pointCost: 1,
    description: 'Attack +14 and Max Energy +35.',
    prerequisites: ['techno_t5_orbital'],
    unlocked: false,
    icon: '🔮',
    effect: { statBoost: { attack: 14, maxEnergy: 35 } }
  },
  'techno_t5_cataclysm': {
    id: 'techno_t5_cataclysm',
    name: 'Arcane Singularity Cataclysm',
    branch: 'technomancer',
    treeIndex: 5,
    subTreeName: 'Orbital Synapse',
    tier: 4,
    type: 'active',
    pointCost: 2,
    energyCost: 45,
    cooldown: 6,
    description: 'Unleash a cataclysmic 10-tile radius AoE nova damaging every enemy within 10 tiles all around (285% dmg, scaled by enemy level).',
    prerequisites: ['techno_t5_omni'],
    unlocked: false,
    icon: '🌌',
    vfxType: 'nova',
    effect: { actionType: 'arcane_cataclysm', power: 2.85, range: 10 }
  },

  // =========================================================================
  // VANGUARD — 5 SKILL TREES
  // =========================================================================

  // TREE 1: Aegis Bastion
  'vanguard_chitin': {
    id: 'vanguard_chitin',
    name: 'Titanium Plating',
    branch: 'vanguard',
    treeIndex: 1,
    subTreeName: 'Aegis Bastion',
    tier: 1,
    type: 'passive',
    pointCost: 1,
    description: 'Increases Defense by +5 and Max HP by +30.',
    prerequisites: [],
    unlocked: true,
    icon: '🛡️',
    effect: { statBoost: { defense: 5, maxHp: 30 } }
  },
  'vanguard_cleave': {
    id: 'vanguard_cleave',
    name: 'Plasma Cleave',
    branch: 'vanguard',
    treeIndex: 1,
    subTreeName: 'Aegis Bastion',
    tier: 2,
    type: 'active',
    pointCost: 1,
    energyCost: 18,
    cooldown: 3,
    description: 'Swing a broad plasma arc striking 3 tiles in front of you for 190% damage.',
    prerequisites: ['vanguard_chitin'],
    unlocked: false,
    icon: '🪓',
    vfxType: 'slash',
    effect: { actionType: 'plasma_cleave', power: 1.9, range: 1 }
  },
  'vanguard_barrier': {
    id: 'vanguard_barrier',
    name: 'Aegis Barrier',
    branch: 'vanguard',
    treeIndex: 1,
    subTreeName: 'Aegis Bastion',
    tier: 3,
    type: 'active',
    pointCost: 1,
    energyCost: 25,
    cooldown: 5,
    description: 'Generate a kinetic shield absorbing up to 40 damage for 5 turns.',
    prerequisites: ['vanguard_cleave'],
    unlocked: false,
    icon: '💠',
    vfxType: 'shield',
    effect: { actionType: 'aegis_barrier', power: 40 }
  },
  'vanguard_immortal': {
    id: 'vanguard_immortal',
    name: 'Indomitable Core',
    branch: 'vanguard',
    treeIndex: 1,
    subTreeName: 'Aegis Bastion',
    tier: 4,
    type: 'passive',
    pointCost: 2,
    description: 'Take 25% less damage from all attacks. Defense +6.',
    prerequisites: ['vanguard_barrier'],
    unlocked: false,
    icon: '👑',
    effect: { statBoost: { defense: 6 } }
  },

  // TREE 2: Titan Breaker (Earthshatter Heavy Slam)
  'vanguard_t2_mass': {
    id: 'vanguard_t2_mass',
    name: 'Hydraulic Servos',
    branch: 'vanguard',
    treeIndex: 2,
    subTreeName: 'Titan Breaker',
    tier: 1,
    type: 'passive',
    pointCost: 1,
    description: 'Attack +6 and Max HP +20.',
    prerequisites: [],
    unlocked: false,
    icon: '🦾',
    effect: { statBoost: { attack: 6, maxHp: 20 } }
  },
  'vanguard_t2_shatter': {
    id: 'vanguard_t2_shatter',
    name: 'Earthshatter Slam',
    branch: 'vanguard',
    treeIndex: 2,
    subTreeName: 'Titan Breaker',
    tier: 2,
    type: 'active',
    pointCost: 1,
    energyCost: 24,
    cooldown: 4,
    description: 'Smash the floor creating a 2-tile shockwave dealing 230% heavy damage.',
    prerequisites: ['vanguard_t2_mass'],
    unlocked: false,
    icon: '💥',
    vfxType: 'smash',
    effect: { actionType: 'earthshatter', power: 2.3, range: 2 }
  },
  'vanguard_t2_colossus': {
    id: 'vanguard_t2_colossus',
    name: 'Colossus Frame',
    branch: 'vanguard',
    treeIndex: 2,
    subTreeName: 'Titan Breaker',
    tier: 3,
    type: 'passive',
    pointCost: 2,
    description: 'Attack +10, Max HP +55.',
    prerequisites: ['vanguard_t2_shatter'],
    unlocked: false,
    icon: '🗿',
    effect: { statBoost: { attack: 10, maxHp: 55 } }
  },

  // TREE 3: Whirlwind Enforcer (Greatsword 360 Cleave)
  'vanguard_t3_edge': {
    id: 'vanguard_t3_edge',
    name: 'Heavy Blade Training',
    branch: 'vanguard',
    treeIndex: 3,
    subTreeName: 'Whirlwind Enforcer',
    tier: 1,
    type: 'passive',
    pointCost: 1,
    description: 'Attack +5 and Crit Rate +6%.',
    prerequisites: [],
    unlocked: false,
    icon: '⚔️',
    effect: { statBoost: { attack: 5, critRate: 0.06 } }
  },
  'vanguard_t3_whirlwind': {
    id: 'vanguard_t3_whirlwind',
    name: 'Cyclone Greatsword',
    branch: 'vanguard',
    treeIndex: 3,
    subTreeName: 'Whirlwind Enforcer',
    tier: 2,
    type: 'active',
    pointCost: 1,
    energyCost: 20,
    cooldown: 3,
    description: 'Spin in a 360° arc slashing all adjacent enemies for 215% weapon damage.',
    prerequisites: ['vanguard_t3_edge'],
    unlocked: false,
    icon: '🌪️',
    vfxType: 'crit_slash',
    effect: { actionType: 'whirlwind', power: 2.15, range: 1 }
  },
  'vanguard_t3_execution': {
    id: 'vanguard_t3_execution',
    name: 'Dreadnought Momentum',
    branch: 'vanguard',
    treeIndex: 3,
    subTreeName: 'Whirlwind Enforcer',
    tier: 3,
    type: 'passive',
    pointCost: 2,
    description: 'Attack +12 and Defense +5.',
    prerequisites: ['vanguard_t3_whirlwind'],
    unlocked: false,
    icon: '🔥',
    effect: { statBoost: { attack: 12, defense: 5 } }
  },

  // TREE 4: Nanite Juggernaut (Fortress & Shielding)
  'vanguard_t4_alloy': {
    id: 'vanguard_t4_alloy',
    name: 'Reactive Plating',
    branch: 'vanguard',
    treeIndex: 4,
    subTreeName: 'Nanite Juggernaut',
    tier: 1,
    type: 'passive',
    pointCost: 1,
    description: 'Defense +6 and Max HP +35.',
    prerequisites: [],
    unlocked: false,
    icon: '🧱',
    effect: { statBoost: { defense: 6, maxHp: 35 } }
  },
  'vanguard_t4_fortify': {
    id: 'vanguard_t4_fortify',
    name: 'Fortress Overdrive',
    branch: 'vanguard',
    treeIndex: 4,
    subTreeName: 'Nanite Juggernaut',
    tier: 2,
    type: 'active',
    pointCost: 1,
    energyCost: 22,
    cooldown: 5,
    description: 'Deploy a 70-point armored shield and empower Overclock for 2 turns.',
    prerequisites: ['vanguard_t4_alloy'],
    unlocked: false,
    icon: '🏰',
    vfxType: 'shield',
    effect: { actionType: 'fortify_stance', power: 70 }
  },
  'vanguard_t4_titan': {
    id: 'vanguard_t4_titan',
    name: 'Immortal Bulwark',
    branch: 'vanguard',
    treeIndex: 4,
    subTreeName: 'Nanite Juggernaut',
    tier: 3,
    type: 'passive',
    pointCost: 2,
    description: 'Defense +10 and Max HP +70.',
    prerequisites: ['vanguard_t4_fortify'],
    unlocked: false,
    icon: '🛡️',
    effect: { statBoost: { defense: 10, maxHp: 70 } }
  },

  // TREE 5: Solar Sentinel (Heal + Orbital Counter)
  'vanguard_t5_aura': {
    id: 'vanguard_t5_aura',
    name: 'Bio-Repair Reactor',
    branch: 'vanguard',
    treeIndex: 5,
    subTreeName: 'Solar Sentinel',
    tier: 1,
    type: 'passive',
    pointCost: 1,
    description: 'Max Energy +20 and Max HP +25.',
    prerequisites: [],
    unlocked: false,
    icon: '✨',
    effect: { statBoost: { maxEnergy: 20, maxHp: 25 } }
  },
  'vanguard_t5_heal': {
    id: 'vanguard_t5_heal',
    name: 'Sentinel Surge',
    branch: 'vanguard',
    treeIndex: 5,
    subTreeName: 'Solar Sentinel',
    tier: 2,
    type: 'active',
    pointCost: 1,
    energyCost: 25,
    cooldown: 5,
    description: 'Activate cellular regeneration restoring 50% of Max HP instantly.',
    prerequisites: ['vanguard_t5_aura'],
    unlocked: false,
    icon: '💚',
    vfxType: 'heal',
    effect: { actionType: 'nanite_heal', power: 0.50 }
  },
  'vanguard_t5_radiance': {
    id: 'vanguard_t5_radiance',
    name: 'Aegis Radiance',
    branch: 'vanguard',
    treeIndex: 5,
    subTreeName: 'Solar Sentinel',
    tier: 3,
    type: 'passive',
    pointCost: 2,
    description: 'Attack +8, Defense +6, Max HP +40.',
    prerequisites: ['vanguard_t5_heal'],
    unlocked: false,
    icon: '🌟',
    effect: { statBoost: { attack: 8, defense: 6, maxHp: 40 } }
  }
};

export function getSkillsForClass(cls: CharacterClass): SkillNode[] {
  return Object.values(SKILL_DATABASE).filter(s => s.branch === cls);
}

export function getSkillTreesForClass(cls: CharacterClass): { treeIndex: 1 | 2 | 3 | 4 | 5; subTreeName: string; nodes: SkillNode[] }[] {
  const skills = getSkillsForClass(cls);
  const indices: (1 | 2 | 3 | 4 | 5)[] = [1, 2, 3, 4, 5];
  return indices.map(idx => {
    const nodes = skills.filter(s => s.treeIndex === idx).sort((a, b) => a.tier - b.tier);
    return {
      treeIndex: idx,
      subTreeName: nodes[0]?.subTreeName || `Tree ${idx}`,
      nodes
    };
  });
}

export function canUnlockSkill(skillId: string, unlockedList: string[], availablePoints: number): { canUnlock: boolean; reason?: string } {
  const node = SKILL_DATABASE[skillId];
  if (!node) return { canUnlock: false, reason: 'Skill not found' };
  if (unlockedList.includes(skillId)) return { canUnlock: false, reason: 'Already unlocked' };
  if (availablePoints < node.pointCost) return { canUnlock: false, reason: `Requires ${node.pointCost} Skill Point(s)` };

  for (const prereq of node.prerequisites) {
    if (!unlockedList.includes(prereq)) {
      const prereqName = SKILL_DATABASE[prereq]?.name || prereq;
      return { canUnlock: false, reason: `Requires prerequisite: ${prereqName}` };
    }
  }

  return { canUnlock: true };
}

export function computePassiveBonuses(unlockedSkills: string[]): {
  attack: number;
  defense: number;
  critRate: number;
  maxHp: number;
  maxEnergy: number;
} {
  const result = {
    attack: 0,
    defense: 0,
    critRate: 0,
    maxHp: 0,
    maxEnergy: 0
  };

  for (const id of unlockedSkills) {
    const node = SKILL_DATABASE[id];
    if (node && node.type === 'passive' && node.effect.statBoost) {
      if (node.effect.statBoost.attack) result.attack += node.effect.statBoost.attack;
      if (node.effect.statBoost.defense) result.defense += node.effect.statBoost.defense;
      if (node.effect.statBoost.critRate) result.critRate += node.effect.statBoost.critRate;
      if (node.effect.statBoost.maxHp) result.maxHp += node.effect.statBoost.maxHp;
      if (node.effect.statBoost.maxEnergy) result.maxEnergy += node.effect.statBoost.maxEnergy;
    }
  }

  return result;
}
