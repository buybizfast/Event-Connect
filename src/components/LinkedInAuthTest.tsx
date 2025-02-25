"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signInWithLinkedIn } from '@/lib/firebase/firebaseUtils';

export default function LinkedInAuthTest() {
  const [status, setStatus] = useState<string>('idle');
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState<boolean>(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check for LinkedIn callback parameters
    const linkedinError = searchParams.get('linkedin_error');
    const linkedinConnected = searchParams.get('linkedin_connected');

    if (linkedinError) {
      setStatus('error');
      setError(decodeURIComponent(linkedinError));
    } else if (linkedinConnected === 'true') {
      setStatus('success');
      setVerified(true);
    }
  }, [searchParams]);

  const handleLinkedInLogin = async () => {
    try {
      setStatus('loading');
      setError(null);
      await signInWithLinkedIn();
      // The page will redirect, so we don't need to set success state here
    } catch (error: any) {
      setStatus('error');
      setError(error.message || 'Failed to sign in with LinkedIn');
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-md">
      <h2 className="text-xl font-bold mb-4">LinkedIn Authentication Test</h2>
      
      {status === 'success' && (
        <div className="mb-4 p-3 bg-green-100 text-green-800 rounded">
          <p className="font-bold">Successfully verified with LinkedIn!</p>
          <p className="mt-2">Your account is now verified.</p>
        </div>
      )}
      
      {status === 'error' && error && (
        <div className="mb-4 p-3 bg-red-100 text-red-800 rounded">
          <p className="font-bold">Error:</p>
          <p>{error}</p>
          {(error.includes('r_liteprofile') || error.includes('r_emailaddress') || error.includes('not authorized')) && (
            <div className="mt-2 p-2 bg-yellow-50 text-yellow-800 rounded text-sm">
              <p className="font-semibold">How to fix:</p>
              <ol className="list-decimal ml-4">
                <li>Go to the LinkedIn Developer Portal</li>
                <li>Select your app with ID: {process.env.NEXT_PUBLIC_LINKEDIN_CLIENT_ID}</li>
                <li>Go to the "Products" tab</li>
                <li>Request access to "Sign In with LinkedIn"</li>
                <li>Under "Auth" tab, verify the redirect URL is: {`${process.env.NEXT_PUBLIC_BASE_URL}/api/linkedin/callback`}</li>
                <li>Make sure the OpenID Connect scopes (openid) are authorized</li>
              </ol>
            </div>
          )}
        </div>
      )}
      
      <div className="flex flex-col space-y-4">
        <button
          onClick={handleLinkedInLogin}
          disabled={status === 'loading'}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {status === 'loading' ? 'Connecting...' : 'Verify with LinkedIn'}
        </button>
        
        <div className="text-sm text-gray-600">
          <p className="font-semibold">Debug Information:</p>
          <p>Status: {status}</p>
          <p>Client ID: {process.env.NEXT_PUBLIC_LINKEDIN_CLIENT_ID || 'Not configured'}</p>
          <p>Base URL: {process.env.NEXT_PUBLIC_BASE_URL}</p>
          <p>Environment: {process.env.NODE_ENV || 'development'}</p>
          <p>Redirect URI: {`${process.env.NEXT_PUBLIC_BASE_URL}/api/linkedin/callback`}</p>
          <p>Using: OpenID Connect flow</p>
        </div>
      </div>
    </div>
  );
} 