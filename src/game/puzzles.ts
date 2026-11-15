/**
 * Dungeon puzzle props: pushable crates, pits, pressure plates, sealed gates.
 * Solo gets helper crates for button puzzles; multiplayer requires teamwork.
 */
import { CombatLogEntry, DungeonState, PuzzleCrate, PuzzleLink, Room, Tile } from './types';

/** Match realtime ENTITY_BODY — keep local to avoid circular imports. */
const ENTITY_BODY = 0.72;
const CRATE_MAX_HP = 36;
const CRATE_RESPAWN_SEC = 10;

export type PuzzleRng = () => number;

export function makeCrate(id: string, x: number, y: number): PuzzleCrate {
  return {
    id,
    x,
    y,
    homeX: x,
    homeY: y,
    hp: CRATE_MAX_HP,
    maxHp: CRATE_MAX_HP,
    broken: false,
    respawnIn: 0
  };
}

/** Solid tile occupancy — crates block walk like walls until broken. */
export function crateBlocksTile(dungeon: DungeonState, tx: number, ty: number): boolean {
  const crates = dungeon.crates;
  if (!crates || !crates.length) return false;
  for (let i = 0; i < crates.length; i++) {
    const c = crates[i];
    if (c.broken) continue;
    if (Math.floor(c.x) === tx && Math.floor(c.y) === ty) return true;
  }
  return false;
}

export function livingCrates(dungeon: DungeonState): PuzzleCrate[] {
  return (dungeon.crates || []).filter(c => !c.broken);
}

function isFloorish(t: Tile | undefined): boolean {
  return !!t && t.walkable && (t.type === 'floor' || t.type === 'corridor');
}

function setPit(tile: Tile) {
  tile.type = 'pit';
  tile.walkable = false;
  tile.transparent = true;
}

function setPitFilled(tile: Tile) {
  tile.type = 'pit_filled';
  tile.walkable = true;
  tile.transparent = true;
}

function setPlate(tile: Tile) {
  tile.type = 'pressure_plate';
  tile.walkable = true;
  tile.transparent = true;
}

function setGateClosed(tile: Tile) {
  tile.type = 'gate_closed';
  tile.walkable = false;
  tile.transparent = false;
}

function setGateOpen(tile: Tile) {
  tile.type = 'gate_open';
  tile.walkable = true;
  tile.transparent = true;
}

function tileFreeForCrate(dungeon: DungeonState, x: number, y: number, ignoreCrateId?: string): boolean {
  const t = dungeon.tiles[y]?.[x];
  if (!t) return false;
  if (t.type === 'pit') return true; // can drop into pit
  if (!t.walkable) return false;
  if (t.type === 'stairs_down' || t.type === 'shop' || t.type === 'checkpoint') return false;
  if (t.type === 'gate_closed') return false;
  const crates = dungeon.crates || [];
  for (const c of crates) {
    if (c.broken) continue;
    if (ignoreCrateId && c.id === ignoreCrateId) continue;
    if (Math.floor(c.x) === x && Math.floor(c.y) === y) return false;
  }
  return true;
}

/** Prefer a quiet corner in a nearby room — not glued to the pit/plate. */
function findHiddenCrateSpot(
  tiles: Tile[][],
  rooms: Room[],
  near: { x: number; y: number },
  used: Set<string>,
  rng: PuzzleRng
): { x: number; y: number } | null {
  const scored: Array<{ x: number; y: number; score: number }> = [];
  for (const room of rooms) {
    for (let ry = room.y + 1; ry < room.y + room.h - 1; ry++) {
      for (let rx = room.x + 1; rx < room.x + room.w - 1; rx++) {
        const key = `${rx},${ry}`;
        if (used.has(key)) continue;
        if (!isFloorish(tiles[ry]?.[rx])) continue;
        // Prefer corners / edges so it reads as scenery
        const edge =
          rx === room.x + 1 ||
          rx === room.x + room.w - 2 ||
          ry === room.y + 1 ||
          ry === room.y + room.h - 2;
        if (!edge) continue;
        const dist = Math.hypot(rx - near.x, ry - near.y);
        if (dist < 3 || dist > 18) continue;
        scored.push({ x: rx, y: ry, score: dist + (edge ? 0 : 4) + rng() });
      }
    }
  }
  if (!scored.length) return null;
  scored.sort((a, b) => a.score - b.score);
  const pick = scored[Math.min(scored.length - 1, Math.floor(rng() * Math.min(5, scored.length)))];
  return { x: pick.x, y: pick.y };
}

