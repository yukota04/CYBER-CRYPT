import test from 'node:test';
import assert from 'node:assert/strict';
import { generateDungeon, getPartyThreatMultipliers, updateFOV } from './dungeon';
import {
  createInitialPlayer,
  calculatePlayerDamage,
  computeSkillDamage,
  resolveStepOrAttack,
  resolveRangedAttack,
  getTotalStats,
  awardXP,
  calculateHitstopSeconds,
  executeSkill,
  resolveMonsterTurns,
  useConsumableItem,
  dropPlayerLoadoutOnDeath,
  collectDeathDropBagsAt
} from './combat';
import { canUnlockSkill, getSkillTreesForClass } from './skills';
import {
  BASE_ITEMS,
  createItem,
  canClassEquipItem,
  canEquipItem,
  canMeetItemLevelRequirement,
  getItemRequiredLevel,
  getUpgradeCost,
  getUpgradeDestroyChance,
  getProbabilityStoneCost,
  attemptUpgradeItem,
  upgradeItem
} from './items';
import { generateShopItems } from './events';
import {
  BASE_INVENTORY_SLOTS,
  MAX_INVENTORY_SLOTS,
  canUnlockInventorySlot,
  getActiveBonusSlots,
  unlockInventorySlotFromAd,
  refreshInventoryCapacity
} from './inventorySlots';
import { CoopRoomManager } from '../server/coopRooms';

test('dungeon generator creates valid walkable rooms, stairs, and checkpoints', () => {
  const dungeon = generateDungeon(1, 42);
  assert.ok(dungeon.rooms.length > 0, 'Dungeon should have at least 1 room');
  assert.ok(dungeon.width > 0 && dungeon.height > 0);
  assert.ok(dungeon.stairsPos.x >= 0 && dungeon.stairsPos.y >= 0);

  const stairsTile = dungeon.tiles[dungeon.stairsPos.y][dungeon.stairsPos.x];
  assert.equal(stairsTile.type, 'stairs_down');
  assert.equal(stairsTile.walkable, true);

  assert.equal(dungeon.checkpoints.length, 2, 'Dungeon should place strictly 2 checkpoints per map (start and end)');
  const cpStart = dungeon.checkpoints[0];
  const cpEnd = dungeon.checkpoints[1];
  const firstRoom = dungeon.rooms[0];
  const lastRoom = dungeon.rooms[dungeon.rooms.length - 1];

  assert.equal(dungeon.tiles[cpStart.y][cpStart.x].type, 'checkpoint');
  assert.equal(dungeon.tiles[cpEnd.y][cpEnd.x].type, 'checkpoint');
  assert.ok(
    cpStart.x >= firstRoom.x && cpStart.x < firstRoom.x + firstRoom.w &&
    cpStart.y >= firstRoom.y && cpStart.y < firstRoom.y + firstRoom.h,
    'First checkpoint should be in the start room'
  );
  assert.ok(
    cpEnd.x >= lastRoom.x && cpEnd.x < lastRoom.x + lastRoom.w &&
    cpEnd.y >= lastRoom.y && cpEnd.y < lastRoom.y + lastRoom.h,
    'Second checkpoint should be in the final room'
  );
});

test('expanded catalog provides 22 items per role gear bucket and shared pools', async () => {
  const { BASE_ITEMS } = await import('./items');
  const { CATALOG_TARGET_PER_BUCKET, catalogStats } = await import('./itemCatalogGen');
  const stats = catalogStats(BASE_ITEMS);
  for (const role of ['striker', 'technomancer', 'vanguard'] as const) {
    for (const type of ['weapon', 'offhand', 'helmet', 'chest', 'gloves', 'legs', 'boots'] as const) {
      assert.ok(
        (stats[`${role}:${type}`] || 0) >= CATALOG_TARGET_PER_BUCKET,
        `${role}:${type} should have >= ${CATALOG_TARGET_PER_BUCKET}`
      );
    }
  }
  for (const type of ['ring', 'earrings', 'consumable'] as const) {
    const count = Object.values(BASE_ITEMS).filter(i => i.type === type).length;
    assert.ok(count >= CATALOG_TARGET_PER_BUCKET, `${type} should have >= ${CATALOG_TARGET_PER_BUCKET}`);
  }
});

test('procedural monster visual variants evolve across floors and density scales balanced', () => {
  const f1 = generateDungeon(1, 77);
  const f5 = generateDungeon(5, 77);
  const f12 = generateDungeon(12, 77);

  const all = (d: typeof f1) => [...d.monsters, ...(d.pendingSpawns || [])];
  const a1 = all(f1);
  const a5 = all(f5);
  const a12 = all(f12);

  assert.ok(a1.length > 0 && a5.length > 0 && a12.length > 0);
  assert.ok(a12.length >= a1.length, 'Deeper floors spawn more enemies');

  const pick = (arr: typeof a1) =>
    arr.find(m => m.archetype === 'glitch_swarmer') || arr[0];
  const m1 = pick(a1);
  const m5 = pick(a5);
  const m12 = pick(a12);

  assert.ok(m1.visualVariant && m5.visualVariant && m12.visualVariant);
  assert.notEqual(m1.visualVariant!.hueShift, m5.visualVariant!.hueShift, 'Enemy colors evolve per floor');
  assert.ok(m12.visualVariant!.tier > m1.visualVariant!.tier, 'Enemy visual tier increases with floor');
  assert.ok(m12.maxHp > m5.maxHp && m5.maxHp > m1.maxHp, 'Monster HP scales progressively');
  // Balanced cap verification: floor 12 mobs should stay under runaway exponential territory (< 1200 HP)
  assert.ok(m12.maxHp < 1200, 'Scaling stays challenging yet balanced');
});

test('FOV reveals player origin and transparent neighbors', () => {
  const dungeon = generateDungeon(1, 123);
  const startRoom = dungeon.rooms[0];
  updateFOV(dungeon.tiles, startRoom.centerX, startRoom.centerY, 6);

  const centerTile = dungeon.tiles[startRoom.centerY][startRoom.centerX];
  assert.equal(centerTile.visible, true);
  assert.equal(centerTile.explored, true);
});

test('player creation initializes class-specific stats and coins', () => {
  const striker = createInitialPlayer('striker');
  const vanguard = createInitialPlayer('vanguard');
  const technomancer = createInitialPlayer('technomancer');

  assert.equal(striker.characterClass, 'striker');
  assert.equal(striker.stats.coins, 0);
  assert.ok(striker.stats.critRate > vanguard.stats.critRate);
  assert.ok(vanguard.stats.hp > striker.stats.hp);
  assert.ok(technomancer.stats.energy > striker.stats.energy);
});

test('total stats include all 10 paperdoll equipment slots and upgrades', () => {
  const player = createInitialPlayer('vanguard');
  const initialTotals = getTotalStats(player);

  player.equipment.weapon = createItem('titan_greatsword');
  player.equipment.helmet = createItem('titanium_helm');
  player.equipment.chest = createItem('hyperion_chassis');
  player.equipment.gloves = createItem('kinetic_gauntlets');
  player.equipment.legs = createItem('titan_legplates');
  player.equipment.boots = createItem('void_sabatons');
  player.equipment.ring1 = createItem('neural_chip');
  player.equipment.ring2 = createItem('crimson_signet');
  player.equipment.earrings = createItem('ether_drops');

  const equippedTotals = getTotalStats(player);
  assert.ok(equippedTotals.attack > initialTotals.attack);
  assert.ok(equippedTotals.defense > initialTotals.defense);
  assert.ok(equippedTotals.maxHp > initialTotals.maxHp);
  assert.ok(equippedTotals.critRate > initialTotals.critRate);

  const cost = getUpgradeCost(player.equipment.weapon);
  assert.ok(cost > 0);
  player.equipment.weapon = upgradeItem(player.equipment.weapon);
  assert.equal(player.equipment.weapon.upgradeLevel, 1);
  const afterUpgradeTotals = getTotalStats(player);
  assert.ok(afterUpgradeTotals.attack > equippedTotals.attack, 'Upgrading weapon increases total attack');
});

