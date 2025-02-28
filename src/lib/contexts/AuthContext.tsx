"use client";

import { createContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { auth } from '@/lib/firebase/firebase';
import {
  signIn,
  signUp,
  signOut,
  signInWithGoogle,
  signInWithGitHub,
  updateUserProfile,
  getUserProfile,
  handleAuthRedirectResult,
  isEmailVerified,
  resendVerificationEmail,
  updateUserVerificationStatus,
  createUserProfile,
} from '@/lib/firebase/firebaseUtils';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (email: string, password: string, profile: any) => Promise<User>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<User | null>;
  signInWithGitHub: () => Promise<User | null>;
  updateProfile: (profile: any) => Promise<void>;
  authError: string | null;
  isEmailVerified: (user: User | null) => boolean;
  resendVerificationEmail: (user: User) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkRedirectResult = async () => {
      try {
        // Check if we have a redirect result
        const redirectUser = await handleAuthRedirectResult();
        if (redirectUser) {
          console.log('Successfully signed in via redirect');
          // User is already set by onAuthStateChanged
        }
      } catch (error: any) {
        console.error('Error handling redirect result:', error);
        setAuthError(error.message || 'Failed to complete authentication');
      }
    };

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setUser(user);
      
      if (user) {
        try {
          // Check if user document exists
          const userDoc = await getUserProfile(user.uid);
          if (!userDoc) {
            // Create user document if it doesn't exist
            await createUserProfile(user.uid, {
              id: user.uid,
              displayName: user.displayName || '',
              email: user.email || '',
              photoURL: user.photoURL || '',
              company: '',
              title: '',
              bio: '',
              interests: [],
              skills: [],
              positions: [],
              isVerified: user.emailVerified,
              createdAt: Date.now(),
              updatedAt: Date.now(),
              eventbriteToken: null,
              eventbriteRefreshToken: null,
              eventbriteTokenExpiry: null
            });
          }
          
          // If user is logged in and email is verified, update verification status in Firestore
          if (user.emailVerified) {
            try {
              const userProfile = await getUserProfile(user.uid);
              if (userProfile && !userProfile.isVerified) {
                await updateUserVerificationStatus(user.uid, true);
              }
            } catch (error) {
              console.error('Error updating user verification status:', error);
            }
          }
        } catch (error) {
          console.error('Error ensuring user document exists:', error);
        }
      }
      
      setLoading(false);
    });

    // Check for redirect result when the component mounts
    checkRedirectResult();

    return () => unsubscribe();
  }, []);

  const updateProfile = async (profile: any) => {
    if (!user) throw new Error('No user logged in');
    await updateUserProfile(user.uid, profile);
  };

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    signInWithGitHub,
    updateProfile,
    authError,
    isEmailVerified,
    resendVerificationEmail,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
