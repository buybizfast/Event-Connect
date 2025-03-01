import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { getEdgeFirebase } from './edgeFirebase';
import { cookies } from 'next/headers';

// Generate a CSRF token using crypto.randomUUID
export function generateCsrfToken(): string {
  try {
    // Use crypto.randomUUID if available (Node.js environment)
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID().replace(/-/g, '');
    }
    
    // Fallback implementation
    const array = new Uint8Array(16);
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    
    return Array.from(array)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  } catch (error) {
    console.error('Error generating CSRF token:', error);
    
    // Last resort fallback
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }
}

// Store CSRF token in cookies only (no Firestore)
export function storeCsrfToken(userId: string, csrfToken: string): void {
  try {
    const tokenExpiry = Date.now() + (60 * 60 * 1000); // 1 hour expiry
    
    const cookieStore = cookies();
    cookieStore.set('eventbrite_csrf_token', csrfToken, {
      path: '/',
      secure: true,
      sameSite: 'lax',
      maxAge: 3600 // 1 hour
    });
    
    // Also store the user ID with the token for validation
    cookieStore.set('eventbrite_csrf_user', userId, {
      path: '/',
      secure: true,
      sameSite: 'lax',
      maxAge: 3600 // 1 hour
    });
    
    console.log('CSRF token stored in cookies for user:', userId);
  } catch (error) {
    console.error('Error storing CSRF token in cookies:', error);
    throw error;
  }
}

// Validate CSRF token from cookies only
export function validateCsrfToken(userId: string, token: string): boolean {
  try {
    if (!userId || !token) {
      console.error('Missing required parameters for CSRF validation');
      return false;
    }

    const cookieStore = cookies();
    const cookieCsrfToken = cookieStore.get('eventbrite_csrf_token')?.value;
    const cookieCsrfUser = cookieStore.get('eventbrite_csrf_user')?.value;
    
    if (!cookieCsrfToken || !cookieCsrfUser) {
      console.error('CSRF token or user not found in cookies');
      return false;
    }
    
    const tokenMatches = cookieCsrfToken === token;
    const userMatches = cookieCsrfUser === userId;
    
    console.log('CSRF validation results:', {
      tokenMatches,
      userMatches
    });
    
    return tokenMatches && userMatches;
  } catch (error) {
    console.error('Error validating CSRF token:', error);
    return false;
  }
}

// Store Eventbrite tokens in cookies only
export function storeEventbriteTokens(
  userId: string,
  accessToken: string,
  refreshToken: string,
  expiresIn: number
): void {
  try {
    if (!userId || !accessToken || !refreshToken || !expiresIn) {
      throw new Error('Missing required parameters for token storage');
    }
    
    console.log('Storing tokens for user:', userId, 'with expiry:', expiresIn);
    
    const cookieStore = cookies();
    
    // Store access token
    cookieStore.set('eventbrite_token', accessToken, {
      maxAge: expiresIn, // Use maxAge instead of expires
      path: '/',
      secure: true,
      sameSite: 'lax'
    });
    
    // Store refresh token (normally not recommended in cookies, but needed for Edge)
    cookieStore.set('eventbrite_refresh_token', refreshToken, {
      maxAge: expiresIn, // Use maxAge instead of expires
      path: '/',
      secure: true,
      httpOnly: true,
      sameSite: 'lax'
    });
    
    // Store user ID for token association
    cookieStore.set('eventbrite_token_user', userId, {
      maxAge: expiresIn, // Use maxAge instead of expires
      path: '/',
      secure: true,
      sameSite: 'lax'
    });
    
    // Store expiry time
    cookieStore.set('eventbrite_token_expiry', (Date.now() + (expiresIn * 1000)).toString(), {
      maxAge: expiresIn, // Use maxAge instead of expires
      path: '/',
      secure: true,
      sameSite: 'lax'
    });
    
    console.log('Eventbrite tokens stored in cookies for user:', userId);
  } catch (error) {
    console.error('Error storing Eventbrite tokens:', error);
    throw error;
  }
}

// Get Eventbrite tokens from cookies
export function getEventbriteTokens(userId: string): {
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiry: number | null;
} {
  try {
    if (!userId) {
      console.error('User ID is required to get tokens');
      return { accessToken: null, refreshToken: null, tokenExpiry: null };
    }
    
    const cookieStore = cookies();
    const accessToken = cookieStore.get('eventbrite_token')?.value || null;
    const refreshToken = cookieStore.get('eventbrite_refresh_token')?.value || null;
    const tokenExpiry = cookieStore.get('eventbrite_token_expiry')?.value || null;
    const tokenUser = cookieStore.get('eventbrite_token_user')?.value || null;
    
    // Verify the token belongs to the correct user
    if (tokenUser !== userId) {
      console.error('Token user mismatch');
      return { accessToken: null, refreshToken: null, tokenExpiry: null };
    }
    
    return {
      accessToken,
      refreshToken,
      tokenExpiry: tokenExpiry ? parseInt(tokenExpiry, 10) : null
    };
  } catch (error) {
    console.error('Error getting Eventbrite tokens:', error);
    return { accessToken: null, refreshToken: null, tokenExpiry: null };
  }
} 