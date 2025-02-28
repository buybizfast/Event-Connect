import { randomBytes } from 'crypto';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

// Generate a CSRF token
export function generateCsrfToken(): string {
  return randomBytes(32).toString('hex');
}

// Validate CSRF token
export async function validateCsrfToken(userId: string, token: string): Promise<boolean> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) return false;

    const userData = userDoc.data();
    const storedToken = userData.eventbriteCsrfToken;
    const tokenExpiry = userData.eventbriteCsrfExpiry;

    return (
      storedToken === token &&
      tokenExpiry &&
      Date.now() < tokenExpiry
    );
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
    await setDoc(doc(db, 'users', userId), {
      eventbriteToken: accessToken,
      eventbriteRefreshToken: refreshToken,
      eventbriteTokenExpiry: Date.now() + (expiresIn * 1000),
      eventbriteCsrfToken: null,
      eventbriteCsrfExpiry: null,
    }, { merge: true });
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
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return { accessToken: null, refreshToken: null, tokenExpiry: null };
    }

    const userData = userDoc.data();
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
    if (!refreshToken) return false;

    const response = await fetch('https://www.eventbrite.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: process.env.EVENTBRITE_CLIENT_ID!,
        client_secret: process.env.EVENTBRITE_CLIENT_SECRET!,
      }),
    });

    if (!response.ok) {
      console.error('Failed to refresh token:', await response.text());
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