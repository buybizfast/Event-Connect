import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { generateCsrfToken } from '@/lib/firebase/eventbriteUtils';
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

    // Generate CSRF token first
    const csrfToken = generateCsrfToken();
    console.log('Generated CSRF token for user:', userId);
    
    // Set CSRF token in cookies
    const cookieStore = cookies();
    cookieStore.set('eventbrite_csrf_token', csrfToken, {
      path: '/',
      secure: true,
      sameSite: 'lax',
      maxAge: 3600 // 1 hour
    });

    // Try to store CSRF token in Firestore
    try {
      // Check if user exists in Firestore
      const userDoc = await getDoc(doc(db, 'users', userId));
      
      const tokenExpiry = Date.now() + (60 * 60 * 1000); // 1 hour expiry
      
      if (!userDoc.exists()) {
        console.log('User document not found in Firestore, creating new one:', userId);
        
        // Create user document if it doesn't exist
        await setDoc(doc(db, 'users', userId), {
          eventbriteCsrfToken: csrfToken,
          eventbriteCsrfExpiry: tokenExpiry,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      } else {
        console.log('Updating existing user document with CSRF token for user:', userId);
        
        // Update existing document with CSRF token
        await setDoc(doc(db, 'users', userId), {
          eventbriteCsrfToken: csrfToken,
          eventbriteCsrfExpiry: tokenExpiry,
          updatedAt: Date.now()
        }, { merge: true });
      }
      
      console.log('Successfully stored CSRF token in Firestore for user:', userId);
    } catch (firestoreError) {
      console.error('Error storing CSRF token in Firestore:', firestoreError);
      // Continue with OAuth flow even if Firestore storage fails
      // We'll rely on the cookie for CSRF validation as a fallback
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