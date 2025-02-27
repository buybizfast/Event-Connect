/**
 * Network Utilities
 * 
 * This file contains utilities for detecting and fixing network-related issues.
 */

// Flag to track if network monitoring is active
let networkMonitoringActive = false;

// Store network status
let networkStatus = {
  online: typeof navigator !== 'undefined' ? navigator.onLine : true,
  lastChecked: Date.now(),
  failedRequests: 0,
  totalRequests: 0,
  apiEndpointStatus: {} as Record<string, { success: number; failure: number; lastStatus: number }>,
};

/**
 * Initialize network monitoring
 */
export const initNetworkMonitoring = (): void => {
  if (typeof window === 'undefined' || networkMonitoringActive) return;
  
  try {
    // Listen for online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Override fetch to monitor network requests
    monitorNetworkRequests();
    
    // Periodically check network status
    setInterval(checkNetworkStatus, 30000); // Check every 30 seconds
    
    // Mark as active
    networkMonitoringActive = true;
    
    console.log('Network monitoring initialized');
  } catch (error) {
    console.error('Error initializing network monitoring:', error);
  }
};

/**
 * Handle online event
 */
const handleOnline = (): void => {
  networkStatus.online = true;
  networkStatus.lastChecked = Date.now();
  
  // Notify user if they were previously offline
  if (typeof document !== 'undefined') {
    const offlineNotification = document.getElementById('offline-notification');
    if (offlineNotification) {
      offlineNotification.style.display = 'none';
    }
  }
};

/**
 * Handle offline event
 */
const handleOffline = (): void => {
  networkStatus.online = false;
  networkStatus.lastChecked = Date.now();
  
  // Show offline notification
  showOfflineNotification();
};

/**
 * Show offline notification
 */
const showOfflineNotification = (): void => {
  if (typeof document === 'undefined') return;
  
  // Check if notification already exists
  let offlineNotification = document.getElementById('offline-notification');
  
  if (!offlineNotification) {
    // Create notification element
    offlineNotification = document.createElement('div');
    offlineNotification.id = 'offline-notification';
    offlineNotification.style.position = 'fixed';
    offlineNotification.style.top = '0';
    offlineNotification.style.left = '0';
    offlineNotification.style.right = '0';
    offlineNotification.style.backgroundColor = '#f44336';
    offlineNotification.style.color = 'white';
    offlineNotification.style.padding = '10px';
    offlineNotification.style.textAlign = 'center';
    offlineNotification.style.zIndex = '9999';
    offlineNotification.style.fontWeight = 'bold';
    
    // Add retry button
    const retryButton = document.createElement('button');
    retryButton.textContent = 'Retry Connection';
    retryButton.style.marginLeft = '10px';
    retryButton.style.padding = '5px 10px';
    retryButton.style.backgroundColor = 'white';
    retryButton.style.color = '#f44336';
    retryButton.style.border = 'none';
    retryButton.style.borderRadius = '4px';
    retryButton.style.cursor = 'pointer';
    retryButton.onclick = checkNetworkStatus;
    
    offlineNotification.textContent = 'You are currently offline. ';
    offlineNotification.appendChild(retryButton);
    
    // Add to document
    document.body.appendChild(offlineNotification);
  } else {
    offlineNotification.style.display = 'block';
  }
};

/**
 * Check network status by making a request to a reliable endpoint
 */
