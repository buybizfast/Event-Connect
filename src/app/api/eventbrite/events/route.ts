import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getEventbriteTokens, refreshEventbriteToken } from '@/lib/firebase/eventbriteUtils';

// Function to get base URL
const getBaseUrl = () => {
  return process.env.NEXT_PUBLIC_BASE_URL || 'https://event-connect-git-main-mindfulelementsinc-gmailcoms-projects.vercel.app';
};

// Eventbrite API endpoint for fetching user's events
const EVENTBRITE_API_URL = 'https://www.eventbriteapi.com/v3';

export async function GET(request: NextRequest) {
  try {
    // Get user ID from cookies
    const userId = cookies().get('userId')?.value;
    if (!userId) {
      return NextResponse.json({
        events: [],
        authenticated: false,
        message: 'User not authenticated'
      }, { status: 401 });
    }

    // Get Eventbrite tokens
    const { accessToken, tokenExpiry } = await getEventbriteTokens(userId);

    // Check if token exists and is valid
    if (!accessToken || !tokenExpiry || Date.now() >= tokenExpiry) {
      // Try to refresh the token
      const refreshed = await refreshEventbriteToken(userId);
      if (!refreshed) {
        return NextResponse.json({
          events: [],
          authenticated: false,
          message: 'Eventbrite authentication required'
        }, { status: 401 });
      }
      // Get new token after refresh
      const { accessToken: newToken } = await getEventbriteTokens(userId);
      if (!newToken) {
        return NextResponse.json({
          events: [],
          authenticated: false,
          message: 'Failed to refresh Eventbrite token'
        }, { status: 401 });
      }
    }

    // Get current token
    const { accessToken: currentToken } = await getEventbriteTokens(userId);
    if (!currentToken) {
      return NextResponse.json({
        events: [],
        authenticated: false,
        message: 'No valid Eventbrite token found'
      }, { status: 401 });
    }

    // First, get organization ID
    const orgResponse = await fetch(`${EVENTBRITE_API_URL}/users/me/organizations`, {
      headers: {
        'Authorization': `Bearer ${currentToken}`,
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

    let events = [];

    if (organizationId) {
      // Fetch events for the organization
      const eventsResponse = await fetch(
        `${EVENTBRITE_API_URL}/organizations/${organizationId}/events?status=live,started,ended,completed&expand=venue,organizer,ticket_classes`,
        {
          headers: {
            'Authorization': `Bearer ${currentToken}`,
          },
        }
      );

      if (!eventsResponse.ok) {
        console.error('Failed to fetch organization events:', await eventsResponse.text());
        return NextResponse.json({
          events: [],
          authenticated: true,
          message: 'Failed to fetch organization events'
        }, { status: 500 });
      }

      const eventsData = await eventsResponse.json();
      events = eventsData.events || [];
    } else {
      // If no organization, try fetching user's events directly
      const userEventsResponse = await fetch(
        `${EVENTBRITE_API_URL}/users/me/events?status=live,started,ended,completed&expand=venue,organizer,ticket_classes`,
        {
          headers: {
            'Authorization': `Bearer ${currentToken}`,
          },
        }
      );

      if (!userEventsResponse.ok) {
        console.error('Failed to fetch user events:', await userEventsResponse.text());
        return NextResponse.json({
          events: [],
          authenticated: true,
          message: 'Failed to fetch user events'
        }, { status: 500 });
      }

      const userEventsData = await userEventsResponse.json();
      events = userEventsData.events || [];
    }

    return NextResponse.json({
      events,
      authenticated: true,
      message: 'Successfully fetched events'
    });
  } catch (error) {
    console.error('Error fetching Eventbrite events:', error);
    return NextResponse.json({
      events: [],
      authenticated: false,
      message: error instanceof Error ? error.message : 'Failed to fetch events'
    }, { status: 500 });
  }
} 