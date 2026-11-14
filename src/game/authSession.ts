export interface AuthUserSnapshot {
  id: string;
  username: string;
  role: 'player' | 'moderator' | 'admin';
  login?: string;
  email?: string;
}

export interface StoredAuthSession {
  token: string;
  user: AuthUserSnapshot;
  keepSignedIn: boolean;
  savedAt: number;
}

export const AUTH_SESSION_STORAGE_KEY = 'cyber_crypt_auth_session_v1';
export const KEEP_SIGNED_IN_PREF_KEY = 'cyber_crypt_keep_signed_in_pref';

export function readKeepSignedInPref(defaultValue = true): boolean {
  try {
    const raw = localStorage.getItem(KEEP_SIGNED_IN_PREF_KEY);
    if (raw === null) return defaultValue;
    return raw === '1' || raw === 'true';
  } catch {
    return defaultValue;
  }
}

export function writeKeepSignedInPref(value: boolean) {
  try {
    localStorage.setItem(KEEP_SIGNED_IN_PREF_KEY, value ? '1' : '0');
  } catch {
    /* ignore quota */
  }
}

export function loadStoredAuthSession(): StoredAuthSession | null {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAuthSession;
    if (!parsed?.token || !parsed?.user?.id || !parsed.keepSignedIn) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveAuthSession(
  token: string,
  user: AuthUserSnapshot,
  keepSignedIn: boolean
) {
  writeKeepSignedInPref(keepSignedIn);
  try {
    if (!keepSignedIn) {
      localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
      return;
    }
    const payload: StoredAuthSession = {
      token,
      user,
      keepSignedIn: true,
      savedAt: Date.now()
    };
    localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore quota */
  }
}

export function clearAuthSession() {
  try {
    localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