const checkNetworkStatus = async (): Promise<void> => {
  if (typeof window === 'undefined') return;
  
  try {
    // First check navigator.onLine
    networkStatus.online = navigator.onLine;
    
    if (!networkStatus.online) {
      showOfflineNotification();
      return;
    }
    
    // Make a request to a reliable endpoint
    const timestamp = Date.now();
    const response = await fetch(`/api/health?t=${timestamp}`, {
      method: 'HEAD',
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
    
    // Update network status
    networkStatus.online = response.ok;
    networkStatus.lastChecked = Date.now();
    
    // Hide offline notification if we're online
    if (networkStatus.online && typeof document !== 'undefined') {
      const offlineNotification = document.getElementById('offline-notification');
      if (offlineNotification) {
        offlineNotification.style.display = 'none';
      }
    } else if (!networkStatus.online) {
      showOfflineNotification();
    }
  } catch (error) {
    // If the request fails, we're likely offline
    networkStatus.online = false;
    networkStatus.lastChecked = Date.now();
    showOfflineNotification();
  }
};

/**
 * Monitor network requests by overriding fetch
 */
const monitorNetworkRequests = (): void => {
  if (typeof window === 'undefined') return;
  
  const originalFetch = window.fetch;
  
  window.fetch = async function(input, init) {
    // Increment total requests
    networkStatus.totalRequests++;
    
    // Get URL
    const url = typeof input === 'string' 
      ? input 
      : input instanceof URL 
        ? input.toString() 
        : input instanceof Request 
          ? input.url 
          : '';
    
    // Extract API endpoint for tracking
    const apiEndpoint = extractApiEndpoint(url);
    
    try {
      // Make the request
      const response = await originalFetch.apply(this, [input, init]);
      
      // Track successful request
      if (apiEndpoint) {
        if (!networkStatus.apiEndpointStatus[apiEndpoint]) {
          networkStatus.apiEndpointStatus[apiEndpoint] = { success: 0, failure: 0, lastStatus: 200 };
        }
        
        networkStatus.apiEndpointStatus[apiEndpoint].success++;
        networkStatus.apiEndpointStatus[apiEndpoint].lastStatus = response.status;
      }
      
      return response;
    } catch (error) {
      // Track failed request
      networkStatus.failedRequests++;
      
      if (apiEndpoint) {
        if (!networkStatus.apiEndpointStatus[apiEndpoint]) {
          networkStatus.apiEndpointStatus[apiEndpoint] = { success: 0, failure: 0, lastStatus: 0 };
        }
        
        networkStatus.apiEndpointStatus[apiEndpoint].failure++;
        networkStatus.apiEndpointStatus[apiEndpoint].lastStatus = 0;
      }
      
      // Check network status on failure
      checkNetworkStatus();
      
      throw error;
    }
  };
};

/**
 * Extract API endpoint from URL for tracking
 */
const extractApiEndpoint = (url: string): string | null => {
  try {
    // Only track API endpoints
    if (!url.includes('/api/')) return null;
    
    const urlObj = new URL(url, window.location.origin);
    const pathParts = urlObj.pathname.split('/');
    
    // Get the API endpoint (e.g., /api/users)
    if (pathParts.length >= 3 && pathParts[1] === 'api') {
      return `/api/${pathParts[2]}`;
    }
    
    return null;
  } catch (error) {
    return null;
  }
};

/**
 * Get current network status
 */
export const getNetworkStatus = (): typeof networkStatus => {
  return { ...networkStatus };
};

/**
 * Get problematic API endpoints
 */
export const getProblematicEndpoints = (): Record<string, { success: number; failure: number; lastStatus: number }> => {
  const problematic: Record<string, { success: number; failure: number; lastStatus: number }> = {};
  
  Object.entries(networkStatus.apiEndpointStatus).forEach(([endpoint, stats]) => {
    // Consider an endpoint problematic if it has more failures than successes
    // or if the last status was an error
    if (stats.failure > stats.success || (stats.lastStatus >= 400 && stats.lastStatus < 600)) {
      problematic[endpoint] = { ...stats };
    }
  });
  
  return problematic;
};

/**
 * Force reconnect to network
 */
export const forceReconnect = async (): Promise<boolean> => {
  try {
    // Clear DNS cache (not directly possible in browser)
    // Clear connection pool (not directly possible in browser)
    
    // Make a request to a reliable endpoint
    await checkNetworkStatus();
    
    return networkStatus.online;
  } catch (error) {
    return false;
  }
};

// Initialize network monitoring
if (typeof window !== 'undefined') {
  initNetworkMonitoring();
} 