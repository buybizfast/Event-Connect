/**
 * Browser Utilities
 * 
 * This file contains utility functions to handle browser-specific issues,
 * particularly related to service workers, tab management, and browser extensions.
 */

/**
 * Safely access browser APIs with error handling
 * Prevents "Frame with ID 0 was removed" and "No tab with id" errors
 */
export const safeBrowserAccess = <T>(callback: () => T, fallback: T): T => {
  try {
    return callback();
  } catch (error) {
    // Don't log anything in production to avoid console spam
    return fallback;
  }
};

// Define a global flag to track if error suppression is active
let errorSuppressionActive = false;

/**
 * Suppress common browser extension errors in the console
 * This helps clean up the console from extension-related errors
 */
export const suppressBrowserExtensionErrors = (): void => {
  // Only apply once to avoid multiple overrides
  if (errorSuppressionActive || typeof window === 'undefined') return;
  
  errorSuppressionActive = true;
  
  if (typeof window !== 'undefined') {
    // Store the original console methods
    const originalConsoleError = console.error;
    const originalConsoleLog = console.log;
    const originalConsoleWarn = console.warn;
    const originalConsoleInfo = console.info;
    
    // Common browser extension error patterns
    const extensionErrorPatterns = [
      'Frame with ID 0 was removed',
      'No tab with id',
      'Could not establish connection',
      'Receiving end does not exist',
      'The message port closed before a response was received',
      'heartbeats undefined',
      'serviceWorker.js',
      'background.js',
      'Uncaught (in promise)',
      'Failed to execute',
      'Extension context invalidated',
      'content-script.js',
      'content.js',
      'alert-observer.js',
      'lockdown-install.js',
      'affirm_injection.js',
      'A listener indicated an asynchronous response',
      'Removing unpermitted intrinsics'
    ];
    
    // Debug log patterns to filter
    const debugLogPatterns = [
      'User profile from Firestore',
      'User is not verified',
      'heartbeats undefined',
      'page-',
      '.js:',
      'null',
      'Object',
      'undefined',
      'isVerified:',
      '[communication]',
      'ALERT OBSERVER',
      'content-script',
      'Removing unpermitted intrinsics'
    ];
    
    // Override console.error to filter out known extension errors
    console.error = function(...args) {
      if (args.length > 0) {
        // Convert to string for easier matching
        const errorString = String(args[0]);
        
        // Skip extension-related errors
        if (
          errorString.includes('Extension context invalidated') ||
          errorString.includes('Extension manifest version 2') ||
          errorString.includes('extension ID') ||
          errorString.includes('extension context') ||
          errorString.includes('event listeners registered from extensions') ||
          errorString.includes('Frame with ID 0 was removed')
        ) {
          return;
        }
      }
      
      // Pass through all other errors
      originalConsoleError.apply(console, args);
    };
    
    // Override console.log to filter out excessive debug logs
    console.log = function(...args) {
      if (args.length > 0) {
        const logString = String(args[0]);
        
        // Skip logs from extensions
        if (
          logString.includes('extension') ||
          logString.includes('Error:') ||
          logString.includes('Socket connected')
        ) {
          return;
        }
      }
      
      // Pass through all other logs
      originalConsoleLog.apply(console, args);
    };
    
    // Override console.warn to filter extension warnings
    console.warn = function(...args) {
      if (args.length === 0) return;
      
      try {
        // Try to stringify the args, but fall back to simple string join if it fails
        let warnString;
        try {
          warnString = JSON.stringify(args);
        } catch (e) {
          warnString = args.join(' ');
        }
        
        // Only log warnings that aren't from browser extensions
        if (!extensionErrorPatterns.some(pattern => warnString.includes(pattern))) {
          originalConsoleWarn.apply(console, args);
        }
      } catch (e) {
        // If anything goes wrong, fall back to the original behavior
        originalConsoleWarn.apply(console, args);
      }
    };
    
    // Override console.info to filter extension info messages
    console.info = function(...args) {
      if (args.length === 0) return;
      
      try {
        // Try to stringify the args, but fall back to simple string join if it fails
        let infoString;
        try {
          infoString = JSON.stringify(args);
        } catch (e) {
          infoString = args.join(' ');
        }
        
        // Only log info messages that aren't from browser extensions
        if (!debugLogPatterns.some(pattern => infoString.includes(pattern))) {
          originalConsoleInfo.apply(console, args);
        }
      } catch (e) {
        // If anything goes wrong, fall back to the original behavior
        originalConsoleInfo.apply(console, args);
      }
    };

    // Add a global error handler to catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      try {
        const errorString = String(event.reason || '');
        
        // Prevent the error from being logged if it's a known browser extension error
        if (extensionErrorPatterns.some(knownError => errorString.includes(knownError))) {
          event.preventDefault();
          event.stopPropagation();
          return false;
        }
      } catch (e) {
        // Ignore errors in the error handler
      }
    }, true);
    
    // Add a global error handler for regular errors
    window.addEventListener('error', (event) => {
      try {
        const errorString = event.message || '';
        
        // Prevent the error from being logged if it's a known browser extension error
        if (extensionErrorPatterns.some(knownError => errorString.includes(knownError))) {
          event.preventDefault();
          event.stopPropagation();
          return false;
        }
      } catch (e) {
        // Ignore errors in the error handler
      }
    }, true);
  }
};

