/**
 * Extension Detector Utility
 * 
 * This utility helps detect browser extensions that might be causing conflicts
 * with the application and provides recommendations to the user.
 */

// Known signature patterns for various extension categories
const extensionSignatures = [
  { name: 'Ad Blockers', signatures: ['adblock', 'ublock', 'adguard', 'ghostery', 'privacy badger'] },
  { name: 'Password Managers', signatures: ['lastpass', 'bitwarden', '1password', 'dashlane', 'keeper'] },
  { name: 'Developer Tools', signatures: ['react developer tools', 'redux devtools', 'lighthouse', 'axe', 'web vitals'] },
  { name: 'Social Media', signatures: ['facebook container', 'twitter'] },
  { name: 'Productivity', signatures: ['grammarly', 'evernote', 'todoist', 'notion'] },
  { name: 'Shopping', signatures: ['honey', 'rakuten', 'camelcamelcamel', 'keepa'] },
  { name: 'Security', signatures: ['vpn', 'antivirus', 'firewall', 'malware', 'noscript'] }
];

// Flag to track if detection has been performed
let detectionPerformed = false;

/**
 * Detect potentially problematic browser extensions
 * @returns Array of detected extension categories
 */
export const detectProblematicExtensions = (): string[] => {
  if (typeof window === 'undefined' || detectionPerformed) return [];
  
  const detectedExtensions: string[] = [];
  
  try {
    // Method 1: Check for extension-specific DOM elements
    const allElements = document.querySelectorAll('*');
    const allElementsArray = Array.from(allElements);
    const allIds = allElementsArray.map(el => el.id?.toLowerCase() || '');
    const allClasses = allElementsArray.flatMap(el => 
      Array.from(el.classList).map(cls => cls.toLowerCase())
    );
    
    // Method 2: Check for extension-specific CSS
    const allStyleSheets = Array.from(document.styleSheets);
    let cssRules: string[] = [];
    
    try {
      allStyleSheets.forEach(sheet => {
        try {
          if (sheet.cssRules) {
            Array.from(sheet.cssRules).forEach(rule => {
              cssRules.push(rule.cssText.toLowerCase());
            });
          }
        } catch (e) {
          // Ignore CORS errors for external stylesheets
        }
      });
    } catch (e) {
      // Ignore stylesheet access errors
    }
    
    // Method 3: Check for extension-specific global variables
    const allGlobalVars = Object.keys(window).map(key => key.toLowerCase());
    
    // Combine all signatures to check
    const allSignatures = [
      ...allIds,
      ...allClasses,
      ...cssRules,
      ...allGlobalVars
    ];
    
    // Check for matches against known problematic extensions
    extensionSignatures.forEach(extension => {
      const found = extension.signatures.some(signature => 
        allSignatures.some(item => item.includes(signature))
      );
      
      if (found && !detectedExtensions.includes(extension.name)) {
        detectedExtensions.push(extension.name);
      }
    });
    
    // Mark detection as performed
    detectionPerformed = true;
  } catch (error) {
    console.error('Error detecting extensions:', error);
  }
  
  return detectedExtensions;
};

/**
 * Get recommendations based on detected extensions
 * @param detectedExtensions Array of detected extension categories
 * @returns String with recommendations
 */
export const getExtensionRecommendations = (detectedExtensions: string[]): string => {
  if (detectedExtensions.length === 0) {
    return 'No problematic browser extensions detected.';
  }
  
  return `
    We've detected the following browser extensions that might be causing conflicts:
    ${detectedExtensions.map(ext => `- ${ext}`).join('\n')}
    
    Recommendations:
    1. Try disabling these extensions temporarily to see if it resolves the issues
    2. Use the Emergency Reset button to clear all browser data
    3. Try using the site in incognito/private browsing mode
    4. If problems persist, try a different browser
  `;
};

/**
 * Check if the site is running in incognito/private browsing mode
 * @returns Promise that resolves to boolean indicating if in private mode
 */
export const isInPrivateMode = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false;
  
  try {
    // Method 1: Try to use localStorage (fails in some private modes)
    try {
      localStorage.setItem('test', '1');
      localStorage.removeItem('test');
    } catch (e) {
      return true;
    }
    
    // Method 2: Try to use IndexedDB (fails in some private modes)
    const db = await new Promise<boolean>((resolve) => {
      const dbRequest = window.indexedDB.open('test');
      dbRequest.onerror = () => resolve(true);
      dbRequest.onsuccess = () => {
        dbRequest.result.close();
        window.indexedDB.deleteDatabase('test');
        resolve(false);
      };
    });
    
    if (db) return true;
    
    // Not in private mode
    return false;
  } catch (error) {
    // If any error occurs, assume not in private mode
    return false;
  }
};

/**
 * Run a full diagnostic check and return results
 * @returns Object with diagnostic results
 */
export const runDiagnostics = async (): Promise<{
  problematicExtensions: string[];
  isPrivateMode: boolean;
  recommendations: string;
}> => {
  const problematicExtensions = detectProblematicExtensions();
  const isPrivateMode = await isInPrivateMode();
  const recommendations = getExtensionRecommendations(problematicExtensions);
  
  return {
    problematicExtensions,
    isPrivateMode,
    recommendations
  };
}; 