/** Find a short corridor run between rooms suitable for a pit. */
function findCorridorPitSpot(
  tiles: Tile[][],
  rooms: Room[],
  rng: PuzzleRng
): { pit: { x: number; y: number }; crate: { x: number; y: number }; axis: 'h' | 'v' } | null {
  const candidates: Array<{ pit: { x: number; y: number }; crate: { x: number; y: number }; axis: 'h' | 'v' }> =
    [];
  const h = tiles.length;
  const w = tiles[0]?.length || 0;
  const inRoom = (x: number, y: number) =>
    rooms.some(r => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);

  for (let y = 2; y < h - 2; y++) {
    for (let x = 2; x < w - 2; x++) {
      if (!isFloorish(tiles[y][x]) || inRoom(x, y)) continue;
      // Horizontal corridor: walkable left+right, walls above/below
      const horiz =
        isFloorish(tiles[y][x - 1]) &&
        isFloorish(tiles[y][x + 1]) &&
        !tiles[y - 1][x].walkable &&
        !tiles[y + 1][x].walkable;
      const vert =
        isFloorish(tiles[y - 1][x]) &&
        isFloorish(tiles[y + 1][x]) &&
        !tiles[y][x - 1].walkable &&
        !tiles[y][x + 1].walkable;
      if (horiz && isFloorish(tiles[y][x - 2])) {
        candidates.push({ pit: { x, y }, crate: { x: x - 2, y }, axis: 'h' });
      }
      if (vert && isFloorish(tiles[y - 2][x])) {
        candidates.push({ pit: { x, y }, crate: { x, y: y - 2 }, axis: 'v' });
      }
    }
  }
  if (!candidates.length) return null;
  return candidates[Math.floor(rng() * candidates.length)];
}

function findGateAcrossCorridor(
  tiles: Tile[][],
  rooms: Room[],
  rng: PuzzleRng,
  avoid: Set<string>
): { gates: Array<{ x: number; y: number }>; plate: { x: number; y: number }; crateSpot: { x: number; y: number } } | null {
  const candidates: Array<{
    gates: Array<{ x: number; y: number }>;
    plate: { x: number; y: number };
    crateSpot: { x: number; y: number };
  }> = [];
  // Prefer mid-floor rooms (not start, not last)
  const midRooms = rooms.slice(1, Math.max(2, rooms.length - 1));
  for (const room of midRooms) {
    // Try each edge for a 1-tile corridor exit
    const edges: Array<{ gx: number; gy: number; px: number; py: number; cx: number; cy: number }> = [];
    // Bottom edge
    for (let x = room.x + 1; x < room.x + room.w - 1; x++) {
      const gy = room.y + room.h;
      if (tiles[gy]?.[x]?.walkable && tiles[gy + 1]?.[x]?.walkable) {
        edges.push({
          gx: x,
          gy,
          px: room.centerX,
          py: room.y + 2,
          cx: room.x + 2,
          cy: room.y + 2
        });
      }
    }
    // Top edge
    for (let x = room.x + 1; x < room.x + room.w - 1; x++) {
      const gy = room.y - 1;
      if (tiles[gy]?.[x]?.walkable && tiles[gy - 1]?.[x]?.walkable) {
        edges.push({
          gx: x,
          gy,
          px: room.centerX,
          py: room.y + room.h - 3,
          cx: room.x + room.w - 3,
          cy: room.y + room.h - 3
        });
      }
    }
    for (const e of edges) {
      const gKey = `${e.gx},${e.gy}`;
      if (avoid.has(gKey)) continue;
      if (!isFloorish(tiles[e.py]?.[e.px])) continue;
      if (!isFloorish(tiles[e.cy]?.[e.cx])) continue;
      candidates.push({
        gates: [{ x: e.gx, y: e.gy }],
        plate: { x: e.px, y: e.py },
        crateSpot: { x: e.cx, y: e.cy }
      });
    }
  }
  if (!candidates.length) return null;
  return candidates[Math.floor(rng() * candidates.length)];
}

