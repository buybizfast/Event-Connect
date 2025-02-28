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
    console.log('Fetching Eventbrite events...');
    
    if (!EVENTBRITE_PRIVATE_TOKEN) {
      console.error('Eventbrite Private Token is not configured');
      return NextResponse.json({
        events: [],
        authenticated: false,
        message: 'Eventbrite configuration error'
      }, { status: 500 });
    }

    // Get organization ID
    console.log('Fetching organization ID...');
    const orgResponse = await fetch(`${EVENTBRITE_API_URL}/users/me/organizations`, {
      headers: {
        'Authorization': `Bearer ${EVENTBRITE_PRIVATE_TOKEN}`,
      },
    });

    if (!orgResponse.ok) {
      console.error('Failed to fetch organization:', await orgResponse.text());
      return NextResponse.json({
        events: [],
        authenticated: false,
        message: 'Failed to fetch organization'
      }, { status: 500 });
    }

    const orgData = await orgResponse.json();
    const organizationId = orgData.organizations?.[0]?.id;

    if (!organizationId) {
      console.log('No organization found');
      return NextResponse.json({
        events: [],
        authenticated: true,
        message: 'No organization found'
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

    if (!eventsResponse.ok) {
      console.error('Error fetching events:', await eventsResponse.text());
      return NextResponse.json({
        events: [],
        authenticated: false,
        message: 'Failed to fetch events'
      }, { status: 500 });
    }

    const eventsData = await eventsResponse.json();
    console.log(`Found ${eventsData.events?.length || 0} events`);

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