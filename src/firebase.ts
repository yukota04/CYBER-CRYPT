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

export async function signInWithGoogleNativeMobile(): Promise<User | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (err: any) {
    const code = err?.code || '';
    // On strict mobile in-app WebViews where popups are blocked, fall back to native redirect flow
    if (
      code === 'auth/popup-blocked' ||
      code === 'auth/operation-not-supported-in-this-environment'
    ) {
      await signInWithRedirect(auth, googleProvider);
      return null;
    }
    throw err;
  }
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