/**
 * Carve puzzle props into a freshly generated dungeon.
 * `partySize` 1 → solo helper crates for button puzzles; 2+ → teamwork (no helper crate).
 */
export function placePuzzles(
  dungeon: DungeonState,
  rng: PuzzleRng,
  partySize = 1
): void {
  const tiles = dungeon.tiles;
  const rooms = dungeon.rooms;
  const crates: PuzzleCrate[] = [];
  const links: PuzzleLink[] = [];
  const used = new Set<string>();
  let crateSeq = 1;
  const solo = partySize <= 1;

  // --- 1) Crate → pit bridge (1–2 per floor) ---
  const pitCount = 1 + (rng() < 0.45 && dungeon.floor >= 3 ? 1 : 0);
  for (let i = 0; i < pitCount; i++) {
    const spot = findCorridorPitSpot(tiles, rooms, rng);
    if (!spot) break;
    const pk = `${spot.pit.x},${spot.pit.y}`;
    const ck = `${spot.crate.x},${spot.crate.y}`;
    if (used.has(pk) || used.has(ck)) continue;
    if (tiles[spot.pit.y][spot.pit.x].type !== 'floor' && tiles[spot.pit.y][spot.pit.x].type !== 'corridor') {
      continue;
    }
    setPit(tiles[spot.pit.y][spot.pit.x]);
    // Hide the crate in a nearby room corner — player must search, not trip over it
    const hidden =
      findHiddenCrateSpot(tiles, rooms, spot.pit, used, rng) ||
      (isFloorish(tiles[spot.crate.y]?.[spot.crate.x]) ? spot.crate : null);
    if (hidden) {
      const id = `crate_${dungeon.floor}_${crateSeq++}`;
      crates.push(makeCrate(id, hidden.x, hidden.y));
      links.push({
        id: `pitlink_${i}`,
        kind: 'crate_pit',
        pitTile: { ...spot.pit },
        crateId: id,
        open: false
      });
      used.add(pk);
      used.add(`${hidden.x},${hidden.y}`);
      used.add(ck);
    }
  }

  // --- 2) Pressure plate + sealed gate ---
  const gateSpot = findGateAcrossCorridor(tiles, rooms, rng, used);
  if (gateSpot) {
    for (const g of gateSpot.gates) {
      if (tiles[g.y]?.[g.x] && (tiles[g.y][g.x].type === 'floor' || tiles[g.y][g.x].type === 'corridor')) {
        setGateClosed(tiles[g.y][g.x]);
        used.add(`${g.x},${g.y}`);
      }
    }
    if (isFloorish(tiles[gateSpot.plate.y]?.[gateSpot.plate.x])) {
      setPlate(tiles[gateSpot.plate.y][gateSpot.plate.x]);
      used.add(`${gateSpot.plate.x},${gateSpot.plate.y}`);
    }
    let helperCrateId: string | undefined;
    if (solo) {
      const hidden =
        findHiddenCrateSpot(tiles, rooms, gateSpot.plate, used, rng) ||
        (isFloorish(tiles[gateSpot.crateSpot.y]?.[gateSpot.crateSpot.x]) ? gateSpot.crateSpot : null);
      if (hidden) {
        helperCrateId = `crate_${dungeon.floor}_${crateSeq++}`;
        crates.push(makeCrate(helperCrateId, hidden.x, hidden.y));
        used.add(`${hidden.x},${hidden.y}`);
      }
    }
    links.push({
      id: `gate_btn_0`,
      kind: 'button_gate',
      buttonTiles: [{ ...gateSpot.plate }],
      gateTiles: gateSpot.gates.map(g => ({ ...g })),
      requiredPresses: 1,
      crateId: helperCrateId,
      open: false,
      holdOpen: true
    });
  }

  // --- 3) Dual-plate seal (floors 4+) — multi needs two bodies; solo gets a crate weight ---
  if (dungeon.floor >= 4 && rooms.length >= 4) {
    const roomA = rooms[Math.min(2, rooms.length - 2)];
    const roomB = rooms[Math.min(3, rooms.length - 1)];
    const last = rooms[rooms.length - 1];
    // Gate at entrance to last room
    const gx = last.centerX;
    const gy = last.y - 1;
    if (tiles[gy]?.[gx]?.walkable && !used.has(`${gx},${gy}`)) {
      setGateClosed(tiles[gy][gx]);
      // Widen gate to 3 if possible
      const gates = [{ x: gx, y: gy }];
      if (tiles[gy]?.[gx - 1]?.walkable) {
        setGateClosed(tiles[gy][gx - 1]);
        gates.push({ x: gx - 1, y: gy });
      }
      if (tiles[gy]?.[gx + 1]?.walkable) {
        setGateClosed(tiles[gy][gx + 1]);
        gates.push({ x: gx + 1, y: gy });
      }
      const p1 = { x: roomA.centerX, y: roomA.y + 2 };
      const p2 = { x: roomB.centerX, y: roomB.y + 2 };
      if (isFloorish(tiles[p1.y]?.[p1.x])) setPlate(tiles[p1.y][p1.x]);
      if (isFloorish(tiles[p2.y]?.[p2.x])) setPlate(tiles[p2.y][p2.x]);
      let weightCrate: string | undefined;
      if (solo) {
        const hidden =
          findHiddenCrateSpot(tiles, rooms, p2, used, rng) ||
          (isFloorish(tiles[p2.y]?.[p2.x + 1]) ? { x: p2.x + 1, y: p2.y } : null);
        if (hidden) {
          weightCrate = `crate_${dungeon.floor}_${crateSeq++}`;
          crates.push(makeCrate(weightCrate, hidden.x, hidden.y));
          used.add(`${hidden.x},${hidden.y}`);
        }
      }
      links.push({
        id: 'dual_gate_0',
        kind: 'dual_button',
        buttonTiles: [p1, p2],
        gateTiles: gates,
        requiredPresses: 2,
        crateId: weightCrate,
        open: false,
        holdOpen: true
      });
    }
  }

  // --- 4) Timed laser gate (floors 6+) — plate opens briefly ---
  if (dungeon.floor >= 6 && rooms.length >= 3) {
    const room = rooms[Math.min(rooms.length - 2, 2)];
    const gx = room.x - 1;
    const gy = room.centerY;
    if (tiles[gy]?.[gx]?.walkable && !used.has(`${gx},${gy}`)) {
      setGateClosed(tiles[gy][gx]);
      const plate = { x: room.x + 2, y: room.centerY };
      if (isFloorish(tiles[plate.y]?.[plate.x])) {
        setPlate(tiles[plate.y][plate.x]);
        let helper: string | undefined;
        if (solo) {
          const hidden =
            findHiddenCrateSpot(tiles, rooms, plate, used, rng) ||
            (isFloorish(tiles[plate.y]?.[plate.x + 1]) ? { x: plate.x + 1, y: plate.y } : null);
          if (hidden) {
            helper = `crate_${dungeon.floor}_${crateSeq++}`;
            crates.push(makeCrate(helper, hidden.x, hidden.y));
            used.add(`${hidden.x},${hidden.y}`);
          }
        }
        links.push({
          id: 'timed_gate_0',
          kind: 'timed_gate',
          buttonTiles: [plate],
          gateTiles: [{ x: gx, y: gy }],
          requiredPresses: 1,
          crateId: helper,
          open: false,
          holdOpen: false,
          openSeconds: 3.2,
          openTimer: 0
        });
      }
    }
  }

  dungeon.crates = crates;
  dungeon.puzzleLinks = links;
}

