import { NextRequest, NextResponse } from 'next/server';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase/firebase';
import { getUserProfile } from '@/lib/firebase/firebaseUtils';

// LinkedIn OAuth token endpoint
const LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';

// Your LinkedIn OAuth credentials (should be stored in environment variables)
const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID || '';
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET || '';
// Make sure to use the correct port from the environment variable
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_BASE_URL}/api/linkedin/callback`;

export async function GET(request: NextRequest) {
  console.log('LinkedIn Callback Route - Processing callback');
  
  // Get the URL parameters
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  
  console.log('LinkedIn Callback - Parameters:', { 
    code: code ? 'Present' : 'Missing',
    state: state ? 'Present' : 'Missing',
    error: error || 'None',
    errorDescription: errorDescription || 'None'
  });
  
  // Check for errors from LinkedIn
  if (error) {
    console.error('LinkedIn OAuth error:', error, errorDescription);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/?linkedin_error=${encodeURIComponent(errorDescription || error)}`
    );
  }
  
  // Check if code is present
  if (!code) {
    console.error('No authorization code received from LinkedIn');
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/?linkedin_error=No%20authorization%20code%20received`
    );
  }
  
  // Check if LinkedIn credentials are configured
  if (!LINKEDIN_CLIENT_ID || !LINKEDIN_CLIENT_SECRET) {
    console.error('LinkedIn credentials are not configured');
    console.log('LinkedIn Client ID:', LINKEDIN_CLIENT_ID || 'Not configured');
    console.log('LinkedIn Client Secret:', LINKEDIN_CLIENT_SECRET ? '[CONFIGURED]' : 'Not configured');
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/?linkedin_error=LinkedIn%20credentials%20are%20not%20configured`
    );
  }
  
  // Verify state for CSRF protection
  const storedState = request.cookies.get('linkedin_oauth_state')?.value;
  console.log('LinkedIn Callback - State verification:', { 
    storedState: storedState || 'None',
    receivedState: state || 'None',
    match: storedState === state
  });
  
  if (!storedState || storedState !== state) {
    console.error('State mismatch - possible CSRF attack');
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/?linkedin_error=Invalid%20state%20parameter`
    );
  }
  
  try {
    // Exchange authorization code for access token
    console.log('Exchanging code for token with LinkedIn');
    const tokenResponse = await fetch(LINKEDIN_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        client_id: LINKEDIN_CLIENT_ID,
        client_secret: LINKEDIN_CLIENT_SECRET,
      }).toString(),
    });
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Failed to exchange code for token. Status:', tokenResponse.status);
      console.error('Error response:', errorText);
      
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { error: 'Could not parse error response' };
      }
      
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/?linkedin_error=Failed%20to%20exchange%20code%20for%20token:%20${encodeURIComponent(errorData.error || 'Unknown error')}`
      );
    }
    
    // If we get here, the user has successfully authenticated with LinkedIn
    
    // Get the user ID from the cookie if available
    const userId = request.cookies.get('uid')?.value;
    console.log('User ID from cookie:', userId || 'Not found');
    
    // If we have a user ID, update the user document to mark them as verified
    if (userId) {
      try {
        const userDocRef = doc(db, 'users', userId);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          console.log(`Updating existing user document for user: ${userId}`);
          // Update existing user document with verification status
          await updateDoc(userDocRef, {
            isVerified: true,
            verifiedAt: new Date().toISOString()
          });
          console.log(`Successfully updated verification status for user: ${userId}`);
        } else {
          console.log(`No user document found for user: ${userId}, creating new document`);
          // Create new user document with verification status
          await setDoc(userDocRef, {
            uid: userId,
            isVerified: true,
            verifiedAt: new Date().toISOString(),
            // Add minimal required fields to avoid errors
            displayName: '',
            email: '',
            company: '',
            title: '',
            interests: []
          });
          console.log(`Successfully created user document with verification status for user: ${userId}`);
        }
        
        // Double-check that the update was successful
        const updatedUserDoc = await getDoc(userDocRef);
        if (updatedUserDoc.exists()) {
          const userData = updatedUserDoc.data();
          console.log(`Verification status after update: ${userData.isVerified}`);
        }
      } catch (error) {
        console.error('Error updating user verification status:', error);
        // Continue with the flow even if there was an error updating the user document
      }
    } else {
      console.error('No user ID found in cookies, cannot update verification status');
      // Store the LinkedIn token in a cookie so we can use it later when the user is authenticated
      const response = NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/?linkedin_connected=true&pending_verification=true`
      );
      
      // Set a cookie to indicate that LinkedIn verification is pending
      response.cookies.set('linkedin_pending_verification', 'true', {
        maxAge: 60 * 60 * 24, // 24 hours
        path: '/',
      });
      
      return response;
    }
    
    // Redirect back to the application with a success parameter
    const response = NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/?linkedin_connected=true`
    );
    
    return response;
  } catch (error) {
    console.error('Error in LinkedIn callback:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/?linkedin_error=Internal%20server%20error`
    );
  }
} 