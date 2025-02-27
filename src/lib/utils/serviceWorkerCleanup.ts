/**
 * Service Worker Cleanup Utility
 * 
 * This file contains utility functions to help manage and clean up service workers
 * that might be causing issues with browser extensions or other functionality.
 */

// Flag to track if cleanup has been performed
let cleanupPerformed = false;

/**
 * Unregister all service workers to prevent conflicts with browser extensions
 * This can help resolve "Frame with ID 0 was removed" and similar errors
 */
export const unregisterAllServiceWorkers = async (): Promise<void> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    
    if (registrations.length === 0) {
      return; // No service workers to unregister
    }
    
    // Unregister all service workers
    await Promise.all(
      registrations.map(async (registration) => {
        try {
          const result = await registration.unregister();
          return result;
        } catch (e) {
          // Ignore individual unregister errors
          return false;
        }
      })
    );
    
    // Clear any service worker caches
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => {
            try {
              return caches.delete(cacheName);
            } catch (e) {
              // Ignore individual cache delete errors
              return false;
            }
          })
        );
      } catch (e) {
        // Ignore cache clearing errors
      }
    }
    
    // Set flag to indicate cleanup has been performed
    cleanupPerformed = true;
  } catch (error) {
    // Ignore overall errors
  }
};

/**
 * Check if the current page is being controlled by a service worker
 * and unregister it if needed
 */
export const checkAndCleanupServiceWorker = async (): Promise<void> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  
  // If cleanup has already been performed, don't do it again
  if (cleanupPerformed) return;
  
  try {
    // Always unregister service workers to prevent issues
    await unregisterAllServiceWorkers();
    
    // Check if we need to reload the page
    if (navigator.serviceWorker.controller) {
      // Reload the page without using the service worker
      if (window.location.search.includes('no-sw')) {
        // Already has the no-sw parameter, just reload
        window.location.reload();
      } else {
        // Add a parameter to prevent service worker from controlling the page
        const separator = window.location.search ? '&' : '?';
        window.location.href = `${window.location.href}${separator}no-sw=true`;
      }
    }
    
    // Set flag to indicate cleanup has been performed
    cleanupPerformed = true;
  } catch (error) {
    // Ignore errors
  }
};

/**
 * Disable service workers completely for this session
 * This is a more aggressive approach to prevent service worker issues
 */
export const disableServiceWorkers = (): void => {
  if (typeof window === 'undefined') return;
  
  try {
    // Override the serviceWorker property to prevent registration
    if ('serviceWorker' in navigator) {
      // @ts-ignore - We're intentionally breaking the API to prevent service worker usage
      navigator.serviceWorker.register = function() {
        return Promise.reject(new Error('Service worker registration disabled'));
      };
      
      // Also disable controller
      if (navigator.serviceWorker.controller) {
        // @ts-ignore - Force controller to null
        navigator.serviceWorker.controller = null;
      }
    }
  } catch (e) {
    // Ignore errors
  }
};

/**
 * Initialize service worker cleanup on page load
 * Call this function in your app's entry point to automatically clean up service workers
 */
export const initServiceWorkerCleanup = (): void => {
  if (typeof window === 'undefined') return;
  
  // Immediately disable service workers
  disableServiceWorkers();
  
  // Immediately unregister all service workers
  unregisterAllServiceWorkers();
  
  // Check for the no-sw parameter and remove it from the URL
  if (window.location.search.includes('no-sw=true')) {
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('no-sw');
      window.history.replaceState({}, document.title, url.toString());
    } catch (e) {
      // Ignore URL manipulation errors
    }
  }
  
  // Add event listener for unhandled errors related to service workers
  window.addEventListener('error', (event) => {
    const errorString = event.message || '';
    if (
      errorString.includes('serviceWorker.js') || 
      errorString.includes('Frame with ID 0 was removed') ||
      errorString.includes('No tab with id')
    ) {
      checkAndCleanupServiceWorker();
    }
  }, true);
  
  // Add event listener for unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const errorString = String(event.reason || '');
    if (
      errorString.includes('serviceWorker.js') || 
      errorString.includes('Frame with ID 0 was removed') ||
      errorString.includes('No tab with id')
    ) {
      checkAndCleanupServiceWorker();
    }
  }, true);
  
  // Set flag to indicate cleanup has been performed
  cleanupPerformed = true;
}; 