import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { cookies } from 'next/headers';

// Generate a CSRF token using Web Crypto API (browser-compatible)
export function generateCsrfToken(): string {
  // Create a random array of 32 bytes
  const array = new Uint8Array(32);
  
  // Fill with random values using the Web Crypto API
  if (typeof crypto !== 'undefined') {
    crypto.getRandomValues(array);
  } else {
    // Fallback for environments where crypto is not available
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  
  // Convert to hex string
  return Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Validate CSRF token
export async function validateCsrfToken(userId: string, token: string): Promise<boolean> {
  try {
    if (!userId || !token) {
      console.error('Missing required parameters for CSRF validation:', { 
        hasUserId: !!userId, 
        hasToken: !!token 
      });
      return false;
    }

    console.log(`Validating CSRF token for user ${userId}`);
    
    // First check if the token matches the one in cookies
    try {
      const cookieStore = cookies();
      const cookieCsrfToken = cookieStore.get('eventbrite_csrf_token')?.value;
      
      if (cookieCsrfToken && cookieCsrfToken === token) {
        console.log('CSRF token validated using cookie');
        return true;
      }
    } catch (cookieError) {
      console.error('Error checking CSRF token in cookies:', cookieError);
      // Continue to check Firestore
    }
    
    // If cookie validation fails, check Firestore
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        console.error('User document not found during CSRF validation');
        return false;
      }

      const userData = userDoc.data();
      const storedToken = userData.eventbriteCsrfToken;
      const tokenExpiry = userData.eventbriteCsrfExpiry;

      if (!storedToken || !tokenExpiry) {
        console.error('CSRF token or expiry not found in user document:', {
          hasStoredToken: !!storedToken,
          hasTokenExpiry: !!tokenExpiry
        });
        return false;
      }

      const tokenMatches = storedToken === token;
      const tokenValid = Date.now() < tokenExpiry;
      
      console.log('CSRF token validation results:', {
        tokenMatches,
        tokenValid,
        tokenExpiry: new Date(tokenExpiry).toISOString(),
        currentTime: new Date().toISOString()
      });
      
      if (!tokenMatches || !tokenValid) {
        console.error('CSRF validation failed:', {
          tokenMatch: tokenMatches,
          expired: !tokenValid,
          tokenExpiry: new Date(tokenExpiry).toISOString(),
          currentTime: new Date().toISOString()
        });
        return false;
      }

      console.log('CSRF token validation successful');
      return true;
    } catch (firestoreError) {
      console.error('Error accessing Firestore during CSRF validation:', firestoreError);
      // If we can't access Firestore but we have a userId and token, 
      // we might want to proceed anyway in some cases
      return false;
    }
  } catch (error) {
    console.error('Error validating CSRF token:', error);
    return false;
  }
}

