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

const LOCAL_SAVE_DEBOUNCE_MS = 2000;
let pendingLocalSave: {
  state: Omit<OfflineSaveState, 'version' | 'savedAt'>;
  timer: ReturnType<typeof setTimeout>;
} | null = null;

/** Immediate localStorage write (game over / explicit flush). Truncates combat log to 100. */
export function saveOfflineRun(state: Omit<OfflineSaveState, 'version' | 'savedAt'>): OfflineSaveState | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const payload: OfflineSaveState = {
      version: 1,
      savedAt: Date.now(),
      ...state,
      combatLogs: (state.combatLogs || []).slice(0, 100)
    };
    const key = getOfflineSaveStorageKey(state.difficultyMode, state.player.characterClass);
    window.localStorage.setItem(key, JSON.stringify(payload));
    queueCloudRunPush(payload);
    return payload;
  } catch {
    return null;
  }
}

/**
 * Debounced persist during play — coalesces rapid player/dungeon React updates
 * into one localStorage write every ~2s (avoids 5–15ms blocking every turn).
 */
export function scheduleSaveOfflineRun(
  state: Omit<OfflineSaveState, 'version' | 'savedAt'>,
  delayMs = LOCAL_SAVE_DEBOUNCE_MS
): void {
  if (pendingLocalSave) {
    pendingLocalSave.state = state;
    return;
  }
  pendingLocalSave = {
    state,
    timer: setTimeout(() => {
      const pending = pendingLocalSave;
      pendingLocalSave = null;
      if (pending) saveOfflineRun(pending.state);
    }, delayMs)
  };
}

/** Flush any debounced local save now (tab hide / unload / leave run). */
export function flushScheduledOfflineSave(): OfflineSaveState | null {
  if (!pendingLocalSave) return null;
  clearTimeout(pendingLocalSave.timer);
  const state = pendingLocalSave.state;
  pendingLocalSave = null;
  return saveOfflineRun(state);
}

export function clearOfflineSave(
  difficulty: DifficultyMode = 'normal',
  characterClass: CharacterClass = 'striker'
): void {
  if (pendingLocalSave) {
    const pendingClass = pendingLocalSave.state.player.characterClass;
    const pendingDiff = pendingLocalSave.state.difficultyMode;
    if (pendingClass === characterClass && pendingDiff === difficulty) {
      clearTimeout(pendingLocalSave.timer);
      pendingLocalSave = null;
    }
  }
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.removeItem(getOfflineSaveStorageKey(difficulty, characterClass));
  } catch {
    // Ignore storage quota / privacy mode errors
  }
  queueCloudRunDelete(getOfflineSaveSlotKey(difficulty, characterClass));
}

// ----------------------------------------------------
// Cloud mirror (Neon Postgres via /api/saves/runs) for signed-in players.
// localStorage stays the source of truth while playing; the server copy means
// progress survives a new device, a cleared browser, or a redeploy.
// ----------------------------------------------------
const CLOUD_PUSH_DEBOUNCE_MS = 4000;
let cloudToken = '';
const pendingPush = new Map<OfflineSaveSlotKey, { save: OfflineSaveState; timer: ReturnType<typeof setTimeout> }>();

export function setCloudRunSyncToken(token: string | null | undefined) {
  const next = token || '';
  if (cloudToken && next !== cloudToken) flushCloudRunPushes();
  cloudToken = next;
  if (!cloudToken) {
    for (const p of pendingPush.values()) clearTimeout(p.timer);
    pendingPush.clear();
  }
}

function canSync() {
  return !!cloudToken && typeof window !== 'undefined' && typeof fetch === 'function';
}

function sendRunPush(slot: OfflineSaveSlotKey, save: OfflineSaveState, keepalive = false) {
  if (!canSync()) return Promise.resolve();
  let body: string;
  try {
    body = JSON.stringify({ save });
  } catch {
    return Promise.resolve();
  }
  return fetch(`/api/saves/runs/${slot}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cloudToken}` },
    body,
    keepalive: keepalive && body.length < 60_000
  })
    .then(() => undefined)
    .catch(() => undefined);
}

function queueCloudRunPush(save: OfflineSaveState) {
  if (!canSync()) return;
  const slot = getOfflineSaveSlotKey(save.difficultyMode, save.player.characterClass);
  const existing = pendingPush.get(slot);
  if (existing) {
    existing.save = save;
    return;
  }
  const entry = {
    save,
    timer: setTimeout(() => {
      pendingPush.delete(slot);
      void sendRunPush(slot, entry.save);
    }, CLOUD_PUSH_DEBOUNCE_MS)
  };
  pendingPush.set(slot, entry);
}

/** Push any debounced saves right now (e.g. on tab hide / page unload). */
export function flushCloudRunPushes() {
  for (const [slot, p] of pendingPush) {
    clearTimeout(p.timer);
    void sendRunPush(slot, p.save, true);
  }
  pendingPush.clear();
}

function queueCloudRunDelete(slot: OfflineSaveSlotKey) {
  const pending = pendingPush.get(slot);
  if (pending) {
    clearTimeout(pending.timer);
    pendingPush.delete(slot);
  }
  if (!canSync()) return;
  fetch(`/api/saves/runs/${slot}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${cloudToken}` }
  }).catch(() => undefined);
}

/**
 * Merge server-side run saves with local ones: newer wins per slot.
 * Server-newer saves are written to localStorage; local-newer ones are pushed up.
 */
export async function pullAndMergeCloudRuns(): Promise<boolean> {
  if (!canSync()) return false;
  try {
    const res = await fetch('/api/saves/runs', { headers: { Authorization: `Bearer ${cloudToken}` } });
    if (!res.ok) return false;
    const data = (await res.json()) as { runs?: Record<string, OfflineSaveState> };
    const remote = data.runs || {};
    const local = loadAllOfflineSaves();
    let changed = false;
    for (const slot of Object.keys(local) as OfflineSaveSlotKey[]) {
      const r = remote[slot];
      const l = local[slot];
      if (r && r.version === 1 && (!l || (r.savedAt || 0) > (l.savedAt || 0))) {
        try {
          window.localStorage.setItem(
            getOfflineSaveStorageKey(r.difficultyMode, r.player.characterClass),
            JSON.stringify(r)
          );
          changed = true;
        } catch {
          // quota
        }
      } else if (l && (!r || (l.savedAt || 0) > (r.savedAt || 0))) {
        void sendRunPush(slot, l);
      }
    }
    return changed;
  } catch {
    return false;
  }
}
