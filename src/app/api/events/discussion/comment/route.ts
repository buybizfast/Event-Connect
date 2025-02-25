import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase/firebase';
import { 
  collection, 
  addDoc, 
  serverTimestamp,
  doc,
  getDoc
} from 'firebase/firestore';

// Development mode flag - set to false in production
const DEV_MODE = false;

export async function POST(request: NextRequest) {
  try {
    // In development mode, use mock user data
    const userId = DEV_MODE ? 'dev_user_123' : 'user_123';
    const userName = DEV_MODE ? 'Dev User' : 'John Doe';
    
    const { eventId, postId, content } = await request.json();
    
    if (!eventId || !postId || !content) {
      return NextResponse.json({ error: 'Event ID, post ID, and content are required' }, { status: 400 });
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
    
    // Add the comment to Firestore
    const commentsRef = collection(db, 'eventDiscussionComments');
    const newComment = await addDoc(commentsRef, {
      eventId,
      postId,
      content,
      authorId: userId,
      authorName: userName,
      timestamp: serverTimestamp()
    });
    
    return NextResponse.json({ 
      success: true, 
      commentId: newComment.id 
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 });
  }
} 