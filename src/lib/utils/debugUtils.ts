/**
 * Debug Utilities
 * 
 * This file contains utilities for managing debug logs and console output.
 * It provides a way to toggle debug mode on/off and filter specific types of logs.
 */

// Debug mode state
let debugMode = false;

// Original console methods
let originalConsoleLog: typeof console.log;
let originalConsoleError: typeof console.error;
let originalConsoleWarn: typeof console.warn;
let originalConsoleInfo: typeof console.info;

// Store original console methods when this module is loaded
if (typeof console !== 'undefined') {
  originalConsoleLog = console.log;
  originalConsoleError = console.error;
  originalConsoleWarn = console.warn;
  originalConsoleInfo = console.info;
}

/**
 * Patterns to filter from console logs
 */
const filteredLogPatterns = [
  'User profile from Firestore',
  'heartbeats undefined',
  'User is not verified or profile not found',
  'page-',
  '.js:',
  'null'
];

/**
 * Patterns to filter from console errors
 */
const filteredErrorPatterns = [
  'Frame with ID 0 was removed',
  'No tab with id',
  'Could not establish connection. Receiving end does not exist',
  'The message port closed before a response was received',
  'heartbeats undefined',
  'ERR_INSUFFICIENT_RESOURCES',
  'serviceWorker.js',
  'background.js',
  'Uncaught (in promise)'
];

// Filter patterns for excessive debug logs 
const debugLogPatterns = [
  'Extension context invalidated',
  'Extension ID:',
  'Extension manifest',
  'ServiceWorker',
  'User profile from Firestore',
  'Error in event handler for',
  'Uncaught (in promise)',
  'Socket connected',
  'Socket disconnected'
];

/**
 * Enable debug mode - shows all console logs
 */
export const enableDebugMode = () => {
  if (typeof window === 'undefined') return;
  
  debugMode = true;
  
  // Restore original console methods
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
  console.info = originalConsoleInfo;
  
  console.log('🐞 Debug mode enabled - showing all console output');
};

/**
 * Disable debug mode - filters console logs based on patterns
 */
export const disableDebugMode = () => {
  if (typeof window === 'undefined') return;
  
  debugMode = false;
  
  // Override console.log to filter out noise
  console.log = function(...args) {
    // Skip empty logs
    if (args.length === 0) return;
    
    const logString = args.join(' ');
    if (!filteredLogPatterns.some(pattern => logString.includes(pattern))) {
      originalConsoleLog.apply(console, args);
    }
  };
  
  // Override console.error to filter out extension errors
  console.error = function(...args) {
    // Skip empty errors
    if (args.length === 0) return;
    
    const errorString = args.join(' ');
    if (!filteredErrorPatterns.some(pattern => errorString.includes(pattern))) {
      originalConsoleError.apply(console, args);
    }
  };
  
  // Also filter warnings that might be related to extensions
  console.warn = function(...args) {
    const warnString = args.join(' ');
    if (!filteredErrorPatterns.some(pattern => warnString.includes(pattern))) {
      originalConsoleWarn.apply(console, args);
    }
  };
  
  console.log('🔇 Debug mode disabled - filtering console output');
};

/**
 * Toggle debug mode
 */
export const toggleDebugMode = () => {
  if (debugMode) {
    disableDebugMode();
  } else {
    enableDebugMode();
  }
  return debugMode;
};

/**
 * Check if debug mode is enabled
 */
export const isDebugModeEnabled = () => debugMode;

/**
 * Debug log - only shows when debug mode is enabled
 */
export const debugLog = (...args: any[]) => {
  if (debugMode && typeof window !== 'undefined') {
    originalConsoleLog.apply(console, ['[DEBUG]', ...args]);
  }
};

// Initialize - disable debug mode by default
if (typeof window !== 'undefined') {
  disableDebugMode();
} 