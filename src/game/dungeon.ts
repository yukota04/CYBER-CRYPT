import { DungeonState, Monster, MonsterArchetype, Room, Tile } from './types';
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
  const config = { ...DEFAULT_CONFIG, floor, ...customConfig };
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
      // Carve room
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

      // Connect with previous room via L-corridor
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

  // Ensure at least 2 rooms exist
  if (rooms.length === 0) {
    // Fallback safe room
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

  // Place Chests & Shrines & Traps
  for (let i = 1; i < rooms.length; i++) {
    const room = rooms[i];
    // Chest placement
    if (rng() < 0.65) {
      const cx = room.x + 1;
      const cy = room.y + 1;
      if (tiles[cy][cx].type === 'floor' && !(cx === stairsPos.x && cy === stairsPos.y)) {
        tiles[cy][cx].type = 'chest';
        tiles[cy][cx].item = generateRandomLoot(floor);
      }
    }
    // Shrine placement (boost/heal)
    if (rng() < 0.35 && i !== rooms.length - 1) {
      const sx = room.x + room.w - 2;
      const sy = room.y + room.h - 2;
      if (tiles[sy][sx].type === 'floor') {
        tiles[sy][sx].type = 'shrine';
      }
    }
    // Hidden trap
    if (rng() < 0.40) {
      const tx = Math.floor(rng() * (room.w - 2)) + room.x + 1;
      const ty = Math.floor(rng() * (room.h - 2)) + room.y + 1;
      if (tiles[ty][tx].type === 'floor' && !(tx === stairsPos.x && ty === stairsPos.y)) {
        tiles[ty][tx].hazard = 'glitch_wire';
      }
    }
  }

  // Spawn Monsters
  const monsters: Monster[] = [];
  let monsterIdCount = 1;

  for (let i = 1; i < rooms.length; i++) {
    const room = rooms[i];
    const isBossRoom = (i === rooms.length - 1 && floor % 3 === 0);

    if (isBossRoom) {
      // Spawn Boss: The Core Synthesizer
      monsters.push({
        id: `boss_${floor}_${monsterIdCount++}`,
        name: `CORE SYNTHESIZER MK-${floor}`,
        archetype: 'core_synthesizer',
        x: room.centerX,
        y: Math.max(room.y + 1, room.centerY - 1),
        hp: 120 + floor * 55,
        maxHp: 120 + floor * 55,
        attack: 16 + floor * 4,
        defense: 10 + floor * 3,
        expReward: 140 + floor * 50,
        shardReward: 40 + floor * 15,
        alerted: true,
        color: '#ff007f',
        symbol: 'Ω'
      });
      continue;
    }

    const numMonsters = Math.floor(rng() * 3) + 1; // 1 to 3 monsters per room
    for (let m = 0; m < numMonsters; m++) {
      const mx = Math.floor(rng() * (room.w - 2)) + room.x + 1;
      const my = Math.floor(rng() * (room.h - 2)) + room.y + 1;

      if (!tiles[my][mx].walkable || (mx === stairsPos.x && my === stairsPos.y)) {
        continue;
      }
      if (monsters.some(mon => mon.x === mx && mon.y === my)) {
        continue;
      }

      // Pick archetype
      const archetypeRoll = rng();
      let archetype: MonsterArchetype = 'glitch_swarmer';
      let name = 'Glitch Swarmer';
      let hp = 24 + floor * 8;
      let attack = 7 + floor * 2;
      let defense = 2 + floor;
      let color = '#00f0ff';
      let symbol = '👾';
      let expReward = 20 + floor * 5;
      let shardReward = 5 + floor * 2;

      if (archetypeRoll > 0.75) {
        archetype = 'cyber_behemoth';
        name = 'Cyber Behemoth';
        hp = 55 + floor * 18;
        attack = 13 + floor * 3;
        defense = 6 + floor * 2;
        color = '#ff3366';
        symbol = '🤖';
        expReward = 50 + floor * 12;
        shardReward = 14 + floor * 4;
      } else if (archetypeRoll > 0.45) {
        archetype = 'neon_stalker';
        name = 'Neon Stalker';
        hp = 30 + floor * 9;
        attack = 10 + floor * 3;
        defense = 3 + floor;
        color = '#ffe600';
        symbol = '👁️';
        expReward = 32 + floor * 8;
        shardReward = 8 + floor * 3;
      } else if (archetypeRoll > 0.25) {
        archetype = 'circuit_disruptor';
        name = 'Circuit Disruptor';
        hp = 35 + floor * 10;
        attack = 9 + floor * 2;
        defense = 4 + floor;
        color = '#bd00ff';
        symbol = '⚡';
        expReward = 38 + floor * 9;
        shardReward = 10 + floor * 3;
      }

      monsters.push({
        id: `mob_${floor}_${monsterIdCount++}`,
        name,
        archetype,
        x: mx,
        y: my,
        hp,
        maxHp: hp,
        attack,
        defense,
        expReward,
        shardReward,
        alerted: false,
        color,
        symbol
      });
    }
  }

  // Check for Environmental Event (triggers every 5 floors)
  const activeEvent = getEnvironmentalEventForFloor(floor, seed);
  let shopItems: DungeonState['shopItems'] = undefined;

  if (activeEvent?.id === 'black_market' && rooms.length > 1) {
    const shopRoom = rooms[Math.min(rooms.length - 1, Math.max(1, Math.floor(rooms.length / 2)))];
    const sx = shopRoom.centerX;
    const sy = shopRoom.centerY;
    if (tiles[sy][sx].type !== 'stairs_down') {
      tiles[sy][sx].type = 'shop';
    }
    shopItems = generateShopItems(floor);
  }

  return {
    floor,
    width,
    height,
    tiles,
    rooms,
    monsters,
    stairsPos,
    activeEvent,
    shopItems
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

  // Clear visibility
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      tiles[y][x].visible = false;
    }
  }

  // Center is always visible and explored
  tiles[startY][startX].visible = true;
  tiles[startY][startX].explored = true;

  // Raycast 360 degrees
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

      // Walls block further light
      if (!tiles[ty][tx].transparent) {
        break;
      }
    }
  }
}
