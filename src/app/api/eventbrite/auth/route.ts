import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { generateCsrfToken } from '@/lib/firebase/eventbriteUtils';

// Function to get base URL
const getBaseUrl = () => {
  return process.env.NEXT_PUBLIC_BASE_URL || 'https://event-connect-git-main-mindfulelementsinc-gmailcoms-projects.vercel.app';
};

// Initiate OAuth flow
export async function GET(request: NextRequest) {
  try {
    // Get user ID from cookies
    const userId = cookies().get('userId')?.value;
    if (!userId) {
      return NextResponse.redirect(
        `${getBaseUrl()}/profile?eventbrite_error=User%20not%20authenticated`
      );
    }

    // Generate and store CSRF token
    const csrfToken = generateCsrfToken();
    const cookieStore = cookies();
    cookieStore.set('eventbrite_csrf_token', csrfToken, {
      path: '/',
      secure: true,
      sameSite: 'lax',
      maxAge: 3600 // 1 hour
    });

    // Store CSRF token in user's document
    await setDoc(doc(db, 'users', userId), {
      eventbriteCsrfToken: csrfToken,
      eventbriteCsrfExpiry: Date.now() + (60 * 60 * 1000), // 1 hour expiry
    }, { merge: true });

    // Build OAuth URL
    const clientId = process.env.EVENTBRITE_CLIENT_ID;
    const redirectUri = encodeURIComponent(`${getBaseUrl()}/api/eventbrite/callback`);
    const state = encodeURIComponent(JSON.stringify({ csrfToken, userId }));

    const oauthUrl = `https://www.eventbrite.com/oauth/authorize?` +
      `response_type=code` +
      `&client_id=${clientId}` +
      `&redirect_uri=${redirectUri}` +
      `&state=${state}`;

    // Redirect to Eventbrite OAuth page
    return NextResponse.redirect(oauthUrl);
  } catch (error) {
    console.error('Error initiating OAuth flow:', error);
    return NextResponse.redirect(
      `${getBaseUrl()}/profile?eventbrite_error=Failed%20to%20initiate%20OAuth%20flow`
    );
  }
} 