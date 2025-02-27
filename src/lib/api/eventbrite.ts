import { Event } from '@/lib/firebase/eventUtils';

// Define Eventbrite API base URL
const EVENTBRITE_API_URL = 'https://www.eventbriteapi.com/v3';

// Define Eventbrite event interface
export interface EventbriteEvent {
  id: string;
  name: {
    text: string;
    html: string;
  };
  description: {
    text: string;
    html: string;
  };
  url: string;
  start: {
    timezone: string;
    local: string;
    utc: string;
  };
  end: {
    timezone: string;
    local: string;
    utc: string;
  };
  venue_id: string;
  venue?: {
    name: string;
    address: {
      address_1: string;
      address_2: string;
      city: string;
      region: string;
      postal_code: string;
      country: string;
      localized_address_display: string;
    };
  };
  logo?: {
    url: string;
  };
  capacity: number;
  ticket_classes?: Array<{
    name: string;
    cost?: {
      value: number;
      currency: string;
      display: string;
    };
  }>;
  eventbrite_url: string;
  organizer?: {
    id: string;
    name: string;
    description?: {
      text?: string;
    };
  };
  status?: string;
}

// Define Eventbrite attendee interface
export interface EventbriteAttendee {
  id: string;
  profile: {
    first_name: string;
    last_name: string;
    email: string;
    name: string;
    addresses?: {
      home?: {
        city?: string;
        country?: string;
        region?: string;
        postal_code?: string;
        address_1?: string;
        address_2?: string;
      };
      work?: {
        city?: string;
        country?: string;
        region?: string;
        postal_code?: string;
        address_1?: string;
        address_2?: string;
      };
    };
  };
  ticket_class_name: string;
  status: string;
  checked_in: boolean;
  cancelled: boolean;
  order_id: string;
  refunded: boolean;
}

// Convert Eventbrite event to our app's event format
export const convertEventbriteToAppEvent = (
  eventbriteEvent: EventbriteEvent,
  organizerId: string
): Partial<Event> => {
  // Extract price from ticket classes if available
  let price = 'Free';
  if (eventbriteEvent.ticket_classes && eventbriteEvent.ticket_classes.length > 0) {
    const paidTicket = eventbriteEvent.ticket_classes.find(ticket => ticket.cost && ticket.cost.value > 0);
    if (paidTicket && paidTicket.cost) {
      price = paidTicket.cost.display;
    }
  }

  // Format date and time
  const startDate = new Date(eventbriteEvent.start.local);
  const endDate = new Date(eventbriteEvent.end.local);
  
  const formattedDate = startDate.toISOString().split('T')[0];
  const formattedStartTime = startDate.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });
  const formattedEndTime = endDate.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });

  return {
    title: eventbriteEvent.name.text,
    description: eventbriteEvent.description.text,
    date: formattedDate,
    time: `${formattedStartTime} - ${formattedEndTime}`,
    location: eventbriteEvent.venue?.name || 'TBD',
    address: eventbriteEvent.venue?.address?.localized_address_display || '',
    organizer: eventbriteEvent.organizer?.name || organizerId,
    organizerId: organizerId,
    category: 'Imported from Eventbrite',
    image: eventbriteEvent.logo?.url || 'https://placehold.co/800x400',
    attendees: 0,
    maxAttendees: eventbriteEvent.capacity,
    price: price,
    createdAt: new Date().toISOString(),
    eventbriteId: eventbriteEvent.id,
    eventbriteUrl: eventbriteEvent.url,
  };
};

// Fetch events from Eventbrite API
export const fetchEventbriteEvents = async (accessToken: string): Promise<EventbriteEvent[]> => {
  try {
    const response = await fetch(`${EVENTBRITE_API_URL}/users/me/events?status=live,started,ended,completed&expand=organizer,venue`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Eventbrite API error: ${response.status}`);
    }

    const data = await response.json();
    return data.events;
  } catch (error) {
    console.error('Error fetching Eventbrite events:', error);
    throw error;
  }
};

// Fetch a single event from Eventbrite API
export const fetchEventbriteEvent = async (eventId: string, accessToken: string): Promise<EventbriteEvent> => {
  try {
    const response = await fetch(`${EVENTBRITE_API_URL}/events/${eventId}?expand=venue,organizer,ticket_classes`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Eventbrite API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching Eventbrite event ${eventId}:`, error);
    throw error;
  }
};

// Fetch attendees for an event
export const fetchEventbriteAttendees = async (eventId: string, accessToken: string): Promise<EventbriteAttendee[]> => {
  try {
    const response = await fetch(`${EVENTBRITE_API_URL}/events/${eventId}/attendees?status=attending`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Eventbrite API error: ${response.status}`);
    }

    const data = await response.json();
    return data.attendees;
  } catch (error) {
    console.error(`Error fetching Eventbrite attendees for event ${eventId}:`, error);
    throw error;
  }
};

// Transform Eventbrite attendees to our app's format
export const convertEventbriteAttendees = (attendees: EventbriteAttendee[]) => {
  return attendees.map(attendee => ({
    id: attendee.id,
    name: attendee.profile.name || `${attendee.profile.first_name} ${attendee.profile.last_name}`,
    email: attendee.profile.email,
    ticketType: attendee.ticket_class_name,
    status: attendee.status,
    checkedIn: attendee.checked_in,
    city: attendee.profile.addresses?.home?.city || '',
    source: 'eventbrite'
  }));
}; 