// Store Eventbrite tokens
export async function storeEventbriteTokens(
  userId: string,
  accessToken: string,
  refreshToken: string,
  expiresIn: number
): Promise<void> {
  try {
    // Validate input parameters
    if (!userId) {
      throw new Error('Missing userId for token storage');
    }
    
    if (!accessToken) {
      throw new Error('Missing accessToken for token storage');
    }
    
    if (!refreshToken) {
      throw new Error('Missing refreshToken for token storage');
    }
    
    if (!expiresIn || isNaN(expiresIn)) {
      throw new Error(`Invalid expiresIn value: ${expiresIn}`);
    }

    console.log(`Storing Eventbrite tokens for user ${userId} with expiry of ${expiresIn} seconds`);

    const tokenExpiry = Date.now() + (expiresIn * 1000);
    
    // Store in cookies first as a backup
    try {
      const cookieStore = cookies();
      cookieStore.set('eventbrite_token', accessToken, {
        expires: new Date(tokenExpiry),
        path: '/',
        secure: true,
        sameSite: 'lax'
      });
      console.log('Stored token in cookies');
    } catch (cookieError) {
      console.error('Error storing token in cookies:', cookieError);
      // Continue to store in Firestore
    }
    
    // Then store in Firestore
    const userRef = doc(db, 'users', userId);
    
    try {
      // Get the current user document
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        console.log(`Creating new user document for ${userId} with Eventbrite tokens`);
        // Create new user document if it doesn't exist
        await setDoc(userRef, {
          eventbriteToken: accessToken,
          eventbriteRefreshToken: refreshToken,
          eventbriteTokenExpiry: tokenExpiry,
          eventbriteTokenUpdatedAt: Date.now(),
          eventbriteCsrfToken: null,
          eventbriteCsrfExpiry: null,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      } else {
        console.log(`Updating existing user document for ${userId} with new Eventbrite tokens`);
        // Update existing document
        await updateDoc(userRef, {
          eventbriteToken: accessToken,
          eventbriteRefreshToken: refreshToken,
          eventbriteTokenExpiry: tokenExpiry,
          eventbriteTokenUpdatedAt: Date.now(),
          eventbriteCsrfToken: null,
          eventbriteCsrfExpiry: null,
          updatedAt: Date.now()
        });
      }
      
      console.log(`Successfully stored Eventbrite tokens for user ${userId}`);
    } catch (firestoreError) {
      console.error('Error storing tokens in Firestore:', firestoreError);
      throw firestoreError;
    }
  } catch (error) {
    console.error('Error storing Eventbrite tokens:', error);
    throw error;
  }
}

// Get Eventbrite tokens
export async function getEventbriteTokens(userId: string): Promise<{
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiry: number | null;
}> {
  try {
    if (!userId) {
      console.error('User ID is required to get tokens');
      return { accessToken: null, refreshToken: null, tokenExpiry: null };
    }

    // First check if token is in cookies
    try {
      const cookieStore = cookies();
      const cookieToken = cookieStore.get('eventbrite_token')?.value;
      
      if (cookieToken) {
        console.log('Found Eventbrite token in cookies');
        // We only store access token in cookies, not refresh token
        return {
          accessToken: cookieToken,
          refreshToken: null, // We don't have this in cookies
          tokenExpiry: null,  // We don't have this in cookies
        };
      }
    } catch (cookieError) {
      console.error('Error checking token in cookies:', cookieError);
      // Continue to check Firestore
    }

    // If not in cookies, check Firestore
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        console.error('User document not found while getting tokens');
        return { accessToken: null, refreshToken: null, tokenExpiry: null };
      }

      const userData = userDoc.data();
      const tokenExpiry = userData.eventbriteTokenExpiry;
      
      // If token is expired or will expire in the next 5 minutes, try to refresh
      if (tokenExpiry && (Date.now() + 300000) >= tokenExpiry) {
        try {
          const refreshed = await refreshEventbriteToken(userId);
          if (refreshed) {
            // Get the new tokens after refresh
            const newUserDoc = await getDoc(doc(db, 'users', userId));
            if (!newUserDoc.exists()) {
              console.error('User document not found after token refresh');
              return { accessToken: null, refreshToken: null, tokenExpiry: null };
            }
            const newUserData = newUserDoc.data();
            return {
              accessToken: newUserData?.eventbriteToken || null,
              refreshToken: newUserData?.eventbriteRefreshToken || null,
              tokenExpiry: newUserData?.eventbriteTokenExpiry || null,
            };
          }
        } catch (refreshError) {
          console.error('Error refreshing token:', refreshError);
          // Continue with the existing token
        }
      }

      return {
        accessToken: userData.eventbriteToken || null,
        refreshToken: userData.eventbriteRefreshToken || null,
        tokenExpiry: userData.eventbriteTokenExpiry || null,
      };
    } catch (firestoreError) {
      console.error('Error accessing Firestore while getting tokens:', firestoreError);
      return { accessToken: null, refreshToken: null, tokenExpiry: null };
    }
  } catch (error) {
    console.error('Error getting Eventbrite tokens:', error);
    return { accessToken: null, refreshToken: null, tokenExpiry: null };
  }
}

// Refresh Eventbrite token
export async function refreshEventbriteToken(userId: string): Promise<boolean> {
  try {
    const { refreshToken } = await getEventbriteTokens(userId);
    if (!refreshToken) {
      console.error('No refresh token available');
      return false;
    }

    // For testing purposes, hardcoding the credentials
    const clientId = process.env.EVENTBRITE_CLIENT_ID || 'JHEEX22OX2CXXUZ37B';
    const clientSecret = process.env.EVENTBRITE_CLIENT_SECRET || 'BDZJQUIY57AXYTBWHFVQGSZP3OZTOHGIDTQQNEH3UUJNDGR5C3';

    if (!clientId || !clientSecret) {
      console.error('Missing Eventbrite credentials in environment');
      return false;
    }

    console.log('Refreshing token with credentials:', {
      clientIdExists: !!clientId,
      clientSecretExists: !!clientSecret
    });

    const response = await fetch('https://www.eventbrite.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to refresh token:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      return false;
    }

    const tokenData = await response.json();
    
    // Store the new tokens
    await storeEventbriteTokens(
      userId,
      tokenData.access_token,
      tokenData.refresh_token,
      tokenData.expires_in
    );
    
    console.log('Successfully refreshed and stored new tokens');
    return true;
  } catch (error) {
    console.error('Error refreshing Eventbrite token:', error);
    return false;
  }
} 