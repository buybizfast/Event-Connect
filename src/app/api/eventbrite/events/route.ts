import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Eventbrite API endpoint for fetching user's events
const EVENTBRITE_API_URL = 'https://www.eventbriteapi.com/v3';

export async function GET(request: NextRequest) {
  try {
    // Get the Eventbrite access token from cookies
    const eventbriteToken = cookies().get('eventbrite_token')?.value;
    
    if (!eventbriteToken) {
      return NextResponse.json({ error: 'Not authenticated with Eventbrite' }, { status: 401 });
    }
    
    try {
      // Fetch the user's organization ID first
      const orgResponse = await fetch(`${EVENTBRITE_API_URL}/users/me/organizations`, {
        headers: {
          'Authorization': `Bearer ${eventbriteToken}`,
        },
      });
      
      if (!orgResponse.ok) {
        const errorData = await orgResponse.json();
        console.error('Error fetching Eventbrite organizations:', errorData);
        return NextResponse.json({ error: 'Failed to fetch Eventbrite organizations' }, { status: 400 });
      }
      
      const orgData = await orgResponse.json();
      
      if (!orgData.organizations || orgData.organizations.length === 0) {
        return NextResponse.json({ events: [] });
      }
      
      // Use the first organization ID to fetch events
      const organizationId = orgData.organizations[0].id;
      
      // Fetch events for the organization
      const eventsResponse = await fetch(`${EVENTBRITE_API_URL}/organizations/${organizationId}/events`, {
        headers: {
          'Authorization': `Bearer ${eventbriteToken}`,
        },
      });
      
      if (!eventsResponse.ok) {
        const errorData = await eventsResponse.json();
        console.error('Error fetching Eventbrite events:', errorData);
        return NextResponse.json({ error: 'Failed to fetch Eventbrite events' }, { status: 400 });
      }
      
      const eventsData = await eventsResponse.json();
      
      return NextResponse.json({ events: eventsData.events || [] });
    } catch (error) {
      console.error('Error fetching from Eventbrite API:', error);
      // Return empty events array instead of error to prevent UI from breaking
      return NextResponse.json({ events: [] });
    }
  } catch (error) {
    console.error('Error in Eventbrite events API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 