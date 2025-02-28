import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { validateCsrfToken, storeEventbriteTokens } from '@/lib/firebase/eventbriteUtils';
import { getBaseUrl } from '@/lib/utils/urlUtils';

// Eventbrite OAuth token endpoint
const EVENTBRITE_TOKEN_URL = 'https://www.eventbrite.com/oauth/token';

// Your Eventbrite OAuth credentials
const EVENTBRITE_CLIENT_ID = process.env.EVENTBRITE_CLIENT_ID;
const EVENTBRITE_CLIENT_SECRET = process.env.EVENTBRITE_CLIENT_SECRET;

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
        `${baseUrl}/profile?eventbrite_error=Missing%20required%20parameters`
      );
    }

    // Parse state parameter
    let csrfToken, userId;
    try {
      const state = JSON.parse(decodeURIComponent(stateParam));
      csrfToken = state.csrfToken;
      userId = state.userId;
    } catch (error) {
      console.error('Error parsing state parameter:', error);
      return NextResponse.redirect(
        `${baseUrl}/profile?eventbrite_error=Invalid%20state%20parameter`
      );
    }

    // Validate CSRF token
    const isValidCsrf = await validateCsrfToken(userId, csrfToken);
    if (!isValidCsrf) {
      console.error('CSRF validation failed for user:', userId);
      return NextResponse.redirect(
        `${baseUrl}/profile?eventbrite_error=Invalid%20CSRF%20token`
      );
    }

    // Check required credentials
    if (!EVENTBRITE_CLIENT_ID || !EVENTBRITE_CLIENT_SECRET) {
      console.error('Missing Eventbrite credentials');
      return NextResponse.redirect(
        `${baseUrl}/profile?eventbrite_error=Configuration%20error`
      );
    }

    // Exchange code for access token
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
        redirect_uri: `${baseUrl}/api/eventbrite/callback`,
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
        `${baseUrl}/profile?eventbrite_error=Failed%20to%20exchange%20code%20for%20token`
      );
    }

    const tokenData = await tokenResponse.json();

    // Store tokens in Firestore
    await storeEventbriteTokens(
      userId,
      tokenData.access_token,
      tokenData.refresh_token,
      tokenData.expires_in
    );

    // Clear CSRF token cookie
    const cookieStore = cookies();
    cookieStore.delete('eventbrite_csrf_token');

    // Redirect back to profile with success
    return NextResponse.redirect(
      `${baseUrl}/profile?eventbrite_connected=true`
    );
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    return NextResponse.redirect(
      `${baseUrl}/profile?eventbrite_error=Internal%20server%20error`
    );
  }
} 