function bodyOnTile(x: number, y: number, tx: number, ty: number): boolean {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.floor(x + ENTITY_BODY - 1e-4);
  const y1 = Math.floor(y + ENTITY_BODY - 1e-4);
  return tx >= x0 && tx <= x1 && ty >= y0 && ty <= y1;
}

function isPressed(
  dungeon: DungeonState,
  tile: { x: number; y: number },
  occupants: Array<{ x: number; y: number }>
): boolean {
  for (const o of occupants) {
    if (bodyOnTile(o.x, o.y, tile.x, tile.y)) return true;
  }
  for (const c of dungeon.crates || []) {
    if (c.broken) continue;
    if (Math.floor(c.x) === tile.x && Math.floor(c.y) === tile.y) return true;
  }
  return false;
}

function applyGateState(dungeon: DungeonState, gates: Array<{ x: number; y: number }>, open: boolean) {
  for (const g of gates) {
    const t = dungeon.tiles[g.y]?.[g.x];
    if (!t) continue;
    if (open) setGateOpen(t);
    else setGateClosed(t);
  }
}

/**
 * Evaluate pressure plates / timed gates. Call each sim frame with living player bodies.
 */
export function tickPuzzleState(
  dungeon: DungeonState,
  occupants: Array<{ x: number; y: number }>,
  dt: number,
  turn: number,
  logs: CombatLogEntry[]
): { soundEvents: string[] } {
  const soundEvents: string[] = [];
  const links = dungeon.puzzleLinks;
  if (!links || !links.length) return { soundEvents };

  for (const link of links) {
    if (link.kind === 'crate_pit') continue;

    const buttons = link.buttonTiles || [];
    let presses = 0;
    for (const b of buttons) {
      if (isPressed(dungeon, b, occupants)) presses++;
    }
    const need = link.requiredPresses || 1;
    const held = presses >= need;

    if (link.kind === 'timed_gate') {
      if (held) {
        link.openTimer = link.openSeconds || 3;
        if (!link.open) {
          link.open = true;
          applyGateState(dungeon, link.gateTiles || [], true);
          soundEvents.push('shrine');
          logs.unshift({
            id: `pz_open_${link.id}_${turn}`,
            text: '⚡ SEAL DISENGAGED — timed window open!',
            type: 'info',
            turn
          });
        }
      } else if (link.open) {
        link.openTimer = Math.max(0, (link.openTimer || 0) - dt);
        if ((link.openTimer || 0) <= 0) {
          link.open = false;
          applyGateState(dungeon, link.gateTiles || [], false);
          soundEvents.push('hit');
          logs.unshift({
            id: `pz_close_${link.id}_${turn}`,
            text: '🔒 SEAL RE-ENGAGED.',
            type: 'info',
            turn
          });
        }
      }
      continue;
    }

    // button_gate / dual_button — stay open while held (and optionally latch)
    if (held && !link.open) {
      link.open = true;
      applyGateState(dungeon, link.gateTiles || [], true);
      soundEvents.push('shrine');
      logs.unshift({
        id: `pz_open_${link.id}_${turn}`,
        text:
          link.kind === 'dual_button'
            ? '🔓 DUAL LOCK CLEARED — gate open!'
            : '🔓 PRESSURE LOCK RELEASED — gate open!',
        type: 'info',
        turn
      });
    } else if (!held && link.open && link.holdOpen !== false) {
      // Momentary: close when released (holdOpen true means stay open only while pressed)
      // Naming: holdOpen=true → must keep pressing; false was for timed
      link.open = false;
      applyGateState(dungeon, link.gateTiles || [], false);
    }
  }

  return { soundEvents };
}

