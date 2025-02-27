import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { fetchEventbriteAttendees, convertEventbriteAttendees } from '@/lib/api/eventbrite';

// Cache to prevent duplicate requests
const responseCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

export async function GET(request: NextRequest) {
  try {
    // Get the event ID from the query parameters
    const searchParams = request.nextUrl.searchParams;
    const eventId = searchParams.get('eventId');
    const eventbriteId = searchParams.get('eventbriteId');
    
    if (!eventId && !eventbriteId) {
      return NextResponse.json({ error: 'Event ID or Eventbrite ID is required' }, { status: 400 });
    }
    
    // Get the Eventbrite access token from cookies
    const eventbriteToken = cookies().get('eventbrite_token')?.value;
    const userId = cookies().get('userId')?.value;
    
    // Generate a cache key
    const cacheKey = `eventbrite_attendees_${eventbriteId || eventId}_${eventbriteToken || 'no_token'}`;
    
    // Check if we have a cached response and it's not expired
    const cachedResponse = responseCache.get(cacheKey);
    if (cachedResponse && (Date.now() - cachedResponse.timestamp) < CACHE_TTL) {
      return cachedResponse.response;
    }
    
    // If no token in cookies, try to get it from Firestore if we have a userId
    let tokenToUse = eventbriteToken;
    
    if (!tokenToUse && userId) {
      try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          // Check if token exists and isn't expired
          if (userData.eventbriteToken && userData.eventbriteTokenExpiry && userData.eventbriteTokenExpiry > Date.now()) {
            tokenToUse = userData.eventbriteToken;
          }
        }
      } catch (error) {
        console.error('Error fetching Eventbrite token from Firestore:', error);
      }
    }
    
    if (!tokenToUse) {
      const response = NextResponse.json({ 
        attendees: [], 
        authenticated: false,
        authRequired: true,
        message: 'Eventbrite authentication required'
      }, { status: 401 });
      responseCache.set(cacheKey, { response, timestamp: Date.now() });
      return response;
    }
    
    // If we have an event ID but not an Eventbrite ID, look it up
    let eventbriteIdToUse = eventbriteId;
    if (!eventbriteIdToUse && eventId) {
      try {
        const eventDoc = await getDoc(doc(db, 'events', eventId));
        if (eventDoc.exists()) {
          const eventData = eventDoc.data();
          eventbriteIdToUse = eventData.eventbriteId;
        }
        
        if (!eventbriteIdToUse) {
          const response = NextResponse.json({ 
            attendees: [], 
            error: 'Event is not linked to Eventbrite',
            message: 'This event is not linked to an Eventbrite event'
          }, { status: 400 });
          responseCache.set(cacheKey, { response, timestamp: Date.now() });
          return response;
        }
      } catch (error) {
        console.error('Error fetching event from Firestore:', error);
        const response = NextResponse.json({ 
          attendees: [], 
          error: 'Failed to fetch event data',
          message: 'An error occurred while fetching event data'
        }, { status: 500 });
        responseCache.set(cacheKey, { response, timestamp: Date.now() });
        return response;
      }
    }
    
    try {
      // Fetch attendees from Eventbrite
      const eventbriteAttendees = await fetchEventbriteAttendees(eventbriteIdToUse!, tokenToUse);
      
      // Convert Eventbrite attendees to our format
      const convertedAttendees = convertEventbriteAttendees(eventbriteAttendees);
      
      const response = NextResponse.json({ 
        attendees: convertedAttendees,
        count: convertedAttendees.length,
        authenticated: true,
        message: `Successfully retrieved ${convertedAttendees.length} attendees`
      });
      responseCache.set(cacheKey, { response, timestamp: Date.now() });
      return response;
    } catch (error) {
      console.error('Error fetching Eventbrite attendees:', error);
      const response = NextResponse.json({ 
        attendees: [], 
        error: 'Failed to fetch attendees from Eventbrite',
        message: 'An error occurred while fetching attendees from Eventbrite'
      }, { status: 500 });
      responseCache.set(cacheKey, { response, timestamp: Date.now() });
      return response;
    }
  } catch (error) {
    console.error('Error in Eventbrite attendees API:', error);
    return NextResponse.json({ 
      attendees: [], 
      error: 'Internal server error',
      message: 'An unexpected error occurred. Please try again later.'
    }, { status: 500 });
  }
}

// Import attendees from Eventbrite to our event
export async function POST(request: NextRequest) {
  try {
    const { eventId, eventbriteId } = await request.json();
    
    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }
    
    // Get the Eventbrite access token from cookies
    const eventbriteToken = cookies().get('eventbrite_token')?.value;
    const userId = cookies().get('userId')?.value;
    
    // If no token in cookies, try to get it from Firestore if we have a userId
    let tokenToUse = eventbriteToken;
    
    if (!tokenToUse && userId) {
      try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          // Check if token exists and isn't expired
          if (userData.eventbriteToken && userData.eventbriteTokenExpiry && userData.eventbriteTokenExpiry > Date.now()) {
            tokenToUse = userData.eventbriteToken;
          }
        }
      } catch (error) {
        console.error('Error fetching Eventbrite token from Firestore:', error);
      }
    }
    
    if (!tokenToUse) {
      return NextResponse.json({ 
        success: false,
        authRequired: true,
        message: 'Eventbrite authentication required'
      }, { status: 401 });
    }
    
    // Get the event from Firestore
    const eventDoc = await getDoc(doc(db, 'events', eventId));
    if (!eventDoc.exists()) {
      return NextResponse.json({ 
        success: false,
        error: 'Event not found',
        message: 'The specified event was not found'
      }, { status: 404 });
    }
    
    // Determine the Eventbrite ID to use
    let eventbriteIdToUse = eventbriteId;
    if (!eventbriteIdToUse) {
      const eventData = eventDoc.data();
      eventbriteIdToUse = eventData.eventbriteId;
      
      if (!eventbriteIdToUse) {
        return NextResponse.json({ 
          success: false,
          error: 'Event is not linked to Eventbrite',
          message: 'This event is not linked to an Eventbrite event'
        }, { status: 400 });
      }
    }
    
    try {
      // Fetch attendees from Eventbrite
      const eventbriteAttendees = await fetchEventbriteAttendees(eventbriteIdToUse, tokenToUse);
      
      if (eventbriteAttendees.length === 0) {
        return NextResponse.json({
          success: true,
          imported: 0,
          message: 'No attendees found to import'
        });
      }
      
      // Convert Eventbrite attendees to our format
      const convertedAttendees = convertEventbriteAttendees(eventbriteAttendees);
      
      // Update the event with the imported attendees
      const eventRef = doc(db, 'events', eventId);
      
      // Update the event document with the attendees
      // We're using arrayUnion to avoid duplicates
      await updateDoc(eventRef, {
        importedAttendees: convertedAttendees,
        attendees: convertedAttendees.length, // Update the attendee count
        updatedAt: new Date().toISOString()
      });
      
      return NextResponse.json({
        success: true,
        imported: convertedAttendees.length,
        message: `Successfully imported ${convertedAttendees.length} attendees`
      });
    } catch (error) {
      console.error('Error importing Eventbrite attendees:', error);
      return NextResponse.json({ 
        success: false,
        error: 'Failed to import attendees from Eventbrite',
        message: 'An error occurred while importing attendees from Eventbrite'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in Eventbrite attendees import API:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error',
      message: 'An unexpected error occurred. Please try again later.'
    }, { status: 500 });
  }
} 