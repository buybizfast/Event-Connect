import { randomBytes } from 'crypto';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { cookies } from 'next/headers';

// Generate a CSRF token
export function generateCsrfToken(): string {
  return randomBytes(32).toString('hex');
}

// Validate CSRF token
export async function validateCsrfToken(userId: string, token: string): Promise<boolean> {
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
      console.error('CSRF token or expiry not found in user document');
      return false;
    }

    const isValid = storedToken === token && Date.now() < tokenExpiry;
    
    if (!isValid) {
      console.error('CSRF validation failed:', {
        tokenMatch: storedToken === token,
        expired: Date.now() >= tokenExpiry
      });
    }

    return isValid;
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
    if (!userId || !accessToken || !refreshToken || !expiresIn) {
      throw new Error('Missing required parameters for token storage');
    }

    const tokenExpiry = Date.now() + (expiresIn * 1000);
    
    // Store in Firebase
    await setDoc(doc(db, 'users', userId), {
      eventbriteToken: accessToken,
      eventbriteRefreshToken: refreshToken,
      eventbriteTokenExpiry: tokenExpiry,
      eventbriteTokenUpdatedAt: Date.now(),
      eventbriteCsrfToken: null,
      eventbriteCsrfExpiry: null,
    }, { merge: true });

    // Store in cookies
    const cookieStore = cookies();
    cookieStore.set('eventbrite_token', accessToken, {
      expires: new Date(tokenExpiry),
      path: '/',
      secure: true,
      sameSite: 'lax'
    });
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

    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      console.error('User document not found while getting tokens');
      return { accessToken: null, refreshToken: null, tokenExpiry: null };
    }

    const userData = userDoc.data();
    const tokenExpiry = userData.eventbriteTokenExpiry;
    
    // If token is expired or will expire in the next 5 minutes, try to refresh
    if (tokenExpiry && (Date.now() + 300000) >= tokenExpiry) {
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
    }

    return {
      accessToken: userData.eventbriteToken || null,
      refreshToken: userData.eventbriteRefreshToken || null,
      tokenExpiry: userData.eventbriteTokenExpiry || null,
    };
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

    if (!process.env.EVENTBRITE_CLIENT_ID || !process.env.EVENTBRITE_CLIENT_SECRET) {
      console.error('Missing Eventbrite credentials in environment');
      return false;
    }

    const response = await fetch('https://www.eventbrite.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: process.env.EVENTBRITE_CLIENT_ID,
        client_secret: process.env.EVENTBRITE_CLIENT_SECRET,
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

    const data = await response.json();
    await storeEventbriteTokens(
      userId,
      data.access_token,
      data.refresh_token,
      data.expires_in
    );

    return true;
  } catch (error) {
    console.error('Error refreshing Eventbrite token:', error);
    return false;
  }
} 