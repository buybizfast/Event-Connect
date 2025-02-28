import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getEventbriteTokens, isEventbriteTokenValid } from '@/lib/firebase/eventbriteUtils';

// Function to get base URL
const getBaseUrl = () => {
  // In server components, we should only use the environment variable or a fallback
  return process.env.NEXT_PUBLIC_BASE_URL || 'https://event-connect.vercel.app';
};

// Eventbrite API endpoint for fetching user's events
const EVENTBRITE_API_URL = 'https://www.eventbriteapi.com/v3';

// Cache to prevent duplicate requests
const responseCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

export async function GET(request: NextRequest) {
  try {
    // Get user ID from cookies
    const userId = cookies().get('userId')?.value;
    
    if (!userId) {
      return NextResponse.json({
        events: [],
        authenticated: false,
        authRequired: true,
        message: 'User not authenticated. Please sign in.'
      }, { status: 401 });
    }
    
    // Check if token is valid
    const isValid = await isEventbriteTokenValid(userId);
    if (!isValid) {
      return NextResponse.json({
        events: [],
        authenticated: false,
        authRequired: true,
        message: 'Eventbrite authentication required. Please reconnect your account.'
      }, { status: 401 });
    }
    
    // Get tokens from Firestore
    const tokens = await getEventbriteTokens(userId);
    if (!tokens) {
      return NextResponse.json({
        events: [],
        authenticated: false,
        authRequired: true,
        message: 'Eventbrite authentication required. Please reconnect your account.'
      }, { status: 401 });
    }
    
    // If we have an organization ID, use it to fetch events
    if (tokens.organizationId) {
      const eventsResponse = await fetch(
        `${EVENTBRITE_API_URL}/organizations/${tokens.organizationId}/events?status=live,started,ended,completed&expand=venue,organizer,ticket_classes`,
        {
          headers: {
            'Authorization': `Bearer ${tokens.accessToken}`,
          },
        }
      );
      
      if (!eventsResponse.ok) {
        if (eventsResponse.status === 401) {
          return NextResponse.json({
            events: [],
            authenticated: false,
            authRequired: true,
            message: 'Eventbrite authentication expired. Please reconnect your account.'
          }, { status: 401 });
        }
        
        throw new Error(`Failed to fetch events: ${eventsResponse.statusText}`);
      }
      
      const eventsData = await eventsResponse.json();
      
      return NextResponse.json({
        events: eventsData.events,
        authenticated: true,
        message: 'Successfully fetched events'
      });
    }
    
    // If no organization ID, try to fetch user's events directly
    const eventsResponse = await fetch(
      `${EVENTBRITE_API_URL}/users/me/events?status=live,started,ended,completed&expand=venue,organizer,ticket_classes`,
      {
        headers: {
          'Authorization': `Bearer ${tokens.accessToken}`,
        },
      }
    );
    
    if (!eventsResponse.ok) {
      if (eventsResponse.status === 401) {
        return NextResponse.json({
          events: [],
          authenticated: false,
          authRequired: true,
          message: 'Eventbrite authentication expired. Please reconnect your account.'
        }, { status: 401 });
      }
      
      throw new Error(`Failed to fetch events: ${eventsResponse.statusText}`);
    }
    
    const eventsData = await eventsResponse.json();
    
    return NextResponse.json({
      events: eventsData.events,
      authenticated: true,
      message: 'Successfully fetched events'
    });
  } catch (error) {
    console.error('Error fetching Eventbrite events:', error);
    return NextResponse.json({
      error: 'Failed to fetch Eventbrite events',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
} 