'use client';

import { useState } from 'react';
import { forceCleanReload } from '@/lib/utils/extensionBlocker';
import { unregisterAllServiceWorkers } from '@/lib/utils/serviceWorkerCleanup';

export default function EmergencyResetButton() {
  const [isResetting, setIsResetting] = useState(false);

  const handleEmergencyReset = async () => {
    if (isResetting) return;
    
    try {
      setIsResetting(true);
      
      // Show a message to the user
      alert('Emergency reset in progress. This will clear all browser data and reload the page.');
      
      // Unregister all service workers
      await unregisterAllServiceWorkers();
      
      // Clear all caches
      if ('caches' in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map(key => caches.delete(key)));
      }
      
      // Clear localStorage
      localStorage.clear();
      
      // Clear sessionStorage
      sessionStorage.clear();
      
      // Clear cookies (for the current domain)
      document.cookie.split(';').forEach(cookie => {
        const eqPos = cookie.indexOf('=');
        const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      });
      
      // Clear IndexedDB databases
      if (window.indexedDB) {
        const databases = await window.indexedDB.databases();
        databases.forEach(db => {
          if (db.name) window.indexedDB.deleteDatabase(db.name);
        });
      }
      
      // Add a flag to the URL to indicate a clean reload
      const cleanUrl = window.location.href.split('?')[0] + 
        '?emergency_reset=true&t=' + Date.now();
      
      // Force reload with cache busting
      window.location.href = cleanUrl;
    } catch (error) {
      console.error('Emergency reset failed:', error);
      setIsResetting(false);
      
      // Fallback to simple reload
      forceCleanReload();
    }
  };

  return (
    <button
      onClick={handleEmergencyReset}
      disabled={isResetting}
      className="fixed bottom-4 right-4 z-50 px-4 py-2 bg-red-600 text-white font-bold rounded-md shadow-lg hover:bg-red-700 transition-colors duration-200 flex items-center space-x-2"
      title="Use this in case of severe website glitches"
    >
      {isResetting ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Resetting...</span>
        </>
      ) : (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>Emergency Reset</span>
        </>
      )}
    </button>
  );
} 