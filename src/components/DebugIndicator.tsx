'use client';

import { useEffect, useState } from 'react';
import { isDebugModeEnabled, toggleDebugMode } from '@/lib/utils/debugUtils';
import { safeBrowserAccess } from '@/lib/utils/browserUtils';

export default function DebugIndicator() {
  const [isDebugMode, setIsDebugMode] = useState(false);
  
  useEffect(() => {
    // Check initial debug mode
    setIsDebugMode(isDebugModeEnabled());
    
    // Set up an interval to check debug mode status
    const interval = setInterval(() => {
      setIsDebugMode(isDebugModeEnabled());
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  if (!isDebugMode) return null;
  
  return (
    <div 
      className="fixed bottom-4 right-4 bg-black/80 text-white px-3 py-1.5 rounded-full text-xs font-mono z-50 flex items-center space-x-2 cursor-pointer hover:bg-black/90"
      onClick={() => {
        const newMode = toggleDebugMode();
        setIsDebugMode(newMode);
        
        safeBrowserAccess(
          () => localStorage.setItem('debug_mode', newMode.toString()),
          undefined
        );
      }}
    >
      <span className="inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
      <span>Debug Mode</span>
    </div>
  );
} 