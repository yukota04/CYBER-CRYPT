import {
  DungeonState,
  Monster,
  MonsterArchetype,
  MonsterVisualVariant,
  Room,
  Tile
} from './types';
import { generateRandomLoot } from './items';
import { getEnvironmentalEventForFloor, generateShopItems } from './events';

export interface DungeonConfig {
  width: number;
  height: number;
  maxRooms: number;
  minRoomSize: number;
  maxRoomSize: number;
  floor: number;
}

const DEFAULT_CONFIG: DungeonConfig = {
  width: 48,
  height: 34,
  maxRooms: 9,
  minRoomSize: 5,
  maxRoomSize: 10,
  floor: 1
};

const EVOLVED_SHAPES: MonsterVisualVariant['bodyShape'][] = [
  'hex',
  'diamond',
  'octo',
  'spiked',
  'serpent',
  'titan',
  'core'
];

const EYE_STYLES: MonsterVisualVariant['eyeStyle'][] = [
  'twin',
  'single',
  'tri',
  'visor',
  'halo'
];

const FLOOR_TIER_PREFIXES = [
  '',
  'Mk-II ',
  'Overclocked ',
  'Apex ',
  'Void-Forged ',
  'Singularity ',
  'Omega '
];

function hslToHex(h: number, s: number, l: number): string {
  const hue = ((h % 360) + 360) % 360;
  const sat = Math.max(0, Math.min(100, s)) / 100;
  const light = Math.max(0, Math.min(100, l)) / 100;
  const a = sat * Math.min(light, 1 - light);
  const f = (n: number) => {
    const k = (n + hue / 30) % 12;
    const color = light - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function buildMonsterVisualVariant(
  floor: number,
  archetype: MonsterArchetype,
  seedNum: number
): { visualVariant: MonsterVisualVariant; primaryColor: string; evolvedPrefix: string } {
  const tier = Math.min(6, Math.floor((floor - 1) / 2) + 1);
  const baseHue =
    archetype === 'core_synthesizer'
      ? 330
      : archetype === 'cyber_behemoth'
      ? 350
      : archetype === 'neon_stalker'
      ? 48
      : archetype === 'circuit_disruptor'
      ? 282
      : 188;

  // Deterministic procedural hue shift per floor & individual seed so enemies visibly evolve every floor
  const hueShift = ((floor - 1) * 37 + (seedNum % 5) * 19) % 360;
  const finalHue = (baseHue + hueShift) % 360;
  const secondaryHue = (finalHue + 135) % 360;
  const auraHue = (finalHue + 60) % 360;

  const primaryColor = hslToHex(finalHue, 92, 56);
  const secondaryColor = hslToHex(secondaryHue, 90, 62);
  const auraColor = hslToHex(auraHue, 95, 65);

  const shapeIdx = (floor - 1 + seedNum + archetype.length) % EVOLVED_SHAPES.length;
  const eyeIdx = (floor + seedNum) % EYE_STYLES.length;

  const visualVariant: MonsterVisualVariant = {
    seed: seedNum,
    tier,
    hueShift,
    bodyShape: archetype === 'core_synthesizer' ? 'core' : EVOLVED_SHAPES[shapeIdx],
    plates: Math.min(6, Math.floor((floor + 1) / 2)),
    spikes: Math.min(12, (floor - 1) + (archetype === 'cyber_behemoth' ? 4 : 2)),
    eyeStyle: archetype === 'core_synthesizer' ? 'halo' : EYE_STYLES[eyeIdx],
    auraColor,
    secondaryColor,
    crown: archetype === 'core_synthesizer' || floor >= 4
  };

  const prefixIdx = Math.min(FLOOR_TIER_PREFIXES.length - 1, Math.floor((floor - 1) / 2));
  return {
    visualVariant,
    primaryColor,
    evolvedPrefix: FLOOR_TIER_PREFIXES[prefixIdx]
  };
}

export function createEmptyGrid(width: number, height: number): Tile[][] {
  const tiles: Tile[][] = [];
  for (let y = 0; y < height; y++) {
    const row: Tile[] = [];
    for (let x = 0; x < width; x++) {
      row.push({
        x,
        y,
        type: 'wall',
        walkable: false,
        transparent: false,
        explored: false,
        visible: false
      });
    }
    tiles.push(row);
  }
  return tiles;
}

// Pseudo-random number generator for seeded or unseeded runs
function makeRng(seed?: number) {
  let s = seed !== undefined ? seed : Math.floor(Math.random() * 1000000);
  return function next() {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export function generateDungeon(floor = 1, seed?: number, customConfig?: Partial<DungeonConfig>): DungeonState {
  const scaledWidth = DEFAULT_CONFIG.width + Math.min(16, Math.max(0, floor - 1) * 2);
  const scaledHeight = DEFAULT_CONFIG.height + Math.min(10, Math.max(0, floor - 1));
  const scaledRooms = DEFAULT_CONFIG.maxRooms + Math.min(6, Math.floor(Math.max(0, floor - 1) / 2));

  const config: DungeonConfig = {
    ...DEFAULT_CONFIG,
    width: scaledWidth,
    height: scaledHeight,
    maxRooms: scaledRooms,
    floor,
    ...customConfig
  };
  const rng = makeRng(seed);
  const { width, height, maxRooms, minRoomSize, maxRoomSize } = config;

  const tiles = createEmptyGrid(width, height);
  const rooms: Room[] = [];

  for (let r = 0; r < maxRooms; r++) {
    const w = Math.floor(rng() * (maxRoomSize - minRoomSize + 1)) + minRoomSize;
    const h = Math.floor(rng() * (maxRoomSize - minRoomSize + 1)) + minRoomSize;
    const x = Math.floor(rng() * (width - w - 2)) + 1;
    const y = Math.floor(rng() * (height - h - 2)) + 1;

    const newRoom: Room = {
      x,
      y,
      w,
      h,
      centerX: Math.floor(x + w / 2),
      centerY: Math.floor(y + h / 2)
    };

    // Check collision with existing rooms (with 1 tile padding)
    let failed = false;
    for (const other of rooms) {
      if (
        newRoom.x <= other.x + other.w + 1 &&
        newRoom.x + newRoom.w + 1 >= other.x &&
        newRoom.y <= other.y + other.h + 1 &&
        newRoom.y + newRoom.h + 1 >= other.y
      ) {
        failed = true;
        break;
      }
    }

    if (!failed) {
      for (let rx = newRoom.x; rx < newRoom.x + newRoom.w; rx++) {
        for (let ry = newRoom.y; ry < newRoom.y + newRoom.h; ry++) {
          tiles[ry][rx] = {
            x: rx,
            y: ry,
            type: 'floor',
            walkable: true,
            transparent: true,
            explored: false,
            visible: false
          };
        }
      }

      if (rooms.length > 0) {
        const prev = rooms[rooms.length - 1];
        if (rng() < 0.5) {
          carveHorizontalTunnel(tiles, prev.centerX, newRoom.centerX, prev.centerY);
          carveVerticalTunnel(tiles, prev.centerY, newRoom.centerY, newRoom.centerX);
        } else {
          carveVerticalTunnel(tiles, prev.centerY, newRoom.centerY, prev.centerX);
          carveHorizontalTunnel(tiles, prev.centerX, newRoom.centerX, newRoom.centerY);
        }
      }

      rooms.push(newRoom);
    }
  }

  if (rooms.length === 0) {
    const fallback: Room = { x: 5, y: 5, w: 8, h: 8, centerX: 9, centerY: 9 };
    for (let rx = 5; rx < 13; rx++) {
      for (let ry = 5; ry < 13; ry++) {
        tiles[ry][rx] = { x: rx, y: ry, type: 'floor', walkable: true, transparent: true, explored: false, visible: false };
      }
    }
    rooms.push(fallback);
  }

  // Place stairs in the furthest room from room 0
  const lastRoom = rooms[rooms.length - 1];
  const stairsPos = { x: lastRoom.centerX, y: lastRoom.centerY };
  tiles[stairsPos.y][stairsPos.x].type = 'stairs_down';

  // Place strictly 2 Checkpoints per map: 1 at the start room and 1 at the final room
  const checkpoints: { x: number; y: number; activated: boolean }[] = [];
  const startRoom = rooms[0];
  let startPlaced = false;
  for (let ry = startRoom.y + 1; ry < startRoom.y + startRoom.h - 1 && !startPlaced; ry++) {
    for (let rx = startRoom.x + 1; rx < startRoom.x + startRoom.w - 1 && !startPlaced; rx++) {
      if (
        tiles[ry]?.[rx]?.type === 'floor' &&
        !(rx === startRoom.centerX && ry === startRoom.centerY) &&
        !(rx === stairsPos.x && ry === stairsPos.y)
      ) {
        tiles[ry][rx].type = 'checkpoint';
        tiles[ry][rx].checkpointActivated = true;
        checkpoints.push({ x: rx, y: ry, activated: true });
        startPlaced = true;
      }
    }
  }

  let endPlaced = false;
  for (let ry = lastRoom.y + 1; ry < lastRoom.y + lastRoom.h - 1 && !endPlaced; ry++) {
    for (let rx = lastRoom.x + lastRoom.w - 2; rx > lastRoom.x && !endPlaced; rx--) {
      if (
        tiles[ry]?.[rx]?.type === 'floor' &&
        !(rx === stairsPos.x && ry === stairsPos.y) &&
        !(rx === startRoom.centerX && ry === startRoom.centerY)
      ) {
        tiles[ry][rx].type = 'checkpoint';
        tiles[ry][rx].checkpointActivated = false;
        checkpoints.push({ x: rx, y: ry, activated: false });
        endPlaced = true;
      }
    }
  }

  // Place Chests, Shrines & Traps
  for (let i = 1; i < rooms.length; i++) {
    const room = rooms[i];
    if (rng() < 0.72) {
      const cx = room.x + 1;
      const cy = room.y + 1;
      if (tiles[cy][cx].type === 'floor' && !(cx === stairsPos.x && cy === stairsPos.y)) {
        tiles[cy][cx].type = 'chest';
        tiles[cy][cx].item = generateRandomLoot(floor);
      }
    }
    if (rng() < 0.38 && i !== rooms.length - 1) {
      const sx = room.x + room.w - 2;
      const sy = room.y + room.h - 2;
      if (tiles[sy][sx].type === 'floor') {
        tiles[sy][sx].type = 'shrine';
      }
    }
    if (rng() < 0.40) {
      const tx = Math.floor(rng() * (room.w - 2)) + room.x + 1;
      const ty = Math.floor(rng() * (room.h - 2)) + room.y + 1;
      if (tiles[ty][tx].type === 'floor' && !(tx === stairsPos.x && ty === stairsPos.y)) {
        tiles[ty][tx].hazard = 'glitch_wire';
      }
    }
  }

  // Balanced progressive monster scaling
  const monsters: Monster[] = [];
  let monsterIdCount = 1;
  const hpCurve = 1 + (floor - 1) * 0.25 + Math.pow(Math.max(0, floor - 1), 1.28) * 0.03;
  const atkScale = Math.floor((floor - 1) * 2.1);
  const defScale = Math.floor((floor - 1) * 1.1);
  const rewardScale = 1 + (floor - 1) * 0.24;

  // Monster count per room scales progressively with floor
  const minPerRoom = 1 + Math.floor((floor - 1) / 3);
  const maxPerRoom = Math.min(6, 2 + Math.floor((floor - 1) / 2));

  for (let i = 1; i < rooms.length; i++) {
    const room = rooms[i];
    const isBossRoom = i === rooms.length - 1 && floor % 3 === 0;

    if (isBossRoom) {
      const bossIdNum = monsterIdCount++;
      const variant = buildMonsterVisualVariant(floor, 'core_synthesizer', bossIdNum);
      const bossHp = Math.round(135 * hpCurve);
      monsters.push({
        id: `boss_${floor}_${bossIdNum}`,
        name: `${variant.evolvedPrefix}CORE SYNTHESIZER MK-${floor}`,
        level: floor + 4,
        archetype: 'core_synthesizer',
        x: room.centerX,
        y: Math.max(room.y + 1, room.centerY - 1),
        hp: bossHp,
        maxHp: bossHp,
        attack: 16 + Math.floor(floor * 3.2),
        defense: 9 + Math.floor(floor * 1.6),
        expReward: Math.round(145 * rewardScale),
        shardReward: Math.round(40 * rewardScale),
        alerted: true,
        color: variant.primaryColor,
        symbol: 'Ω',
        visualVariant: variant.visualVariant
      });
    }

    const numMonsters = isBossRoom
      ? Math.min(3, 1 + Math.floor(floor / 4))
      : Math.floor(rng() * (maxPerRoom - minPerRoom + 1)) + minPerRoom;

    for (let m = 0; m < numMonsters; m++) {
      const mx = Math.floor(rng() * (room.w - 2)) + room.x + 1;
      const my = Math.floor(rng() * (room.h - 2)) + room.y + 1;

      if (!tiles[my][mx].walkable || (mx === stairsPos.x && my === stairsPos.y)) {
        continue;
      }
      if (monsters.some(mon => mon.x === mx && mon.y === my)) {
        continue;
      }

      const archetypeRoll = rng();
      let archetype: MonsterArchetype = 'glitch_swarmer';
      let baseName = 'Glitch Swarmer';
      let baseHp = 24;
      let baseAtk = 7;
      let baseDef = 2;
      let symbol = '👾';
      let baseExp = 20;
      let baseShard = 5;

      // Higher floors unlock stronger archetype weightings smoothly
      const eliteBias = Math.min(0.25, (floor - 1) * 0.03);
      if (archetypeRoll > 0.78 - eliteBias) {
        archetype = 'cyber_behemoth';
        baseName = 'Cyber Behemoth';
        baseHp = 52;
        baseAtk = 12;
        baseDef = 5;
        symbol = '🤖';
        baseExp = 48;
        baseShard = 14;
      } else if (archetypeRoll > 0.48 - eliteBias * 0.5) {
        archetype = 'neon_stalker';
        baseName = 'Neon Stalker';
        baseHp = 30;
        baseAtk = 10;
        baseDef = 3;
        symbol = '👁️';
        baseExp = 32;
        baseShard = 8;
      } else if (archetypeRoll > 0.25) {
        archetype = 'circuit_disruptor';
        baseName = 'Circuit Disruptor';
        baseHp = 34;
        baseAtk = 9;
        baseDef = 4;
        symbol = '⚡';
        baseExp = 36;
        baseShard = 10;
      }

      const idNum = monsterIdCount++;
      const variant = buildMonsterVisualVariant(floor, archetype, idNum);
      const hp = Math.round(baseHp * hpCurve);
      const attack = baseAtk + atkScale;
      const defense = baseDef + defScale;
      const monsterLevel =
        archetype === 'cyber_behemoth'
          ? floor + 2
          : archetype === 'neon_stalker' || archetype === 'circuit_disruptor'
          ? floor + 1
          : floor;

      monsters.push({
        id: `mob_${floor}_${idNum}`,
        name: `${variant.evolvedPrefix}${baseName}`,
        level: monsterLevel,
        archetype,
        x: mx,
        y: my,
        hp,
        maxHp: hp,
        attack,
        defense,
        expReward: Math.round(baseExp * rewardScale),
        shardReward: Math.round(baseShard * rewardScale),
        alerted: false,
        color: variant.primaryColor,
        symbol,
        visualVariant: variant.visualVariant
      });
    }
  }

  // Check for Environmental Event (triggers every 5 floors)
  const activeEvent = getEnvironmentalEventForFloor(floor, seed);

  // Place NPC Merchant Shop at the start of EVERY floor inside startRoom (rooms[0])
  let shopPlaced = false;
  for (let ry = startRoom.y + 1; ry < startRoom.y + startRoom.h - 1 && !shopPlaced; ry++) {
    for (let rx = startRoom.x + startRoom.w - 2; rx > startRoom.x && !shopPlaced; rx--) {
      if (
        tiles[ry]?.[rx]?.type === 'floor' &&
        !(rx === startRoom.centerX && ry === startRoom.centerY) &&
        !(rx === stairsPos.x && ry === stairsPos.y)
      ) {
        tiles[ry][rx].type = 'shop';
        shopPlaced = true;
      }
    }
  }

  // On Black Market event floors, also place a secondary bonus Black Market terminal mid-floor
  if (activeEvent?.id === 'black_market' && rooms.length > 1) {
    const shopRoom = rooms[Math.min(rooms.length - 1, Math.max(1, Math.floor(rooms.length / 2)))];
    const sx = shopRoom.centerX;
    const sy = shopRoom.centerY;
    if (tiles[sy][sx].type === 'floor') {
      tiles[sy][sx].type = 'shop';
    }
  }

  const shopItems = generateShopItems(floor, activeEvent?.id === 'black_market');

  return {
    floor,
    width,
    height,
    tiles,
    rooms,
    monsters,
    stairsPos,
    activeEvent,
    shopItems,
    groundCoins: [],
    checkpoints,
    deathDrops: []
  };
}

function carveHorizontalTunnel(tiles: Tile[][], x1: number, x2: number, y: number) {
  const startX = Math.min(x1, x2);
  const endX = Math.max(x1, x2);
  for (let x = startX; x <= endX; x++) {
    if (y >= 0 && y < tiles.length && x >= 0 && x < tiles[0].length) {
      tiles[y][x] = {
        x,
        y,
        type: 'corridor',
        walkable: true,
        transparent: true,
        explored: false,
        visible: false
      };
    }
  }
}

function carveVerticalTunnel(tiles: Tile[][], y1: number, y2: number, x: number) {
  const startY = Math.min(y1, y2);
  const endY = Math.max(y1, y2);
  for (let y = startY; y <= endY; y++) {
    if (y >= 0 && y < tiles.length && x >= 0 && x < tiles[0].length) {
      tiles[y][x] = {
        x,
        y,
        type: 'corridor',
        walkable: true,
        transparent: true,
        explored: false,
        visible: false
      };
    }
  }
}

// Field of View computation using raycasting to circle perimeter
export function updateFOV(tiles: Tile[][], startX: number, startY: number, radius = 7) {
  const height = tiles.length;
  const width = tiles[0].length;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      tiles[y][x].visible = false;
    }
  }

  if (tiles[startY]?.[startX]) {
    tiles[startY][startX].visible = true;
    tiles[startY][startX].explored = true;
  }

  const steps = 180;
  for (let i = 0; i < steps; i++) {
    const angle = (i * 2 * Math.PI) / steps;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);

    let cx = startX + 0.5;
    let cy = startY + 0.5;

    for (let dist = 1; dist <= radius; dist++) {
      cx += dx;
      cy += dy;
      const tx = Math.floor(cx);
      const ty = Math.floor(cy);

      if (tx < 0 || tx >= width || ty < 0 || ty >= height) break;

      tiles[ty][tx].visible = true;
      tiles[ty][tx].explored = true;

      if (!tiles[ty][tx].transparent) {
        break;
      }
    }
  }
}
