"use client";

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';

export default function LinkedInStatus() {
  const [verified, setVerified] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const searchParams = useSearchParams();
  const { user } = useAuth();

  useEffect(() => {
    // Check for LinkedIn callback parameters
    const linkedinError = searchParams.get('linkedin_error');
    const linkedinConnected = searchParams.get('linkedin_connected');

    if (linkedinError) {
      setError(decodeURIComponent(linkedinError));
      setLoading(false);
    } else if (linkedinConnected === 'true') {
      // If LinkedIn connected, check verification status from API
      checkVerificationStatus();
    } else if (user) {
      // If user is logged in, check verification status from API
      checkVerificationStatus();
    } else {
      setLoading(false);
    }
  }, [searchParams, user]);

  const checkVerificationStatus = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/linkedin/profile?userId=${user.uid}&t=${Date.now()}`);
      const data = await response.json();
      
      if (data.isVerified) {
        setVerified(true);
      } else {
        setVerified(false);
      }
    } catch (err) {
      console.error('Error checking verification status:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return null;
  }

  if (!verified && !error) {
    return null;
  }

  return (
    <div className="mb-6">
      {verified && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="text-lg font-semibold text-green-800 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            LinkedIn Verification Successful
          </h3>
          <p className="text-green-700">
            Your account has been successfully verified with LinkedIn.
          </p>
        </div>
      )}
      
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-lg font-semibold text-red-800 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            LinkedIn Verification Error
          </h3>
          <p className="text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
} 