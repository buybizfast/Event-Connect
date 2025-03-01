import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';

// Specify that this route uses the Edge Runtime
export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json(
      { error: 'User ID is required' },
      { status: 400 }
    );
  }

  try {
    // Get the user document
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    const isConnected = !!(
      userData.eventbriteToken &&
      userData.eventbriteTokenExpiry &&
      userData.eventbriteTokenExpiry > Date.now()
    );

    return NextResponse.json({
      isConnected,
      message: isConnected ? 'Eventbrite account connected' : 'Eventbrite account not connected'
    });
  } catch (error) {
    console.error('Error checking Eventbrite connection status:', error);
    return NextResponse.json(
      { error: 'Failed to check Eventbrite connection status' },
      { status: 500 }
    );
  }
} 