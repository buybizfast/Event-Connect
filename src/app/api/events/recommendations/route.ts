import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { findEventRecommendations } from '@/lib/ai/matchmaking';
import { getUserProfile } from '@/lib/firebase/firebaseUtils';
import { auth } from '@/lib/firebase/firebase';

// Mark this route as dynamic since it uses cookies
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    
    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'Unauthorized: No session cookie found' },
        { status: 401 }
      );
    }
    
    // Get the user ID from the session cookie
    // Note: In a production app, you would verify this with Firebase Admin SDK
    // For now, we'll extract the user ID from the cookie or request context
    let userId: string;
    
    try {
      // This is a simplified approach - in production, use proper Firebase Admin verification
      const decodedToken = JSON.parse(atob(sessionCookie.split('.')[1]));
      userId = decodedToken.user_id || decodedToken.uid;
      
      if (!userId) {
        throw new Error('User ID not found in session');
      }
    } catch (error) {
      console.error('Error decoding session:', error);
      return NextResponse.json(
        { error: 'Unauthorized: Invalid session' },
        { status: 401 }
      );
    }
    
    // Get event recommendations using our AI matchmaking algorithm
    const eventScores = await findEventRecommendations(userId, 10);
    
    // Get the current user's profile
    const userProfile = await getUserProfile(userId);
    
    if (!userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }
    
    // Format the recommendations for the frontend
    const formattedRecommendations = eventScores.map(eventScore => {
      // Calculate a percentage score for display (0-100)
      const percentageScore = Math.round(eventScore.score * 100);
      
      // Get the primary match reason (first in the list)
      const primaryReason = eventScore.matchReasons[0] || 'Event that may interest you';
      
      return {
        event: {
          id: eventScore.eventId,
          title: eventScore.event.title,
          description: eventScore.event.description,
          date: eventScore.event.date,
          time: eventScore.event.time || '12:00 PM', // Default time if not provided
          location: eventScore.event.location,
          category: eventScore.event.category,
          organizer: eventScore.event.organizer,
          imageUrl: eventScore.event.imageUrl || eventScore.event.image || null, // Use imageUrl or fallback to image
        },
        score: percentageScore,
        matchReason: primaryReason,
        allReasons: eventScore.matchReasons,
      };
    });
    
    return NextResponse.json({ recommendations: formattedRecommendations });
    
  } catch (error) {
    console.error('Error in event recommendations API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 