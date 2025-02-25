import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase/firebase';
// Import Firebase Admin for authentication
import { getAuthAdmin } from '@/lib/firebase/firebaseAdmin';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  addDoc, 
  serverTimestamp,
  FirestoreError 
} from 'firebase/firestore';

// Production mode flag - set to false for development, true for production
const DEV_MODE = false;

export async function GET(request: NextRequest) {
  try {
    // Initialize user ID
    let userId = '';
    
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
    }
    
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    
    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }
    
    // Verify authentication in production mode
    if (!DEV_MODE) {
      const authHeader = request.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      const token = authHeader.split('Bearer ')[1];
      try {
        const decodedToken = await getAuthAdmin().verifyIdToken(token);
        userId = decodedToken.uid;
      } catch (error) {
        console.error('Error verifying token:', error);
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }
    }
    
    // Get messages for this event
    try {
      const messagesRef = collection(db, 'eventChats');
      const q = query(
        messagesRef,
        where('eventId', '==', eventId),
        orderBy('timestamp', 'asc')
      );
      
      const querySnapshot = await getDocs(q);
      const messages = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      return NextResponse.json({ messages });
    } catch (error: any) {
      // Handle Firebase index error
      if (error.code === 'failed-precondition' && error.message.includes('index')) {
        console.warn('Firebase index error, falling back to simpler query');
        
        // Fallback to a simpler query without ordering
        const messagesRef = collection(db, 'eventChats');
        const q = query(
          messagesRef,
          where('eventId', '==', eventId)
        );
        
        const querySnapshot = await getDocs(q);
        const messages = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Sort in memory
        messages.sort((a: any, b: any) => {
          const timeA = a.timestamp?.toDate?.() || new Date(a.timestamp);
          const timeB = b.timestamp?.toDate?.() || new Date(b.timestamp);
          return timeA - timeB;
        });
        
        return NextResponse.json({ messages });
      }
      
      throw error;
    }
  } catch (error) {
    console.error('Error fetching event chat messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Initialize user data
    let userId = '';
    let userName = '';
    let userPhoto = null;
    
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
        userPhoto = decodedToken.picture || null;
        
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
      userPhoto = null;
    }
    
    const { eventId, message, isAnnouncement } = await request.json();
    
    if (!eventId || !message) {
      return NextResponse.json({ error: 'Event ID and message are required' }, { status: 400 });
    }
    
    // Check if user is authorized to send announcements
    if (isAnnouncement && !DEV_MODE) {
      // Query the event to check if the current user is the organizer
      const eventsRef = collection(db, 'events');
      const eventQuery = query(eventsRef, where('id', '==', eventId));
      const eventSnapshot = await getDocs(eventQuery);
      
      if (eventSnapshot.empty) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 });
      }
      
      const eventData = eventSnapshot.docs[0].data();
      
      if (eventData.organizerId !== userId) {
        return NextResponse.json({ error: 'Only event organizers can send announcements' }, { status: 403 });
      }
    }
    
    // Add the message to Firestore
    const messagesRef = collection(db, 'eventChats');
    const newMessage = await addDoc(messagesRef, {
      eventId,
      text: message,
      senderId: userId,
      senderName: userName,
      timestamp: serverTimestamp(),
      isAnnouncement: isAnnouncement || false,
      avatar: userPhoto
    });
    
    return NextResponse.json({ 
      success: true, 
      messageId: newMessage.id 
    });
  } catch (error) {
    console.error('Error sending event chat message:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
} 