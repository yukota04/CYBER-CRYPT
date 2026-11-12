import test from 'node:test';
import assert from 'node:assert/strict';
import { generateDungeon, updateFOV } from './dungeon';
import { createInitialPlayer, calculatePlayerDamage, resolveStepOrAttack, getTotalStats, awardXP } from './combat';
import { canUnlockSkill, computePassiveBonuses, SKILL_DATABASE } from './skills';
import { BASE_ITEMS, createItem } from './items';

test('dungeon generator creates valid walkable rooms and stairs', () => {
  const dungeon = generateDungeon(1, 42); // deterministic seed 42
  assert.ok(dungeon.rooms.length > 0, 'Dungeon should have at least 1 room');
  assert.ok(dungeon.width > 0 && dungeon.height > 0);
  assert.ok(dungeon.stairsPos.x >= 0 && dungeon.stairsPos.y >= 0);
  
  // Verify stairs tile is set
  const stairsTile = dungeon.tiles[dungeon.stairsPos.y][dungeon.stairsPos.x];
  assert.equal(stairsTile.type, 'stairs_down');
  assert.equal(stairsTile.walkable, true);
});

test('FOV reveals player origin and transparent neighbors', () => {
  const dungeon = generateDungeon(1, 123);
  const startRoom = dungeon.rooms[0];
  updateFOV(dungeon.tiles, startRoom.centerX, startRoom.centerY, 6);

  const centerTile = dungeon.tiles[startRoom.centerY][startRoom.centerX];
  assert.equal(centerTile.visible, true);
  assert.equal(centerTile.explored, true);
});

test('player creation initializes class-specific stats', () => {
  const striker = createInitialPlayer('striker');
  const vanguard = createInitialPlayer('vanguard');
  const technomancer = createInitialPlayer('technomancer');

  assert.equal(striker.characterClass, 'striker');
  assert.ok(striker.stats.critRate > vanguard.stats.critRate, 'Striker should have higher crit rate');
  assert.ok(vanguard.stats.hp > striker.stats.hp, 'Vanguard should have higher base HP');
  assert.ok(technomancer.stats.energy > striker.stats.energy, 'Technomancer should have higher energy');
});

test('total stats include weapon and armor bonuses', () => {
  const player = createInitialPlayer('striker');
  const initialTotals = getTotalStats(player);

  player.equipment.weapon = createItem('cyber_railgun');
  player.equipment.armor = createItem('hyperion_chassis');

  const upgradedTotals = getTotalStats(player);
  assert.ok(upgradedTotals.attack > initialTotals.attack, 'Weapon should boost attack');
  assert.ok(upgradedTotals.defense > initialTotals.defense, 'Armor should boost defense');
  assert.ok(upgradedTotals.critRate > initialTotals.critRate, 'Weapon should boost crit rate');
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
  assert.equal(player.stats.hp, player.stats.maxHp, 'Level up should heal to full');
  assert.equal(player.stats.energy, player.stats.maxEnergy, 'Level up should refill energy');
});

test('skill unlock prerequisites enforce skill tree ordering', () => {
  // Tier 1 has no prereqs
  const tier1Check = canUnlockSkill('striker_slash', [], 1);
  assert.equal(tier1Check.canUnlock, true);

  // Tier 2 requires striker_slash
  const tier2CheckLocked = canUnlockSkill('striker_phase_dash', [], 1);
  assert.equal(tier2CheckLocked.canUnlock, false);

  const tier2CheckUnlocked = canUnlockSkill('striker_phase_dash', ['striker_slash'], 1);
  assert.equal(tier2CheckUnlocked.canUnlock, true);

  // Check insufficient points
  const noPointsCheck = canUnlockSkill('striker_phase_dash', ['striker_slash'], 0);
  assert.equal(noPointsCheck.canUnlock, false);
});

test('combat damage formula produces positive damage and honors critical hits', () => {
  const player = createInitialPlayer('striker');
  const dummyMonster = {
    id: 'test_mob',
    name: 'Target Dummy',
    archetype: 'glitch_swarmer' as const,
    x: 1,
    y: 1,
    hp: 100,
    maxHp: 100,
    attack: 5,
    defense: 2,
    expReward: 10,
    shardReward: 5,
    alerted: false,
    color: '#00f',
    symbol: 'M'
  };

  const { damage } = calculatePlayerDamage(player, dummyMonster);
  assert.ok(damage > 0, 'Damage must be greater than 0');
});

test('i18n translations support all 5 principal languages', async () => {
  const { t, SUPPORTED_LANGUAGES } = await import('./i18n');
  assert.equal(SUPPORTED_LANGUAGES.length, 5);
  
  const expectedLangs = ['en', 'es', 'fr', 'de', 'ja'] as const;
  for (const lang of expectedLangs) {
    assert.ok(t('startRun', lang).length > 0, `${lang} should have startRun translation`);
    assert.ok(t('level', lang).length > 0, `${lang} should have level translation`);
    assert.ok(t('floor', lang).length > 0, `${lang} should have floor translation`);
    assert.ok(t('vitality', lang).length > 0, `${lang} should have vitality translation`);
  }

  // Spot-check language-specific translations
  assert.equal(t('startRun', 'es'), 'INICIAR PARTIDA [ENTER / ESPACIO]');
  assert.equal(t('startRun', 'en'), 'INITIALIZE RUN [ENTER / SPACE]');
  assert.equal(t('floor', 'es'), 'PISO');
  assert.equal(t('floor', 'en'), 'FLOOR');
  assert.equal(t('floor', 'fr'), 'ÉTAGE');
  assert.equal(t('floor', 'de'), 'EBENE');
  assert.equal(t('floor', 'ja'), '階層');
});

test('resolveStepOrAttack produces critical hit floating text indicator', () => {
  const player = createInitialPlayer('striker', 0, 0);
  // Force 100% crit rate via overclock
  player.buffs.overclockTurns = 5;

  const dungeon = generateDungeon(1, 10);
  // Place target monster adjacent at (1, 0)
  dungeon.tiles[0][1].walkable = true;
  dungeon.monsters = [{
    id: 'crit_dummy',
    name: 'Target Dummy',
    archetype: 'glitch_swarmer',
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

  const result = resolveStepOrAttack(player, dungeon, 1, 0, 1);
  assert.ok(result.floatingTexts.length > 0, 'Should produce floating text');
  
  const critFloater = result.floatingTexts[0];
  assert.equal(critFloater.isCrit, true, 'Floater should have isCrit: true');
  assert.ok(critFloater.text.includes('CRIT!'), 'Text should contain CRIT!');
  assert.equal(critFloater.color, '#ffe600', 'Crit floater should have vibrant electric gold color');
  assert.ok(result.soundEvents.includes('crit'), 'Sound event should include crit');
  assert.ok(result.screenShake >= 0.25, 'Crit should trigger enhanced screen shake');
});

