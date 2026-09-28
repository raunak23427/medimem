import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, type Auth } from 'firebase/auth';
import { initializeFirestore, connectFirestoreEmulator, persistentLocalCache, persistentMultipleTabManager, type Firestore } from 'firebase/firestore';
import { getStorage, connectStorageEmulator, type FirebaseStorage } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator, type Functions } from 'firebase/functions';
import { firebaseConfig, functionsRegion, useEmulators } from './env';

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _storage: FirebaseStorage | null = null;
let _functions: Functions | null = null;
let _emulatorsConnected = false;

function ensureApp(): FirebaseApp {
  if (_app) return _app;
  _app = getApps()[0] ?? initializeApp(firebaseConfig as Record<string, string>);
  return _app;
}

export function getFirebaseAuth(): Auth {
  if (_auth) return _auth;
  _auth = getAuth(ensureApp());
  maybeConnectEmulators();
  return _auth;
}

export function getDb(): Firestore {
  if (_db) return _db;
  _db = initializeFirestore(ensureApp(), {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
  maybeConnectEmulators();
  return _db;
}

export function getFirebaseStorage(): FirebaseStorage {
  if (_storage) return _storage;
  _storage = getStorage(ensureApp());
  maybeConnectEmulators();
  return _storage;
}

export function getFirebaseFunctions(): Functions {
  if (_functions) return _functions;
  _functions = getFunctions(ensureApp(), functionsRegion);
  maybeConnectEmulators();
  return _functions;
}

function maybeConnectEmulators(): void {
  if (!useEmulators || _emulatorsConnected) return;
  _emulatorsConnected = true;
  try {
    if (_auth) connectAuthEmulator(_auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    if (_db) connectFirestoreEmulator(_db, '127.0.0.1', 8080);
    if (_storage) connectStorageEmulator(_storage, '127.0.0.1', 9199);
    if (_functions) connectFunctionsEmulator(_functions, '127.0.0.1', 5001);
    // eslint-disable-next-line no-console
    console.info('[firebase] connected to local emulators');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[firebase] emulator connect failed', err);
  }
}