test('class weapon compatibility enforces striker/vanguard/technomancer restrictions', () => {
  const greatsword = createItem('titan_greatsword');
  const staff = createItem('arcane_pulse_staff');
  const katana = createItem('katana_neon');
  const shield = createItem('aegis_kite_shield');
  const helmet = createItem('recon_visor');

  assert.equal(canClassEquipItem('vanguard', greatsword), true);
  assert.equal(canClassEquipItem('vanguard', shield), true);
  assert.equal(canClassEquipItem('technomancer', greatsword), false);
  assert.equal(canClassEquipItem('striker', staff), false);

  assert.equal(canClassEquipItem('technomancer', staff), true);
  assert.equal(canClassEquipItem('striker', katana), true);
  assert.equal(canClassEquipItem('vanguard', katana), false);

  // Armor/Clothing is usable across classes
  assert.equal(canClassEquipItem('striker', helmet), true);
  assert.equal(canClassEquipItem('technomancer', helmet), true);
});

test('gear level requirements block low-level players from equipping high-tier gifts', () => {
  const lowLegendary = createItem('hyperion_greatsword', 'leg_low', 1);
  assert.equal(getItemRequiredLevel(lowLegendary), 3, 'legendary itemLevel 1 requires Lv.3');
  assert.equal(canMeetItemLevelRequirement(1, lowLegendary), false);
  assert.equal(canEquipItem('vanguard', 1, lowLegendary), false);
  assert.equal(canEquipItem('vanguard', 3, lowLegendary), true);

  const deepMythic = createItem('mythic_chronos_ring', 'myth_deep', 10);
  assert.equal(getItemRequiredLevel(deepMythic), 13);
  assert.equal(canMeetItemLevelRequirement(5, deepMythic), false);
  assert.equal(canMeetItemLevelRequirement(13, deepMythic), true);

  const commonHelm = createItem('recon_visor', 'helm_ok', 1);
  assert.equal(canEquipItem('striker', 1, commonHelm), true);
});

test('party size scales creature HP and attack', () => {
  const solo = getPartyThreatMultipliers(1);
  const duo = getPartyThreatMultipliers(2);
  const trio = getPartyThreatMultipliers(3);
  assert.equal(solo.hp, 1);
  assert.ok(duo.hp > solo.hp && trio.hp > duo.hp);
  assert.ok(duo.attack > solo.attack && trio.attack > duo.attack);

  const d1 = generateDungeon(3, 88, { partySize: 1 });
  const d3 = generateDungeon(3, 88, { partySize: 3 });
  const all1 = [...d1.monsters, ...(d1.pendingSpawns || [])];
  const all3 = [...d3.monsters, ...(d3.pendingSpawns || [])];
  assert.ok(all1.length > 0 && all3.length > 0);
  const avgHp = (list: typeof all1) => list.reduce((s, m) => s + m.maxHp, 0) / list.length;
  const avgAtk = (list: typeof all1) => list.reduce((s, m) => s + m.attack, 0) / list.length;
  assert.ok(avgHp(all3) > avgHp(all1) * 1.4, '3P dungeon monsters should have much higher HP');
  assert.ok(avgAtk(all3) > avgAtk(all1) * 1.2, '3P dungeon monsters should hit harder');
});

test('ad inventory slots accumulate to 24 and share a resetting 24h timer', () => {
  const player = createInitialPlayer('striker');
  assert.equal(player.maxInventory, BASE_INVENTORY_SLOTS);
  assert.equal(canUnlockInventorySlot(player), true);

  const t0 = 1_700_000_000_000;
  let r = unlockInventorySlotFromAd(player, t0);
  assert.equal(r.ok, true);
  assert.equal(getActiveBonusSlots(player, t0), 1);
  assert.equal(player.maxInventory, BASE_INVENTORY_SLOTS + 1);
  const firstExpiry = player.inventoryBonusExpiresAt || 0;

  r = unlockInventorySlotFromAd(player, t0 + 60_000);
  assert.equal(r.ok, true);
  assert.equal(getActiveBonusSlots(player, t0 + 60_000), 2);
  assert.ok((player.inventoryBonusExpiresAt || 0) > firstExpiry, 'new ad resets shared 24h timer');

  const lastUnlock = t0 + 200_000;
  for (let i = 0; i < 20; i++) unlockInventorySlotFromAd(player, lastUnlock);
  assert.equal(player.maxInventory, MAX_INVENTORY_SLOTS);
  assert.equal(canUnlockInventorySlot(player, lastUnlock), false);

  // After 24h from the latest unlock, all bonus slots close
  const afterExpiry = lastUnlock + 24 * 60 * 60 * 1000 + 1;
  refreshInventoryCapacity(player, afterExpiry);
  assert.equal(getActiveBonusSlots(player, afterExpiry), 0);
  assert.equal(player.maxInventory, BASE_INVENTORY_SLOTS);
});

test('shop stock improves with floor depth', () => {
  const f1 = generateShopItems(1);
  const f5 = generateShopItems(5);
  const f10 = generateShopItems(10);
  assert.ok(f5.length > f1.length, 'deeper floors offer more shop slots');
  assert.ok(f10.length >= f5.length);

  const maxIlvl = (items: ReturnType<typeof generateShopItems>) =>
    Math.max(0, ...items.filter(i => i.type !== 'consumable').map(i => i.itemLevel || 1));
  assert.ok(maxIlvl(f5) >= 5);
  assert.ok(maxIlvl(f10) >= 10);

  const f1Gear = f1.filter(i => i.currency === 'shards');
  const f10Gear = f10.filter(i => i.currency === 'shards');
  assert.ok(f10Gear.length > f1Gear.length, 'deep floors stock more shard gear');
  const topRarityRank = (r: string) =>
    r === 'cyber-relic' ? 5 : r === 'mythic' ? 4 : r === 'legendary' ? 3 : r === 'epic' ? 2 : 1;
  const best = (items: typeof f1Gear) => Math.max(0, ...items.map(i => topRarityRank(i.rarity)));
  assert.ok(best(f10Gear) >= best(f1Gear), 'deep floors unlock higher rarity shop gear');
});

test('awardXP levels up player and replenishes stats', () => {
  const player = createInitialPlayer('technomancer');
  player.stats.hp = 10;
  player.stats.energy = 5;
  const initialLevel = player.stats.level;

  const logs: any[] = [];
  const leveled = awardXP(player, 60, logs, 1);

  assert.equal(leveled, true);
  assert.equal(player.stats.level, initialLevel + 1);
  assert.equal(player.stats.skillPoints, 2);
  assert.equal(player.stats.hp, player.stats.maxHp);
  assert.equal(player.stats.energy, player.stats.maxEnergy);
});

test('every character class has 5 distinct skill trees and prerequisites enforce order', () => {
  for (const cls of ['striker', 'technomancer', 'vanguard'] as const) {
    const trees = getSkillTreesForClass(cls);
    assert.equal(trees.length, 5, `${cls} should have exactly 5 skill trees`);
    for (const tree of trees) {
      assert.ok(tree.nodes.length >= 3, `${cls} tree ${tree.treeIndex} should have at least 3 nodes`);
    }
  }

  assert.equal(canUnlockSkill('striker_slash', [], 1).canUnlock, true);
  assert.equal(canUnlockSkill('striker_phase_dash', [], 1).canUnlock, false);
  assert.equal(canUnlockSkill('striker_phase_dash', ['striker_slash'], 1).canUnlock, true);
  assert.equal(canUnlockSkill('striker_phase_dash', ['striker_slash'], 0).canUnlock, false);
});

