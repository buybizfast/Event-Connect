import { NextRequest, NextResponse } from 'next/server';

const EVENTBRITE_API_KEY = process.env.EVENTBRITE_API_KEY;
const EVENTBRITE_API_URL = 'https://www.eventbriteapi.com/v3';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('userId');
  
  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }
  
  if (!EVENTBRITE_API_KEY) {
    return NextResponse.json({ error: 'Eventbrite API key is not configured' }, { status: 500 });
  }
  
  try {
    // Get user's Eventbrite organization ID
    const orgResponse = await fetch(`${EVENTBRITE_API_URL}/users/me/organizations`, {
      headers: {
        'Authorization': `Bearer ${EVENTBRITE_API_KEY}`,
      },
    });
    
    if (!orgResponse.ok) {
      throw new Error(`Failed to fetch organizations: ${orgResponse.statusText}`);
    }
    
    const orgData = await orgResponse.json();
    
    if (!orgData.organizations || orgData.organizations.length === 0) {
      return NextResponse.json({ events: [] }, { status: 200 });
    }
    
    const organizationId = orgData.organizations[0].id;
    
    // Get events for the organization
    const eventsResponse = await fetch(`${EVENTBRITE_API_URL}/organizations/${organizationId}/events`, {
      headers: {
        'Authorization': `Bearer ${EVENTBRITE_API_KEY}`,
      },
    });
    
    if (!eventsResponse.ok) {
      throw new Error(`Failed to fetch events: ${eventsResponse.statusText}`);
    }
    
    const eventsData = await eventsResponse.json();
    
    return NextResponse.json({ events: eventsData.events }, { status: 200 });
  } catch (error) {
    console.error('Error fetching Eventbrite events:', error);
    return NextResponse.json({ error: 'Failed to fetch Eventbrite events' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { userId, eventbriteToken } = await request.json();
  
  if (!userId || !eventbriteToken) {
    return NextResponse.json({ error: 'User ID and Eventbrite token are required' }, { status: 400 });
  }
  
  try {
    // Store the Eventbrite token for the user
    // This would typically be stored in your database
    // For this example, we'll just return success
    
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error connecting Eventbrite account:', error);
    return NextResponse.json({ error: 'Failed to connect Eventbrite account' }, { status: 500 });
  }
} 