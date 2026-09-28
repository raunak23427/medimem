const env = import.meta.env;

export const isFirebaseConfigured: boolean = Boolean(
  env.VITE_FIREBASE_API_KEY &&
  env.VITE_FIREBASE_PROJECT_ID &&
  env.VITE_FIREBASE_APP_ID,
);

// When Firebase is not configured, the app runs in local test mode:
// in-memory state, direct HF API calls, no persistence between page refreshes.
export const isLocalMode: boolean = !isFirebaseConfigured;

// HF token used only in local test mode — never set this in production builds.
export const hfApiKey: string = (env.VITE_HF_API_KEY as string) || '';

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY as string,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: env.VITE_FIREBASE_APP_ID as string,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID as string | undefined,
};

export const functionsRegion = (env.VITE_FIREBASE_REGION as string) || 'us-central1';

export const useEmulators: boolean = env.VITE_USE_EMULATORS === 'true';
