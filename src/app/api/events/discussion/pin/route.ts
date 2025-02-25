import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase/firebase';
import { 
  doc,
  getDoc,
  updateDoc
} from 'firebase/firestore';

// Development mode flag - set to false in production
const DEV_MODE = false;

export async function POST(request: NextRequest) {
  try {
    // In development mode, skip authentication checks
    // In a real app, you would authenticate the user here and check if they're an organizer
    
    const { eventId, postId, isPinned } = await request.json();
    
    if (!eventId || !postId || isPinned === undefined) {
      return NextResponse.json({ error: 'Event ID, post ID, and isPinned are required' }, { status: 400 });
    }
    
    // Check if the post exists
    const postRef = doc(db, 'eventDiscussions', postId);
    const postSnap = await getDoc(postRef);
    
    if (!postSnap.exists()) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }
    
    const postData = postSnap.data();
    
    if (postData.eventId !== eventId) {
      return NextResponse.json({ error: 'Post does not belong to this event' }, { status: 403 });
    }
    
    // Update the pin status
    await updateDoc(postRef, {
      isPinned
    });
    
    return NextResponse.json({ 
      success: true,
      isPinned
    });
  } catch (error) {
    console.error('Error updating pin status:', error);
    return NextResponse.json({ error: 'Failed to update pin status' }, { status: 500 });
  }
} 