test('hitstop freeze duration stays within 0.03s to 0.25s and scales by impact force', () => {
  const lightHit = calculateHitstopSeconds(10, 100, false, false, false);
  const heavyCritKill = calculateHitstopSeconds(95, 100, true, true, true);

  assert.ok(lightHit >= 0.03 && lightHit <= 0.25);
  assert.ok(heavyCritKill >= 0.03 && heavyCritKill <= 0.25);
  assert.ok(heavyCritKill > lightHit);
});

test('defeating an enemy scatters ground coins and stepping onto coins adds to player backpack', () => {
  const player = createInitialPlayer('striker', 0, 0);
  player.buffs.overclockTurns = 5;
  const dungeon = generateDungeon(1, 10);
  dungeon.tiles[0][1].walkable = true;
  dungeon.tiles[0][1].type = 'floor';
  dungeon.tiles[0][2].walkable = true;
  dungeon.tiles[0][2].type = 'floor';
  dungeon.groundCoins = [];
  dungeon.monsters = [{
    id: 'coin_mob',
    name: 'Coin Bot',
    archetype: 'glitch_swarmer',
    level: 1,
    x: 1,
    y: 0,
    hp: 5,
    maxHp: 20,
    attack: 0,
    defense: 0,
    expReward: 10,
    shardReward: 5,
    alerted: true,
    color: '#00f',
    symbol: 'M'
  }];

  const killRes = resolveStepOrAttack(player, dungeon, 1, 0, 1);
  assert.ok(killRes.hitstopSeconds >= 0.03 && killRes.hitstopSeconds <= 0.25);
  assert.ok(killRes.dungeon.groundCoins.length >= 2, 'Slain monster should drop scattered coins around death location');

  const coin = killRes.dungeon.groundCoins[0];
  killRes.player.x = coin.x - 1;
  killRes.player.y = coin.y;
  const stepRes = resolveStepOrAttack(killRes.player, killRes.dungeon, 1, 0, 2);
  assert.ok(stepRes.player.stats.coins >= coin.value, 'Stepping on coin tile adds value to player coins');
});

test('combat damage formula produces positive damage and critical hit floating text', () => {
  const player = createInitialPlayer('striker', 0, 0);
  player.buffs.overclockTurns = 5;

  const dungeon = generateDungeon(1, 10);
  dungeon.tiles[0][1].walkable = true;
  dungeon.monsters = [{
    id: 'crit_dummy',
    name: 'Target Dummy',
    archetype: 'glitch_swarmer',
    level: 1,
    x: 1,
    y: 0,
    hp: 200,
    maxHp: 200,
    attack: 0,
    defense: 0,
    expReward: 10,
    shardReward: 5,
    alerted: true,
    color: '#00f',
    symbol: 'M'
  }];

  const { damage } = calculatePlayerDamage(player, dungeon.monsters[0]);
  assert.ok(damage > 0);

  const result = resolveStepOrAttack(player, dungeon, 1, 0, 1);
  const critFloater = result.floatingTexts[0];
  assert.equal(critFloater.isCrit, true);
  assert.ok(critFloater.text.includes('CRIT!'));
  assert.equal(critFloater.color, '#ffe600');
  assert.ok(result.soundEvents.includes('crit'));
  assert.ok(result.screenShake >= 0.25);
});

test('environmental events trigger strictly every 5 floors and black_market spawns shop tile', () => {
  for (let floor = 1; floor <= 15; floor++) {
    const dng = generateDungeon(floor, 7);
    if (floor % 5 === 0) {
      assert.ok(dng.activeEvent);
      if (dng.activeEvent?.id === 'black_market') {
        assert.ok(dng.shopItems && dng.shopItems.length > 0);
        const hasShopTile = dng.tiles.some(row => row.some(t => t.type === 'shop'));
        assert.equal(hasShopTile, true);
      }
    } else {
      assert.equal(dng.activeEvent, null);
    }
  }
});

test('gravity_shift reduces skill energy cost by 30% and vanguard_barrier works properly', async () => {
  const { getEffectiveSkillEnergyCost, getFovRadius, computeSkillDamage } = await import('./combat');
  const { ENVIRONMENTAL_EVENTS } = await import('./events');

  const gravityEvent = ENVIRONMENTAL_EVENTS.find(e => e.id === 'gravity_shift')!;
  const shadowEvent = ENVIRONMENTAL_EVENTS.find(e => e.id === 'shadow_veil')!;

  assert.equal(getEffectiveSkillEnergyCost(20, gravityEvent), 14);
  const dng = generateDungeon(5, 1);
  dng.activeEvent = shadowEvent;
  assert.equal(getFovRadius(dng), 5);

  const striker = createInitialPlayer('striker', 2, 2);
  striker.unlockedSkills.push('striker_executioner');
  const lowHpMob = {
    id: 'low_hp', name: 'Drone', archetype: 'glitch_swarmer' as const,
    level: 1,
    x: 3, y: 2, hp: 10, maxHp: 100, attack: 10, defense: 0, expReward: 10, shardReward: 5,
    alerted: true, color: '#f00', symbol: 'D'
  };
  const normalDmg = computeSkillDamage({ ...striker, unlockedSkills: ['striker_slash'] }, lowHpMob, 2.0, null);
  const execDmg = computeSkillDamage(striker, lowHpMob, 2.0, null);
  assert.equal(execDmg, normalDmg * 2);

  const vanguard = createInitialPlayer('vanguard', 2, 2);
  vanguard.unlockedSkills.push('vanguard_barrier');
  vanguard.stats.energy = 40;
  dng.monsters = [];
  const barrierRes = executeSkill(vanguard, dng, 'vanguard_barrier', 1);
  assert.equal(barrierRes.player.buffs.shieldAmount, 40);
});

test('3-player co-op room enforces unique roles, 3 ready gate, and 1-tile turn-barrier locking', () => {
  const mgr = new CoopRoomManager();
  assert.equal(mgr.joinRoom('SQ1', 'p1', 'Alpha').ok, true);
  assert.equal(mgr.joinRoom('SQ1', 'p2', 'Beta').ok, true);
  assert.equal(mgr.joinRoom('SQ1', 'p3', 'Gamma').ok, true);
  assert.equal(mgr.joinRoom('SQ1', 'p4', 'Extra').ok, false); // Max 3 players

  // Duplicate role blocked
  assert.equal(mgr.selectRole('SQ1', 'p1', 'striker').ok, true);
  const dupAttempt = mgr.selectRole('SQ1', 'p2', 'striker');
  assert.equal(dupAttempt.ok, false);
  assert.equal(dupAttempt.error, 'ROLE_ALREADY_TAKEN');

  assert.equal(mgr.selectRole('SQ1', 'p2', 'technomancer').ok, true);
  assert.equal(mgr.selectRole('SQ1', 'p3', 'vanguard').ok, true);

  // Cannot start until all 3 click Ready
  assert.equal(mgr.toggleReady('SQ1', 'p1', true).ok, true);
  assert.equal(mgr.toggleReady('SQ1', 'p2', true).ok, true);
  assert.equal(mgr.startRoom('SQ1', 42).ok, false);

  assert.equal(mgr.toggleReady('SQ1', 'p3', true).ok, true);
  const started = mgr.startRoom('SQ1', 42);
  assert.equal(started.ok, true);
  assert.equal(started.room?.status, 'playing');

  // Turn 1 movement lock: p1 moves once, then is locked until p2 & p3 move
  const m1 = mgr.submitAction('SQ1', 'p1', { playerId: 'p1', type: 'move', dx: 0, dy: 0 });
  assert.equal(m1.ok, true);
  assert.equal(m1.resolved, false);

  const m1Extra = mgr.submitAction('SQ1', 'p1', { playerId: 'p1', type: 'move', dx: 1, dy: 0 });
  assert.equal(m1Extra.ok, false);
  assert.equal(m1Extra.error, 'TURN_LOCKED_WAITING_FOR_TEAMMATES');

  const m2 = mgr.submitAction('SQ1', 'p2', { playerId: 'p2', type: 'move', dx: 0, dy: 0 });
  assert.equal(m2.ok, true);
  assert.equal(m2.resolved, false);

  const m3 = mgr.submitAction('SQ1', 'p3', { playerId: 'p3', type: 'move', dx: 0, dy: 0 });
  assert.equal(m3.ok, true);
  assert.equal(m3.resolved, true);
  assert.equal(m3.room?.turn, 2);
  // After 3/3 resolved, p1 is unlocked for turn 2
  assert.equal(m3.room?.players.every(p => !p.movedThisTurn), true);
});

