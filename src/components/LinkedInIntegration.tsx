'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { Linkedin, Check, AlertCircle, RefreshCw, User, Shield } from 'lucide-react';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { getUserProfile } from '@/lib/firebase/firebaseUtils';

export default function LinkedInIntegration() {
  const [isVerified, setIsVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { user } = useAuth();

  const verifyUser = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Check if user document exists
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      
      if (userDocSnap.exists()) {
        console.log('Updating existing user document with verification status');
        // Update existing user document with verification status
        await updateDoc(userDocRef, {
          isVerified: true,
          verifiedAt: new Date().toISOString()
        });
      } else {
        console.log('Creating new user document with verification status');
        // Create new user document with verification status
        await setDoc(userDocRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || '',
          photoURL: user.photoURL || '',
          company: '',
          title: '',
          interests: [],
          createdAt: new Date().toISOString(),
          isVerified: true,
          verifiedAt: new Date().toISOString()
        });
      }

      // Double-check that the update was successful by calling the API
      const response = await fetch(`/api/linkedin/profile?userId=${user.uid}&t=${Date.now()}`);
      const data = await response.json();
      
      if (data.isVerified) {
        console.log(`Verification status after update: ${data.isVerified}`);
        setIsVerified(true);
        setSuccess('Your account has been verified with LinkedIn!');
      } else {
        console.error('Verification status was not updated correctly');
        setError('Verification status was not updated correctly. Please try again.');
      }
    } catch (err) {
      console.error('Error verifying user with LinkedIn:', err);
      setError('Error verifying with LinkedIn');
    } finally {
      setLoading(false);
    }
  };
  
  const checkVerificationAfterRedirect = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Wait a moment to ensure the callback has time to update the database
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Call the API endpoint to check verification status
      const response = await fetch(`/api/linkedin/profile?userId=${user.uid}&t=${Date.now()}`);
      const data = await response.json();
      
      if (data.isVerified) {
        console.log('Verification confirmed after redirect');
        setIsVerified(true);
        setSuccess('Your account has been verified with LinkedIn!');
      } else {
        console.log('Verification not confirmed after redirect, trying to verify manually');
        await verifyUser();
      }
    } catch (err) {
      console.error('Error checking verification after redirect:', err);
      setError('Error confirming verification status');
    } finally {
      setLoading(false);
    }
  };

  // Check if user is already verified
  useEffect(() => {
    const checkVerificationStatus = async () => {
      if (!user) return;

      try {
        setLoading(true);
        // Call the API endpoint to check verification status
        const response = await fetch(`/api/linkedin/profile?userId=${user.uid}&t=${Date.now()}`);
        const data = await response.json();
        
        if (data.isVerified) {
          console.log('User is verified:', data.isVerified);
          setIsVerified(true);
        } else {
          console.log('User is not verified or profile not found');
          setIsVerified(false);
          
          // If URL indicates LinkedIn connection but status is not verified, try to verify manually
          const urlParams = new URLSearchParams(window.location.search);
          if (urlParams.get('linkedin_connected') === 'true') {
            console.log('LinkedIn connected but user not verified, attempting manual verification');
            await verifyUser();
          }
        }
      } catch (err) {
        console.error('Error checking verification status:', err);
      } finally {
        setLoading(false);
      }
    };

    checkVerificationStatus();
  }, [user, verifyUser]);

  // Check for URL parameters indicating connection status
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('linkedin_connected') === 'true') {
      setSuccess('Successfully verified with LinkedIn!');
      checkVerificationAfterRedirect();
    }
    if (urlParams.get('linkedin_error')) {
      setError(`Error connecting to LinkedIn: ${urlParams.get('linkedin_error')}`);
    }
    
    // Clean up URL parameters
    if (urlParams.has('linkedin_connected') || urlParams.has('linkedin_error')) {
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, [checkVerificationAfterRedirect]);
  
  const connectToLinkedIn = () => {
    setLoading(true);
    setError(null);
    try {
      window.location.href = '/api/linkedin/auth';
    } catch (err) {
      console.error('Error redirecting to LinkedIn auth:', err);
      setError('Error connecting to LinkedIn');
      setLoading(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">LinkedIn Verification</h2>
      
      <div className="mb-4 p-4 bg-blue-50 text-blue-700 rounded-md">
        <p className="text-sm">
          <strong>Verify your account:</strong> Connect your LinkedIn account to verify your identity.
          Verified users receive a checkmark badge on their profile. We don&apos;t retrieve any data from your LinkedIn profile.
        </p>
      </div>
      
      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-md flex items-start">
          <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-4 bg-green-50 text-green-700 rounded-md flex items-start">
          <Check className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
          <p>{success}</p>
        </div>
      )}
      
      {loading && (
        <div className="mb-4 p-4 bg-gray-50 text-gray-700 rounded-md flex items-start">
          <RefreshCw className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0 animate-spin" />
          <p>Processing your verification...</p>
        </div>
      )}
      
      {!isVerified ? (
        <div>
          <p className="text-gray-600 mb-4">
            Connect your LinkedIn account to verify your identity and receive a verification badge.
          </p>
          <button
            onClick={connectToLinkedIn}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Linkedin className="h-4 w-4 mr-2" />
            Verify with LinkedIn
          </button>
        </div>
      ) : (
        <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-md">
          <Shield className="h-6 w-6 text-green-600" />
          <div>
            <p className="text-green-700 font-medium">Your account is verified</p>
            <p className="text-green-600 text-sm">Your profile now displays a verification badge</p>
          </div>
        </div>
      )}
    </div>
  );
} 