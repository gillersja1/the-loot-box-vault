import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';

const useEmulators = import.meta.env.VITE_USE_EMULATORS === 'true';

// Firebase web config is public by design; access is enforced by firestore.rules.
const config = useEmulators
  ? { apiKey: 'demo-key', authDomain: 'localhost', projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'demo-loot-box-vault', appId: 'demo-app' }
  : {
      apiKey: 'AIzaSyBCRbYQ0s4VUOtIuZgoLuRmAzgW5VHka0A',
      authDomain: 'the-loot-box-vault.firebaseapp.com',
      projectId: 'the-loot-box-vault',
      storageBucket: 'the-loot-box-vault.firebasestorage.app',
      messagingSenderId: '73102310027',
      appId: '1:73102310027:web:77a2972b4f9b2852afb28e',
    };

export const app = initializeApp(config);
export const auth = getAuth(app);
export const db = getFirestore(app);

if (useEmulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}
