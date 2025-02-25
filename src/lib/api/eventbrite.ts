import { Event } from '@/lib/firebase/eventUtils';

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
    organizer: organizerId,
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
    const response = await fetch('https://www.eventbriteapi.com/v3/users/me/events?status=live', {
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
    const response = await fetch(`https://www.eventbriteapi.com/v3/events/${eventId}?expand=venue`, {
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