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
  signInWithLinkedIn,
  updateUserProfile,
  getUserProfile,
  handleAuthRedirectResult,
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
  signInWithLinkedIn: () => Promise<User | null>;
  updateProfile: (profile: any) => Promise<void>;
  authError: string | null;
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

    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
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
    signInWithLinkedIn,
    updateProfile,
    authError,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
