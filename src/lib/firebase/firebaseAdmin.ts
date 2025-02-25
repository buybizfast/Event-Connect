import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

// Initialize Firebase Admin
const initializeFirebaseAdmin = () => {
  // Check if Firebase Admin is already initialized
  const apps = getApps();
  
  if (apps.length > 0) {
    return apps[0];
  }

  // If not initialized, create a new app
  let serviceAccount;
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      // Decode the Base64-encoded service account key
      const decodedKey = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf-8');
      serviceAccount = JSON.parse(decodedKey);
    }
  } catch (error) {
    console.error('Error parsing Firebase service account key:', error);
    serviceAccount = undefined;
  }

  // For development, we can use a mock service account or default credentials
  if (!serviceAccount) {
    console.warn('Firebase Admin SDK initialized without service account. Using default credentials.');
    
    // In development, initialize with project ID from env vars
    if (process.env.NODE_ENV === 'development') {
      return initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      });
    }
    
    return initializeApp();
  }

  return initializeApp({
    credential: cert(serviceAccount),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
};

// Get Firebase Admin App instance
export const getFirebaseAdminApp = () => {
  return initializeFirebaseAdmin();
};

// Get Firestore Admin instance
export const getFirestoreAdmin = () => {
  return getFirestore(getFirebaseAdminApp());
};

// Get Auth Admin instance
export const getAuthAdmin = () => {
  return getAuth(getFirebaseAdminApp());
};

// Get Storage Admin instance
export const getStorageAdmin = () => {
  return getStorage(getFirebaseAdminApp());
}; 