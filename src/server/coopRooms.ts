import {
  AttackEffect,
  CharacterClass,
  CombatLogEntry,
  CoopPlayerSlot,
  CoopRoomState,
  DungeonState,
  EquipSlot,
  GameItem,
  Player,
  SavedPlayerLoadout
} from '../game/types';
import { activateNearbySpawns, generateDungeon, updateFOV } from '../game/dungeon';
import {
  awardXP,
  buildOnlineExitStash,
  calculateHitstopSeconds,
  calculatePlayerDamage,
  collectDeathDropBagsAt,
  computeSkillDamage,
  dropCoinsAround,
  dropPlayerLoadoutOnDeath,
  getEffectiveSkillEnergyCost,
  getFovRadius,
  getPlayerAttackRange,
  getTotalStats,
  hasLineOfSight,
  resolveMonsterTurns,
  restoreOnlineStashToLevel1Player,
  useConsumableItem
} from '../game/combat';
import { canUnlockSkill, SKILL_DATABASE } from '../game/skills';
import {
  attemptUpgradeItem,
  canClassEquipItem,
  canUpgradeItem,
  getEquipSlotForItem,
  getItemSellPrice,
  getProbabilityStoneCost,
  getUpgradeCost
} from '../game/items';

export interface PendingCoopAction {
  playerId: string;
  type: 'move' | 'skill' | 'ranged_attack' | 'wait';
  dx?: number;
  dy?: number;
  targetX?: number;
  targetY?: number;
  skillId?: string;
}

export interface InternalCoopRoom extends CoopRoomState {
  pendingActions: Map<string, PendingCoopAction>;
}

export interface CoopTurnBroadcast {
  room: CoopRoomState;
  soundEvents: string[];
  floatingTexts: { text: string; x: number; y: number; color: string; isCrit?: boolean }[];
  attackEffects: AttackEffect[];
  hitstopSeconds: number;
  screenShake: number;
}

export function getOnlineStashKey(accountId: string, characterClass: CharacterClass | null | undefined): string {
  return `${accountId}:${characterClass || 'striker'}`;
}

export class CoopRoomManager {
  private rooms = new Map<string, InternalCoopRoom>();
  private savedLoadouts = new Map<string, SavedPlayerLoadout>();

  public exportPersistentState(): SavedPlayerLoadout[] {
    return Array.from(this.savedLoadouts.values());
  }

  public importPersistentState(loadouts: SavedPlayerLoadout[]) {
    if (!Array.isArray(loadouts)) return;
    for (const entry of loadouts) {
      if (entry?.playerId) {
        const key = getOnlineStashKey(entry.playerId, entry.characterClass);
        this.savedLoadouts.set(key, entry);
      }
    }
  }

  public getSavedLoadout(accountId: string, characterClass?: CharacterClass | null): SavedPlayerLoadout | undefined {
    if (characterClass) {
      return this.savedLoadouts.get(getOnlineStashKey(accountId, characterClass));
    }
    return (
      this.savedLoadouts.get(getOnlineStashKey(accountId, 'striker')) ||
      this.savedLoadouts.get(getOnlineStashKey(accountId, 'technomancer')) ||
      this.savedLoadouts.get(getOnlineStashKey(accountId, 'vanguard'))
    );
  }

  public getSavedStashesForAccount(accountId: string): Partial<Record<CharacterClass, SavedPlayerLoadout>> {
    const out: Partial<Record<CharacterClass, SavedPlayerLoadout>> = {};
    for (const cls of ['striker', 'technomancer', 'vanguard'] as CharacterClass[]) {
      const entry = this.savedLoadouts.get(getOnlineStashKey(accountId, cls));
      if (entry) out[cls] = entry;
    }
    return out;
  }

  private saveLiveSlotLoadout(slot: CoopPlayerSlot, dungeon?: DungeonState | null) {
    if (!slot.player) return;
    const accountId = slot.accountId || slot.playerId;
    const cls = slot.player.characterClass || slot.characterClass || 'striker';
    const key = getOnlineStashKey(accountId, cls);

    if (!slot.alive || slot.player.stats.hp <= 0) {
      if (slot.preDeathLoadout) {
        this.savedLoadouts.set(key, slot.preDeathLoadout);
      }
      return;
    }

    const extraBags = (dungeon?.deathDrops || []).filter(b => b.ownerId === slot.playerId);
    const exitStash = buildOnlineExitStash(slot.player, accountId, slot.username, extraBags);
    slot.preDeathLoadout = exitStash;
    this.savedLoadouts.set(key, exitStash);
  }

  public getOrCreateRoom(roomId: string): InternalCoopRoom {
    const cleanId = (roomId || 'ALPHA-1').toUpperCase().slice(0, 16);
    let room = this.rooms.get(cleanId);
    if (!room) {
      room = {
        roomId: cleanId,
        status: 'lobby',
        turn: 1,
        players: [],
        dungeon: null,
        logs: [],
        score: 0,
        monstersSlain: 0,
        pendingActions: new Map()
      };
      this.rooms.set(cleanId, room);
    }
    return room;
  }

  public getRoom(roomId: string): InternalCoopRoom | undefined {
    return this.rooms.get(roomId.toUpperCase());
  }

  public sanitizeRoom(room: InternalCoopRoom): CoopRoomState {
    return {
      roomId: room.roomId,
      status: room.status,
      turn: room.turn,
      players: room.players.map(p => ({ ...p })),
      dungeon: room.dungeon,
      logs: room.logs.slice(0, 30),
      score: room.score,
      monstersSlain: room.monstersSlain
    };
  }

  public joinRoom(
    roomId: string,
    playerId: string,
    username: string,
    accountId?: string
  ): { ok: boolean; error?: string; room?: CoopRoomState } {
    const room = this.getOrCreateRoom(roomId);
    const resolvedAccountId = accountId || playerId;
    const existing = room.players.find(p => p.playerId === playerId);
    if (existing) {
      existing.username = username;
      existing.accountId = resolvedAccountId;
      return { ok: true, room: this.sanitizeRoom(room) };
    }
    if (room.players.length >= 3) {
      return { ok: false, error: 'ROOM_FULL' };
    }
    if (room.status === 'playing') {
      return { ok: false, error: 'MATCH_ALREADY_STARTED' };
    }

    room.players.push({
      playerId,
      accountId: resolvedAccountId,
      username,
      characterClass: null,
      ready: false,
      movedThisTurn: false,
      alive: true
    });
    return { ok: true, room: this.sanitizeRoom(room) };
  }

