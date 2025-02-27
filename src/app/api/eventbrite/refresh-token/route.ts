import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';

const EVENTBRITE_TOKEN_URL = 'https://www.eventbrite.com/oauth/token';
const EVENTBRITE_CLIENT_ID = process.env.EVENTBRITE_CLIENT_ID;
const EVENTBRITE_CLIENT_SECRET = process.env.EVENTBRITE_CLIENT_SECRET;

export async function POST(request: NextRequest) {
  try {
    // Get the user ID from cookies
    const userId = request.cookies.get('userId')?.value;
    if (!userId) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    // Get the user's Eventbrite refresh token from Firestore
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data();
    const refreshToken = userData.eventbriteRefreshToken;
    if (!refreshToken) {
      return NextResponse.json({ error: 'No refresh token found' }, { status: 401 });
    }

    // Exchange refresh token for new access token
    const response = await fetch(EVENTBRITE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: EVENTBRITE_CLIENT_ID!,
        client_secret: EVENTBRITE_CLIENT_SECRET!,
        refresh_token: refreshToken,
      }).toString(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('Error refreshing token:', errorData);
      return NextResponse.json({ error: 'Failed to refresh token' }, { status: response.status });
    }

    const tokenData = await response.json();
    const { access_token, refresh_token, expires_in } = tokenData;

    // Update tokens in Firestore
    await updateDoc(doc(db, 'users', userId), {
      eventbriteToken: access_token,
      eventbriteRefreshToken: refresh_token,
      eventbriteTokenExpires: Date.now() + (expires_in * 1000),
    });

    // Set the new access token in a cookie
    const nextResponse = NextResponse.json({ success: true });
    nextResponse.cookies.set('eventbrite_access_token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: expires_in,
      path: '/',
    });

    return nextResponse;
  } catch (error) {
    console.error('Error refreshing Eventbrite token:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 