/**
 * Try to push a crate one tile in the dominant move direction.
 * Returns true if a crate moved (or fell into a pit).
 */
export function tryPushCrate(
  dungeon: DungeonState,
  playerX: number,
  playerY: number,
  ix: number,
  iy: number,
  turn: number,
  logs: CombatLogEntry[]
): { pushed: boolean; soundEvents: string[] } {
  const soundEvents: string[] = [];
  if (!dungeon.crates?.length) return { pushed: false, soundEvents };
  if (Math.hypot(ix, iy) < 0.2) return { pushed: false, soundEvents };

  const dirX = Math.abs(ix) >= Math.abs(iy) ? Math.sign(ix) : 0;
  const dirY = Math.abs(iy) > Math.abs(ix) ? Math.sign(iy) : 0;
  if (dirX === 0 && dirY === 0) return { pushed: false, soundEvents };

  // Probe several cells ahead so free-move always contacts solid crates
  const pcx = playerX + ENTITY_BODY * 0.5;
  const pcy = playerY + ENTITY_BODY * 0.5;
  let crate: PuzzleCrate | undefined;
  for (const dist of [0.45, 0.75, 1.05, 1.35]) {
    const frontX = Math.floor(pcx + dirX * dist);
    const frontY = Math.floor(pcy + dirY * dist);
    crate = dungeon.crates.find(
      c => !c.broken && Math.floor(c.x) === frontX && Math.floor(c.y) === frontY
    );
    if (crate) break;
  }
  if (!crate) return { pushed: false, soundEvents };

  const nx = Math.floor(crate.x) + dirX;
  const ny = Math.floor(crate.y) + dirY;
  if (!tileFreeForCrate(dungeon, nx, ny, crate.id)) return { pushed: false, soundEvents };

  const dest = dungeon.tiles[ny]?.[nx];
  if (!dest) return { pushed: false, soundEvents };

  if (dest.type === 'pit') {
    setPitFilled(dest);
    // Crate consumed by the pit — no respawn (puzzle solved)
    dungeon.crates = dungeon.crates.filter(c => c.id !== crate!.id);
    soundEvents.push('chest');
    logs.unshift({
      id: `crate_pit_${turn}_${crate.id}`,
      text: 'Crate sealed the void — path restored.',
      type: 'info',
      turn
    });
    return { pushed: true, soundEvents };
  }

  crate.x = nx;
  crate.y = ny;
  soundEvents.push('hit');
  return { pushed: true, soundEvents };
}

