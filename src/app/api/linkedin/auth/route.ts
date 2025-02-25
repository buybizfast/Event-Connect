import { NextRequest, NextResponse } from 'next/server';

// LinkedIn OAuth endpoints
const LINKEDIN_AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization';
const LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';

// Your LinkedIn OAuth credentials (should be stored in environment variables)
const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID || '';
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET || '';
// Make sure to use the correct port from the environment variable
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_BASE_URL}/api/linkedin/callback`;

// Request minimal scopes - we only need to verify the user, not access their data
const SCOPES = ['openid', 'profile', 'email'];

// Initiate OAuth flow
export async function GET(request: NextRequest) {
  console.log('LinkedIn Auth Route - Starting OAuth flow');
  console.log('LinkedIn Client ID:', LINKEDIN_CLIENT_ID);
  console.log('LinkedIn Client Secret:', LINKEDIN_CLIENT_SECRET ? '[CONFIGURED]' : 'Not configured');
  console.log('Redirect URI:', REDIRECT_URI);
  console.log('Requested Scopes:', SCOPES.join(', '));
  
  // Check if LinkedIn credentials are configured
  if (!LINKEDIN_CLIENT_ID) {
    console.error('LinkedIn Client ID is not configured');
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/?linkedin_error=LinkedIn%20Client%20ID%20is%20not%20configured`
    );
  }

  const state = Math.random().toString(36).substring(2, 15);
  
  // Log the auth URL for debugging
  // Use OpenID Connect flow with minimal scopes
  const authUrl = `${LINKEDIN_AUTH_URL}?response_type=code&client_id=${LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${state}&scope=${encodeURIComponent(SCOPES.join(' '))}`;
  console.log('LinkedIn Auth URL:', authUrl);
  
  // Store state in cookie for CSRF protection
  const response = NextResponse.redirect(authUrl);
  
  response.cookies.set('linkedin_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 10, // 10 minutes
    path: '/',
  });
  
  console.log('LinkedIn Auth Route - Redirecting to LinkedIn');
  return response;
}

// Exchange authorization code for access token
export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();
    
    if (!code) {
      return NextResponse.json({ error: 'Authorization code is required' }, { status: 400 });
    }
    
    // Check if LinkedIn credentials are configured
    if (!LINKEDIN_CLIENT_ID || !LINKEDIN_CLIENT_SECRET) {
      console.error('LinkedIn credentials are not configured');
      return NextResponse.json({ error: 'LinkedIn credentials are not configured' }, { status: 500 });
    }
    
    const tokenResponse = await fetch(LINKEDIN_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: LINKEDIN_CLIENT_ID,
        client_secret: LINKEDIN_CLIENT_SECRET,
        code,
        redirect_uri: REDIRECT_URI,
      }).toString(),
    });
    
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('LinkedIn token error:', errorData);
      return NextResponse.json({ error: 'Failed to exchange code for token', details: errorData }, { status: 400 });
    }
    
    const tokenData = await tokenResponse.json();
    
    return NextResponse.json({
      access_token: tokenData.access_token,
      expires_in: tokenData.expires_in,
    });
  } catch (error) {
    console.error('Error exchanging code for token:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 