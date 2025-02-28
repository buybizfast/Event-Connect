import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { storeEventbriteTokens } from '@/lib/firebase/eventbriteUtils';

// Eventbrite OAuth token endpoint
const EVENTBRITE_TOKEN_URL = 'https://www.eventbrite.com/oauth/token';
const EVENTBRITE_API_BASE = 'https://www.eventbriteapi.com/v3';

// Your Eventbrite OAuth credentials
const EVENTBRITE_CLIENT_ID = process.env.EVENTBRITE_CLIENT_ID || '';
const EVENTBRITE_CLIENT_SECRET = process.env.EVENTBRITE_CLIENT_SECRET || '';

// Function to get base URL
const getBaseUrl = () => {
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
};

const REDIRECT_URI = `${getBaseUrl()}/api/eventbrite/callback`;

export async function GET(request: NextRequest) {
  // Get the authorization code from the URL query parameters
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const state = searchParams.get('state');
  
  // Get user ID from cookies
  const userId = cookies().get('userId')?.value;
  
  if (!userId) {
    console.error('No user ID found in cookies');
    return NextResponse.redirect(
      `${getBaseUrl()}/profile?eventbrite_error=${encodeURIComponent('User not authenticated. Please sign in and try again.')}`
    );
  }
  
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
      return NextResponse.redirect(`${getBaseUrl()}/profile?eventbrite_error=invalid_state`);
    }
  }
  
  // Verify CSRF token
  const storedCsrfToken = cookies().get('eventbrite_oauth_state')?.value;
  if (!csrfToken || !storedCsrfToken || csrfToken !== storedCsrfToken) {
    console.error('CSRF token validation failed');
    return NextResponse.redirect(`${getBaseUrl()}/profile?eventbrite_error=csrf_validation_failed`);
  }
  
  // Handle error case
  if (error) {
    console.error('Eventbrite OAuth error:', error);
    return NextResponse.redirect(
      eventId 
        ? `${getBaseUrl()}/events/${eventId}?eventbrite_error=${error}`
        : `${getBaseUrl()}/profile?eventbrite_error=${error}`
    );
  }
  
  // Handle missing code
  if (!code) {
    console.error('No authorization code received from Eventbrite');
    return NextResponse.redirect(
      eventId
        ? `${getBaseUrl()}/events/${eventId}?eventbrite_error=no_code`
        : `${getBaseUrl()}/profile?eventbrite_error=no_code`
    );
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
      return NextResponse.redirect(
        eventId
          ? `${getBaseUrl()}/events/${eventId}?eventbrite_error=${encodeURIComponent('Failed to exchange code for token')}`
          : `${getBaseUrl()}/profile?eventbrite_error=${encodeURIComponent('Failed to exchange code for token')}`
      );
    }
    
    const tokenData = await tokenResponse.json();
    
    // Get the organization ID
    const orgResponse = await fetch(`${EVENTBRITE_API_BASE}/users/me/organizations`, {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    });
    
    let organizationId = null;
    if (orgResponse.ok) {
      const orgData = await orgResponse.json();
      if (orgData.organizations && orgData.organizations.length > 0) {
        organizationId = orgData.organizations[0].id;
      }
    }
    
    // Store tokens in Firestore
    await storeEventbriteTokens(userId, {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresIn: tokenData.expires_in,
      organizationId
    });
    
    // Set success cookie and redirect
    const response = NextResponse.redirect(
      eventId
        ? `${getBaseUrl()}/events/${eventId}?eventbrite_connected=true`
        : `${getBaseUrl()}/profile?eventbrite_connected=true`
    );
    
    // Clear the CSRF token cookie
    response.cookies.set('eventbrite_oauth_state', '', { maxAge: 0 });
    
    return response;
  } catch (error) {
    console.error('Error in Eventbrite callback:', error);
    return NextResponse.redirect(
      eventId
        ? `${getBaseUrl()}/events/${eventId}?eventbrite_error=${encodeURIComponent('Internal server error during OAuth callback')}`
        : `${getBaseUrl()}/profile?eventbrite_error=${encodeURIComponent('Internal server error during OAuth callback')}`
    );
  }
} 