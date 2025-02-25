import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/firebase/firebase';
import { collection, getDocs, query, where, doc, getDoc, addDoc, serverTimestamp, deleteDoc, FirestoreError } from 'firebase/firestore';
import { getUserProfile } from '@/lib/firebase/firebaseUtils';
import { getAuthAdmin } from '@/lib/firebase/firebaseAdmin';

// Production mode flag
const DEV_MODE = false; // Set to true for development, false for production

// Define types for better type safety
interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  photoURL: string;
  skills: string[];
  bio: string;
  isVerified?: boolean;
  [key: string]: any;
}

interface Attendee {
  id: string;
  userId: string;
  eventId: string;
  displayName: string;
  email: string;
  photoURL: string;
  skills: string[];
  registeredAt: string;
  status: 'registered' | 'attended' | 'cancelled';
  isVerified?: boolean;
  [key: string]: any;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    
    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }
    
    // Query attendees for this event
    const attendeesRef = collection(db, 'eventAttendees');
    const q = query(attendeesRef, where('eventId', '==', eventId));
    const attendeesSnapshot = await getDocs(q);
    
    const attendeesPromises = attendeesSnapshot.docs.map(async (docSnapshot) => {
      const data = docSnapshot.data();
      
      // Get the user's verification status
      let isVerified = false;
      try {
        const userDocRef = doc(db, 'users', data.userId);
        const userDocSnapshot = await getDoc(userDocRef);
        if (userDocSnapshot.exists()) {
          const userData = userDocSnapshot.data();
          isVerified = userData?.isVerified || false;
        }
      } catch (error) {
        console.error(`Error fetching verification status for user ${data.userId}:`, error);
      }
      
      return {
        id: docSnapshot.id,
        ...data,
        isVerified,
        registeredAt: data.registeredAt?.toDate?.().toISOString() || new Date().toISOString()
      } as Attendee;
    });
    
    const attendees = await Promise.all(attendeesPromises);
    
    return NextResponse.json({ attendees });
  } catch (error) {
    console.error('Error fetching attendees:', error);
    return NextResponse.json({ error: 'Failed to fetch attendees' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Initialize user data
    let userId = '';
    let userEmail = '';
    
    if (!DEV_MODE) {
      // Get the authorization header
      const authHeader = request.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Unauthorized - Missing or invalid authorization header' }, { status: 401 });
      }
      
      // Extract the token
      const idToken = authHeader.split('Bearer ')[1];
      
      try {
        // Verify the token with Firebase Admin
        const auth = getAuthAdmin();
        const decodedToken = await auth.verifyIdToken(idToken);
        userId = decodedToken.uid;
        userEmail = decodedToken.email || '';
        
        if (!userId) {
          return NextResponse.json({ error: 'Unauthorized - User ID not found in token' }, { status: 401 });
        }
      } catch (authError) {
        console.error('Authentication error:', authError);
        return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
      }
    } else {
      // In development mode, use mock data
      userId = 'dev_user_123';
      userEmail = 'dev@example.com';
      console.log('Using development mode with mock user:', userId, userEmail);
    }
    
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (error) {
      console.error('Error parsing request body:', error);
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    
    const { eventId } = requestBody;
    
    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }
    
    console.log(`Registering user ${userId} for event ${eventId}`);
    
    // Check if the event exists
    const eventRef = doc(db, 'events', eventId);
    const eventSnapshot = await getDoc(eventRef);
    
    if (!eventSnapshot.exists()) {
      console.error(`Event with ID ${eventId} not found`);
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    
    // Check if the user is already registered for this event
    const attendeesRef = collection(db, 'eventAttendees');
    const q = query(
      attendeesRef, 
      where('eventId', '==', eventId),
      where('userId', '==', userId)
    );
    
    const existingAttendeeSnapshot = await getDocs(q);
    
    if (!existingAttendeeSnapshot.empty) {
      return NextResponse.json({ 
        error: 'You are already registered for this event',
        attendeeId: existingAttendeeSnapshot.docs[0].id
      }, { status: 400 });
    }
    
    // Get the user's profile data
    const userProfileRef = doc(db, 'userProfiles', userId);
    const userProfileSnapshot = await getDoc(userProfileRef);
    
    let userProfile: UserProfile = {
      id: userId,
      displayName: 'Anonymous',
      email: userEmail,
      photoURL: '',
      skills: [],
      bio: ''
    };
    
    if (userProfileSnapshot.exists()) {
      userProfile = {
        id: userProfileSnapshot.id,
        ...userProfileSnapshot.data()
      } as UserProfile;
    }
    
    // Check if user is verified
    let isVerified = false;
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        isVerified = userDoc.data().isVerified || false;
      }
    } catch (error) {
      console.error(`Error fetching verification status for user ${userId}:`, error);
    }
    
    // Register the user for the event
    const attendeeData = {
      userId,
      eventId,
      displayName: userProfile.displayName,
      email: userProfile.email,
      photoURL: userProfile.photoURL,
      skills: userProfile.skills || [],
      registeredAt: serverTimestamp(),
      status: 'registered',
      isVerified
    };
    
    console.log('Creating attendee record with data:', JSON.stringify(attendeeData, null, 2));
    
    const newAttendee = await addDoc(attendeesRef, attendeeData);
    console.log('Successfully registered user for event, attendee ID:', newAttendee.id);
    
    return NextResponse.json({ 
      success: true, 
      attendeeId: newAttendee.id 
    });
  } catch (error) {
    console.error('Error registering for event:', error);
    return NextResponse.json({ error: 'Failed to register for event' }, { status: 500 });
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
    const attendeeId = searchParams.get('attendeeId');
    
    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }
    
    if (attendeeId) {
      // Delete a specific attendee registration
      const attendeeRef = doc(db, 'eventAttendees', attendeeId);
      const attendeeSnap = await getDoc(attendeeRef);
      
      if (!attendeeSnap.exists()) {
        return NextResponse.json({ error: 'Attendee registration not found' }, { status: 404 });
      }
      
      const attendeeData = attendeeSnap.data();
      
      if (attendeeData.eventId !== eventId) {
        return NextResponse.json({ error: 'Attendee does not belong to this event' }, { status: 403 });
      }
      
      // Check if the user is the attendee or an admin
      if (!DEV_MODE && attendeeData.userId !== userId && !isAdmin) {
        return NextResponse.json({ error: 'Not authorized to cancel this registration' }, { status: 403 });
      }
      
      // Delete the attendee registration
      await deleteDoc(attendeeRef);
      
      return NextResponse.json({ success: true });
    } else {
      // Cancel the user's own registration
      const attendeesRef = collection(db, 'eventAttendees');
      const q = query(
        attendeesRef, 
        where('eventId', '==', eventId),
        where('userId', '==', userId)
      );
      
      const attendeeSnapshot = await getDocs(q);
      
      if (attendeeSnapshot.empty) {
        return NextResponse.json({ error: 'You are not registered for this event' }, { status: 404 });
      }
      
      // Delete the attendee registration
      await deleteDoc(doc(db, 'eventAttendees', attendeeSnapshot.docs[0].id));
      
      return NextResponse.json({ success: true });
    }
  } catch (error) {
    console.error('Error cancelling registration:', error);
    return NextResponse.json({ error: 'Failed to cancel registration' }, { status: 500 });
  }
} 