// Call suppressBrowserExtensionErrors immediately to set up error handling
if (typeof window !== 'undefined') {
  suppressBrowserExtensionErrors();
}

/**
 * Safely get URL parameters without causing browser extension errors
 */
export const safeGetUrlParams = (): URLSearchParams => {
  return safeBrowserAccess(
    () => new URLSearchParams(window.location.search),
    new URLSearchParams('')
  );
};

/**
 * Safely update browser history without causing errors
 */
export const safeUpdateHistory = (url: string, title: string = document.title): void => {
  safeBrowserAccess(
    () => {
      window.history.replaceState({}, title, url);
    },
    undefined
  );
};

/**
 * Create a cleanup function for React useEffect hooks
 * Helps prevent "Receiving end does not exist" errors with browser extensions
 */
export const createSafeCleanup = (): (() => void) => {
  // Create a flag to track if the component is still mounted
  let isMounted = true;
  
  // Return a cleanup function that sets the flag to false
  return () => {
    isMounted = false;
  };
};

/**
 * Check if a component is still mounted
 * Use with the cleanup function to prevent state updates after unmount
 */
export const createMountedChecker = (): { isMounted: () => boolean, cleanup: () => void } => {
  let mounted = true;
  
  return {
    isMounted: () => mounted,
    cleanup: () => {
      mounted = false;
    }
  };
};

/**
 * Safely access localStorage with error handling
 */
export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    return safeBrowserAccess(
      () => localStorage.getItem(key),
      null
    );
  },
  setItem: (key: string, value: string): void => {
    safeBrowserAccess(
      () => localStorage.setItem(key, value),
      undefined
    );
  },
  removeItem: (key: string): void => {
    safeBrowserAccess(
      () => localStorage.removeItem(key),
      undefined
    );
  }
};

/**
 * Generate a cache-busting URL parameter that changes less frequently
 * Uses a time-based approach that changes every 5 minutes instead of every request
 */
export const addStableCacheBuster = (url: string): string => {
  const separator = url.includes('?') ? '&' : '?';
  // Create a timestamp that changes every 5 minutes (300,000 ms)
  const cacheKey = Math.floor(Date.now() / 300000);
  return `${url}${separator}t=${cacheKey}`;
};

/**
 * Generate a cache-busting URL parameter
 */
export const addCacheBuster = (url: string): string => {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}t=${Date.now()}`;
};

/**
 * Safely fetch data with error handling, cache busting, and retry logic
 */
export const safeFetch = async <T>(
  url: string, 
  options?: RequestInit,
  cacheBust: boolean = true,
  retries: number = 2,
  stableCacheBusting: boolean = true
): Promise<{ data: T | null; error: Error | null }> => {
  let attempts = 0;
  let lastError: Error | null = null;
  
  // Implement exponential backoff for retries
  const backoff = (attempt: number) => Math.min(100 * Math.pow(2, attempt), 3000);
  
  while (attempts <= retries) {
    try {
      // Use stable cache busting to prevent too many unique requests
      const fetchUrl = cacheBust 
        ? (stableCacheBusting ? addStableCacheBuster(url) : addCacheBuster(url)) 
        : url;
      
      const response = await fetch(fetchUrl, options);
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      
      const data = await response.json();
      return { data, error: null };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Check if this is a resource limitation error
      const errorMessage = String(error);
      if (errorMessage.includes('ERR_INSUFFICIENT_RESOURCES')) {
        break; // Don't retry resource limitation errors
      }
      
      attempts++;
      
      // If we have retries left, wait before trying again
      if (attempts <= retries) {
        await new Promise(resolve => setTimeout(resolve, backoff(attempts)));
      }
    }
  }
  
  return { data: null, error: lastError };
}; 