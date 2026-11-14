import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  getRedirectResult,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write'
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map(provider => ({
          providerId: provider.providerId,
          email: provider.email
        })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testFirestoreConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

function isLikelyMobileClient(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768 || 'ontouchstart' in window || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

/** Stable server id for a Firebase Google user (must match server.ts goog_ prefix). */
export function googleServerUserId(uid: string): string {
  return `goog_${uid.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 48)}`;
}

/**
 * Sign in with Google. Prefers redirect on mobile (popup often hangs after account picker).
 * Returns null when a redirect navigation was started (page will reload).
 */
export async function signInWithGoogleNativeMobile(): Promise<User | null> {
  // Already authenticated — caller can finalize without opening another picker hang.
  if (auth.currentUser) {
    return auth.currentUser;
  }

  if (isLikelyMobileClient()) {
    await signInWithRedirect(auth, googleProvider);
    return null;
  }

  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (err: any) {
    const code = err?.code || '';
    if (
      code === 'auth/popup-blocked' ||
      code === 'auth/operation-not-supported-in-this-environment' ||
      code === 'auth/cancelled-popup-request'
    ) {
      await signInWithRedirect(auth, googleProvider);
      return null;
    }
    throw err;
  }
}

/**
 * Wait until Firebase reports a signed-in user (covers hung popups where
 * onAuthStateChanged updates but signInWithPopup never resolves).
 */
export function waitForFirebaseUser(timeoutMs = 90000): Promise<User | null> {
  return new Promise(resolve => {
    if (auth.currentUser) {
      resolve(auth.currentUser);
      return;
    }
    let settled = false;
    const finish = (user: User | null) => {
      if (settled) return;
      settled = true;
      clearInterval(poll);
      clearTimeout(timer);
      unsub();
      resolve(user);
    };
    const unsub = onAuthStateChanged(auth, user => {
      if (user) finish(user);
    });
    const poll = window.setInterval(() => {
      if (auth.currentUser) finish(auth.currentUser);
    }, 400);
    const timer = window.setTimeout(() => finish(auth.currentUser), timeoutMs);
  });
}

export async function checkGoogleRedirectSignIn(): Promise<User | null> {
  try {
    const result = await getRedirectResult(auth);
    return result?.user || null;
  } catch {
    return null;
  }
}

export async function syncFirebaseUserProfile(
  user: User,
  highestFloor = 1,
  bestScore = 0
): Promise<void> {
  if (!user.uid || !user.emailVerified) return;
  const uid = user.uid.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
  const path = `userProfiles/${uid}`;
  const ref = doc(db, 'userProfiles', uid);
  const safeName = (user.displayName || user.email?.split('@')[0] || 'Operative').trim().slice(0, 64) || 'Operative';
  const safePhoto = user.photoURL && user.photoURL.length <= 512 ? user.photoURL : undefined;

  try {
    const existingSnap = await getDoc(ref);
    if (!existingSnap.exists()) {
      const payload: Record<string, any> = {
        uid,
        displayName: safeName,
        highestFloor: Math.max(1, Math.min(9999, Math.floor(highestFloor))),
        bestScore: Math.max(0, Math.min(1000000000, Math.floor(bestScore))),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      if (safePhoto) payload.photoURL = safePhoto;
      await setDoc(ref, payload);
    } else {
      const prev = existingSnap.data();
      const payload: Record<string, any> = {
        uid,
        displayName: safeName,
        highestFloor: Math.max(Number(prev?.highestFloor) || 1, Math.floor(highestFloor)),
        bestScore: Math.max(Number(prev?.bestScore) || 0, Math.floor(bestScore)),
        createdAt: prev?.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      if (safePhoto) payload.photoURL = safePhoto;
      await setDoc(ref, payload);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function signOutFirebaseUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch {
    // Ignore if already signed out or offline
  }
}

export { onAuthStateChanged };
