import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Eventbrite API endpoint for fetching user's events
const EVENTBRITE_API_URL = 'https://www.eventbriteapi.com/v3';

// Cache to prevent duplicate requests
const responseCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

export async function GET(request: NextRequest) {
  try {
    // Get the Eventbrite access token from cookies
    const eventbriteToken = cookies().get('eventbrite_token')?.value;
    
    // Generate a cache key
    const cacheKey = `eventbrite_events_${eventbriteToken || 'no_token'}`;
    
    // Check if we have a cached response and it's not expired
    const cachedResponse = responseCache.get(cacheKey);
    if (cachedResponse && (Date.now() - cachedResponse.timestamp) < CACHE_TTL) {
      return cachedResponse.response;
    }
    
    if (!eventbriteToken) {
      console.log('Eventbrite API: No token found in cookies');
      // Return authentication required status with clear message
      const response = NextResponse.json({ 
        events: [], 
        authenticated: false,
        authRequired: true,
        message: 'Eventbrite authentication required'
      }, { status: 401 });
      responseCache.set(cacheKey, { response, timestamp: Date.now() });
      return response;
    }
    
    try {
      // Fetch the user's organization ID first
      const orgResponse = await fetch(`${EVENTBRITE_API_URL}/users/me/organizations`, {
        headers: {
          'Authorization': `Bearer ${eventbriteToken}`,
        },
      });
      
      if (!orgResponse.ok) {
        const status = orgResponse.status;
        console.error(`Error fetching Eventbrite organizations: Status ${status}`);
        
        // If token is invalid or expired (401), clear the cookie and provide clear message
        if (status === 401) {
          console.log('Clearing invalid Eventbrite token');
          cookies().set('eventbrite_token', '', { maxAge: 0 });
          
          const response = NextResponse.json({ 
            events: [], 
            authenticated: false,
            authRequired: true,
            message: 'Eventbrite authentication expired or invalid. Please reconnect your account.'
          }, { status: 401 });
          responseCache.set(cacheKey, { response, timestamp: Date.now() });
          return response;
        }
        
        // For other errors, return appropriate status
        const response = NextResponse.json({ 
          events: [], 
          authenticated: false,
          error: `Failed to fetch Eventbrite organizations (${status})`,
          message: 'Error connecting to Eventbrite. Please try again later.'
        }, { status });
        responseCache.set(cacheKey, { response, timestamp: Date.now() });
        return response;
      }
      
      const orgData = await orgResponse.json();
      
      if (!orgData.organizations || orgData.organizations.length === 0) {
        const response = NextResponse.json({ 
          events: [], 
          authenticated: true,
          message: 'No organizations found in your Eventbrite account.'
        });
        responseCache.set(cacheKey, { response, timestamp: Date.now() });
        return response;
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
        const status = eventsResponse.status;
        console.error(`Error fetching Eventbrite events: Status ${status}`);
        
        // Return appropriate error message
        const response = NextResponse.json({ 
          events: [], 
          authenticated: true,
          error: `Failed to fetch Eventbrite events (${status})`,
          message: 'Error retrieving events from Eventbrite. Please try again later.'
        }, { status });
        responseCache.set(cacheKey, { response, timestamp: Date.now() });
        return response;
      }
      
      const eventsData = await eventsResponse.json();
      
      const response = NextResponse.json({ 
        events: eventsData.events || [],
        authenticated: true,
        message: eventsData.events?.length ? `Successfully retrieved ${eventsData.events.length} events` : 'No events found'
      });
      responseCache.set(cacheKey, { response, timestamp: Date.now() });
      return response;
    } catch (error) {
      console.error('Error fetching from Eventbrite API:', error);
      // Return appropriate error message
      const response = NextResponse.json({ 
        events: [], 
        authenticated: false,
        error: 'Error connecting to Eventbrite API',
        message: 'Failed to connect to Eventbrite. Please check your internet connection and try again.'
      }, { status: 500 });
      responseCache.set(cacheKey, { response, timestamp: Date.now() });
      return response;
    }
  } catch (error) {
    console.error('Error in Eventbrite events API:', error);
    // Return appropriate error message
    return NextResponse.json({ 
      events: [], 
      authenticated: false,
      error: 'Internal server error',
      message: 'An unexpected error occurred. Please try again later.'
    }, { status: 500 });
  }
} 