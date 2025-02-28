import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Function to get base URL
const getBaseUrl = () => {
  return process.env.NEXT_PUBLIC_BASE_URL || 'https://event-connect-git-main-mindfulelementsinc-gmailcoms-projects.vercel.app';
};

// Eventbrite API endpoint for fetching user's events
const EVENTBRITE_API_URL = 'https://www.eventbriteapi.com/v3';
const EVENTBRITE_PRIVATE_TOKEN = process.env.EVENTBRITE_PRIVATE_TOKEN;

export async function GET(request: NextRequest) {
  try {
    console.log('Starting Eventbrite events fetch with token:', EVENTBRITE_PRIVATE_TOKEN?.substring(0, 5) + '...');
    
    if (!EVENTBRITE_PRIVATE_TOKEN) {
      console.error('Eventbrite Private Token is not configured');
      return NextResponse.json({
        events: [],
        authenticated: false,
        message: 'Eventbrite configuration error'
      }, { status: 500 });
    }

    // First, test the token by getting user info
    console.log('Testing token with user info endpoint...');
    const userResponse = await fetch(`${EVENTBRITE_API_URL}/users/me/`, {
      headers: {
        'Authorization': `Bearer ${EVENTBRITE_PRIVATE_TOKEN}`,
      },
    });

    if (!userResponse.ok) {
      const userError = await userResponse.text();
      console.error('Failed to fetch user info:', userError);
      return NextResponse.json({
        events: [],
        authenticated: false,
        message: 'Failed to authenticate with Eventbrite'
      }, { status: 401 });
    }

    const userData = await userResponse.json();
    console.log('Successfully authenticated as Eventbrite user:', userData.id);

    // Get organization ID
    console.log('Fetching organization ID...');
    const orgResponse = await fetch(`${EVENTBRITE_API_URL}/users/me/organizations`, {
      headers: {
        'Authorization': `Bearer ${EVENTBRITE_PRIVATE_TOKEN}`,
      },
    });

    const orgResponseText = await orgResponse.text();
    console.log('Organization response:', orgResponseText);

    if (!orgResponse.ok) {
      console.error('Failed to fetch organization:', orgResponseText);
      return NextResponse.json({
        events: [],
        authenticated: false,
        message: 'Failed to fetch organization'
      }, { status: 500 });
    }

    const orgData = JSON.parse(orgResponseText);
    console.log('Organization data:', orgData);
    
    const organizationId = orgData.organizations?.[0]?.id;
    console.log('Found organization ID:', organizationId);

    if (!organizationId) {
      console.log('No organization found');
      // Try fetching user's events directly
      console.log('Attempting to fetch user events directly...');
      const userEventsResponse = await fetch(
        `${EVENTBRITE_API_URL}/users/me/events?status=live,started,ended,completed&expand=venue,organizer,ticket_classes`,
        {
          headers: {
            'Authorization': `Bearer ${EVENTBRITE_PRIVATE_TOKEN}`,
          },
        }
      );

      const userEventsText = await userEventsResponse.text();
      console.log('User events response:', userEventsText);

      if (!userEventsResponse.ok) {
        console.error('Failed to fetch user events:', userEventsText);
        return NextResponse.json({
          events: [],
          authenticated: true,
          message: 'No events found'
        });
      }

      const userEventsData = JSON.parse(userEventsText);
      console.log(`Found ${userEventsData.events?.length || 0} user events`);

      return NextResponse.json({
        events: userEventsData.events || [],
        authenticated: true,
        message: 'Successfully fetched user events'
      });
    }

    // Fetch events for the organization
    console.log('Fetching events for organization:', organizationId);
    const eventsResponse = await fetch(
      `${EVENTBRITE_API_URL}/organizations/${organizationId}/events?status=live,started,ended,completed&expand=venue,organizer,ticket_classes`,
      {
        headers: {
          'Authorization': `Bearer ${EVENTBRITE_PRIVATE_TOKEN}`,
        },
      }
    );

    const eventsText = await eventsResponse.text();
    console.log('Events response:', eventsText);

    if (!eventsResponse.ok) {
      console.error('Error fetching events:', eventsText);
      return NextResponse.json({
        events: [],
        authenticated: false,
        message: 'Failed to fetch events'
      }, { status: 500 });
    }

    const eventsData = JSON.parse(eventsText);
    console.log(`Found ${eventsData.events?.length || 0} organization events`);

    return NextResponse.json({
      events: eventsData.events || [],
      authenticated: true,
      message: 'Successfully fetched events',
      debug: {
        userId: userData.id,
        organizationId,
        eventCount: eventsData.events?.length || 0
      }
    });
  } catch (error) {
    console.error('Error fetching Eventbrite events:', error);
    return NextResponse.json({
      error: 'Failed to fetch Eventbrite events',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
} 