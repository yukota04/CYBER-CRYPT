import { 
  GameState, 
  Position, 
  Entity, 
  CombatLogEntry, 
  Skill, 
  GameEvent,
  Item
} from './types';
import { generateDungeon } from './dungeon';

export const calculatePlayerDamage = (state: GameState): { damage: number, isCritical: boolean } => {
  const { player } = state;
  let baseDamage = player.stats.attack;
  
  // Apply weapon bonus
  if (player.equipment.weapon) {
    baseDamage += player.equipment.weapon.bonus || 0;
  }
  
  // Passive: Striker Executioner (Tier 4) - 2x damage to low health targets
  let multiplier = 1;
  const target = state.monsters.find(m => m.pos.x === state.lastTargetPos?.x && m.pos.y === state.lastTargetPos?.y);
  if (target && player.skills.includes('striker_executioner')) {
    if (target.hp < target.maxHp * 0.3) {
      multiplier = 2;
    }
  }

  // Critical hit chance
  const critChance = 0.1 + (player.stats.luck * 0.02);
  const isCritical = Math.random() < critChance;
  if (isCritical) multiplier *= 1.5;

  return { 
    damage: Math.floor(baseDamage * multiplier), 
    isCritical 
  };
};

export const resolveStepOrAttack = (state: GameState, targetPos: Position): { 
  newState: GameState, 
  interaction?: 'stairs' | 'shop' | 'shrine' | 'chest',
  log?: CombatLogEntry 
} => {
  const newState = { ...state };
  const { x, y } = targetPos;

  // Check for monsters at target position
  const monsterIndex = newState.monsters.findIndex(m => m.pos.x === x && m.pos.y === y);
  
  if (monsterIndex !== -1) {
    // Attack monster
    const monster = newState.monsters[monsterIndex];
    const { damage, isCritical } = calculatePlayerDamage(newState);
    
    monster.hp -= damage;
    newState.lastTargetPos = { x, y };
    
    const log: CombatLogEntry = {
      text: `Hit ${monster.name} for ${damage} damage!${isCritical ? ' CRITICAL!' : ''}`,
      type: isCritical ? 'critical' : 'player-attack'
    };

    if (monster.hp <= 0) {
      log.text += ` ${monster.name} destroyed. +${monster.expValue} XP.`;
      newState.player.exp += monster.expValue;
      newState.monsters.splice(monsterIndex, 1);
      
      // Check level up
      const expNeeded = newState.player.level * 100;
      if (newState.player.exp >= expNeeded) {
        newState.player.level++;
        newState.player.exp -= expNeeded;
        newState.player.stats.maxHp += 10;
        newState.player.hp = newState.player.stats.maxHp;
        newState.player.stats.maxEnergy += 5;
        newState.player.energy = newState.player.stats.maxEnergy;
        newState.player.skillPoints += 1;
        log.text += ` LEVEL UP! Reached level ${newState.player.level}.`;
      }
    } else {
      monster.alerted = true; // Wake up on hit
    }

    return { newState, log };
  }

  // Check for items/interactables on floor
  const tile = newState.dungeon.grid[y][x];
  let interaction: 'stairs' | 'shop' | 'shrine' | 'chest' | undefined;
  let log: CombatLogEntry | undefined;

  if (tile.type === 'stairs_down') {
    interaction = 'stairs';
    log = { text: "System link detected. Descend to next sub-layer?", type: 'system' };
  } else if (tile.type === 'shop') {
    interaction = 'shop';
    log = { text: "Neural-Market terminal active. Accessing inventory...", type: 'system' };
  } else if (tile.type === 'shrine') {
    interaction = 'shrine';
    // Shrines restore 30% HP/Energy immediately on step
    const healHp = Math.floor(newState.player.stats.maxHp * 0.3);
    const healEn = Math.floor(newState.player.stats.maxEnergy * 0.3);
    newState.player.hp = Math.min(newState.player.stats.maxHp, newState.player.hp + healHp);
    newState.player.energy = Math.min(newState.player.stats.maxEnergy, newState.player.energy + healEn);
    // Change tile back to floor after use (or keep as shrine but disable? Let's make it floor)
    newState.dungeon.grid[y][x] = { ...tile, type: 'floor' };
    log = { text: "Nanite station synchronized. Vitals restored.", type: 'buff' };
  } else if (tile.type === 'chest') {
    interaction = 'chest';
    // Logic for chests would go here or handled in App.tsx to show a modal
  }

  // Move player if no monster
  newState.player.pos = targetPos;
  return { newState, interaction, log };
};

