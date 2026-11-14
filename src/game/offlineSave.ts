import {
  CharacterClass,
  CheckpointSnapshot,
  CombatLogEntry,
  DifficultyMode,
  DungeonState,
  Player
} from './types';

export const OFFLINE_SAVE_STORAGE_KEY = 'cyber_crypt_offline_save_v1';

export type OfflineSaveSlotKey = `${DifficultyMode}_${CharacterClass}`;

export function getOfflineSaveSlotKey(
  difficulty: DifficultyMode = 'normal',
  characterClass: CharacterClass = 'striker'
): OfflineSaveSlotKey {
  return `${difficulty}_${characterClass}`;
}

export function getOfflineSaveStorageKey(
  difficulty: DifficultyMode = 'normal',
  characterClass: CharacterClass = 'striker'
): string {
  return `${OFFLINE_SAVE_STORAGE_KEY}_${difficulty}_${characterClass}`;
}

export interface OfflineSaveState {
  version: 1;
  savedAt: number;
  difficultyMode: DifficultyMode;
  player: Player;
  dungeon: DungeonState;
  turn: number;
  score: number;
  monstersSlain: number;
  combatLogs: CombatLogEntry[];
  checkpointSnapshot: CheckpointSnapshot | null;
}

export function loadOfflineSave(
  difficulty: DifficultyMode = 'normal',
  characterClass: CharacterClass = 'striker'
): OfflineSaveState | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = window.localStorage.getItem(getOfflineSaveStorageKey(difficulty, characterClass));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OfflineSaveState;
    if (
      !parsed ||
      parsed.version !== 1 ||
      parsed.difficultyMode !== difficulty ||
      !parsed.player ||
      parsed.player.characterClass !== characterClass ||
      !parsed.dungeon ||
      !Array.isArray(parsed.dungeon.tiles)
    ) {
      return null;
    }
    if (!Array.isArray(parsed.dungeon.deathDrops)) {
      parsed.dungeon.deathDrops = [];
    }
    if (!Array.isArray(parsed.dungeon.groundCoins)) {
      parsed.dungeon.groundCoins = [];
    }
    if (!Array.isArray(parsed.dungeon.checkpoints)) {
      parsed.dungeon.checkpoints = [];
    }
    return parsed;
  } catch {
    return null;
  }
}

export function loadAllOfflineSaves(): Record<OfflineSaveSlotKey, OfflineSaveState | null> {
  return {
    normal_striker: loadOfflineSave('normal', 'striker'),
    normal_technomancer: loadOfflineSave('normal', 'technomancer'),
    normal_vanguard: loadOfflineSave('normal', 'vanguard'),
    hard_striker: loadOfflineSave('hard', 'striker'),
    hard_technomancer: loadOfflineSave('hard', 'technomancer'),
    hard_vanguard: loadOfflineSave('hard', 'vanguard')
  };
}

export function saveOfflineRun(state: Omit<OfflineSaveState, 'version' | 'savedAt'>): OfflineSaveState | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const payload: OfflineSaveState = {
      version: 1,
      savedAt: Date.now(),
      ...state,
      combatLogs: (state.combatLogs || []).slice(0, 30)
    };
    const key = getOfflineSaveStorageKey(state.difficultyMode, state.player.characterClass);
    window.localStorage.setItem(key, JSON.stringify(payload));
    return payload;
  } catch {
    return null;
  }
}

export function clearOfflineSave(
  difficulty: DifficultyMode = 'normal',
  characterClass: CharacterClass = 'striker'
): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.removeItem(getOfflineSaveStorageKey(difficulty, characterClass));
  } catch {
    // Ignore storage quota / privacy mode errors
  }
}
