import { CharacterClass, SkillNode, Stats } from './types';

export const SKILL_DATABASE: Record<string, SkillNode> = {
  // STRIKER (Cyber Ninja / Assassin)
  'striker_slash': {
    id: 'striker_slash',
    name: 'Neon Edge',
    branch: 'striker',
    tier: 1,
    type: 'passive',
    pointCost: 1,
    description: 'Increases critical strike chance by +12% and base attack by +4.',
    prerequisites: [],
    unlocked: true,
    icon: '🗡️',
    effect: {
      statBoost: { critRate: 0.12, attack: 4 }
    }
  },
  'striker_phase_dash': {
    id: 'striker_phase_dash',
    name: 'Phase Dash',
    branch: 'striker',
    tier: 2,
    type: 'active',
    pointCost: 1,
    energyCost: 15,
    cooldown: 4,
    description: 'Teleport 3 tiles in facing direction, passing through enemies and dealing 180% damage to all bypassed targets.',
    prerequisites: ['striker_slash'],
    unlocked: false,
    icon: '⚡',
    effect: {
      actionType: 'phase_dash',
      power: 1.8,
      range: 3
    }
  },
  'striker_overclock': {
    id: 'striker_overclock',
    name: 'Adrenaline Matrix',
    branch: 'striker',
    tier: 3,
    type: 'active',
    pointCost: 1,
    energyCost: 25,
    cooldown: 6,
    description: 'Enter Overclock state for 4 turns: 100% Critical hit rate and +6 attack.',
    prerequisites: ['striker_phase_dash'],
    unlocked: false,
    icon: '🔥',
    effect: {
      actionType: 'glitch_overcharge',
      power: 2.0
    }
  },
  'striker_executioner': {
    id: 'striker_executioner',
    name: 'Cyber Executioner',
    branch: 'striker',
    tier: 4,
    type: 'passive',
    pointCost: 2,
    description: 'Enemies below 35% HP instantly take double damage. Max Energy +20.',
    prerequisites: ['striker_overclock'],
    unlocked: false,
    icon: '☠️',
    effect: {
      statBoost: { maxEnergy: 20 }
    }
  },

  // TECHNOMANCER (Synth-Mage / Hacker)
  'techno_conduit': {
    id: 'techno_conduit',
    name: 'Power Conduit',
    branch: 'technomancer',
    tier: 1,
    type: 'passive',
    pointCost: 1,
    description: 'Increases Max Energy by +35 and Energy recovery per turn by +2.',
    prerequisites: [],
    unlocked: true,
    icon: '🔋',
    effect: {
      statBoost: { maxEnergy: 35 }
    }
  },
  'techno_emp_blast': {
    id: 'techno_emp_blast',
    name: 'EMP Surge',
    branch: 'technomancer',
    tier: 2,
    type: 'active',
    pointCost: 1,
    energyCost: 20,
    cooldown: 3,
    description: 'Release a 360-degree shockwave damaging all adjacent monsters (220% dmg) and disabling their movement for 1 turn.',
    prerequisites: ['techno_conduit'],
    unlocked: false,
    icon: '🌐',
    effect: {
      actionType: 'emp_blast',
      power: 2.2,
      range: 1
    }
  },
  'techno_nanite_heal': {
    id: 'techno_nanite_heal',
    name: 'Nanite Infusion',
    branch: 'technomancer',
    tier: 3,
    type: 'active',
    pointCost: 1,
    energyCost: 30,
    cooldown: 5,
    description: 'Emergency nanite matrix immediately restores 45% of maximum HP.',
    prerequisites: ['techno_emp_blast'],
    unlocked: false,
    icon: '💉',
    effect: {
      actionType: 'nanite_heal',
      power: 0.45
    }
  },
  'techno_singularity': {
    id: 'techno_singularity',
    name: 'Synth Singularity',
    branch: 'technomancer',
    tier: 4,
    type: 'passive',
    pointCost: 2,
    description: 'All spells refund 30% of energy on kill. Attack increased by +8.',
    prerequisites: ['techno_nanite_heal'],
    unlocked: false,
    icon: '🌌',
    effect: {
      statBoost: { attack: 8 }
    }
  },

  // VANGUARD (Heavy Tank / Enforcer)
  'vanguard_chitin': {
    id: 'vanguard_chitin',
    name: 'Titanium Plating',
    branch: 'vanguard',
    tier: 1,
    type: 'passive',
    pointCost: 1,
    description: 'Increases Defense by +5 and Max HP by +30.',
    prerequisites: [],
    unlocked: true,
    icon: '🛡️',
    effect: {
      statBoost: { defense: 5, maxHp: 30 }
    }
  },
  'vanguard_cleave': {
    id: 'vanguard_cleave',
    name: 'Plasma Cleave',
    branch: 'vanguard',
    tier: 2,
    type: 'active',
    pointCost: 1,
    energyCost: 18,
    cooldown: 3,
    description: 'Swing a broad plasma arc striking 3 tiles in front of you for 190% damage.',
    prerequisites: ['vanguard_chitin'],
    unlocked: false,
    icon: '🪓',
    effect: {
      actionType: 'plasma_cleave',
      power: 1.9,
      range: 1
    }
  },
  'vanguard_barrier': {
    id: 'vanguard_barrier',
    name: 'Aegis Barrier',
    branch: 'vanguard',
    tier: 3,
    type: 'active',
    pointCost: 1,
    energyCost: 25,
    cooldown: 5,
    description: 'Generate a kinetic shield absorbing up to 40 damage for 5 turns.',
    prerequisites: ['vanguard_cleave'],
    unlocked: false,
    icon: '💠',
    effect: {
      actionType: 'nanite_heal',
      power: 40
    }
  },
  'vanguard_immortal': {
    id: 'vanguard_immortal',
    name: 'Indomitable Core',
    branch: 'vanguard',
    tier: 4,
    type: 'passive',
    pointCost: 2,
    description: 'Take 25% less damage from all attacks. Defense +6.',
    prerequisites: ['vanguard_barrier'],
    unlocked: false,
    icon: '👑',
    effect: {
      statBoost: { defense: 6 }
    }
  }
};

export function getSkillsForClass(cls: CharacterClass): SkillNode[] {
  return Object.values(SKILL_DATABASE).filter(s => s.branch === cls);
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
