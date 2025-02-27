import { NextRequest, NextResponse } from 'next/server';

// Eventbrite OAuth endpoints
const EVENTBRITE_AUTH_URL = 'https://www.eventbrite.com/oauth/authorize';
const EVENTBRITE_TOKEN_URL = 'https://www.eventbrite.com/oauth/token';

// Your Eventbrite OAuth credentials (should be stored in environment variables)
const EVENTBRITE_CLIENT_ID = process.env.EVENTBRITE_CLIENT_ID || '';
const EVENTBRITE_CLIENT_SECRET = process.env.EVENTBRITE_CLIENT_SECRET || '';

// Function to get base URL
const getBaseUrl = () => {
  // In server components, we should only use the environment variable or a fallback
  return process.env.NEXT_PUBLIC_BASE_URL || 'https://event-connect.vercel.app';
};

const REDIRECT_URI = `${getBaseUrl()}/api/eventbrite/callback`;

// Initiate OAuth flow
export async function GET(request: NextRequest) {
  // Check if Eventbrite credentials are configured
  if (!EVENTBRITE_CLIENT_ID) {
    console.error('Eventbrite Client ID is not configured');
    return NextResponse.redirect(
      `${getBaseUrl()}/profile?eventbrite_error=Eventbrite%20Client%20ID%20is%20not%20configured`
    );
  }

  // Get the eventId from the query parameters if available
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get('eventId');
  
  // Generate a random state for CSRF protection
  const randomState = Math.random().toString(36).substring(2, 15);
  
  // Build the state parameter to include the eventId and random state
  const state = JSON.stringify({ 
    eventId: eventId || null, 
    csrf: randomState 
  });
  
  // Log the auth URL for debugging
  const authUrl = `${EVENTBRITE_AUTH_URL}?response_type=code&client_id=${EVENTBRITE_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${encodeURIComponent(state)}`;
  console.log('Eventbrite Auth URL:', authUrl);
  
  // Store state in cookie for CSRF protection
  const response = NextResponse.redirect(authUrl);
  
  response.cookies.set('eventbrite_oauth_state', randomState, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 10, // 10 minutes
    path: '/',
  });
  
  return response;
}

// Exchange authorization code for access token
export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();
    
    if (!code) {
      return NextResponse.json({ error: 'Authorization code is required' }, { status: 400 });
    }
    
    // Check if Eventbrite credentials are configured
    if (!EVENTBRITE_CLIENT_ID || !EVENTBRITE_CLIENT_SECRET) {
      console.error('Eventbrite credentials are not configured');
      return NextResponse.json({ error: 'Eventbrite credentials are not configured' }, { status: 500 });
    }
    
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
      console.error('Eventbrite token error:', errorData);
      return NextResponse.json({ error: 'Failed to exchange code for token', details: errorData }, { status: 400 });
    }
    
    const tokenData = await tokenResponse.json();
    
    return NextResponse.json({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in,
    });
  } catch (error) {
    console.error('Error exchanging code for token:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 