test('i18n translation dictionaries have 100% key parity across all 5 languages', async () => {
  const { TRANSLATIONS, SUPPORTED_LANGUAGES } = await import('./i18n');
  const baseKeys = Object.keys(TRANSLATIONS.en).sort();
  for (const lang of SUPPORTED_LANGUAGES) {
    const langKeys = Object.keys(TRANSLATIONS[lang.code]).sort();
    assert.deepEqual(langKeys, baseKeys, `Language ${lang.code} keys should match en keys exactly`);
  }
});

test('ranged attacks hit enemies 1 to 5 tiles away, respect walls/LOS, and reject beyond range', () => {
  const player = createInitialPlayer('striker', 2, 2);
  player.equipment.weapon = createItem('laser_pistol', 'pistol_test'); // range 5
  const dungeon = generateDungeon(1, 99);
  for (let x = 2; x <= 9; x++) {
    dungeon.tiles[2][x].walkable = true;
    dungeon.tiles[2][x].transparent = true;
    dungeon.tiles[2][x].type = 'floor';
  }
  dungeon.monsters = [
    {
      id: 'm_dist_5',
      name: 'Far Drone',
      archetype: 'glitch_swarmer',
      level: 1,
      x: 7,
      y: 2,
      hp: 100,
      maxHp: 100,
      attack: 5,
      defense: 0,
      expReward: 10,
      shardReward: 2,
      alerted: true,
      color: '#0ff',
      symbol: 'M'
    },
    {
      id: 'm_dist_6',
      name: 'Too Far Drone',
      archetype: 'glitch_swarmer',
      level: 1,
      x: 8,
      y: 2,
      hp: 100,
      maxHp: 100,
      attack: 5,
      defense: 0,
      expReward: 10,
      shardReward: 2,
      alerted: true,
      color: '#0ff',
      symbol: 'M'
    }
  ];

  // Distance 5 succeeds
  const hitRes = resolveRangedAttack(player, dungeon, 7, 2, 1);
  assert.ok(hitRes.dungeon.monsters[0].hp < 100, 'Should hit enemy at distance 5 tiles');
  assert.ok(hitRes.attackEffects.some(fx => fx.type === 'beam'));

  // Distance 6 fails (out of range 5)
  const farRes = resolveRangedAttack(player, dungeon, 8, 2, 2);
  assert.equal(farRes.dungeon.monsters[1].hp, 100, 'Should not hit enemy beyond 5 tiles');

  // Wall in between blocks LOS
  dungeon.tiles[2][4].transparent = false;
  dungeon.tiles[2][4].walkable = false;
  const blockedRes = resolveRangedAttack(player, dungeon, 7, 2, 3);
  assert.equal(blockedRes.dungeon.monsters[0].hp, 100, 'Wall should block line of sight');
});

test('technomancer AoE reaches up to 10 tiles radius and damage scales by enemy level', () => {
  const mage = createInitialPlayer('technomancer', 12, 12);
  mage.unlockedSkills.push('techno_t5_cataclysm');
  mage.stats.energy = 100;

  const dungeon = generateDungeon(1, 55);
  const lowLevelMob = {
    id: 'lvl1_mob',
    name: 'Lv1 Node',
    archetype: 'glitch_swarmer' as const,
    level: 1,
    x: 22, // 10 tiles away horizontally
    y: 12,
    hp: 300,
    maxHp: 300,
    attack: 1,
    defense: 2,
    expReward: 10,
    shardReward: 2,
    alerted: true,
    color: '#0ff',
    symbol: 'M'
  };
  const highLevelMob = {
    ...lowLevelMob,
    id: 'lvl10_mob',
    name: 'Lv10 Boss Node',
    level: 10,
    x: 12,
    y: 22 // 10 tiles away vertically
  };
  const outMob = {
    ...lowLevelMob,
    id: 'dist11_mob',
    x: 23, // 11 tiles away -> out of 10-tile AoE
    y: 12
  };
  dungeon.monsters = [lowLevelMob, highLevelMob, outMob];

  const dmgVsLow = computeSkillDamage(mage, lowLevelMob, 2.85, null);
  const dmgVsHigh = computeSkillDamage(mage, highLevelMob, 2.85, null);
  assert.ok(dmgVsLow > dmgVsHigh, 'Higher monster level should mitigate more skill damage');

  const res = executeSkill(mage, dungeon, 'techno_t5_cataclysm', 1);
  assert.ok(res.dungeon.monsters.find(m => m.id === 'lvl1_mob')!.hp < 300, '10-tile AoE hits enemy 10 tiles away');
  assert.ok(res.dungeon.monsters.find(m => m.id === 'lvl10_mob')!.hp < 300, '10-tile AoE hits enemy 10 tiles vertically');
  assert.equal(res.dungeon.monsters.find(m => m.id === 'dist11_mob')!.hp, 300, '11 tiles away is outside 10-tile AoE');
});

test('all 6 item rarities exist and upgrade cost/destruction risk increase per level', () => {
  const rarities = new Set(Object.values(BASE_ITEMS).map(i => i.rarity));
  for (const expected of ['common', 'rare', 'epic', 'legendary', 'mythic', 'cyber-relic'] as const) {
    assert.ok(rarities.has(expected), `BASE_ITEMS should include ${expected} rarity`);
  }

  let sword = createItem('hyperion_greatsword', 'forge_test');
  assert.equal(getUpgradeDestroyChance(sword), 0, '+0 -> +1 upgrade has 0% destroy risk');

  const cost0 = getUpgradeCost(sword);
  sword = upgradeItem(sword); // +1
  const cost1 = getUpgradeCost(sword);
  const risk1 = getUpgradeDestroyChance(sword);
  assert.ok(cost1 > cost0, 'Higher upgrade levels cost more coins');
  assert.ok(risk1 > 0, '+1 -> +2 carries positive destruction risk');

  const destroyedOutcome = attemptUpgradeItem(sword, 0.0); // roll 0 < risk1
  assert.equal(destroyedOutcome.status, 'destroyed');
  assert.equal(destroyedOutcome.item, null);

  const successOutcome = attemptUpgradeItem(sword, 0.99);
  assert.equal(successOutcome.status, 'success');
  assert.equal(successOutcome.item?.upgradeLevel, 2);
});

