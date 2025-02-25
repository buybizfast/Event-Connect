import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { fetchEventbriteEvent, convertEventbriteToAppEvent } from '@/lib/api/eventbrite';
import { createEvent, Event } from '@/lib/firebase/eventUtils';

export async function POST(request: NextRequest) {
  try {
    // Get the Eventbrite access token from cookies
    const eventbriteToken = cookies().get('eventbrite_token')?.value;
    
    if (!eventbriteToken) {
      return NextResponse.json({ error: 'Not authenticated with Eventbrite' }, { status: 401 });
    }
    
    // Get the event ID and user ID from the request body
    const { eventbriteId, userId } = await request.json();
    
    if (!eventbriteId || !userId) {
      return NextResponse.json({ error: 'Event ID and user ID are required' }, { status: 400 });
    }
    
    // Fetch the event details from Eventbrite
    const eventbriteEvent = await fetchEventbriteEvent(eventbriteId, eventbriteToken);
    
    // Convert the Eventbrite event to our app's event format
    const appEventPartial = convertEventbriteToAppEvent(eventbriteEvent, userId);
    
    // Create a complete event object with a temporary ID that will be replaced by Firebase
    const appEvent = {
      ...appEventPartial,
      id: `eventbrite-${eventbriteId}`, // This ID will be replaced by Firebase when created
    } as Event;
    
    // Create the event in our database
    const createdEvent = await createEvent(appEvent);
    
    return NextResponse.json({ success: true, eventId: createdEvent.id });
  } catch (error) {
    console.error('Error importing Eventbrite event:', error);
    return NextResponse.json({ error: 'Failed to import Eventbrite event' }, { status: 500 });
  }
} 