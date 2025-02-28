import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { validateCsrfToken, storeEventbriteTokens } from '@/lib/firebase/eventbriteUtils';

// Eventbrite OAuth token endpoint
const EVENTBRITE_TOKEN_URL = 'https://www.eventbrite.com/oauth/token';
const EVENTBRITE_API_BASE = 'https://www.eventbriteapi.com/v3';

// Your Eventbrite OAuth credentials
const EVENTBRITE_CLIENT_ID = process.env.EVENTBRITE_CLIENT_ID || '';
const EVENTBRITE_CLIENT_SECRET = process.env.EVENTBRITE_CLIENT_SECRET || '';

// Function to get base URL
const getBaseUrl = () => {
  return process.env.NEXT_PUBLIC_BASE_URL || 'https://event-connect-git-main-mindfulelementsinc-gmailcoms-projects.vercel.app';
};

const REDIRECT_URI = `${getBaseUrl()}/api/eventbrite/callback`;

export async function GET(request: NextRequest) {
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
        `${getBaseUrl()}/profile?eventbrite_error=${encodeURIComponent(error)}`
      );
    }

    // Validate required parameters
    if (!code || !stateParam) {
      return NextResponse.redirect(
        `${getBaseUrl()}/profile?eventbrite_error=Missing%20required%20parameters`
      );
    }

    // Parse state parameter
    const { csrfToken, userId } = JSON.parse(decodeURIComponent(stateParam));

    // Validate CSRF token
    const isValidCsrf = await validateCsrfToken(userId, csrfToken);
    if (!isValidCsrf) {
      return NextResponse.redirect(
        `${getBaseUrl()}/profile?eventbrite_error=Invalid%20CSRF%20token`
      );
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://www.eventbrite.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: process.env.EVENTBRITE_CLIENT_ID!,
        client_secret: process.env.EVENTBRITE_CLIENT_SECRET!,
        grant_type: 'authorization_code',
        redirect_uri: `${getBaseUrl()}/api/eventbrite/callback`,
      }),
    });

    if (!tokenResponse.ok) {
      console.error('Failed to exchange code for token:', await tokenResponse.text());
      return NextResponse.redirect(
        `${getBaseUrl()}/profile?eventbrite_error=Failed%20to%20exchange%20code%20for%20token`
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
      `${getBaseUrl()}/profile?eventbrite_connected=true`
    );
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    return NextResponse.redirect(
      `${getBaseUrl()}/profile?eventbrite_error=Internal%20server%20error`
    );
  }
} 