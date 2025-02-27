import { NextRequest, NextResponse } from 'next/server';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    // Update user document to remove Eventbrite tokens
    await updateDoc(doc(db, 'users', userId), {
      eventbriteToken: null,
      eventbriteRefreshToken: null,
      eventbriteTokenExpiry: null
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error clearing Eventbrite token:', error);
    return NextResponse.json({ error: 'Failed to clear Eventbrite token' }, { status: 500 });
  }
} 