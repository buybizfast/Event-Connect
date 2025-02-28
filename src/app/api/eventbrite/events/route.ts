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
    console.log('Fetching Eventbrite events...');
    
    // Get user ID from cookies
    const userId = cookies().get('userId')?.value;
    console.log('User ID from cookies:', userId);
    
    if (!userId) {
      console.log('No user ID found');
      return NextResponse.json({
        events: [],
        authenticated: false,
        authRequired: true,
        message: 'User not authenticated. Please sign in.'
      }, { status: 401 });
    }
    
    // Check if token is valid
    console.log('Checking token validity...');
    const isValid = await isEventbriteTokenValid(userId);
    console.log('Token valid:', isValid);
    
    if (!isValid) {
      console.log('Token invalid or expired');
      return NextResponse.json({
        events: [],
        authenticated: false,
        authRequired: true,
        message: 'Eventbrite authentication required. Please reconnect your account.'
      }, { status: 401 });
    }
    
    // Get tokens from Firestore
    console.log('Getting tokens from Firestore...');
    const tokens = await getEventbriteTokens(userId);
    
    if (!tokens) {
      console.log('No tokens found in Firestore');
      return NextResponse.json({
        events: [],
        authenticated: false,
        authRequired: true,
        message: 'Eventbrite authentication required. Please reconnect your account.'
      }, { status: 401 });
    }
    
    console.log('Tokens retrieved successfully');
    
    // If we have an organization ID, use it to fetch events
    if (tokens.organizationId) {
      console.log('Fetching events for organization:', tokens.organizationId);
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
          console.log('Token expired during event fetch');
          return NextResponse.json({
            events: [],
            authenticated: false,
            authRequired: true,
            message: 'Eventbrite authentication expired. Please reconnect your account.'
          }, { status: 401 });
        }
        
        const errorText = await eventsResponse.text();
        console.error('Error fetching organization events:', errorText);
        throw new Error(`Failed to fetch events: ${eventsResponse.statusText}`);
      }
      
      const eventsData = await eventsResponse.json();
      console.log(`Found ${eventsData.events?.length || 0} events for organization`);
      
      return NextResponse.json({
        events: eventsData.events,
        authenticated: true,
        message: 'Successfully fetched events'
      });
    }
    
    // If no organization ID, try to fetch user's events directly
    console.log('No organization ID, fetching user events directly');
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
        console.log('Token expired during event fetch');
        return NextResponse.json({
          events: [],
          authenticated: false,
          authRequired: true,
          message: 'Eventbrite authentication expired. Please reconnect your account.'
        }, { status: 401 });
      }
      
      const errorText = await eventsResponse.text();
      console.error('Error fetching user events:', errorText);
      throw new Error(`Failed to fetch events: ${eventsResponse.statusText}`);
    }
    
    const eventsData = await eventsResponse.json();
    console.log(`Found ${eventsData.events?.length || 0} events for user`);
    
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