/** Nearest living crate within melee reach (no mutation). */
export function nearestLivingCrate(
  dungeon: DungeonState,
  playerX: number,
  playerY: number,
  maxDist = 1.7
): { crate: PuzzleCrate; dist: number } | null {
  const living = livingCrates(dungeon);
  if (!living.length) return null;
  let best: PuzzleCrate | null = null;
  let bestD = Infinity;
  const pcx = playerX + ENTITY_BODY * 0.5;
  const pcy = playerY + ENTITY_BODY * 0.5;
  for (const c of living) {
    const ccx = Math.floor(c.x) + 0.5;
    const ccy = Math.floor(c.y) + 0.5;
    const d = Math.hypot(pcx - ccx, pcy - ccy);
    if (d <= maxDist && d < bestD) {
      best = c;
      bestD = d;
    }
  }
  return best ? { crate: best, dist: bestD } : null;
}

/** Damage a crate in melee range; breaks and schedules respawn at home. */
export function tryDamageCrate(
  dungeon: DungeonState,
  playerX: number,
  playerY: number,
  damage: number,
  turn: number,
  logs: CombatLogEntry[]
): { hit: boolean; destroyed: boolean; soundEvents: string[]; x?: number; y?: number } {
  const soundEvents: string[] = [];
  const found = nearestLivingCrate(dungeon, playerX, playerY);
  if (!found) return { hit: false, destroyed: false, soundEvents };
  const best = found.crate;

  best.hp = Math.max(0, best.hp - Math.max(1, damage));
  soundEvents.push('hit');
  if (best.hp <= 0) {
    best.broken = true;
    best.respawnIn = CRATE_RESPAWN_SEC;
    soundEvents.push('blocked');
    logs.unshift({
      id: `crate_break_${turn}_${best.id}`,
      text: 'Storage crate shattered — nano-fabricators will rebuild it.',
      type: 'info',
      turn
    });
    return { hit: true, destroyed: true, soundEvents, x: best.x, y: best.y };
  }
  return { hit: true, destroyed: false, soundEvents, x: best.x, y: best.y };
}

