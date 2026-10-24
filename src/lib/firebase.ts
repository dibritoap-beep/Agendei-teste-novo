import { initializeApp } from 'firebase/app';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

export const isFirebaseConfigured = !!import.meta.env.VITE_FIREBASE_PROJECT_ID;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'mock-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'mock-domain.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'mock-project-id-12345',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'mock-bucket.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:123456789:web:123456'
};

// Ensure all config values are present
Object.entries(firebaseConfig).forEach(([key, value]) => {
  if (!value) {
    console.warn(`Missing Firebase configuration: ${key}. Ensure VITE_FIREBASE_${key.toUpperCase()} is set.`);
  }
});

const app = initializeApp(firebaseConfig);
const databaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID;

let dbInstance: any;

try {
  // Try to enable robust offline persistence so writes queue up and sync automatically
  dbInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({tabManager: persistentMultipleTabManager()})
  }, databaseId);
} catch (error) {
  console.warn("Offline persistence not supported or blocked in this environment (e.g., iframe), falling back to standard Firestore:", error);
  try {
    dbInstance = getFirestore(app, databaseId);
  } catch (err2) {
    console.error("Critical: Failed to initialize Firestore entirely, using mock instance:", err2);
    dbInstance = {
      collection: () => ({ doc: () => ({ set: () => Promise.resolve() }) }),
      doc: () => ({ set: () => Promise.resolve(), delete: () => Promise.resolve(), update: () => Promise.resolve() })
    } as any;
  }
}

export const db = dbInstance;