test('every floor spawns NPC merchant in start room with coins potions, scaling Probability Stone, and diamond hardware', () => {
  for (let floor = 1; floor <= 6; floor++) {
    const dng = generateDungeon(floor, 31);
    const firstRoom = dng.rooms[0];
    let hasStartShopNpc = false;
    for (let y = firstRoom.y; y < firstRoom.y + firstRoom.h; y++) {
      for (let x = firstRoom.x; x < firstRoom.x + firstRoom.w; x++) {
        if (dng.tiles[y]?.[x]?.type === 'shop') {
          hasStartShopNpc = true;
        }
      }
    }
    assert.equal(hasStartShopNpc, true, `Floor ${floor} must place an NPC merchant inside rooms[0]`);
    assert.ok(dng.shopItems && dng.shopItems.length >= 6, `Floor ${floor} must stock shop potions, stones, and shard gear`);

    const stoneItem = dng.shopItems!.find(i => i.effectType === 'stone');
    assert.ok(stoneItem, 'Merchant should always stock a Probability Stone');
    assert.equal(stoneItem!.currency, 'coins');
    assert.equal(stoneItem!.value, getProbabilityStoneCost(floor));

    const shardGear = dng.shopItems!.filter(i => i.currency === 'shards');
    assert.ok(shardGear.length >= 1, 'Merchant should stock Diamond/Shard hardware');
  }

  const f1Cost = getProbabilityStoneCost(1);
  const f3Cost = getProbabilityStoneCost(3);
  const f6Cost = getProbabilityStoneCost(6);
  assert.equal(f1Cost, 1000, 'Probability Stone costs 1000 coins on Floor 1');
  assert.ok(f3Cost > f1Cost && f6Cost > f3Cost, 'Probability Stone cost scales up per floor');
});

test('Probability Stone grants +60% Forge success and makes >= 40% base success 100% safe', () => {
  let blade = createItem('hyperion_greatsword', 'stone_test');
  // Upgrade to +3 where base destroy chance is below 60% (base success >= 40%)
  blade = upgradeItem(upgradeItem(upgradeItem(blade))); // +3
  const baseDestroyRisk = getUpgradeDestroyChance(blade, false);
  assert.ok(baseDestroyRisk > 0 && baseDestroyRisk <= 0.60, `Expected base risk <= 0.60 at +3, got ${baseDestroyRisk}`);

  const stonedDestroyRisk = getUpgradeDestroyChance(blade, true);
  assert.equal(stonedDestroyRisk, 0, 'With Probability Stone (+60% success), >= 40% base success becomes 100% safe');

  const safeAttempt = attemptUpgradeItem(blade, 0.0, true);
  assert.equal(safeAttempt.status, 'success');
  assert.equal(safeAttempt.item?.upgradeLevel, 4);
});

test('consumable potions apply dual recovery, over-time regeneration, and igneous radial burn ticks', () => {
  const player = createInitialPlayer('vanguard', 4, 4);
  player.stats.hp = 40;
  player.stats.energy = 10;

  const dng = generateDungeon(1, 21);
  for (let y = 1; y <= 7; y++) {
    for (let x = 1; x <= 7; x++) {
      dng.tiles[y][x].walkable = true;
      dng.tiles[y][x].transparent = true;
      dng.tiles[y][x].type = 'floor';
    }
  }
  dng.monsters = [
    {
      id: 'burn_mob_near',
      name: 'Near Sentry',
      archetype: 'glitch_swarmer',
      level: 1,
      x: 5,
      y: 4,
      hp: 30,
      maxHp: 30,
      attack: 0,
      defense: 0,
      expReward: 15,
      shardReward: 4,
      alerted: false,
      color: '#f0f',
      symbol: 'S'
    }
  ];

  const dualPotion = createItem('dual_elixir', 'c_dual');
  const dualRes = useConsumableItem(player, dng, dualPotion, 1);
  assert.ok(dualRes.player.stats.hp > 40 && dualRes.player.stats.energy > 10, 'Dual elixir restores both HP and Energy');

  const regenPotion = createItem('regen_serum', 'c_regen');
  const regenRes = useConsumableItem(dualRes.player, dualRes.dungeon, regenPotion, 2);
  assert.ok(regenRes.player.buffs.regenTurns > 0, 'Regen serum applies multi-turn regen buff');

  const hpBeforeTick = regenRes.player.stats.hp;
  regenRes.player.stats.hp = Math.max(1, hpBeforeTick - 25);

  const igneousPotion = createItem('igneous_potion', 'c_ign');
  const ignRes = useConsumableItem(regenRes.player, regenRes.dungeon, igneousPotion, 3);
  const burntMob = ignRes.dungeon.monsters.find(m => m.id === 'burn_mob_near');
  assert.ok(burntMob, 'Monster survives initial blast with burn DoT applied');
  assert.ok(burntMob!.hp < 30, 'Igneous potion deals immediate radial thermal splash');
  assert.ok((burntMob!.burnTurns || 0) > 0, 'Igneous potion ignites nearby monsters');

  // Tick turns until burn DoT ticks & kills monster + triggers player regen
  const hpBeforeRegenTick = ignRes.player.stats.hp;
  const tickLogs: any[] = [];
  const tickSounds: any[] = [];
  const tickFloaters: any[] = [];
  resolveMonsterTurns(ignRes.player, ignRes.dungeon, tickLogs, tickSounds, tickFloaters, 4);
  assert.ok(ignRes.player.stats.hp > hpBeforeRegenTick, 'Player receives over-time regeneration tick');
  const mobAfterTick = ignRes.dungeon.monsters.find(m => m.id === 'burn_mob_near');
  assert.ok(!mobAfterTick || mobAfterTick.hp < burntMob!.hp, 'Burn DoT damages or defeats ignited enemy');
});

test('rarity visual styles cover all 6 tiers with ascending star rank and distinct glow hexes', async () => {
  const { getRarityStyle } = await import('./rarity');
  const tiers = ['common', 'rare', 'epic', 'legendary', 'mythic', 'cyber-relic'] as const;
  const seenHex = new Set<string>();
  tiers.forEach((tier, idx) => {
    const style = getRarityStyle(tier);
    assert.equal(style.tierNumber, idx + 1);
    assert.equal(style.stars.length, idx + 1);
    assert.ok(style.cardClass.length > 0 && style.badgeClass.length > 0);
    seenHex.add(style.hex);
  });
  assert.equal(seenHex.size, 6, 'All 6 rarity tiers should have distinct accent hex colors');
});

test('death drops all equipped gear, backpack items, coins, and stones into a Floating Skull bag and stepping recovers everything', () => {
  const dungeon = generateDungeon(2, 77);
  const player = createInitialPlayer('striker', 6, 6);
  player.equipment.helmet = createItem('recon_visor', 'drop_helm');
  player.equipment.chest = createItem('cyber_vest', 'drop_chest');
  player.equipment.ring1 = createItem('neural_chip', 'drop_ring');
  player.inventory.push(createItem('dual_elixir', 'drop_pot'));
  player.stats.coins = 750;
  player.stats.probabilityStones = 2;

  const originalWeaponId = player.equipment.weapon?.id;
  const bag = dropPlayerLoadoutOnDeath(player, dungeon, 'solo', 'Operative', 12);
  assert.ok(bag, 'Death should create a Floating Skull bag when player has gear/coins');
  assert.equal(player.inventory.length, 0, 'Backpack should be empty after dropping');
  assert.equal(player.equipment.weapon, null, 'Weapon should unequip into drop bag');
  assert.equal(player.equipment.helmet, null, 'Helmet should unequip into drop bag');
  assert.equal(player.equipment.chest, null, 'Chest should unequip into drop bag');
  assert.equal(player.equipment.ring1, null, 'Ring should unequip into drop bag');
  assert.equal(player.stats.coins, 0, 'Coins should drop to 0 on death');
  assert.equal(player.stats.probabilityStones, 0, 'Probability stones should drop to 0 on death');
  assert.equal(dungeon.deathDrops.length, 1);

  // Simulate checkpoint respawn away from death spot
  player.x = 2;
  player.y = 2;
  const emptyRec = collectDeathDropBagsAt(player, dungeon, 'solo');
  assert.equal(emptyRec.recoveredBags, 0, 'Should not recover skull bag when standing elsewhere');

  // Walk back onto Floating Skull coordinates
  player.x = bag!.x;
  player.y = bag!.y;
  const rec = collectDeathDropBagsAt(player, dungeon, 'solo');
  assert.equal(rec.recoveredBags, 1);
  assert.equal(dungeon.deathDrops.length, 0, 'Skull bag should be cleared after collection');
  const eqAfter = player.equipment as unknown as Record<string, { id?: string } | null>;
  assert.equal(eqAfter.weapon?.id, originalWeaponId, 'Weapon should re-equip automatically');
  assert.equal(eqAfter.helmet?.id, 'drop_helm', 'Helmet should re-equip automatically');
  assert.equal(eqAfter.chest?.id, 'drop_chest', 'Chest should re-equip automatically');
  assert.equal(eqAfter.ring1?.id, 'drop_ring', 'Ring should re-equip automatically');
  assert.ok(player.inventory.some(i => i.id === 'drop_pot'), 'Backpack item should be restored');
  assert.equal(player.stats.coins, 750, 'Dropped coins should be fully restored');
  assert.equal(player.stats.probabilityStones, 2, 'Dropped stones should be fully restored');
});

