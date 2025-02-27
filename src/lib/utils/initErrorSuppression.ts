/**
 * Initialize Error Suppression
 * 
 * This file is imported early in the application lifecycle to suppress
 * browser extension errors and other noise in the console.
 */

// Store original console methods
const originalConsoleError = console.error;
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;

// Common browser extension error patterns
const extensionErrorPatterns = [
  'Frame with ID 0 was removed',
  'No tab with id',
  'Could not establish connection. Receiving end does not exist',
  'The message port closed before a response was received',
  'heartbeats undefined',
  'serviceWorker.js',
  'background.js',
  'Uncaught (in promise)'
];

// Debug log patterns to filter
const debugLogPatterns = [
  'User profile from Firestore',
  'Full LinkedIn data from API',
  'heartbeats undefined',
  'page-',
  '.js:',
  'null'
];

// Override console.error to filter extension errors
console.error = function(...args) {
  if (args.length === 0) return;
  
  const errorString = JSON.stringify(args);
  if (!extensionErrorPatterns.some(pattern => errorString.includes(pattern))) {
    originalConsoleError.apply(console, args);
  }
};

// Override console.log to filter debug noise
console.log = function(...args) {
  if (args.length === 0) return;
  
  const logString = JSON.stringify(args);
  if (!debugLogPatterns.some(pattern => logString.includes(pattern))) {
    originalConsoleLog.apply(console, args);
  }
};

// Override console.warn to filter extension warnings
console.warn = function(...args) {
  if (args.length === 0) return;
  
  const warnString = JSON.stringify(args);
  if (!extensionErrorPatterns.some(pattern => warnString.includes(pattern))) {
    originalConsoleWarn.apply(console, args);
  }
};

// Add global error handler for service worker errors
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const errorString = String(event.reason);
    if (extensionErrorPatterns.some(pattern => errorString.includes(pattern))) {
      event.preventDefault();
      event.stopPropagation();
    }
  });
}

// Export a dummy function to ensure the file is not tree-shaken
export const initErrorSuppression = () => {
  // This function exists to ensure this file is imported and executed
  return true;
};

// Self-execute to ensure the overrides are applied immediately
initErrorSuppression(); 