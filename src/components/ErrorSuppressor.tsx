'use client';

import { useEffect, useState } from 'react';
import { disableDebugMode, enableDebugMode, isDebugModeEnabled, toggleDebugMode } from '@/lib/utils/debugUtils';
import { safeBrowserAccess, suppressBrowserExtensionErrors } from '@/lib/utils/browserUtils';
import { checkAndCleanupServiceWorker } from '@/lib/utils/serviceWorkerCleanup';

export default function ErrorSuppressor() {
  const [isDebugMode, setIsDebugMode] = useState(false);

  useEffect(() => {
    // Apply error suppression immediately when the component mounts
    suppressBrowserExtensionErrors();
    disableDebugMode();
    
    // Check for and clean up any service worker issues
    checkAndCleanupServiceWorker();
    
    // Check for debug mode in localStorage
    const savedDebugMode = safeBrowserAccess(
      () => localStorage.getItem('debug_mode') === 'true',
      false
    );
    
    if (savedDebugMode) {
      enableDebugMode();
      setIsDebugMode(true);
    }
    
    // Add keyboard shortcut for toggling debug mode (Ctrl+Shift+D)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        const newMode = toggleDebugMode();
        setIsDebugMode(newMode);
        
        safeBrowserAccess(
          () => localStorage.setItem('debug_mode', newMode.toString()),
          undefined
        );
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    // Add event listener for service worker errors
    const handleError = (event: ErrorEvent) => {
      if (
        event.message?.includes('serviceWorker.js') || 
        event.message?.includes('Frame with ID 0 was removed') ||
        event.message?.includes('No tab with id')
      ) {
        checkAndCleanupServiceWorker();
      }
    };
    
    window.addEventListener('error', handleError);
    
    // Cleanup function
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('error', handleError);
    };
  }, []);
  
  // This is a utility component that doesn't render anything visible
  return null;
} 