import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Global variables to store Firebase instances
let firebaseApp: FirebaseApp | undefined;
let firestoreDb: Firestore | undefined;

// Initialize Firebase for Edge runtime
export function initEdgeFirebase() {
  try {
    // Check if Firebase is already initialized
    if (firebaseApp) {
      return { app: firebaseApp, db: firestoreDb! };
    }
    
    // Initialize Firebase app
    firebaseApp = initializeApp(firebaseConfig, 'edge-app');
    
    // Initialize Firestore with specific settings for Edge
    firestoreDb = getFirestore(firebaseApp);
    
    return { app: firebaseApp, db: firestoreDb };
  } catch (error) {
    console.error('Error initializing Firebase for Edge:', error);
    throw error;
  }
}

// Export a function to get Firebase instances
export function getEdgeFirebase() {
  if (!firebaseApp || !firestoreDb) {
    return initEdgeFirebase();
  }
  return { app: firebaseApp, db: firestoreDb };
} 