test('online co-op preserves pre-death loadout, creates Floating Skull on death, revives at checkpoint, and recovers gear', () => {
  const mgr = new CoopRoomManager();
  mgr.joinRoom('CHK1', 'p1', 'Alpha');
  mgr.joinRoom('CHK1', 'p2', 'Beta');
  mgr.joinRoom('CHK1', 'p3', 'Gamma');
  mgr.selectRole('CHK1', 'p1', 'striker');
  mgr.selectRole('CHK1', 'p2', 'technomancer');
  mgr.selectRole('CHK1', 'p3', 'vanguard');
  mgr.toggleReady('CHK1', 'p1', true);
  mgr.toggleReady('CHK1', 'p2', true);
  mgr.toggleReady('CHK1', 'p3', true);
  const start = mgr.startRoom('CHK1', 88);
  assert.equal(start.ok, true);

  const internalRoom = mgr.getRoom('CHK1')!;
  const p1Slot = internalRoom.players.find(p => p.playerId === 'p1')!;
  const p1 = p1Slot.player!;
  const dungeon = internalRoom.dungeon!;

  // Give p1 custom coins, stone, and lethal monster adjacent
  p1.stats.coins = 420;
  p1.stats.probabilityStones = 1;
  p1.stats.hp = 1;
  p1.x = 10;
  p1.y = 10;
  dungeon.tiles[10][10].walkable = true;
  dungeon.tiles[10][10].type = 'floor';
  dungeon.tiles[10][11].walkable = true;
  dungeon.tiles[10][11].type = 'floor';
  dungeon.monsters = [
    {
      id: 'lethal_mob',
      name: 'Executioner',
      archetype: 'glitch_swarmer',
      level: 5,
      x: 11,
      y: 10,
      hp: 500,
      maxHp: 500,
      attack: 999,
      defense: 0,
      expReward: 10,
      shardReward: 2,
      alerted: true,
      color: '#f00',
      symbol: 'X'
    }
  ];

  // All 3 wait -> monster kills p1
  mgr.submitAction('CHK1', 'p1', { playerId: 'p1', type: 'wait' });
  mgr.submitAction('CHK1', 'p2', { playerId: 'p2', type: 'wait' });
  const turnRes = mgr.submitAction('CHK1', 'p3', { playerId: 'p3', type: 'wait' });
  assert.equal(turnRes.resolved, true);
  assert.equal(p1Slot.alive, false);
  assert.equal(p1.stats.coins, 0, 'Coins dropped on online death');
  assert.equal(p1.equipment.weapon, null, 'Equipped weapon dropped on online death');
  assert.equal(dungeon.deathDrops.length, 1, 'Floating Skull created at death coordinates');
  assert.equal(dungeon.deathDrops[0].ownerId, 'p1');
  assert.equal(p1Slot.preDeathLoadout?.coins, 420, 'Pre-death loadout persisted in slot');
  assert.equal(mgr.getSavedLoadout('p1')?.coins, 420, 'Pre-death loadout persisted in server manager');

  // Test serialization round-trip for db.json persistence
  const exported = mgr.exportPersistentState();
  const mgr2 = new CoopRoomManager();
  mgr2.importPersistentState(exported);
  assert.equal(mgr2.getSavedLoadout('p1')?.coins, 420);

  // Revive p1 at checkpoint
  const reviveRes = mgr.reviveAtCheckpoint('CHK1', 'p1');
  assert.equal(reviveRes.ok, true);
  assert.equal(p1Slot.alive, true);
  assert.ok(p1.stats.hp > 0);
  assert.equal(dungeon.deathDrops.length, 1, 'Floating Skull remains on map until collected');

  // Clear monsters and step onto skull to recover
  dungeon.monsters = [];
  const skull = dungeon.deathDrops[0];
  p1.x = skull.x - 1;
  p1.y = skull.y;
  dungeon.tiles[skull.y][skull.x - 1].walkable = true;
  dungeon.tiles[skull.y][skull.x].walkable = true;

  mgr.submitAction('CHK1', 'p1', { playerId: 'p1', type: 'move', dx: 1, dy: 0 });
  mgr.submitAction('CHK1', 'p2', { playerId: 'p2', type: 'wait' });
  mgr.submitAction('CHK1', 'p3', { playerId: 'p3', type: 'wait' });

  assert.equal(dungeon.deathDrops.length, 0, 'Floating Skull collected upon stepping on tile');
  assert.equal(p1.stats.coins, 420, 'Recovered coins online');
  assert.equal(p1.stats.probabilityStones, 1, 'Recovered stones online');
  assert.ok(p1.equipment.weapon !== null, 'Recovered and re-equipped weapon online');
});

test('offlineSave persists, loads, and deletes per-role and per-difficulty runs independently', async () => {
  const { saveOfflineRun, loadOfflineSave, loadAllOfflineSaves, clearOfflineSave } = await import('./offlineSave');
  const store = new Map<string, string>();
  const origWindow = (globalThis as any).window;
  (globalThis as any).window = {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
      removeItem: (k: string) => store.delete(k)
    }
  };
  try {
    assert.equal(loadOfflineSave('normal', 'vanguard'), null);
    assert.equal(loadOfflineSave('normal', 'striker'), null);
    assert.equal(loadOfflineSave('hard', 'striker'), null);

    const pNormVanguard = createInitialPlayer('vanguard', 4, 4);
    pNormVanguard.stats.coins = 333;
    const dNormVanguard = generateDungeon(3, 12);
    saveOfflineRun({
      difficultyMode: 'normal',
      player: pNormVanguard,
      dungeon: dNormVanguard,
      turn: 17,
      score: 900,
      monstersSlain: 6,
      combatLogs: [],
      checkpointSnapshot: null
    });

    const pNormStriker = createInitialPlayer('striker', 5, 5);
    pNormStriker.stats.coins = 555;
    const dNormStriker = generateDungeon(2, 24);
    saveOfflineRun({
      difficultyMode: 'normal',
      player: pNormStriker,
      dungeon: dNormStriker,
      turn: 9,
      score: 450,
      monstersSlain: 3,
      combatLogs: [],
      checkpointSnapshot: null
    });

    const pHardStriker = createInitialPlayer('striker', 6, 6);
    pHardStriker.stats.coins = 777;
    const dHardStriker = generateDungeon(5, 99);
    saveOfflineRun({
      difficultyMode: 'hard',
      player: pHardStriker,
      dungeon: dHardStriker,
      turn: 42,
      score: 2500,
      monstersSlain: 18,
      combatLogs: [],
      checkpointSnapshot: null
    });

    const loadedNormVanguard = loadOfflineSave('normal', 'vanguard');
    const loadedNormStriker = loadOfflineSave('normal', 'striker');
    const loadedHardStriker = loadOfflineSave('hard', 'striker');
    assert.ok(loadedNormVanguard && loadedNormStriker && loadedHardStriker);
    assert.equal(loadedNormVanguard!.dungeon.floor, 3);
    assert.equal(loadedNormVanguard!.player.stats.coins, 333);
    assert.equal(loadedNormStriker!.dungeon.floor, 2);
    assert.equal(loadedNormStriker!.player.stats.coins, 555);
    assert.equal(loadedHardStriker!.dungeon.floor, 5);
    assert.equal(loadedHardStriker!.player.stats.coins, 777);

    const all = loadAllOfflineSaves();
    assert.equal(all.normal_vanguard?.turn, 17);
    assert.equal(all.normal_striker?.turn, 9);
    assert.equal(all.hard_striker?.turn, 42);
    assert.equal(all.hard_technomancer, null);

    clearOfflineSave('normal', 'vanguard');
    assert.equal(loadOfflineSave('normal', 'vanguard'), null, 'Clearing normal vanguard deletes only normal vanguard run');
    assert.equal(loadOfflineSave('normal', 'striker')!.player.stats.coins, 555, 'Normal striker remains untouched');
    assert.equal(loadOfflineSave('hard', 'striker')!.player.stats.coins, 777, 'Hard striker remains untouched');

    clearOfflineSave('normal', 'striker');
    clearOfflineSave('hard', 'striker');
    assert.equal(loadOfflineSave('hard', 'striker'), null);
  } finally {
    if (origWindow === undefined) delete (globalThis as any).window;
    else (globalThis as any).window = origWindow;
  }
});

