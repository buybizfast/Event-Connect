import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase/firebase';
import { getAuthAdmin } from '@/lib/firebase/firebaseAdmin';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  addDoc, 
  serverTimestamp,
  doc,
  deleteDoc,
  getDoc,
  FirestoreError
} from 'firebase/firestore';

// Production mode flag - set to false for development, true for production
const DEV_MODE = false;

// Define types for better type safety
interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  content: string;
  timestamp: string;
  [key: string]: any;
}

interface Post {
  id: string;
  eventId: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  timestamp: string;
  isPinned: boolean;
  comments: Comment[];
  [key: string]: any;
}

export async function GET(request: NextRequest) {
  try {
    // For simplicity, we'll skip authentication for read operations
    // In a production app, you would want to authenticate users
    
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    
    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }
    
    // Get posts for this event
    try {
      const postsRef = collection(db, 'eventDiscussions');
      const q = query(
        postsRef,
        where('eventId', '==', eventId),
        orderBy('timestamp', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const posts = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      return NextResponse.json({ posts });
    } catch (error: any) {
      // Handle Firebase index error
      if (error.code === 'failed-precondition' && error.message.includes('index')) {
        console.warn('Firebase index error, falling back to simpler query');
        
        // Fallback to a simpler query without ordering
        const postsRef = collection(db, 'eventDiscussions');
        const q = query(
          postsRef,
          where('eventId', '==', eventId)
        );
        
        const querySnapshot = await getDocs(q);
        const posts = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Sort in memory
        posts.sort((a: any, b: any) => {
          const timeA = a.timestamp?.toDate?.() || new Date(a.timestamp);
          const timeB = b.timestamp?.toDate?.() || new Date(b.timestamp);
          return timeB - timeA; // Descending order
        });
        
        return NextResponse.json({ posts });
      }
      
      throw error;
    }
  } catch (error) {
    console.error('Error fetching event discussion posts:', error);
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Initialize user data
    let userId = '';
    let userName = '';
    
    if (!DEV_MODE) {
      // Get the authorization header
      const authHeader = request.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      // Extract the token
      const idToken = authHeader.split('Bearer ')[1];
      
      try {
        // Verify the token with Firebase Admin
        const auth = getAuthAdmin();
        const decodedToken = await auth.verifyIdToken(idToken);
        userId = decodedToken.uid;
        userName = decodedToken.name || decodedToken.email || 'Anonymous';
        
        if (!userId) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
      } catch (authError) {
        console.error('Authentication error:', authError);
        return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
      }
    } else {
      // In development mode, use mock data
      userId = 'dev_user_123';
      userName = 'Dev User';
    }
    
    const { eventId, title, content, isPinned = false } = await request.json();
    
    if (!eventId || !title || !content) {
      return NextResponse.json({ error: 'Event ID, title, and content are required' }, { status: 400 });
    }
    
    // Add the post to Firestore
    const postsRef = collection(db, 'eventDiscussions');
    const newPost = await addDoc(postsRef, {
      eventId,
      title,
      content,
      authorId: userId,
      authorName: userName,
      timestamp: serverTimestamp(),
      isPinned
    });
    
    return NextResponse.json({ 
      success: true, 
      postId: newPost.id 
    });
  } catch (error) {
    console.error('Error creating discussion post:', error);
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Initialize user ID
    let userId = '';
    let isAdmin = false;
    
    if (!DEV_MODE) {
      // Get the authorization header
      const authHeader = request.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      // Extract the token
      const idToken = authHeader.split('Bearer ')[1];
      
      try {
        // Verify the token with Firebase Admin
        const auth = getAuthAdmin();
        const decodedToken = await auth.verifyIdToken(idToken);
        userId = decodedToken.uid;
        
        // Check if user is an admin (you might have custom claims for this)
        isAdmin = decodedToken.admin === true;
        
        if (!userId) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
      } catch (authError) {
        console.error('Authentication error:', authError);
        return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
      }
    } else {
      // In development mode, use a mock user ID
      userId = 'dev_user_123';
      isAdmin = true;
    }
    
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    const postId = searchParams.get('postId');
    
    if (!eventId || !postId) {
      return NextResponse.json({ error: 'Event ID and post ID are required' }, { status: 400 });
    }
    
    // Check if the post exists and belongs to this event
    const postRef = doc(db, 'eventDiscussions', postId);
    const postSnap = await getDoc(postRef);
    
    if (!postSnap.exists()) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }
    
    const postData = postSnap.data();
    
    if (postData.eventId !== eventId) {
      return NextResponse.json({ error: 'Post does not belong to this event' }, { status: 403 });
    }
    
    // Check if the user is the author or an admin
    if (!DEV_MODE && postData.authorId !== userId && !isAdmin) {
      return NextResponse.json({ error: 'Not authorized to delete this post' }, { status: 403 });
    }
    
    // Delete the post
    await deleteDoc(postRef);
    
    // Delete all comments for this post
    const commentsRef = collection(db, 'eventDiscussionComments');
    const commentsQuery = query(commentsRef, where('postId', '==', postId));
    const commentsSnapshot = await getDocs(commentsQuery);
    
    const deletePromises = commentsSnapshot.docs.map(commentDoc => 
      deleteDoc(doc(db, 'eventDiscussionComments', commentDoc.id))
    );
    
    await Promise.all(deletePromises);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting discussion post:', error);
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
  }
} 