export const processMonsterTurns = (state: GameState): { newState: GameState, logs: CombatLogEntry[] } => {
  const newState = { ...state };
  const logs: CombatLogEntry[] = [];
  const { player } = newState;

  newState.monsters.forEach(monster => {
    if (!monster.alerted) {
      // Chance to wake up if player is near
      const dist = Math.abs(monster.pos.x - player.pos.x) + Math.abs(monster.pos.y - player.pos.y);
      if (dist < 4) monster.alerted = true;
      else return;
    }

    const dx = player.pos.x - monster.pos.x;
    const dy = player.pos.y - monster.pos.y;
    const dist = Math.abs(dx) + Math.abs(dy);

    if (dist === 1) {
      // Attack player
      let damage = Math.floor(monster.stats.attack * (1 - player.stats.defense / 100));
      
      // Apply event: EMP Surge (+15% monster damage)
      if (state.activeEvent?.id === 'emp_surge') {
        damage = Math.floor(damage * 1.15);
      }
      
      damage = Math.max(1, damage);
      player.hp -= damage;
      logs.push({
        text: `${monster.name} attacks for ${damage} damage!`,
        type: 'monster-attack'
      });
    } else if (dist < 8) {
      // Move towards player
      const moveX = dx !== 0 ? (dx > 0 ? 1 : -1) : 0;
      const moveY = dy !== 0 ? (dy > 0 ? 1 : -1) : 0;
      
      // Simple pathfinding: try X then Y
      const nextX = { x: monster.pos.x + moveX, y: monster.pos.y };
      const nextY = { x: monster.pos.x, y: monster.pos.y + moveY };
      
      if (isPosWalkable(newState, nextX)) {
        monster.pos = nextX;
      } else if (isPosWalkable(newState, nextY)) {
        monster.pos = nextY;
      }
    }
  });

  return { newState, logs };
};

const isPosWalkable = (state: GameState, pos: Position): boolean => {
  if (pos.x < 0 || pos.y < 0 || pos.x >= state.dungeon.width || pos.y >= state.dungeon.height) return false;
  const tile = state.dungeon.grid[pos.y][pos.x];
  if (tile.type === 'wall' || tile.type === 'void') return false;
  
  // Check other monsters
  const hasMonster = state.monsters.some(m => m.pos.x === pos.x && m.pos.y === pos.y);
  if (hasMonster) return false;
  
  // Check player
  if (state.player.pos.x === pos.x && state.player.pos.y === pos.y) return false;
  
  return true;
};

export const executeSkill = (state: GameState, skillId: string): { newState: GameState, log: CombatLogEntry } => {
  const newState = { ...state };
  const { player } = newState;
  
  // Mock skill data lookup (in real app, use the skills.ts definitions)
  // This is a simplified version for the core combat engine
  let energyCost = 20;
  
  // Event: Gravity Shift (-30% energy cost)
  if (state.activeEvent?.id === 'gravity_shift') {
    energyCost = Math.floor(energyCost * 0.7);
  }

  if (player.energy < energyCost) {
    return { newState, log: { text: "Insufficient energy!", type: 'system' } };
  }

  player.energy -= energyCost;
  let logText = `Activated skill: ${skillId}`;
  let logType: CombatLogEntry['type'] = 'skill';

  // Specific skill logic
  switch(skillId) {
    case 'striker_overclock':
      player.stats.attack += 5;
      logText = "OVERCLOCK: Attack increased significantly.";
      break;
    case 'vanguard_barrier':
      player.hp = Math.min(player.stats.maxHp, player.hp + 25);
      logText = "BARRIER: Integrity restored.";
      logType = 'buff';
      break;
    case 'techno_nanite_heal':
      player.hp = Math.min(player.stats.maxHp, player.hp + 40);
      logText = "NANITES: Cellular repair complete.";
      logType = 'buff';
      break;
    default:
      // Generic attack skill
      const target = newState.monsters.find(m => 
        Math.abs(m.pos.x - player.pos.x) + Math.abs(m.pos.y - player.pos.y) <= 2
      );
      if (target) {
        const dmg = 40;
        target.hp -= dmg;
        logText = `Skill ${skillId} hit ${target.name} for ${dmg}!`;
      }
  }

  return { newState, log: { text: logText, type: logType } };
};