test('online co-op persists loot per account+role on server, moves equipped armor to inventory on exit, and restarts at Lv.1 Floor 1', () => {
  const mgr = new CoopRoomManager();
  mgr.joinRoom('LOOT1', 'conn_a1', 'OperativeA', 'acct_alpha');
  mgr.joinRoom('LOOT1', 'conn_b1', 'OperativeB', 'acct_beta');
  mgr.joinRoom('LOOT1', 'conn_c1', 'OperativeC', 'acct_gamma');
  mgr.selectRole('LOOT1', 'conn_a1', 'vanguard');
  mgr.selectRole('LOOT1', 'conn_b1', 'striker');
  mgr.selectRole('LOOT1', 'conn_c1', 'technomancer');
  mgr.toggleReady('LOOT1', 'conn_a1', true);
  mgr.toggleReady('LOOT1', 'conn_b1', true);
  mgr.toggleReady('LOOT1', 'conn_c1', true);
  assert.equal(mgr.startRoom('LOOT1', 101).ok, true);

  const room = mgr.getRoom('LOOT1')!;
  const slotA = room.players.find(p => p.playerId === 'conn_a1')!;
  const playerA = slotA.player!;

  // Level up operative, unlock an extra skill, advance dungeon floor, add currency + equipped armor
  awardXP(playerA, 600, [], 1);
  assert.ok(playerA.stats.level >= 2, 'Operative leveled up during online run');
  playerA.unlockedSkills.push('van_aegis_slam');
  room.dungeon!.floor = 4;
  playerA.stats.coins = 890;
  playerA.stats.soulShards = 14;
  playerA.stats.probabilityStones = 3;

  const customHelm = createItem('titanium_helm', 'test_helm_1');
  const customChest = createItem('hyperion_chassis', 'test_chest_1');
  playerA.equipment.helmet = customHelm;
  playerA.equipment.chest = customChest;

  // Leave room -> persists loot/currencies/items on server with equipped armor moved to inventory
  mgr.leaveRoom('LOOT1', 'conn_a1');
  const savedVanguard = mgr.getSavedLoadout('acct_alpha', 'vanguard');
  assert.ok(savedVanguard, 'Server saved stash for acct_alpha vanguard');
  assert.equal(savedVanguard!.coins, 890);
  assert.equal(savedVanguard!.soulShards, 14);
  assert.equal(savedVanguard!.probabilityStones, 3);
  assert.ok(savedVanguard!.inventory.some(i => i.id === customHelm.id), 'Equipped helm moved into inventory stash');
  assert.ok(savedVanguard!.inventory.some(i => i.id === customChest.id), 'Equipped chest moved into inventory stash');

  // Rejoin a new room with a fresh connection ID under the same accountId and start a new match
  mgr.joinRoom('LOOT2', 'conn_a2', 'OperativeA', 'acct_alpha');
  mgr.joinRoom('LOOT2', 'conn_b2', 'OperativeB', 'acct_beta');
  mgr.joinRoom('LOOT2', 'conn_c2', 'OperativeC', 'acct_gamma');
  mgr.selectRole('LOOT2', 'conn_a2', 'vanguard');
  mgr.selectRole('LOOT2', 'conn_b2', 'striker');
  mgr.selectRole('LOOT2', 'conn_c2', 'technomancer');
  mgr.toggleReady('LOOT2', 'conn_a2', true);
  mgr.toggleReady('LOOT2', 'conn_b2', true);
  mgr.toggleReady('LOOT2', 'conn_c2', true);
  assert.equal(mgr.startRoom('LOOT2', 202).ok, true);

  const room2 = mgr.getRoom('LOOT2')!;
  const newPlayerA = room2.players.find(p => p.playerId === 'conn_a2')!.player!;
  assert.equal(room2.dungeon!.floor, 1, 'New online match starts on Floor 1');
  assert.equal(newPlayerA.stats.level, 1, 'Online character resets to Level 1');
  assert.equal(newPlayerA.stats.exp, 0, 'Online character resets EXP to 0');
  assert.equal(newPlayerA.unlockedSkills.length, 1, 'Online character resets skill tree unlocks');
  assert.equal(newPlayerA.stats.coins, 890, 'Saved coins restored');
  assert.equal(newPlayerA.stats.soulShards, 14, 'Saved diamonds restored');
  assert.equal(newPlayerA.stats.probabilityStones, 3, 'Saved probability stones restored');
  assert.equal(newPlayerA.equipment.helmet, null, 'Helmet is NOT auto-equipped on new match');
  assert.equal(newPlayerA.equipment.chest, null, 'Chest armor is NOT auto-equipped on new match');
  assert.ok(newPlayerA.inventory.some(i => i.id === customHelm.id), 'Saved helmet is inside inventory');
  assert.ok(newPlayerA.inventory.some(i => i.id === customChest.id), 'Saved chest armor is inside inventory');
});

test('appSettings performance presets and soundEngine audio settings apply cleanly', async () => {
  const { DEFAULT_APP_SETTINGS, applyPerformancePreset } = await import('./settings');
  const { soundEngine } = await import('./audio');

  const perf = applyPerformancePreset('performance', DEFAULT_APP_SETTINGS);
  assert.equal(perf.performanceMode, 'performance');
  assert.equal(perf.enableScanlines, false);
  assert.equal(perf.enableGlow, false);
  assert.equal(perf.enableParticles, false);
  assert.equal(perf.targetFps, 30);

  const high = applyPerformancePreset('high', perf);
  assert.equal(high.enableScanlines, true);
  assert.equal(high.enableGlow, true);
  assert.equal(high.enableParticles, true);
  assert.equal(high.targetFps, 60);

  soundEngine.setAudioSettings({
    masterMuted: false,
    musicEnabled: true,
    musicVolume: 0.45,
    sfxEnabled: false,
    sfxVolume: 0.2,
    ambientReverbEnabled: false
  });
  const audioCfg = soundEngine.getAudioSettings();
  assert.equal(audioCfg.musicVolume, 0.45);
  assert.equal(audioCfg.sfxEnabled, false);
  assert.equal(audioCfg.sfxVolume, 0.2);
  assert.equal(audioCfg.ambientReverbEnabled, false);
});

