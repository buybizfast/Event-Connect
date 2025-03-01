import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { generateCsrfToken, storeCsrfToken } from '@/lib/firebase/edgeEventbriteUtils';
import { getBaseUrl } from '@/lib/utils/urlUtils';

// Specify that this route is dynamic and requires the Edge Runtime
export const dynamic = 'force-dynamic';
export const runtime = 'edge';

// For testing purposes, hardcoding the client ID
const EVENTBRITE_CLIENT_ID = process.env.EVENTBRITE_CLIENT_ID || 'JHEEX22OX2CXXUZ37B';

// Initiate OAuth flow
export async function GET(request: NextRequest) {
  try {
    // Get user ID from cookies
    const userId = cookies().get('userId')?.value;
    if (!userId) {
      console.error('User ID not found in cookies');
      return NextResponse.redirect(
        `${getBaseUrl()}/profile?eventbrite_error=${encodeURIComponent('User not authenticated')}`
      );
    }

    console.log('Initiating Eventbrite OAuth flow for user:', userId);

    // Generate CSRF token using Edge-compatible method
    const csrfToken = generateCsrfToken();
    console.log('Generated CSRF token for user:', userId);
    
    // Store CSRF token in cookies only (no Firestore)
    try {
      storeCsrfToken(userId, csrfToken);
      console.log('Successfully stored CSRF token in cookies for user:', userId);
    } catch (error) {
      console.error('Error storing CSRF token:', error);
      // Continue with OAuth flow even if token storage fails
    }

    // Build OAuth URL
    const clientId = EVENTBRITE_CLIENT_ID;
    if (!clientId) {
      console.error('Missing Eventbrite client ID in environment variables');
      return NextResponse.redirect(
        `${getBaseUrl()}/profile?eventbrite_error=${encodeURIComponent('Missing Eventbrite configuration')}`
      );
    }

    // Using the exact URL for consistency with the callback route
    const redirectUri = encodeURIComponent('https://event-connect-git-main-mindfulelementsinc-gmailcoms-projects.vercel.app/api/eventbrite/callback');
    const state = encodeURIComponent(JSON.stringify({ csrfToken, userId }));

    console.log('OAuth parameters:', {
      redirectUri: decodeURIComponent(redirectUri),
      clientId: clientId ? 'present' : 'missing'
    });

    const oauthUrl = `https://www.eventbrite.com/oauth/authorize?` +
      `response_type=code` +
      `&client_id=${clientId}` +
      `&redirect_uri=${redirectUri}` +
      `&state=${state}`;

    console.log('Redirecting to Eventbrite OAuth page');
    
    // Redirect to Eventbrite OAuth page
    return NextResponse.redirect(oauthUrl);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error initiating OAuth flow:', error);
    return NextResponse.redirect(
      `${getBaseUrl()}/profile?eventbrite_error=${encodeURIComponent(`Failed to initiate OAuth flow: ${errorMessage}`)}`
    );
  }
} 