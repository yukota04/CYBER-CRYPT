import { DungeonState, Tile } from './types';

export interface MinimapStats {
  exploredPercent: number;
  totalWalkable: number;
  exploredWalkable: number;
  visibleMonstersCount: number;
  hasStairsFound: boolean;
  hasShopFound: boolean;
}

/**
 * Calculates dynamic exploration statistics from current dungeon state.
 */
export function calculateMinimapStats(dungeon: DungeonState): MinimapStats {
  let totalWalkable = 0;
  let exploredWalkable = 0;
  let hasStairsFound = false;
  let hasShopFound = false;

  for (let y = 0; y < dungeon.height; y++) {
    for (let x = 0; x < dungeon.width; x++) {
      const tile = dungeon.tiles[y][x];
      if (tile.walkable) {
        totalWalkable++;
        if (tile.explored) {
          exploredWalkable++;
        }
      }
      if (tile.type === 'stairs_down' && tile.explored) {
        hasStairsFound = true;
      }
      if (tile.type === 'shop' && tile.explored) {
        hasShopFound = true;
      }
    }
  }

  const exploredPercent = totalWalkable > 0 
    ? Math.min(100, Math.round((exploredWalkable / totalWalkable) * 100)) 
    : 0;

  const visibleMonstersCount = dungeon.monsters.filter(
    m => dungeon.tiles[m.y]?.[m.x]?.visible
  ).length;

  return {
    exploredPercent,
    totalWalkable,
    exploredWalkable,
    visibleMonstersCount,
    hasStairsFound,
    hasShopFound
  };
}

/**
 * Maps tile type to minimap representation color.
 */
export function getMinimapTileColor(tile: Tile): string | null {
  if (!tile.explored) return null; // Invisible

  if (tile.type === 'wall') {
    return tile.visible ? '#362168' : '#1b1238';
  }

  if (tile.type === 'stairs_down') {
    return '#ffe600'; // Gold stairs
  }

  if (tile.type === 'shop') {
    return '#ff00aa'; // Pink shop beacon
  }

  if (tile.type === 'chest') {
    return '#f59e0b'; // Amber chest
  }

  if (tile.type === 'shrine') {
    return '#00f0ff'; // Cyan shrine
  }

  if (tile.type === 'checkpoint') {
    return tile.checkpointActivated ? '#10b981' : '#f59e0b'; // Emerald active or amber dormant checkpoint
  }

  if (tile.hazard && tile.visible) {
    return '#ff0055'; // Red hazard
  }

  // Walkable floor / corridor
  return tile.visible ? '#152347' : '#0c1124';
}
