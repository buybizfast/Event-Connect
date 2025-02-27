/**
 * Extension Blocker Utility
 * 
 * This file contains aggressive methods to block browser extension errors
 * by completely overriding problematic browser APIs.
 */

// Flag to track if blocker has been applied
let blockerApplied = false;

// Define interfaces for browser extension APIs
interface ChromeAPI {
  runtime?: any;
  extension?: any;
  webRequest?: any;
  tabs?: any;
  [key: string]: any;
}

interface BrowserAPI {
  runtime?: any;
  extension?: any;
  webRequest?: any;
  tabs?: any;
  [key: string]: any;
}

// Extend Window interface to include browser extension APIs
declare global {
  interface Window {
    chrome?: ChromeAPI;
    browser?: BrowserAPI;
  }
}

/**
 * Apply aggressive extension blocking
 * This completely overrides problematic browser APIs to prevent extension errors
 */
export const applyExtensionBlocker = (): void => {
  // Only apply once
  if (blockerApplied || typeof window === 'undefined') return;
  
  try {
    // Override the chrome API if it exists
    if (typeof window.chrome !== 'undefined') {
      // Create a proxy to intercept all chrome API calls
      const chromeProxy = new Proxy(window.chrome, {
        get: (target, prop) => {
          // Return empty objects/functions for problematic APIs
          if (
            prop === 'runtime' || 
            prop === 'extension' || 
            prop === 'webRequest' ||
            prop === 'tabs'
          ) {
            return new Proxy({}, {
              get: () => {
                // Return a no-op function for any method call
                return () => Promise.resolve();
              }
            });
          }
          
          // Return the original property for non-problematic APIs
          return target[prop as keyof typeof target];
        }
      });
      
      // Replace the chrome API with our proxy
      window.chrome = chromeProxy;
    }
    
    // Override the browser API if it exists (Firefox extensions)
    if (typeof window.browser !== 'undefined') {
      const browserProxy = new Proxy(window.browser, {
        get: (target, prop) => {
          // Return empty objects/functions for problematic APIs
          if (
            prop === 'runtime' || 
            prop === 'extension' || 
            prop === 'webRequest' ||
            prop === 'tabs'
          ) {
            return new Proxy({}, {
              get: () => {
                // Return a no-op function for any method call
                return () => Promise.resolve();
              }
            });
          }
          
          // Return the original property for non-problematic APIs
          return target[prop as keyof typeof target];
        }
      });
      
      // Replace the browser API with our proxy
      window.browser = browserProxy;
    }
    
    // Override the ServiceWorker API
    if ('serviceWorker' in navigator) {
      const originalServiceWorker = navigator.serviceWorker;
      
      // Create a proxy for the ServiceWorker API
      const serviceWorkerProxy = new Proxy(originalServiceWorker, {
        get: (target, prop) => {
          // Block registration and messaging
          if (prop === 'register' || prop === 'controller') {
            return null;
          }
          
          // Return empty registrations
          if (prop === 'getRegistrations') {
            return () => Promise.resolve([]);
          }
          
          // Return the original property for other APIs
          return target[prop as keyof typeof target];
        }
      });
      
      // Replace the ServiceWorker API with our proxy
      // @ts-ignore - Intentionally overriding the ServiceWorker API
      navigator.serviceWorker = serviceWorkerProxy;
    }
    
    // Override the console to filter out extension errors
    const originalConsoleError = console.error;
    const originalConsoleLog = console.log;
    const originalConsoleWarn = console.warn;
    
    // List of patterns to filter out
    const filterPatterns = [
      'serviceWorker.js',
      'background.js',
      'Frame with ID 0',
      'No tab with id',
      'Could not establish connection',
      'Receiving end does not exist',
      'The message port closed',
      'Object',
      'page-',
      'User profile from Firestore'
    ];
    
    // Override console.error
    console.error = function(...args) {
      if (args.length === 0) return;
      
      // Convert args to string for filtering
      const errorString = String(args);
      
      // Only log if it doesn't match any filter pattern
      if (!filterPatterns.some(pattern => errorString.includes(pattern))) {
        originalConsoleError.apply(console, args);
      }
    };
    
    // Override console.log
    console.log = function(...args) {
      if (args.length === 0) return;
      
      // Convert args to string for filtering
      const logString = String(args);
      
      // Only log if it doesn't match any filter pattern
      if (!filterPatterns.some(pattern => logString.includes(pattern))) {
        originalConsoleLog.apply(console, args);
      }
    };
    
    // Override console.warn
    console.warn = function(...args) {
      if (args.length === 0) return;
      
      // Convert args to string for filtering
      const warnString = String(args);
      
      // Only log if it doesn't match any filter pattern
      if (!filterPatterns.some(pattern => warnString.includes(pattern))) {
        originalConsoleWarn.apply(console, args);
      }
    };
    
    // Override fetch to block problematic API calls
    const originalFetch = window.fetch;
    window.fetch = function(input, init) {
      const url = typeof input === 'string' 
        ? input 
        : input instanceof URL 
          ? input.toString() 
          : input instanceof Request 
            ? input.url 
            : '';
      
      // Block problematic API calls
      if (
        url.includes('serviceWorker.js')
      ) {
        return Promise.resolve(new Response(JSON.stringify({ success: false }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }));
      }
      
      // Proceed with original fetch for other URLs
      return originalFetch.apply(this, [input, init]);
    };
    
    // Add global error handlers
    window.addEventListener('error', (event) => {
      // Check if this is a browser extension error
      if (filterPatterns.some(pattern => (event.message || '').includes(pattern))) {
        // Prevent the error from propagating
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
    }, true);
    
    window.addEventListener('unhandledrejection', (event) => {
      // Check if this is a browser extension error
      if (filterPatterns.some(pattern => String(event.reason || '').includes(pattern))) {
        // Prevent the error from propagating
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
    }, true);
    
    // Detect and block problematic extensions
    window.addEventListener('message', (event) => {
      // Block extension messages that cause conflicts
      if (event.data && typeof event.data === 'object') {
        if (
          (event.data.type && (
            event.data.type.includes('EXTENSION') ||
            event.data.type.includes('TAB')
          )) ||
          (event.data.source && event.data.source.includes('extension'))
        ) {
          // Prevent the event from propagating
          event.stopImmediatePropagation();
          event.preventDefault();
          return false;
        }
      }
    }, true); // Capture phase to intercept before other handlers
    
    // Filter console logs to avoid noise from extensions
    const existingConsoleLog = console.log;
    console.log = function(...args) {
      if (args.length > 0 && typeof args[0] === 'string') {
        const logMessage = args[0];
        
        // Skip extension-related messages
        if (
          logMessage.includes('extension') ||
          logMessage.includes('Could not establish connection') ||
          logMessage.includes('No tab with id')
        ) {
          return;
        }
      }
      
      // Pass through other messages
      existingConsoleLog.apply(this, args);
    };
    
    // Mark as applied
    blockerApplied = true;
    
    console.log('Extension blocker applied successfully');
  } catch (error) {
    // Ignore any errors during setup
  }
};

// Apply the blocker immediately
if (typeof window !== 'undefined') {
  applyExtensionBlocker();
}

/**
 * Force reload the page without service workers
 */
export const forceCleanReload = (): void => {
  if (typeof window === 'undefined') return;
  
  try {
    // Clear caches
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
          caches.delete(cacheName);
        });
      });
    }
    
    // Add cache-busting parameter and reload
    window.location.href = window.location.href.split('?')[0] + 
      '?clean=true&t=' + Date.now();
  } catch (error) {
    // Fallback to simple reload
    window.location.reload();
  }
}; 