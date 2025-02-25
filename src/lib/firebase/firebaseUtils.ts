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
  linkedin?: string;
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
  linkedinProfile?: {
    id: string;
    firstName: string;
    lastName: string;
    name?: string;
    profilePicture?: string;
    headline?: string;
    summary?: string;
    industry?: string;
    location?: string;
    positions?: Array<{
      title: string;
      company: string;
      startDate: string;
      endDate?: string;
      description?: string;
    }>;
  };
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
        positions: []
      });
    } catch (error) {
      console.error("Error creating user profile in Firestore:", error);
      // Continue even if Firestore update fails
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

export const signInWithLinkedIn = async () => {
  try {
    console.log('Starting LinkedIn sign-in process');
    
    // Check if LinkedIn client ID is configured
    if (!process.env.NEXT_PUBLIC_LINKEDIN_CLIENT_ID) {
      console.error('LinkedIn Client ID is not configured');
      throw new Error('LinkedIn authentication is not properly configured');
    }
    
    // Instead of using Firebase's OAuthProvider, redirect to our custom API route
    window.location.href = '/api/linkedin/auth';
    return null;
  } catch (error: any) {
    console.error('LinkedIn sign-in error:', error);
    throw error;
  }
};

export const createUserProfile = async (userId: string, profile: Partial<UserProfile>) => {
  try {
    // Ensure all required fields are present
    const userProfile: UserProfile = {
      displayName: profile.displayName || '',
      email: profile.email || '',
      company: profile.company || '',
      title: profile.title || '',
      interests: profile.interests || [],
      bio: profile.bio,
      website: profile.website,
      twitter: profile.twitter,
      linkedin: profile.linkedin,
      photoURL: profile.photoURL,
      skills: profile.skills || [],
      positions: profile.positions || [],
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

/**
 * Ensures a LinkedIn profile has positions data, creating a default one from headline if needed
 */
export function ensureLinkedInPositions(profile: any) {
  if (!profile) return null;
  
  // Create a copy of the profile to avoid modifying the original
  const updatedProfile = { ...profile };
  
  // Initialize positions as an empty array if it doesn't exist
  if (!updatedProfile.positions) {
    updatedProfile.positions = [];
  }
  
  // If positions is empty but we have a headline, create a default position
  if (updatedProfile.positions.length === 0 && updatedProfile.headline) {
    updatedProfile.positions = [{
      title: updatedProfile.headline,
      company: updatedProfile.company || '',
      startDate: '',
      endDate: 'Present',
      description: updatedProfile.summary || ''
    }];
  }
  
  // Ensure each position has all required fields
  updatedProfile.positions = updatedProfile.positions.map((position: any) => ({
    title: position.title || updatedProfile.headline || '',
    company: position.company || updatedProfile.company || '',
    startDate: position.startDate || '',
    endDate: position.endDate || 'Present',
    description: position.description || ''
  }));
  
  return updatedProfile;
}
