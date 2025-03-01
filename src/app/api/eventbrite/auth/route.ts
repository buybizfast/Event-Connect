import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { generateCsrfToken } from '@/lib/firebase/eventbriteUtils';
import { getBaseUrl } from '@/lib/utils/urlUtils';

// Specify that this route uses the Edge Runtime
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
        `${getBaseUrl()}/profile?eventbrite_error=User%20not%20authenticated`
      );
    }

    console.log('Initiating Eventbrite OAuth flow for user:', userId);

    // Check if user exists in Firestore
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      console.error('User document not found in Firestore:', userId);
      
      // Create user document if it doesn't exist
      await setDoc(doc(db, 'users', userId), {
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      
      console.log('Created new user document for:', userId);
    }

    // Generate and store CSRF token
    const csrfToken = generateCsrfToken();
    console.log('Generated CSRF token for user:', userId);
    
    const cookieStore = cookies();
    cookieStore.set('eventbrite_csrf_token', csrfToken, {
      path: '/',
      secure: true,
      sameSite: 'lax',
      maxAge: 3600 // 1 hour
    });

    // Store CSRF token in user's document
    const tokenExpiry = Date.now() + (60 * 60 * 1000); // 1 hour expiry
    await setDoc(doc(db, 'users', userId), {
      eventbriteCsrfToken: csrfToken,
      eventbriteCsrfExpiry: tokenExpiry,
      updatedAt: Date.now()
    }, { merge: true });

    console.log('Stored CSRF token in Firestore for user:', userId);

    // Build OAuth URL
    const clientId = EVENTBRITE_CLIENT_ID;
    if (!clientId) {
      console.error('Missing Eventbrite client ID in environment variables');
      return NextResponse.redirect(
        `${getBaseUrl()}/profile?eventbrite_error=Missing%20Eventbrite%20configuration`
      );
    }

    const baseUrl = getBaseUrl();
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