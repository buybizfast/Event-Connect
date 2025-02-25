'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { Loader2, Linkedin, Calendar } from 'lucide-react';

interface ConnectionsProps {
  userId: string;
}

export default function AccountConnections({ userId }: ConnectionsProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [eventbriteConnected, setEventbriteConnected] = useState(false);
  const [unlinkingLinkedin, setUnlinkingLinkedin] = useState(false);
  const [unlinkingEventbrite, setUnlinkingEventbrite] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  useEffect(() => {
    async function fetchConnections() {
      if (!userId) return;
      
      try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setIsVerified(!!userData.isVerified);
          setEventbriteConnected(!!userData.eventbriteToken);
        }
      } catch (error) {
        console.error('Error fetching connections:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchConnections();
  }, [userId]);

  const verifyWithLinkedIn = () => {
    window.location.href = '/api/linkedin/auth';
  };

  const connectEventbrite = () => {
    window.location.href = '/api/eventbrite/auth';
  };

  const removeVerification = async () => {
    if (!userId) return;
    
    try {
      setUnlinkingLinkedin(true);
      
      // Remove verification status from user document
      await updateDoc(doc(db, 'users', userId), {
        isVerified: false,
        verifiedAt: null
      });
      
      setIsVerified(false);
      setMessage({ type: 'success', text: 'Your LinkedIn verification has been removed.' });
    } catch (error) {
      console.error('Error removing verification:', error);
      setMessage({ type: 'error', text: 'There was a problem removing your verification. Please try again.' });
    } finally {
      setUnlinkingLinkedin(false);
    }
  };

  const unlinkEventbrite = async () => {
    if (!userId) return;
    
    try {
      setUnlinkingEventbrite(true);
      
      // Remove Eventbrite token from user document
      await updateDoc(doc(db, 'users', userId), {
        eventbriteToken: null,
        eventbriteRefreshToken: null,
        eventbriteTokenExpiry: null
      });
      
      // Clear Eventbrite cookies
      document.cookie = 'eventbrite_access_token=; Max-Age=0; path=/; domain=' + window.location.hostname;
      
      setEventbriteConnected(false);
      setMessage({ type: 'success', text: 'Your Eventbrite account has been successfully unlinked.' });
    } catch (error) {
      console.error('Error unlinking Eventbrite:', error);
      setMessage({ type: 'error', text: 'There was a problem unlinking your Eventbrite account. Please try again.' });
    } finally {
      setUnlinkingEventbrite(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Connected Accounts</h2>
      
      {message && (
        <div className={`p-4 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message.text}
        </div>
      )}
      
      <div className="grid gap-4 md:grid-cols-2">
        {/* LinkedIn Verification */}
        <div className="border rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <Linkedin className="h-8 w-8 text-[#0077B5]" />
            <div>
              <h3 className="font-semibold">LinkedIn Verification</h3>
              <p className="text-sm text-gray-500">Verify your identity with LinkedIn</p>
            </div>
          </div>
          <div className="mb-4">
            {isVerified ? (
              <p className="text-sm text-green-600">Verified</p>
            ) : (
              <p className="text-sm text-gray-500">Not verified</p>
            )}
          </div>
          <div>
            {isVerified ? (
              <button 
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
                onClick={removeVerification}
                disabled={unlinkingLinkedin}
              >
                {unlinkingLinkedin && <Loader2 className="inline mr-2 h-4 w-4 animate-spin" />}
                Remove Verification
              </button>
            ) : (
              <button 
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium"
                onClick={verifyWithLinkedIn}
              >
                Verify with LinkedIn
              </button>
            )}
          </div>
        </div>

        {/* Eventbrite Connection */}
        <div className="border rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <Calendar className="h-8 w-8 text-[#F05537]" />
            <div>
              <h3 className="font-semibold">Eventbrite</h3>
              <p className="text-sm text-gray-500">Import your Eventbrite events</p>
            </div>
          </div>
          <div className="mb-4">
            {eventbriteConnected ? (
              <p className="text-sm text-green-600">Connected</p>
            ) : (
              <p className="text-sm text-gray-500">Not connected</p>
            )}
          </div>
          <div>
            {eventbriteConnected ? (
              <button 
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
                onClick={unlinkEventbrite}
                disabled={unlinkingEventbrite}
              >
                {unlinkingEventbrite && <Loader2 className="inline mr-2 h-4 w-4 animate-spin" />}
                Disconnect
              </button>
            ) : (
              <button 
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium"
                onClick={connectEventbrite}
              >
                Connect Eventbrite
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 