/** Tick broken-crate respawn timers. */
export function tickCrateRespawns(
  dungeon: DungeonState,
  dt: number,
  turn: number,
  logs: CombatLogEntry[]
): string[] {
  const soundEvents: string[] = [];
  if (!dungeon.crates?.length) return soundEvents;
  for (const c of dungeon.crates) {
    if (!c.broken) continue;
    c.respawnIn = Math.max(0, (c.respawnIn || 0) - dt);
    if ((c.respawnIn || 0) > 0) continue;
    if (!tileFreeForCrate(dungeon, c.homeX, c.homeY, c.id)) {
      c.respawnIn = 1.5;
      continue;
    }
    c.x = c.homeX;
    c.y = c.homeY;
    c.hp = c.maxHp || CRATE_MAX_HP;
    c.broken = false;
    c.respawnIn = 0;
    soundEvents.push('shrine');
    logs.unshift({
      id: `crate_respawn_${turn}_${c.id}`,
      text: 'A storage crate reassembles in the shadows.',
      type: 'info',
      turn
    });
  }
  return soundEvents;
}

/** Crate AABBs for entity hash (living only). */
export function crateBlockers(dungeon: DungeonState): Array<{ x: number; y: number; id: string }> {
  return livingCrates(dungeon).map(c => ({
    x: Math.floor(c.x) + (1 - ENTITY_BODY) * 0.5,
    y: Math.floor(c.y) + (1 - ENTITY_BODY) * 0.5,
    id: c.id
  }));
}

/** Lightweight prediction — solid crates + local push for zero-latency feel. */
export function predictMoveOnly(
  dungeon: DungeonState,
  x: number,
  y: number,
  dx: number,
  dy: number,
  speed: number,
  dt: number,
  extraBlockers: Array<{ x: number; y: number; id?: string }> = []
): { x: number; y: number } {
  const blockers = [...extraBlockers];
  let ix = dx;
  let iy = dy;
  const len = Math.hypot(ix, iy);
  if (len < 1e-6) return { x, y };
  ix /= len;
  iy /= len;

  const tryPos = (px: number, py: number) => {
    const x0 = Math.floor(px);
    const y0 = Math.floor(py);
    const x1 = Math.floor(px + ENTITY_BODY - 1e-4);
    const y1 = Math.floor(py + ENTITY_BODY - 1e-4);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (!dungeon.tiles[ty]?.[tx]?.walkable) return false;
        if (crateBlocksTile(dungeon, tx, ty)) return false;
      }
    }
    const pcx = px + ENTITY_BODY * 0.5;
    const pcy = py + ENTITY_BODY * 0.5;
    for (const b of blockers) {
      const bcx = b.x + ENTITY_BODY * 0.5;
      const bcy = b.y + ENTITY_BODY * 0.5;
      if ((pcx - bcx) ** 2 + (pcy - bcy) ** 2 < (ENTITY_BODY * 0.55) ** 2) return false;
    }
    return true;
  };

  const wantX = x + ix * speed * dt;
  const wantY = y + iy * speed * dt;
  if (tryPos(wantX, wantY)) return { x: wantX, y: wantY };
  if (tryPos(wantX, y)) return { x: wantX, y };
  if (tryPos(x, wantY)) return { x, y: wantY };

  // Blocked by crate → push locally so online prediction feels solid
  const dummyLogs: CombatLogEntry[] = [];
  const push = tryPushCrate(dungeon, x, y, ix, iy, 0, dummyLogs);
  if (push.pushed) {
    if (tryPos(wantX, wantY)) return { x: wantX, y: wantY };
    if (tryPos(wantX, y)) return { x: wantX, y };
    if (tryPos(x, wantY)) return { x, y: wantY };
  }
  return { x, y };
}