  public leaveRoom(roomId: string, playerId: string): InternalCoopRoom | undefined {
    const room = this.getRoom(roomId);
    if (!room) return undefined;
    const leavingSlot = room.players.find(p => p.playerId === playerId);
    if (leavingSlot?.player) {
      // Save only currencies, items & unequipped armor moved to inventory (discard floor/level/skills)
      this.saveLiveSlotLoadout(leavingSlot, room.dungeon);
    }
    room.players = room.players.filter(p => p.playerId !== playerId);
    room.pendingActions.delete(playerId);
    if (room.players.length === 0) {
      this.rooms.delete(room.roomId);
      return undefined;
    }
    return room;
  }

  public selectRole(
    roomId: string,
    playerId: string,
    characterClass: CharacterClass
  ): { ok: boolean; error?: string; room?: CoopRoomState } {
    const room = this.getRoom(roomId);
    if (!room) return { ok: false, error: 'ROOM_NOT_FOUND' };
    if (room.status !== 'lobby') return { ok: false, error: 'ALREADY_IN_MATCH' };

    const slot = room.players.find(p => p.playerId === playerId);
    if (!slot) return { ok: false, error: 'NOT_IN_ROOM' };

    // Enforce unique class per player (no duplicates allowed)
    const takenByOther = room.players.some(
      p => p.playerId !== playerId && p.characterClass === characterClass
    );
    if (takenByOther) {
      return { ok: false, error: 'ROLE_ALREADY_TAKEN' };
    }

    slot.characterClass = characterClass;
    slot.ready = false; // changing role resets ready state
    return { ok: true, room: this.sanitizeRoom(room) };
  }

  public toggleReady(
    roomId: string,
    playerId: string,
    ready: boolean
  ): { ok: boolean; error?: string; room?: CoopRoomState } {
    const room = this.getRoom(roomId);
    if (!room) return { ok: false, error: 'ROOM_NOT_FOUND' };
    const slot = room.players.find(p => p.playerId === playerId);
    if (!slot) return { ok: false, error: 'NOT_IN_ROOM' };
    if (!slot.characterClass && ready) {
      return { ok: false, error: 'SELECT_ROLE_FIRST' };
    }
    slot.ready = ready;
    return { ok: true, room: this.sanitizeRoom(room) };
  }

  public canStartRoom(room: InternalCoopRoom): { canStart: boolean; reason?: string } {
    if (room.players.length < 1 || room.players.length > 3) {
      return { canStart: false, reason: 'REQUIRES_AT_LEAST_1_PLAYER' };
    }
    const roles = room.players.map(p => p.characterClass);
    if (roles.some(r => r === null)) {
      return { canStart: false, reason: 'ALL_MUST_SELECT_ROLE' };
    }
    if (new Set(roles).size !== room.players.length) {
      return { canStart: false, reason: 'ROLES_MUST_BE_UNIQUE' };
    }
    if (!room.players.every(p => p.ready)) {
      return { canStart: false, reason: 'ALL_MUST_BE_READY' };
    }
    return { canStart: true };
  }

  public startRoom(roomId: string, seed?: number): { ok: boolean; error?: string; room?: CoopRoomState } {
    const room = this.getRoom(roomId);
    if (!room) return { ok: false, error: 'ROOM_NOT_FOUND' };

    const check = this.canStartRoom(room);
    if (!check.canStart) {
      return { ok: false, error: check.reason };
    }

    const dungeon = generateDungeon(1, seed);
    const startRoom = dungeon.rooms[0];
    const startCp = dungeon.checkpoints[0] || { x: startRoom.centerX, y: startRoom.centerY, activated: true };
    const offsets = [
      { dx: 0, dy: 0 },
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 }
    ];

    room.players.forEach((slot, idx) => {
      const cls = slot.characterClass!;
      const accountId = slot.accountId || slot.playerId;
      const off = offsets[idx % offsets.length];
      let px = startRoom.centerX + off.dx;
      let py = startRoom.centerY + off.dy;
      if (!dungeon.tiles[py]?.[px]?.walkable) {
        px = startRoom.centerX;
        py = startRoom.centerY;
      }
      const savedStash = this.savedLoadouts.get(getOnlineStashKey(accountId, cls));
      slot.player = restoreOnlineStashToLevel1Player(cls, px, py, savedStash);
      slot.player.lastCheckpoint = { floor: 1, x: startCp.x, y: startCp.y };
      slot.lastCheckpoint = { floor: 1, x: startCp.x, y: startCp.y };
      slot.movedThisTurn = false;
      slot.alive = true;
      this.saveLiveSlotLoadout(slot, dungeon);
    });

    this.refreshSquadFOV(dungeon, room.players);
    room.dungeon = dungeon;
    room.status = 'playing';
    room.turn = 1;
    room.score = 0;
    room.monstersSlain = 0;
    room.pendingActions.clear();
    room.logs = [
      {
        id: `coop_start_${Date.now()}`,
        text: `ONLINE SQUAD DEPLOYED (${room.players.length} ${room.players.length === 1 ? 'OPERATIVE' : 'OPERATIVES'})! Move 1 tile per turn — all active operatives must act to advance.`,
        type: 'info',
        turn: 1
      }
    ];