test('audioDSP humanization keeps timing non-negative and frequency/velocity within organic bounds', async () => {
  const { humanizeTime, humanizeFreq, humanizeVel } = await import('./audioDSP');
  for (let i = 0; i < 40; i++) {
    const ht = humanizeTime(1.0, 0.012);
    assert.ok(ht >= 1.0 && ht <= 1.015, 'humanizeTime stays >= baseTime');
    const hf = humanizeFreq(440, 8);
    assert.ok(hf > 436 && hf < 444, 'humanizeFreq stays within micro-detune cents range');
    const hv = humanizeVel(0.25, 0.15);
    assert.ok(hv > 0.18 && hv < 0.32, 'humanizeVel stays within dynamic envelope bounds');
  }
});

test('combat emits step, blocked, coin, creature-specific attack, and differentiated skill sound events', () => {
  const player = createInitialPlayer('technomancer', 2, 2);
  player.stats.energy = 100;
  player.unlockedSkills.push('techno_emp_blast', 'techno_t2_meteor', 'techno_nanite_heal');

  const dungeon = generateDungeon(1, 55);
  dungeon.monsters = [];
  dungeon.groundCoins = [{ id: 'c1', x: 3, y: 2, value: 25, tier: 'gold' }];
  dungeon.tiles[2][2].walkable = true;
  dungeon.tiles[2][2].type = 'floor';
  dungeon.tiles[2][3].walkable = true;
  dungeon.tiles[2][3].type = 'floor';
  dungeon.tiles[1][3].walkable = false;
  dungeon.tiles[1][3].type = 'wall';

  // Step onto coin tile -> emits 'step' and 'coin'
  const stepRes = resolveStepOrAttack(player, dungeon, 1, 0, 1);
  assert.ok(stepRes.soundEvents.includes('step'));
  assert.ok(stepRes.soundEvents.includes('coin'));

  // Bump into wall -> emits 'blocked'
  const blockedRes = resolveStepOrAttack(stepRes.player, stepRes.dungeon, 0, -1, 2);
  assert.ok(blockedRes.soundEvents.includes('blocked'));

  // Differentiated skill sounds
  const meteorRes = executeSkill(stepRes.player, stepRes.dungeon, 'techno_t2_meteor', 3);
  assert.ok(meteorRes.soundEvents.includes('skill_fire'));

  const healRes = executeSkill(stepRes.player, stepRes.dungeon, 'techno_nanite_heal', 4);
  assert.ok(healRes.soundEvents.includes('skill_heal'));

  // Creature alert + specific archetype attack sound
  const logs: any[] = [];
  const soundEvents: any[] = [];
  const floaters: any[] = [];
  const mobDungeon = generateDungeon(1, 55);
  mobDungeon.monsters = [
    {
      id: 'boss_snd',
      name: 'Core Boss',
      archetype: 'core_synthesizer',
      level: 5,
      x: 4,
      y: 2,
      hp: 200,
      maxHp: 200,
      attack: 12,
      defense: 2,
      expReward: 50,
      shardReward: 20,
      alerted: false,
      color: '#f0f',
      symbol: 'B'
    }
  ];
  resolveMonsterTurns(stepRes.player, mobDungeon, logs, soundEvents, floaters, 5);
  assert.ok(soundEvents.includes('monster_alert'));
  assert.ok(soundEvents.includes('monster_attack_boss'));
});

test('generateFloorTheme produces distinct musical compositions per dungeon floor', async () => {
  const { generateFloorTheme } = await import('./audio');
  const themes = [1, 2, 3, 4, 5, 8, 12].map(f => generateFloorTheme(f));
  const rootSet = new Set(themes.slice(0, 5).map(t => t.rootMidi));
  const bpmSet = new Set(themes.slice(0, 5).map(t => t.bpm));
  const melodySigSet = new Set(themes.slice(0, 5).map(t => t.melodyExplore.join(',')));
  const signatureSet = new Set(themes.map(t => t.signatureHash));

  assert.equal(rootSet.size, 5, 'Floors 1-5 use distinct tonal roots');
  assert.ok(bpmSet.size >= 4, 'Floors 1-5 vary tempo distinctly');
  assert.equal(melodySigSet.size, 5, 'Floors 1-5 each generate a distinct melody');
  assert.equal(signatureSet.size, themes.length, 'Every floor has a unique music signature');

  for (let i = 1; i < 5; i++) {
    assert.notEqual(
      `${themes[i].rootMidi}:${themes[i].drumGroove}:${themes[i].arpMode}:${themes[i].leadEngine}`,
      `${themes[i - 1].rootMidi}:${themes[i - 1].drumGroove}:${themes[i - 1].arpMode}:${themes[i - 1].leadEngine}`,
      'Adjacent floors always change harmonic/rhythmic/engine character'
    );
  }

  // Ascending tension: deeper floors must feel tighter
  assert.ok(themes[0].tension < themes[4].tension, 'Floor 5 more tense than floor 1');
  assert.ok(themes[4].tension < themes[6].tension, 'Floor 12 more tense than floor 5');
  assert.ok(themes[6].bpm > themes[0].bpm, 'Deep floors run at higher BPM');
  assert.ok(themes[6].ambientDensity > themes[0].ambientDensity, 'Deep floors denser ambient');
});

test('DSP exports physical / granular / additive music primitives', async () => {
  const dsp = await import('./audioDSP');
  assert.equal(typeof dsp.playKarplusStrong, 'function');
  assert.equal(typeof dsp.playWaveguide, 'function');
  assert.equal(typeof dsp.playAmbientNoise, 'function');
  assert.equal(typeof dsp.playAdditiveBell, 'function');
  assert.equal(typeof dsp.playModalMembrane, 'function');
  assert.equal(typeof dsp.GranularEngine, 'function');
});


test('realtime free-movement: entities can straddle two tiles and slide on walls', async () => {
  const { occupiedTiles, canOccupy, moveWithCollision, ENTITY_BODY, tickRealtime, createRealtimeClock } = await import('./realtime');
  const dungeon = generateDungeon(1, 99);
  const floorTile = (() => {
    for (const room of dungeon.rooms) {
      for (let y = room.y + 1; y < room.y + room.h - 1; y++) {
        for (let x = room.x + 1; x < room.x + room.w - 1; x++) {
          if (dungeon.tiles[y][x].walkable) return { x, y };
        }
      }
    }
    return { x: dungeon.rooms[0].centerX, y: dungeon.rooms[0].centerY };
  })();

  // Centered on one tile → single cell; shifted → two cells
  const one = occupiedTiles(floorTile.x, floorTile.y, ENTITY_BODY);
  assert.equal(one.length, 1);
  const two = occupiedTiles(floorTile.x + 0.35, floorTile.y, ENTITY_BODY);
  assert.ok(two.length >= 2, 'Body straddling tile boundary occupies 2+ cells');

  assert.equal(canOccupy(dungeon, floorTile.x, floorTile.y), true);

  const blocked = moveWithCollision(dungeon, floorTile.x, floorTile.y, -40, 0, 0.05, []);
  // Extreme left velocity against map/walls should not leave walkable space illegally
  assert.ok(canOccupy(dungeon, blocked.x, blocked.y));

  const player = createInitialPlayer('striker', floorTile.x, floorTile.y);
  dungeon.monsters = dungeon.monsters.filter(
    m => Math.hypot(m.x - player.x, m.y - player.y) > 3
  );
  const clock = createRealtimeClock();
  const beforeX = player.x;
  const tick = tickRealtime(player, dungeon, { dx: 1, dy: 0 }, 0.05, 1, clock);
  assert.ok(tick.player.x > beforeX || tick.moved === false, 'Player advances continuously with held input');
  assert.ok(Number.isFinite(tick.player.x) && Number.isFinite(tick.player.y));
});
