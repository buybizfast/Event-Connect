import { initializeApp, getApps } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
function initFirebase() {
  if (getApps().length === 0) {
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    const storage = getStorage(app);

    // Connect to emulators in development mode
    if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true') {
      // Auth emulator typically runs on port 9099
      connectAuthEmulator(auth, 'http://localhost:9099');
      
      // Firestore emulator typically runs on port 8080
      connectFirestoreEmulator(db, 'localhost', 8080);
      
      // Storage emulator typically runs on port 9199
      connectStorageEmulator(storage, 'localhost', 9199);
      
      console.log('Connected to Firebase emulators');
    }

    return { app, auth, db, storage };
  }
  
  return {
    app: getApps()[0],
    auth: getAuth(),
    db: getFirestore(),
    storage: getStorage(),
  };
}

export const { app, auth, db, storage } = initFirebase();

// Export a function to check if Firebase is initialized
export const isFirebaseInitialized = () => getApps().length > 0; 