    return { ok: true, room: this.sanitizeRoom(room) };
  }

  private refreshSquadFOV(dungeon: DungeonState, players: CoopPlayerSlot[]) {
    for (let y = 0; y < dungeon.height; y++) {
      for (let x = 0; x < dungeon.width; x++) {
        dungeon.tiles[y][x].visible = false;
      }
    }
    const radius = getFovRadius(dungeon);
    for (const slot of players) {
      if (!slot.player || !slot.alive) continue;
      // Compute visibility union
      const tempTiles = dungeon.tiles.map(r => r.map(t => ({ ...t, visible: false })));
      updateFOV(tempTiles, slot.player.x, slot.player.y, radius);
      for (let y = 0; y < dungeon.height; y++) {
        for (let x = 0; x < dungeon.width; x++) {
          if (tempTiles[y][x].visible) dungeon.tiles[y][x].visible = true;
          if (tempTiles[y][x].explored) dungeon.tiles[y][x].explored = true;
        }
      }
    }
  }

  public submitAction(
    roomId: string,
    playerId: string,
    action: PendingCoopAction
  ): {
    ok: boolean;
    error?: string;
    resolved?: boolean;
    room?: CoopRoomState;
    broadcast?: CoopTurnBroadcast;
  } {
    const room = this.getRoom(roomId);
    if (!room) return { ok: false, error: 'ROOM_NOT_FOUND' };
    if (room.status !== 'playing' || !room.dungeon) return { ok: false, error: 'NOT_PLAYING' };

    const slot = room.players.find(p => p.playerId === playerId);
    if (!slot || !slot.player) return { ok: false, error: 'NOT_IN_ROOM' };
    if (!slot.alive) return { ok: false, error: 'OPERATIVE_DOWN' };

    // Enforce 1-tile-per-turn lock until all active teammates act
    if (slot.movedThisTurn) {
      return { ok: false, error: 'TURN_LOCKED_WAITING_FOR_TEAMMATES' };
    }

    slot.movedThisTurn = true;
    room.pendingActions.set(playerId, action);

    const activePlayers = room.players.filter(p => p.alive && p.player);
    const allMoved = activePlayers.every(p => p.movedThisTurn);

    if (!allMoved) {
      return { ok: true, resolved: false, room: this.sanitizeRoom(room) };
    }

    // All active teammates submitted -> resolve synchronized turn!
    const broadcast = this.resolveCoopTurn(room);
    return { ok: true, resolved: true, room: this.sanitizeRoom(room), broadcast };
  }

  private resolveCoopTurn(room: InternalCoopRoom): CoopTurnBroadcast {
    const dungeon = room.dungeon!;
    const turn = room.turn;
    const logs: CombatLogEntry[] = [];
    const soundEvents: string[] = [];
    const floatingTexts: CoopTurnBroadcast['floatingTexts'] = [];
    const attackEffects: AttackEffect[] = [];
    let hitstopSeconds = 0;
    let screenShake = 0;
    let floorCompleted = false;

    for (const slot of room.players) {
      const p = slot.player;
      if (!p || !slot.alive) continue;
      const act = room.pendingActions.get(slot.playerId);
      if (!act) continue;

      // Cooldown & regen bookkeeping
      if (p.buffs.overclockTurns > 0) p.buffs.overclockTurns--;
      for (const sid in p.activeCooldowns) {
        if (p.activeCooldowns[sid] > 0) p.activeCooldowns[sid]--;
      }
      const pTotals = getTotalStats(p);
      const regen = p.characterClass === 'technomancer' ? 3 : 1;
      p.stats.energy = Math.min(pTotals.maxEnergy, p.stats.energy + regen);

      if (act.type === 'move') {
        const dx = Math.max(-1, Math.min(1, act.dx || 0));
        const dy = Math.max(-1, Math.min(1, act.dy || 0));
        if (dx === 1) p.facing = 'right';
        else if (dx === -1) p.facing = 'left';
        else if (dy === 1) p.facing = 'down';
        else if (dy === -1) p.facing = 'up';

        if (dx === 0 && dy === 0) continue;

        const tx = p.x + dx;
        const ty = p.y + dy;
        const monIdx = dungeon.monsters.findIndex(m => m.x === tx && m.y === ty);
        if (monIdx !== -1) {
          const mon = dungeon.monsters[monIdx];
          const { damage, isCrit } = calculatePlayerDamage(p, mon, dungeon.activeEvent);
          mon.hp -= damage;
          mon.alerted = true;
          const killed = mon.hp <= 0;
          hitstopSeconds = Math.max(hitstopSeconds, calculateHitstopSeconds(damage, mon.maxHp, isCrit, false, killed));
          screenShake += isCrit ? 0.25 : 0.1;
          soundEvents.push(isCrit ? 'crit' : 'hit');
          attackEffects.push({ type: isCrit ? 'crit_slash' : 'slash', x: p.x, y: p.y, targetX: tx, targetY: ty, color: isCrit ? '#ffe600' : '#00f0ff' });
          floatingTexts.push({ text: isCrit ? `CRIT! -${damage}` : `-${damage}`, x: tx, y: ty, color: isCrit ? '#ffe600' : '#00f0ff', isCrit });
          logs.unshift({
            id: `c_atk_${Date.now()}_${slot.playerId}`,
            text: `${slot.username} ${isCrit ? 'CRITS' : 'hits'} ${mon.name} for ${damage} dmg!`,
            type: isCrit ? 'critical' : 'player_attack',
            turn
          });

          if (killed) {
            dungeon.monsters.splice(monIdx, 1);
            room.monstersSlain += 1;
            room.score += 150;
            p.stats.soulShards += mon.shardReward;
            dropCoinsAround(dungeon, tx, ty, dungeon.floor, mon.archetype === 'core_synthesizer');
            soundEvents.push('kill');
            awardXP(p, mon.expReward, logs, turn);
          }
        } else {
          const tile = dungeon.tiles[ty]?.[tx];
          const occupiedByAlly = room.players.some(other => other.playerId !== slot.playerId && other.alive && other.player?.x === tx && other.player?.y === ty);
          if (tile && tile.walkable && !occupiedByAlly) {
            p.x = tx;
            p.y = ty;
            if (dx !== 0 || dy !== 0) {
              soundEvents.push('step');
            }

            const coinsHere = dungeon.groundCoins.filter(c => c.x === tx && c.y === ty);
            if (coinsHere.length > 0) {
              const val = coinsHere.reduce((s, c) => s + c.value, 0);
              p.stats.coins += val;
              dungeon.groundCoins = dungeon.groundCoins.filter(c => !(c.x === tx && c.y === ty));
              soundEvents.push('coin');
              floatingTexts.push({ text: `+${val} 🪙`, x: tx, y: ty, color: '#fbbf24' });
            }

            const recovered = collectDeathDropBagsAt(p, dungeon, slot.playerId);
            if (recovered.recoveredBags > 0) {
              soundEvents.push('chest');
              floatingTexts.push({ text: `☠️ GEAR RECOVERED!`, x: tx, y: ty, color: '#ffe600', isCrit: true });
              logs.unshift({
                id: `c_skull_${Date.now()}_${slot.playerId}`,
                text: `☠️ ${slot.username} recovered their death cache (${recovered.totalItems} items, ${recovered.totalCoins} coins)!`,
                type: 'level_up',
                turn
              });
            }

            if (tile.type === 'checkpoint') {
              const wasActive = !!tile.checkpointActivated;
              tile.checkpointActivated = true;
              const cp = dungeon.checkpoints.find(c => c.x === tx && c.y === ty);
              if (cp) cp.activated = true;
              slot.lastCheckpoint = { floor: dungeon.floor, x: tx, y: ty };
              p.lastCheckpoint = { floor: dungeon.floor, x: tx, y: ty };
              if (!wasActive) {
                const healAmt = Math.max(10, Math.floor(pTotals.maxHp * 0.2));
                p.stats.hp = Math.min(pTotals.maxHp, p.stats.hp + healAmt);
                soundEvents.push('checkpoint');
              } else {
                soundEvents.push('pickup');
              }
              floatingTexts.push({ text: 'CHECKPOINT SAVED!', x: tx, y: ty, color: '#10b981' });
              logs.unshift({
                id: `c_cp_${Date.now()}_${slot.playerId}`,
                text: `◈ ${slot.username} synchronized neural checkpoint at (${tx}, ${ty})!`,
                type: 'info',
                turn
              });
            } else if (tile.type === 'chest') {
              const loot = tile.item;
              tile.type = 'floor';
              delete tile.item;
              soundEvents.push('chest');
              if (loot && p.inventory.length < p.maxInventory) {
                p.inventory.push(loot);
                logs.unshift({ id: `c_loot_${Date.now()}`, text: `${slot.username} looted [${loot.name}]!`, type: 'item', turn });
              }
            } else if (tile.type === 'shrine') {
              tile.type = 'floor';
              soundEvents.push('shrine');
              p.stats.hp = Math.min(pTotals.maxHp, p.stats.hp + Math.floor(pTotals.maxHp * 0.5));
              p.stats.energy = pTotals.maxEnergy;
            } else if (tile.type === 'stairs_down') {
              floorCompleted = true;
            }
          }
        }
      } else if (act.type === 'ranged_attack') {
        const maxRange = getPlayerAttackRange(p);
        let monIdx = -1;
        if (typeof act.targetX === 'number' && typeof act.targetY === 'number') {
          monIdx = dungeon.monsters.findIndex(m => m.x === act.targetX && m.y === act.targetY);
        } else {
          let best = Infinity;
          dungeon.monsters.forEach((m, idx) => {
            const dist = Math.max(Math.abs(m.x - p.x), Math.abs(m.y - p.y));
            if (dist >= 1 && dist <= maxRange && hasLineOfSight(dungeon, p.x, p.y, m.x, m.y) && dist < best) {
              best = dist;
              monIdx = idx;
            }
          });
        }
        if (monIdx !== -1) {
          const mon = dungeon.monsters[monIdx];
          const dist = Math.max(Math.abs(mon.x - p.x), Math.abs(mon.y - p.y));
          if (dist >= 1 && dist <= maxRange && hasLineOfSight(dungeon, p.x, p.y, mon.x, mon.y)) {
            const { damage, isCrit } = calculatePlayerDamage(p, mon, dungeon.activeEvent);
            mon.hp -= damage;
            mon.alerted = true;
            const killed = mon.hp <= 0;
            hitstopSeconds = Math.max(hitstopSeconds, calculateHitstopSeconds(damage, mon.maxHp, isCrit, false, killed));
            screenShake += isCrit ? 0.25 : 0.14;
            if (dist > 1) soundEvents.push('ranged_shot');
            soundEvents.push(isCrit ? 'crit' : 'hit');
            const color = p.characterClass === 'technomancer' ? '#bd00ff' : isCrit ? '#ffe600' : '#00f0ff';
            attackEffects.push({
              type: dist <= 1 ? (isCrit ? 'crit_slash' : 'slash') : 'beam',
              x: p.x,
              y: p.y,
              targetX: mon.x,
              targetY: mon.y,
              color
            });
            floatingTexts.push({
              text: isCrit ? `CRIT! -${damage}` : `-${damage}`,
              x: mon.x,
              y: mon.y,
              color: isCrit ? '#ffe600' : color,
              isCrit
            });
            logs.unshift({
              id: `c_rng_${Date.now()}_${slot.playerId}`,
              text: `${slot.username} fires ranged strike (${dist}t) on Lv.${mon.level} ${mon.name} for ${damage} dmg!`,
              type: isCrit ? 'critical' : 'player_attack',
              turn
            });
            if (killed) {
              dungeon.monsters.splice(monIdx, 1);
              room.monstersSlain += 1;
              room.score += 150;
              p.stats.soulShards += mon.shardReward;
              dropCoinsAround(dungeon, mon.x, mon.y, dungeon.floor, mon.archetype === 'core_synthesizer');
              soundEvents.push('kill');
              awardXP(p, mon.expReward, logs, turn);
            }
          }
        }
      } else if (act.type === 'skill' && act.skillId) {
        const skill = SKILL_DATABASE[act.skillId];
        if (skill && p.unlockedSkills.includes(act.skillId) && (p.activeCooldowns[act.skillId] || 0) === 0) {
          const cost = getEffectiveSkillEnergyCost(skill.energyCost || 15, dungeon.activeEvent);
          if (p.stats.energy >= cost) {
            p.stats.energy -= cost;
            p.activeCooldowns[act.skillId] = skill.cooldown || 3;
            const range = skill.effect.range || 2;
            const actionType = skill.effect.actionType;
            soundEvents.push(
              actionType === 'phase_dash' || actionType === 'shadow_strike'
                ? 'skill_dash'
                : actionType === 'chain_lightning' || actionType === 'plasma_beam' || actionType === 'orbital_strike'
                ? 'skill_lightning'
                : actionType === 'meteor_strike'
                ? 'skill_fire'
                : actionType === 'frost_nova'
                ? 'skill_frost'
                : actionType === 'nanite_heal' || actionType === 'vampiric_drain'
                ? 'skill_heal'
                : actionType === 'aegis_barrier' || actionType === 'fortify_stance' || actionType === 'glitch_overcharge'
                ? 'skill_shield'
                : 'skill_aoe'
            );
            let hitCount = 0;

            if (actionType === 'nanite_heal') {
              const healAmt = Math.floor(pTotals.maxHp * (skill.effect.power || 0.45));
              p.stats.hp = Math.min(pTotals.maxHp, p.stats.hp + healAmt);
              floatingTexts.push({ text: `+${healAmt} HP`, x: p.x, y: p.y, color: '#10b981' });
              attackEffects.push({ type: 'heal', x: p.x, y: p.y, color: '#10b981', radius: 1.5 });
            } else if (actionType === 'aegis_barrier' || actionType === 'fortify_stance') {
              const shieldAmt = skill.effect.power || 40;
              p.buffs.shieldAmount = Math.max(p.buffs.shieldAmount, shieldAmt);
              floatingTexts.push({ text: `+${shieldAmt} SHIELD`, x: p.x, y: p.y, color: '#ffe600' });
              attackEffects.push({ type: 'shield', x: p.x, y: p.y, color: '#ffe600', radius: 1.5 });
            } else if (actionType === 'glitch_overcharge') {
              p.buffs.overclockTurns = 4;
              floatingTexts.push({ text: 'OVERCLOCK!', x: p.x, y: p.y, color: '#ff007f' });
              attackEffects.push({ type: 'nova', x: p.x, y: p.y, color: '#ff007f', radius: 1.5 });
            } else {
              for (let i = dungeon.monsters.length - 1; i >= 0; i--) {
                const m = dungeon.monsters[i];
                if (Math.hypot(m.x - p.x, m.y - p.y) <= range + 0.35) {
                  const dmg = computeSkillDamage(p, m, skill.effect.power || 2.0, dungeon.activeEvent);
                  m.hp -= dmg;
                  m.alerted = true;
                  hitCount++;
                  hitstopSeconds = Math.max(hitstopSeconds, calculateHitstopSeconds(dmg, m.maxHp, true, true, m.hp <= 0));
                  floatingTexts.push({
                    text: `-${dmg}`,
                    x: m.x,
                    y: m.y,
                    color: actionType === 'arcane_cataclysm' ? '#ff00aa' : '#00f0ff',
                    isCrit: actionType === 'arcane_cataclysm'
                  });
                  if (range >= 4) {
                    attackEffects.push({ type: 'lightning', x: p.x, y: p.y, targetX: m.x, targetY: m.y, color: '#bd00ff' });
                  }
                  if (m.hp <= 0) {
                    dungeon.monsters.splice(i, 1);
                    room.monstersSlain += 1;
                    room.score += 150;
                    p.stats.soulShards += m.shardReward;
                    dropCoinsAround(dungeon, m.x, m.y, dungeon.floor);
                    awardXP(p, m.expReward, logs, turn);
                  }
                }
              }
              if (actionType === 'frost_nova') {
                p.buffs.shieldAmount = Math.max(p.buffs.shieldAmount, 30);
              }
              attackEffects.push({
                type: skill.vfxType || 'nova',
                x: p.x,
                y: p.y,
                color: actionType === 'arcane_cataclysm' ? '#ff00aa' : '#bd00ff',
                radius: range + 0.5
              });
            }
            logs.unshift({
              id: `c_sk_${Date.now()}_${slot.playerId}`,
              text: `${slot.username} casts ${skill.name} (${hitCount} hits)!`,
              type: 'skill',
              turn
            });
          }
        }
      }
    }

    // Floor completion transitions whole squad to next level
    if (floorCompleted) {
      const nextFloor = dungeon.floor + 1;
      const nextDungeon = generateDungeon(nextFloor);
      const startRoom = nextDungeon.rooms[0];
      const nextStartCp = nextDungeon.checkpoints[0] || { x: startRoom.centerX, y: startRoom.centerY, activated: true };
      const offsets = [{ dx: 0, dy: 0 }, { dx: 1, dy: 0 }, { dx: -1, dy: 0 }];
      room.players.forEach((slot, idx) => {
        if (slot.player) {
          const off = offsets[idx % offsets.length];
          const nx = nextDungeon.tiles[startRoom.centerY + off.dy]?.[startRoom.centerX + off.dx]?.walkable ? startRoom.centerX + off.dx : startRoom.centerX;
          const ny = nextDungeon.tiles[startRoom.centerY + off.dy]?.[startRoom.centerX + off.dx]?.walkable ? startRoom.centerY + off.dy : startRoom.centerY;
          slot.player.x = nx;
          slot.player.y = ny;
          slot.player.lastCheckpoint = { floor: nextFloor, x: nextStartCp.x, y: nextStartCp.y };
          slot.lastCheckpoint = { floor: nextFloor, x: nextStartCp.x, y: nextStartCp.y };
          slot.movedThisTurn = false;
          this.saveLiveSlotLoadout(slot, nextDungeon);
        }
      });
      room.dungeon = nextDungeon;
      room.score += 500;
      this.refreshSquadFOV(nextDungeon, room.players);
      logs.unshift({ id: `c_fl_${Date.now()}`, text: `SQUAD DESCENDED TO FLOOR ${nextFloor}!`, type: 'level_up', turn });
      soundEvents.push('teleport');
    } else {
      // Shared monster turn targeting nearest living player
      const livingPlayers = room.players.filter(s => s.alive && s.player).map(s => s.player!);
      if (livingPlayers.length > 0) {
        for (const lp of livingPlayers) {
          activateNearbySpawns(dungeon, lp.x, lp.y, 11);
        }
        resolveMonsterTurns(livingPlayers[0], dungeon, logs, soundEvents as any, floatingTexts, turn, livingPlayers);
      }

      for (const slot of room.players) {
        if (slot.player && slot.player.stats.hp <= 0) {
          // Persist pre-death loot stash (equipped armor moved to inventory) before dropping onto Floating Skull bag
          const accountId = slot.accountId || slot.playerId;
          const cls = slot.player.characterClass || slot.characterClass || 'striker';
          const preDeathStash = buildOnlineExitStash(slot.player, accountId, slot.username);
          slot.preDeathLoadout = preDeathStash;
          this.savedLoadouts.set(getOnlineStashKey(accountId, cls), preDeathStash);
          slot.player.stats.hp = 0;
          slot.alive = false;
          const droppedBag = dropPlayerLoadoutOnDeath(slot.player, dungeon, slot.playerId, slot.username, turn);
          logs.unshift({
            id: `c_dead_${slot.playerId}_${Date.now()}`,
            text: droppedBag
              ? `${slot.username} fell in combat! ☠️ Equipment, backpack & ${droppedBag.coins} coins dropped at (${droppedBag.x}, ${droppedBag.y}).`
              : `${slot.username} fell in combat!`,
            type: 'defeat',
            turn
          });
        } else if (slot.alive && slot.player) {
          this.saveLiveSlotLoadout(slot, dungeon);
        }
        slot.movedThisTurn = false;
      }

      if (room.players.every(s => !s.alive)) {
        room.status = 'gameover';
        soundEvents.push('death');
      } else {
        this.refreshSquadFOV(dungeon, room.players);
      }
    }

    room.turn += 1;
    room.pendingActions.clear();
    room.logs = [...logs, ...room.logs].slice(0, 30);

    return {
      room: this.sanitizeRoom(room),
      soundEvents,
      floatingTexts,
      attackEffects,
      hitstopSeconds,
      screenShake
    };
  }

  public unlockSkill(roomId: string, playerId: string, skillId: string): { ok: boolean; error?: string; room?: CoopRoomState } {
    const room = this.getRoom(roomId);
    if (!room) return { ok: false, error: 'ROOM_NOT_FOUND' };
    const slot = room.players.find(p => p.playerId === playerId);
    if (!slot?.player) return { ok: false, error: 'PLAYER_NOT_READY' };
    const node = SKILL_DATABASE[skillId];
    if (!node) return { ok: false, error: 'SKILL_NOT_FOUND' };
    const check = canUnlockSkill(skillId, slot.player.unlockedSkills, slot.player.stats.skillPoints);
    if (!check.canUnlock) return { ok: false, error: check.reason };
    slot.player.unlockedSkills.push(skillId);
    slot.player.stats.skillPoints -= node.pointCost;
    if (node.type === 'passive' && node.effect.statBoost) {
      if (node.effect.statBoost.maxHp) {
        slot.player.stats.maxHp += node.effect.statBoost.maxHp;
        slot.player.stats.hp += node.effect.statBoost.maxHp;
      }
      if (node.effect.statBoost.maxEnergy) {
        slot.player.stats.maxEnergy += node.effect.statBoost.maxEnergy;
        slot.player.stats.energy += node.effect.statBoost.maxEnergy;
      }
    }
    return { ok: true, room: this.sanitizeRoom(room) };
  }

  public equipItem(roomId: string, playerId: string, itemId: string): { ok: boolean; error?: string; room?: CoopRoomState } {
    const room = this.getRoom(roomId);
    const slot = room?.players.find(p => p.playerId === playerId);
    if (!room || !slot?.player) return { ok: false, error: 'NOT_FOUND' };
    const p = slot.player;
    const item = p.inventory.find(i => i.id === itemId);
    if (!item) return { ok: false, error: 'ITEM_NOT_FOUND' };
    if (!canClassEquipItem(p.characterClass, item)) return { ok: false, error: 'CLASS_INCOMPATIBLE' };

    const targetSlot = getEquipSlotForItem(item, p.equipment);
    if (!targetSlot) return { ok: false, error: 'INVALID_SLOT' };

    if (targetSlot === 'offhand' && p.equipment.weapon?.twoHanded) {
      return { ok: false, error: 'TWO_HANDED_WEAPON_BLOCKS_OFFHAND' };
    }

    p.inventory = p.inventory.filter(i => i.id !== item.id);
    if (targetSlot === 'weapon' && item.twoHanded && p.equipment.offhand) {
      p.inventory.push(p.equipment.offhand);
      p.equipment.offhand = null;
    }
    const existing = p.equipment[targetSlot];
    if (existing) p.inventory.push(existing);
    p.equipment[targetSlot] = item;
    this.saveLiveSlotLoadout(slot, room.dungeon);
    return { ok: true, room: this.sanitizeRoom(room) };
  }

  public unequipItem(roomId: string, playerId: string, slotName: EquipSlot): { ok: boolean; error?: string; room?: CoopRoomState } {
    const room = this.getRoom(roomId);
    const slot = room?.players.find(p => p.playerId === playerId);
    if (!room || !slot?.player) return { ok: false, error: 'NOT_FOUND' };
    const p = slot.player;
    const currentItem = p.equipment[slotName];
    if (!currentItem) return { ok: false, error: 'EMPTY_SLOT' };
    if (p.inventory.length >= p.maxInventory) return { ok: false, error: 'INVENTORY_FULL' };

    p.equipment[slotName] = null;
    p.inventory.push(currentItem);
    this.saveLiveSlotLoadout(slot, room.dungeon);
    return { ok: true, room: this.sanitizeRoom(room) };
  }

  public buyProbabilityStone(roomId: string, playerId: string): { ok: boolean; error?: string; room?: CoopRoomState } {
    const room = this.getRoom(roomId);
    const slot = room?.players.find(p => p.playerId === playerId);
    if (!room || !slot?.player || !room.dungeon) return { ok: false, error: 'NOT_FOUND' };
    const p = slot.player;
    const cost = getProbabilityStoneCost(room.dungeon.floor);
    if (p.stats.coins < cost) return { ok: false, error: 'INSUFFICIENT_COINS' };

    p.stats.coins -= cost;
    p.stats.probabilityStones = (p.stats.probabilityStones || 0) + 1;
    this.saveLiveSlotLoadout(slot, room.dungeon);
    return { ok: true, room: this.sanitizeRoom(room) };
  }

  public buyShopItem(roomId: string, playerId: string, itemId: string): { ok: boolean; error?: string; room?: CoopRoomState } {
    const room = this.getRoom(roomId);
    const slot = room?.players.find(p => p.playerId === playerId);
    if (!room || !slot?.player || !room.dungeon) return { ok: false, error: 'NOT_FOUND' };
    const p = slot.player;
    const item = room.dungeon.shopItems?.find(i => i.id === itemId);
    if (!item) return { ok: false, error: 'ITEM_NOT_FOUND' };

    const currency = item.currency || 'shards';
    const isStone = item.effectType === 'stone';
    if (currency === 'coins' && p.stats.coins < item.value) return { ok: false, error: 'INSUFFICIENT_COINS' };
    if (currency !== 'coins' && p.stats.soulShards < item.value) return { ok: false, error: 'INSUFFICIENT_SHARDS' };
    if (!isStone && p.inventory.length >= p.maxInventory) return { ok: false, error: 'INVENTORY_FULL' };

    if (currency === 'coins') p.stats.coins -= item.value;
    else p.stats.soulShards -= item.value;

    if (isStone) {
      p.stats.probabilityStones = (p.stats.probabilityStones || 0) + 1;
    } else {
      p.inventory.push({ ...item, id: `${item.id}_own_${Date.now()}_${Math.random().toString(36).slice(2, 5)}` });
      if (item.type !== 'consumable') {
        room.dungeon.shopItems = (room.dungeon.shopItems || []).filter(i => i.id !== item.id);
      }
    }
    this.saveLiveSlotLoadout(slot, room.dungeon);
    return { ok: true, room: this.sanitizeRoom(room) };
  }

  public useItem(roomId: string, playerId: string, itemId: string): { ok: boolean; error?: string; room?: CoopRoomState } {
    const room = this.getRoom(roomId);
    const slot = room?.players.find(p => p.playerId === playerId);
    if (!room || !slot?.player || !room.dungeon) return { ok: false, error: 'NOT_FOUND' };
    const item = slot.player.inventory.find(i => i.id === itemId);
    if (!item || item.type !== 'consumable') return { ok: false, error: 'ITEM_NOT_FOUND' };

    const res = useConsumableItem(slot.player, room.dungeon, item, room.turn);
    slot.player = res.player;
    room.dungeon = res.dungeon;
    room.logs = [...res.logs, ...room.logs].slice(0, 30);
    this.saveLiveSlotLoadout(slot, room.dungeon);
    return { ok: true, room: this.sanitizeRoom(room) };
  }

  public dropItem(roomId: string, playerId: string, itemId: string): { ok: boolean; error?: string; room?: CoopRoomState } {
    const room = this.getRoom(roomId);
    const slot = room?.players.find(p => p.playerId === playerId);
    if (!room || !slot?.player) return { ok: false, error: 'NOT_FOUND' };
    slot.player.inventory = slot.player.inventory.filter(i => i.id !== itemId);
    this.saveLiveSlotLoadout(slot, room.dungeon);
    return { ok: true, room: this.sanitizeRoom(room) };
  }

  public sellItem(roomId: string, playerId: string, itemId: string): { ok: boolean; error?: string; room?: CoopRoomState } {
    const room = this.getRoom(roomId);
    const slot = room?.players.find(p => p.playerId === playerId);
    if (!room || !slot?.player) return { ok: false, error: 'NOT_FOUND' };
    const item = slot.player.inventory.find(i => i.id === itemId);
    if (!item) return { ok: false, error: 'ITEM_NOT_FOUND' };
    const price = getItemSellPrice(item);
    slot.player.inventory = slot.player.inventory.filter(i => i.id !== itemId);
    slot.player.stats.coins += price;
    this.saveLiveSlotLoadout(slot, room.dungeon);
    return { ok: true, room: this.sanitizeRoom(room) };
  }

  public reviveAtCheckpoint(
    roomId: string,
    playerId: string
  ): { ok: boolean; error?: string; room?: CoopRoomState; revivedPos?: { x: number; y: number } } {
    const room = this.getRoom(roomId);
    if (!room || !room.dungeon) return { ok: false, error: 'ROOM_NOT_FOUND' };
    const slot = room.players.find(p => p.playerId === playerId);
    if (!slot || !slot.player) return { ok: false, error: 'NOT_IN_ROOM' };
    if (slot.alive && slot.player.stats.hp > 0) return { ok: false, error: 'OPERATIVE_STILL_ALIVE' };

    const dungeon = room.dungeon;
    let spawnPos =
      slot.lastCheckpoint && slot.lastCheckpoint.floor === dungeon.floor
        ? { x: slot.lastCheckpoint.x, y: slot.lastCheckpoint.y }
        : dungeon.checkpoints.find(c => c.activated) ||
          dungeon.checkpoints[0] || {
            x: dungeon.rooms[0]?.centerX ?? 5,
            y: dungeon.rooms[0]?.centerY ?? 5
          };

    // Avoid overlapping an already-standing teammate if possible
    const occupied = (x: number, y: number) =>
      room.players.some(other => other.playerId !== playerId && other.alive && other.player?.x === x && other.player?.y === y);
    if (occupied(spawnPos.x, spawnPos.y)) {
      const neighbors = [
        { dx: 1, dy: 0 },
        { dx: -1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: 0, dy: -1 }
      ];
      for (const n of neighbors) {
        const nx = spawnPos.x + n.dx;
        const ny = spawnPos.y + n.dy;
        if (dungeon.tiles[ny]?.[nx]?.walkable && !occupied(nx, ny)) {
          spawnPos = { x: nx, y: ny };
          break;
        }
      }
    }

    const totals = getTotalStats(slot.player);
    slot.player.x = spawnPos.x;
    slot.player.y = spawnPos.y;
    slot.player.stats.hp = Math.max(1, Math.floor(totals.maxHp * 0.85));
    slot.player.stats.energy = totals.maxEnergy;
    slot.player.buffs = {
      overclockTurns: 0,
      shieldAmount: 0,
      regenTurns: 0,
      regenHpPerTurn: 0,
      regenEnergyPerTurn: 0
    };
    slot.alive = true;
    slot.movedThisTurn = false;
    room.status = 'playing';

    this.refreshSquadFOV(dungeon, room.players);
    room.logs.unshift({
      id: `c_rev_${Date.now()}_${playerId}`,
      text: `◈ ${slot.username} revived at Checkpoint (${spawnPos.x}, ${spawnPos.y})! Recover your Floating Skull ☠️ to reclaim gear & coins.`,
      type: 'level_up',
      turn: room.turn
    });

    return { ok: true, room: this.sanitizeRoom(room), revivedPos: spawnPos };
  }

  public upgradeItem(
    roomId: string,
    playerId: string,
    itemId: string,
    useProbabilityStone = false
  ): {
    ok: boolean;
    error?: string;
    status?: 'success' | 'destroyed';
    itemName?: string;
    destroyChance?: number;
    room?: CoopRoomState;
  } {
    const room = this.getRoom(roomId);
    const slot = room?.players.find(p => p.playerId === playerId);
    if (!room || !slot?.player) return { ok: false, error: 'NOT_FOUND' };
    const p = slot.player;

    let targetItem: GameItem | undefined;
    let equipKey: keyof Player['equipment'] | null = null;
    for (const k of Object.keys(p.equipment) as (keyof Player['equipment'])[]) {
      if (p.equipment[k]?.id === itemId) {
        targetItem = p.equipment[k]!;
        equipKey = k;
        break;
      }
    }
    if (!targetItem) {
      targetItem = p.inventory.find(i => i.id === itemId);
    }
    if (!targetItem || !canUpgradeItem(targetItem)) return { ok: false, error: 'CANNOT_UPGRADE' };
    const cost = getUpgradeCost(targetItem);
    if (p.stats.coins < cost) return { ok: false, error: 'INSUFFICIENT_COINS' };

    const canUseStone = useProbabilityStone && p.stats.probabilityStones > 0;
    if (canUseStone) p.stats.probabilityStones -= 1;
    p.stats.coins -= cost;
    const outcome = attemptUpgradeItem(targetItem, Math.random(), canUseStone);
    if (outcome.status === 'destroyed' || !outcome.item) {
      if (equipKey) {
        p.equipment[equipKey] = null;
      } else {
        p.inventory = p.inventory.filter(i => i.id !== itemId);
      }
      this.saveLiveSlotLoadout(slot, room.dungeon);
      room.logs.unshift({
        id: `c_upg_fail_${Date.now()}`,
        text: `💥 FORGE FAILURE: ${slot.username}'s [${targetItem.name}] shattered during enhancement!`,
        type: 'defeat',
        turn: room.turn
      });
      return {
        ok: true,
        status: 'destroyed',
        itemName: targetItem.name,
        destroyChance: outcome.destroyChance,
        room: this.sanitizeRoom(room)
      };
    }

    if (equipKey) {
      p.equipment[equipKey] = outcome.item;
    } else {
      p.inventory = p.inventory.map(i => (i.id === itemId ? outcome.item! : i));
    }
    this.saveLiveSlotLoadout(slot, room.dungeon);
    room.logs.unshift({
      id: `c_upg_ok_${Date.now()}`,
      text: `🔨 ${slot.username} enhanced [${outcome.item.name}]!`,
      type: 'item',
      turn: room.turn
    });
    return {
      ok: true,
      status: 'success',
      itemName: outcome.item.name,
      destroyChance: outcome.destroyChance,
      room: this.sanitizeRoom(room)
    };
  }

  /** Swap up to 6 inventory items between two alive players. */
  public executeTrade(
    roomId: string,
    fromPlayerId: string,
    toPlayerId: string,
    fromItemIds: string[],
    toItemIds: string[]
  ): { ok: boolean; error?: string; room?: CoopRoomState } {
    const room = this.getRoom(roomId);
    if (!room) return { ok: false, error: 'ROOM_NOT_FOUND' };
    const a = room.players.find(p => p.playerId === fromPlayerId);
    const b = room.players.find(p => p.playerId === toPlayerId);
    if (!a?.player || !b?.player || !a.alive || !b.alive) return { ok: false, error: 'TRADE_PARTNER_INVALID' };

    const takeA = (fromItemIds || []).slice(0, 6);
    const takeB = (toItemIds || []).slice(0, 6);
    const itemsA = takeA
      .map(id => a.player!.inventory.find(i => i.id === id))
      .filter((i): i is GameItem => !!i);
    const itemsB = takeB
      .map(id => b.player!.inventory.find(i => i.id === id))
      .filter((i): i is GameItem => !!i);
    if (itemsA.length !== takeA.length || itemsB.length !== takeB.length) {
      return { ok: false, error: 'TRADE_ITEMS_MISSING' };
    }

    const idsA = new Set(itemsA.map(i => i.id));
    const idsB = new Set(itemsB.map(i => i.id));
    a.player.inventory = [...a.player.inventory.filter(i => !idsA.has(i.id)), ...itemsB];
    b.player.inventory = [...b.player.inventory.filter(i => !idsB.has(i.id)), ...itemsA];
    this.saveLiveSlotLoadout(a, room.dungeon);
    this.saveLiveSlotLoadout(b, room.dungeon);
    room.logs.unshift({
      id: `trade_${Date.now()}`,
      text: `🤝 Trade completed: ${a.username} ↔ ${b.username}`,
      type: 'item',
      turn: room.turn
    });
    return { ok: true, room: this.sanitizeRoom(room) };
  }
}
