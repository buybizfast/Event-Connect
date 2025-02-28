import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  User,
  updateProfile,
  OAuthProvider,
  sendEmailVerification,
  EmailAuthProvider,
  sendPasswordResetEmail,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { auth, db } from './firebase';

interface UserProfile {
  id?: string;
  displayName: string;
  email: string;
  company: string;
  title: string;
  bio?: string;
  website?: string;
  twitter?: string;
  interests: string[];
  photoURL?: string;
  skills?: string[];
  positions?: Array<{
    title: string;
    company: string;
    startDate: string;
    endDate?: string;
    description?: string;
  }>;
  isVerified?: boolean;
  eventbriteToken?: string;
  eventbriteRefreshToken?: string;
  eventbriteTokenExpiry?: number;
  eventbriteOrganizationId?: string;
}

export const signUp = async (
  email: string,
  password: string,
  profile: Partial<UserProfile>
) => {
  try {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    
    try {
      await updateProfile(user, { displayName: profile.displayName });
    } catch (error) {
      console.error("Error updating user profile:", error);
      // Continue even if updateProfile fails
    }
    
    try {
      await createUserProfile(user.uid, {
        displayName: profile.displayName || '',
        email: user.email!,
        company: profile.company || '',
        title: profile.title || '',
        interests: [],
        skills: [],
        positions: [],
        isVerified: false // Set initial verification status to false
      });
    } catch (error) {
      console.error("Error creating user profile in Firestore:", error);
      // Continue even if Firestore update fails
    }
    
    // Send email verification
    try {
      await sendEmailVerification(user);
    } catch (error) {
      console.error("Error sending verification email:", error);
      // Continue even if email verification fails
    }
    
    return user;
  } catch (error) {
    console.error("Error in signUp:", error);
    throw error;
  }
};

export const signIn = async (email: string, password: string) => {
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  return user;
};

export const signOut = () => firebaseSignOut(auth);

export const signInWithGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider();
    // Add select_account to force account selection each time
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    
    // Use redirect instead of popup to avoid CSP issues
    await signInWithRedirect(auth, provider);
    return null; // This function will not return a user directly due to redirect
  } catch (error: any) {
    console.error('Google sign-in error:', error);
    throw error;
  }
};

// Function to handle redirect result
export const handleAuthRedirectResult = async (): Promise<User | null> => {
  try {
    const result = await getRedirectResult(auth);
    if (!result) {
      return null;
    }
    
    const user = result.user;
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    
    if (!userDoc.exists()) {
      await createUserProfile(user.uid, {
        displayName: user.displayName || '',
        email: user.email!,
        company: '',
        title: '',
        interests: [],
        skills: [],
        positions: []
      });
    }
    
    return user;
  } catch (error: any) {
    if (error.code === 'auth/popup-closed-by-user') {
      console.log('Sign-in was cancelled');
      return null;
    }
    console.error('Error handling auth redirect result:', error);
    throw error;
  }
};

export const signInWithGitHub = async () => {
  try {
    const provider = new GithubAuthProvider();
    // Use redirect instead of popup to avoid CSP issues
    await signInWithRedirect(auth, provider);
    return null; // This function will not return a user directly due to redirect
  } catch (error: any) {
    console.error('GitHub sign-in error:', error);
    throw error;
  }
};

export const createUserProfile = async (userId: string, profile: Partial<UserProfile>) => {
  try {
    // Ensure all required fields are present with default values
    const userProfile: UserProfile = {
      displayName: profile.displayName || '',
      email: profile.email || '',
      company: profile.company || '',
      title: profile.title || '',
      interests: profile.interests || [],
      bio: profile.bio || '',  // Default to empty string instead of undefined
      website: profile.website || '',  // Default to empty string instead of undefined
      twitter: profile.twitter || '',  // Default to empty string instead of undefined
      photoURL: profile.photoURL || '',  // Default to empty string instead of undefined
      skills: profile.skills || [],
      positions: profile.positions || [],
      isVerified: profile.isVerified || false,
      // Add Eventbrite fields as undefined
      eventbriteToken: undefined,
      eventbriteRefreshToken: undefined,
      eventbriteTokenExpiry: undefined,
      eventbriteOrganizationId: undefined
    };
    
    await setDoc(doc(db, 'users', userId), userProfile);
  } catch (error) {
    console.error("Error in createUserProfile:", error);
    throw error;
  }
};

export const updateUserProfile = async (userId: string, profileData: Partial<UserProfile>) => {
  if (!userId) {
    throw new Error('User ID is required');
  }
  
  await updateDoc(doc(db, 'users', userId), profileData);
  return { id: userId, ...profileData };
};

export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  const docRef = doc(db, 'users', userId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? (docSnap.data() as UserProfile) : null;
};

export const findUsersByInterests = async (interests: string[]) => {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('interests', 'array-contains-any', interests));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));
};

export const getUserIdToken = async (): Promise<string | null> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn('No user is currently signed in');
      return null;
    }
    
    return await currentUser.getIdToken();
  } catch (error) {
    console.error('Error getting user ID token:', error);
    return null;
  }
};

/**
 * Get a user document from Firestore by user ID
 * @param userId The user ID
 * @returns The user document data or null if not found
 */
export async function getUserDocument(userId: string) {
  try {
    const userDoc = doc(db, 'users', userId);
    const userSnapshot = await getDoc(userDoc);
    
    if (userSnapshot.exists()) {
      return userSnapshot.data();
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user document:', error);
    return null;
  }
}

// Check if user's email is verified
export const isEmailVerified = (user: User | null): boolean => {
  return user?.emailVerified || false;
};

// Resend verification email
export const resendVerificationEmail = async (user: User): Promise<void> => {
  try {
    await sendEmailVerification(user);
  } catch (error) {
    console.error("Error resending verification email:", error);
    
    // Check if this is a rate limiting error
    const errorMessage = String(error);
    if (errorMessage.includes('auth/too-many-requests')) {
      throw new Error('You have requested too many verification emails. Please wait a while before trying again.');
    }
    
    throw error;
  }
};

// Update user verification status in Firestore
export const updateUserVerificationStatus = async (userId: string, isVerified: boolean): Promise<void> => {
  try {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
      isVerified,
      verifiedAt: isVerified ? new Date().toISOString() : null
    });
  } catch (error) {
    console.error("Error updating user verification status:", error);
    throw error;
  }
};
