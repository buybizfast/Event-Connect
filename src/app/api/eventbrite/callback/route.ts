import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { validateCsrfToken, storeEventbriteTokens } from '@/lib/firebase/edgeEventbriteUtils';
import { getBaseUrl } from '@/lib/utils/urlUtils';

// Specify that this route is dynamic and requires the Edge Runtime
export const dynamic = 'force-dynamic';
export const runtime = 'edge';

// Eventbrite OAuth token endpoint
const EVENTBRITE_TOKEN_URL = 'https://www.eventbrite.com/oauth/token';

// Your Eventbrite OAuth credentials
// For testing purposes, hardcoding the credentials to see if this resolves the issue
const EVENTBRITE_CLIENT_ID = process.env.EVENTBRITE_CLIENT_ID || 'JHEEX22OX2CXXUZ37B';
const EVENTBRITE_CLIENT_SECRET = process.env.EVENTBRITE_CLIENT_SECRET || 'BDZJQUIY57AXYTBWHFVQGSZP3OZTOHGIDTQQNEH3UUJNDGR5C3';

console.log('Eventbrite credentials check:', {
  clientIdExists: !!EVENTBRITE_CLIENT_ID,
  clientSecretExists: !!EVENTBRITE_CLIENT_SECRET,
  clientIdFromEnv: !!process.env.EVENTBRITE_CLIENT_ID,
  clientSecretFromEnv: !!process.env.EVENTBRITE_CLIENT_SECRET
});

if (!EVENTBRITE_CLIENT_ID || !EVENTBRITE_CLIENT_SECRET) {
  console.error('Missing required Eventbrite credentials in environment variables');
}

export async function GET(request: NextRequest) {
  const baseUrl = getBaseUrl();
  
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const stateParam = searchParams.get('state');

    // Log the received parameters for debugging
    console.log('Eventbrite callback received:', { 
      code: code ? 'present' : 'missing', 
      error: error || 'none', 
      state: stateParam ? 'present' : 'missing',
      url: request.url
    });

    // Handle errors from Eventbrite
    if (error) {
      console.error('Eventbrite OAuth error:', error);
      return NextResponse.redirect(
        `${baseUrl}/profile?eventbrite_error=${encodeURIComponent(error)}`
      );
    }

    // Validate required parameters
    if (!code || !stateParam) {
      console.error('Missing required parameters:', { code: !!code, state: !!stateParam });
      return NextResponse.redirect(
        `${baseUrl}/profile?eventbrite_error=${encodeURIComponent('Missing required parameters')}`
      );
    }

    // Parse state parameter
    let csrfToken, userId;
    try {
      const state = JSON.parse(decodeURIComponent(stateParam));
      csrfToken = state.csrfToken;
      userId = state.userId;
      
      console.log('Parsed state parameter:', { userId, csrfTokenLength: csrfToken?.length });
    } catch (error) {
      console.error('Error parsing state parameter:', error);
      return NextResponse.redirect(
        `${baseUrl}/profile?eventbrite_error=${encodeURIComponent('Invalid state parameter')}`
      );
    }

    // Validate CSRF token using Edge-compatible method
    const isValidCsrf = validateCsrfToken(userId, csrfToken);
    
    if (!isValidCsrf) {
      console.error('CSRF validation failed for user:', userId);
      return NextResponse.redirect(
        `${baseUrl}/profile?eventbrite_error=${encodeURIComponent('Invalid CSRF token')}`
      );
    }

    // Check required credentials
    if (!EVENTBRITE_CLIENT_ID || !EVENTBRITE_CLIENT_SECRET) {
      console.error('Missing Eventbrite credentials');
      return NextResponse.redirect(
        `${baseUrl}/profile?eventbrite_error=${encodeURIComponent('Configuration error')}`
      );
    }

    // Prepare redirect URI - ensure it matches exactly what's configured in Eventbrite
    // Using the exact URL from the authorization request for consistency
    const redirectUri = 'https://event-connect-git-main-mindfulelementsinc-gmailcoms-projects.vercel.app/api/eventbrite/callback';
    console.log('Using redirect URI:', redirectUri);

    // Exchange code for access token
    console.log('Exchanging code for access token...');
    const tokenResponse = await fetch(EVENTBRITE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: EVENTBRITE_CLIENT_ID,
        client_secret: EVENTBRITE_CLIENT_SECRET,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Failed to exchange code for token:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        error: errorText
      });
      return NextResponse.redirect(
        `${baseUrl}/profile?eventbrite_error=${encodeURIComponent(`Token exchange failed: ${tokenResponse.status} ${tokenResponse.statusText}`)}`
      );
    }

    const tokenData = await tokenResponse.json();
    console.log('Successfully received token data');

    // Store tokens in cookies only (no Firestore)
    try {
      console.log('About to store tokens with expiry:', tokenData.expires_in);
      
      // Validate token data
      if (!tokenData.access_token || !tokenData.refresh_token || !tokenData.expires_in) {
        console.error('Invalid token data received:', Object.keys(tokenData));
        return NextResponse.redirect(
          `${baseUrl}/profile?eventbrite_error=${encodeURIComponent('Invalid token data received from Eventbrite')}`
        );
      }
      
      storeEventbriteTokens(
        userId,
        tokenData.access_token,
        tokenData.refresh_token,
        tokenData.expires_in
      );
      console.log('Successfully stored tokens in cookies');
    } catch (storeError) {
      console.error('Error storing tokens:', storeError instanceof Error ? storeError.message : storeError);
      return NextResponse.redirect(
        `${baseUrl}/profile?eventbrite_error=${encodeURIComponent('Failed to store tokens: ' + (storeError instanceof Error ? storeError.message : 'Unknown error'))}`
      );
    }

    // Clear CSRF token cookie
    const cookieStore = cookies();
    cookieStore.delete('eventbrite_csrf_token');
    cookieStore.delete('eventbrite_csrf_user');

    // Redirect back to profile with success
    console.log('OAuth flow completed successfully');
    return NextResponse.redirect(
      `${baseUrl}/profile?eventbrite_connected=true`
    );
  } catch (error) {
    // Provide more detailed error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in OAuth callback:', error);
    return NextResponse.redirect(
      `${baseUrl}/profile?eventbrite_error=${encodeURIComponent(`Internal server error: ${errorMessage}`)}`
    );
  }
} 