import { db, auth, storage, isFirebaseInitialized } from './firebase';
import { collection, getDocs, limit, query } from 'firebase/firestore';
import { ref, listAll } from 'firebase/storage';

/**
 * Checks if Firebase is properly initialized and connected
 * @returns An object with the status of each Firebase service
 */
export async function checkFirebaseConnection(): Promise<{
  initialized: boolean;
  firestoreConnected: boolean;
  authInitialized: boolean;
  storageConnected: boolean;
  errors: Record<string, string>;
}> {
  const result = {
    initialized: false,
    firestoreConnected: false,
    authInitialized: false,
    storageConnected: false,
    errors: {} as Record<string, string>
  };

  // Check if Firebase is initialized
  try {
    result.initialized = isFirebaseInitialized();
    if (!result.initialized) {
      result.errors.initialization = 'Firebase is not initialized';
      return result;
    }
  } catch (error: any) {
    result.errors.initialization = `Firebase initialization error: ${error.message}`;
    return result;
  }

  // Check Firestore connection
  try {
    const eventsRef = collection(db, 'events');
    const q = query(eventsRef, limit(1));
    await getDocs(q);
    result.firestoreConnected = true;
  } catch (error: any) {
    result.errors.firestore = `Firestore connection error: ${error.message}`;
  }

  // Check Auth initialization
  try {
    result.authInitialized = !!auth;
  } catch (error: any) {
    result.errors.auth = `Auth initialization error: ${error.message}`;
  }

  // Check Storage connection
  try {
    const storageRef = ref(storage);
    await listAll(storageRef);
    result.storageConnected = true;
  } catch (error: any) {
    result.errors.storage = `Storage connection error: ${error.message}`;
  }

  return result;
}

/**
 * Logs Firebase connection status to the console
 */
export async function logFirebaseStatus(): Promise<void> {
  console.log('Checking Firebase connection...');
  const status = await checkFirebaseConnection();
  
  console.log('Firebase Status:');
  console.log(`- Initialized: ${status.initialized ? '✅' : '❌'}`);
  console.log(`- Firestore Connected: ${status.firestoreConnected ? '✅' : '❌'}`);
  console.log(`- Auth Initialized: ${status.authInitialized ? '✅' : '❌'}`);
  console.log(`- Storage Connected: ${status.storageConnected ? '✅' : '❌'}`);
  
  if (Object.keys(status.errors).length > 0) {
    console.log('Firebase Errors:');
    Object.entries(status.errors).forEach(([service, error]) => {
      console.error(`- ${service}: ${error}`);
    });
  }
} 