import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { updateEvent } from '@/lib/firebase/eventUtils';
import { doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';

// Eventbrite OAuth token endpoint
const EVENTBRITE_TOKEN_URL = 'https://www.eventbrite.com/oauth/token';
const EVENTBRITE_API_BASE = 'https://www.eventbriteapi.com/v3';

// Your Eventbrite OAuth credentials (should be stored in environment variables)
const EVENTBRITE_CLIENT_ID = process.env.EVENTBRITE_CLIENT_ID || '';
const EVENTBRITE_CLIENT_SECRET = process.env.EVENTBRITE_CLIENT_SECRET || '';

// Function to get base URL
const getBaseUrl = () => {
  // In server components, we should only use the environment variable or a fallback
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
};

const REDIRECT_URI = `${getBaseUrl()}/api/eventbrite/callback`;
const BASE_URL = getBaseUrl();

// Helper function to ensure user document exists
async function ensureUserDocument(userId: string) {
  const userRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userRef);
  
  if (!userDoc.exists()) {
    // Create the user document with basic fields
    await setDoc(userRef, {
      id: userId,
      displayName: '',
      email: '',
      company: '',
      title: '',
      interests: [],
      skills: [],
      positions: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      eventbriteToken: null,
      eventbriteRefreshToken: null,
      eventbriteTokenExpiry: null
    });
  }
  return userRef;
}

export async function GET(request: NextRequest) {
  // Get the authorization code from the URL query parameters
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const state = searchParams.get('state');
  
  // Parse the state parameter to get the eventId and CSRF token
  let eventId: string | null = null;
  let csrfToken: string | null = null;
  
  if (state) {
    try {
      const stateObj = JSON.parse(state);
      eventId = stateObj.eventId;
      csrfToken = stateObj.csrf;
    } catch (err) {
      console.error('Error parsing state parameter:', err);
      return NextResponse.redirect(`${BASE_URL}/profile?eventbrite_error=invalid_state`);
    }
  }
  
  // Verify CSRF token
  const storedCsrfToken = request.cookies.get('eventbrite_oauth_state')?.value;
  if (!csrfToken || !storedCsrfToken || csrfToken !== storedCsrfToken) {
    console.error('CSRF token validation failed');
    return NextResponse.redirect(`${BASE_URL}/profile?eventbrite_error=csrf_validation_failed`);
  }
  
  // Handle error case
  if (error) {
    console.error('Eventbrite OAuth error:', error);
    if (eventId) {
      return NextResponse.redirect(`${BASE_URL}/events/${eventId}?eventbrite_error=${error}`);
    }
    return NextResponse.redirect(`${BASE_URL}/profile?eventbrite_error=${error}`);
  }
  
  // Handle missing code
  if (!code) {
    console.error('No authorization code received from Eventbrite');
    if (eventId) {
      return NextResponse.redirect(`${BASE_URL}/events/${eventId}?eventbrite_error=no_code`);
    }
    return NextResponse.redirect(`${BASE_URL}/profile?eventbrite_error=no_code`);
  }
  
  // Check if Eventbrite credentials are configured
  if (!EVENTBRITE_CLIENT_ID || !EVENTBRITE_CLIENT_SECRET) {
    console.error('Eventbrite credentials are not configured');
    const errorMessage = encodeURIComponent('Eventbrite credentials are not configured. Please check your environment variables.');
    return NextResponse.redirect(`${BASE_URL}/profile?eventbrite_error=${errorMessage}`);
  }
  
  try {
    // Exchange the authorization code for an access token
    const tokenResponse = await fetch(EVENTBRITE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: EVENTBRITE_CLIENT_ID,
        client_secret: EVENTBRITE_CLIENT_SECRET,
        code,
        redirect_uri: REDIRECT_URI,
      }).toString(),
    });
    
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({ error: 'Unknown error' }));
      console.error('Error exchanging code for token:', errorData);
      const errorMessage = encodeURIComponent(errorData.error_description || errorData.error || 'Failed to exchange code for token');
      if (eventId) {
        return NextResponse.redirect(`${BASE_URL}/events/${eventId}?eventbrite_error=${errorMessage}`);
      }
      return NextResponse.redirect(`${BASE_URL}/profile?eventbrite_error=${errorMessage}`);
    }
    
    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokenData;
    
    // Set the access token in a cookie
    const response = NextResponse.redirect(
      eventId ? `${BASE_URL}/events/${eventId}?eventbrite_connected=true` : `${BASE_URL}/profile?eventbrite_connected=true`
    );
    
    // Set the token in a secure HTTP-only cookie
    response.cookies.set('eventbrite_access_token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: expires_in,
      path: '/',
    });
    
    // If we have a user ID in the cookies, store the token in Firestore
    const userId = request.cookies.get('userId')?.value;
    if (userId) {
      try {
        // Ensure the user document exists and get its reference
        const userRef = await ensureUserDocument(userId);
        
        // Get the user's current data
        const userDoc = await getDoc(userRef);
        if (!userDoc.exists()) {
          throw new Error('User document not found after creation');
        }

        // Store the token in the user's document
        await updateDoc(userRef, {
          eventbriteToken: access_token,
          eventbriteRefreshToken: refresh_token,
          eventbriteTokenExpiry: Date.now() + (expires_in * 1000),
          updatedAt: Date.now()
        });

        // Verify the token was stored by reading it back
        const updatedDoc = await getDoc(userRef);
        if (!updatedDoc.exists() || !updatedDoc.data()?.eventbriteToken) {
          throw new Error('Failed to verify token storage');
        }
        
        // If we have an eventId, update the event with Eventbrite data
        if (eventId) {
          try {
            await updateEvent(eventId, {
              eventbriteConnected: true,
              eventbriteId: undefined, // Will be updated when fetching event details
              updatedAt: Date.now()
            });
          } catch (err) {
            console.error('Error updating event with Eventbrite connection:', err);
          }
        }
      } catch (err) {
        console.error('Error storing Eventbrite token in Firestore:', err);
        return NextResponse.redirect(
          `${BASE_URL}/profile?eventbrite_error=${encodeURIComponent('Failed to store Eventbrite connection. Please try again.')}`
        );
      }
    } else {
      console.error('No userId found in cookies');
      return NextResponse.redirect(
        `${BASE_URL}/profile?eventbrite_error=${encodeURIComponent('User not authenticated. Please sign in and try again.')}`
      );
    }
    
    return response;
  } catch (error) {
    console.error('Error in Eventbrite callback:', error);
    const errorMessage = encodeURIComponent('Internal server error during OAuth callback');
    if (eventId) {
      return NextResponse.redirect(`${BASE_URL}/events/${eventId}?eventbrite_error=${errorMessage}`);
    }
    return NextResponse.redirect(`${BASE_URL}/profile?eventbrite_error=${errorMessage}`);
  }
} 