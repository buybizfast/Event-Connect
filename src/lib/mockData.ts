import { Event } from './firebase/eventUtils';

// Define UserProfile interface locally since it's not exported from firebaseUtils
interface UserProfile {
  displayName: string;
  email: string;
  company: string;
  title: string;
  bio?: string;
  website?: string;
  twitter?: string;
  interests: string[];
  photoURL?: string;
}

// Mock events data
export const mockEvents: Event[] = [
  {
    id: 'event1',
    title: 'Tech Conference 2023',
    description: 'The biggest tech conference of the year with speakers from leading companies. Join us for a day of inspiring talks, workshops, and networking opportunities.',
    date: '2023-11-15',
    time: '09:00 - 18:00',
    location: 'Convention Center, New York',
    address: '123 Main St, New York, NY 10001',
    organizer: 'TechEvents Inc.',
    organizerId: 'org1',
    category: 'Technology',
    image: 'https://placehold.co/800x400',
    attendees: 120,
    price: 'Free',
    createdAt: new Date().toISOString(),
    agenda: [
      { time: '09:00 - 09:30', title: 'Registration & Coffee' },
      { time: '09:30 - 10:30', title: 'Keynote: The Future of Tech', speaker: 'John Smith, CTO of TechCorp' },
      { time: '10:45 - 11:45', title: 'Workshop: AI Implementation Strategies', speaker: 'Sarah Johnson, AI Specialist' },
      { time: '12:00 - 13:00', title: 'Lunch Break & Networking' },
      { time: '13:15 - 14:15', title: 'Panel Discussion: Emerging Technologies', speaker: 'Various Industry Leaders' },
      { time: '14:30 - 15:30', title: 'Workshop: Cloud Solutions', speaker: 'Michael Brown, Cloud Architect' },
      { time: '15:45 - 16:45', title: 'Closing Keynote: Innovation Mindset', speaker: 'Emily Davis, Innovation Consultant' },
      { time: '17:00 - 18:00', title: 'Networking Reception' }
    ],
    attendeeList: [
      { id: 'user1', name: 'John Smith', title: 'Software Engineer at TechCorp', avatar: 'https://placehold.co/100x100' },
      { id: 'user3', name: 'Michael Brown', title: 'Product Manager at StartupInc', avatar: 'https://placehold.co/100x100' },
      { id: 'user4', name: 'Emily Davis', title: 'Data Scientist at AnalyticsPro', avatar: 'https://placehold.co/100x100' },
      { id: 'user8', name: 'Ryan Taylor', title: 'Frontend Developer at WebSolutions', avatar: 'https://placehold.co/100x100' }
    ]
  },
  {
    id: 'event2',
    title: 'Startup Networking Mixer',
    description: 'Connect with founders, investors, and startup enthusiasts in a casual setting. This event is perfect for entrepreneurs looking to expand their network, find potential investors, or just share ideas with like-minded individuals.',
    date: '2023-11-20',
    time: '18:00 - 21:00',
    location: 'Innovation Hub, San Francisco',
    address: '456 Startup Ave, San Francisco, CA 94107',
    organizer: 'Founder Network',
    organizerId: 'org2',
    category: 'Networking',
    image: 'https://placehold.co/800x400',
    attendees: 75,
    price: '$15',
    createdAt: new Date().toISOString(),
    agenda: [
      { time: '18:00 - 18:30', title: 'Check-in & Welcome Drinks' },
      { time: '18:30 - 19:00', title: 'Introduction & Ice Breakers' },
      { time: '19:00 - 20:30', title: 'Open Networking' },
      { time: '20:30 - 21:00', title: 'Closing Remarks & Final Connections' }
    ],
    attendeeList: [
      { id: 'user2', name: 'Sarah Johnson', title: 'Marketing Director at CreativeAgency', avatar: 'https://placehold.co/100x100' },
      { id: 'user5', name: 'David Wilson', title: 'Startup Founder at InnovateTech', avatar: 'https://placehold.co/100x100' },
      { id: 'user7', name: 'Alex Thompson', title: 'Sales Director at GrowthCorp', avatar: 'https://placehold.co/100x100' }
    ]
  },
  {
    id: 'event3',
    title: 'AI in Healthcare Symposium',
    description: 'Explore the latest applications of artificial intelligence in healthcare. This symposium brings together medical professionals, AI researchers, and healthcare innovators to discuss the future of medicine.',
    date: '2023-12-05',
    time: '10:00 - 17:00',
    location: 'Medical Research Center, Boston',
    address: '789 Science Blvd, Boston, MA 02115',
    organizer: 'HealthTech Alliance',
    organizerId: 'org3',
    category: 'Healthcare',
    image: 'https://placehold.co/800x400',
    attendees: 150,
    price: '$50',
    createdAt: new Date().toISOString()
  }
];

// Mock user profile data
export const mockUserProfile: UserProfile = {
  displayName: 'Demo User',
  email: 'demo@example.com',
  company: 'Demo Company',
  title: 'Software Developer',
  bio: 'I am a software developer with a passion for building innovative applications.',
  website: 'https://example.com',
  twitter: '@demouser',
  interests: ['Technology', 'AI', 'Web Development', 'Networking'],
  photoURL: 'https://placehold.co/200x200'
};

// Function to get a mock event by ID
export const getMockEvent = (eventId: string): Event | undefined => {
  return mockEvents.find(event => event.id === eventId);
};

// Function to get all mock events
export const getAllMockEvents = (): Event[] => {
  return mockEvents;
};

// Function to get mock events by category
export const getMockEventsByCategory = (category: string): Event[] => {
  return mockEvents.filter(event => event.category === category);
};

// Function to save a mock event (for fallback when Firebase fails)
export const saveMockEvent = (event: Event): Event => {
  try {
    // Add to mock events array
    mockEvents.push(event);
    
    // Save to localStorage if available
    if (typeof window !== 'undefined') {
      // Get existing events
      const localEvents = JSON.parse(localStorage.getItem('localEvents') || '[]');
      
      // Check if an event with this ID already exists
      const existingEventIndex = localEvents.findIndex((e: Event) => e.id === event.id);
      
      if (existingEventIndex >= 0) {
        // Update existing event
        localEvents[existingEventIndex] = event;
      } else {
        // Add new event
        localEvents.push(event);
      }
      
      localStorage.setItem('localEvents', JSON.stringify(localEvents));
      console.log('Event saved to localStorage');
    }
    
    return event;
  } catch (error) {
    console.error('Error saving mock event:', error);
    throw error;
  }
};

// Function to get events from localStorage
export const getLocalEvents = (): Event[] => {
  if (typeof window !== 'undefined') {
    try {
      return JSON.parse(localStorage.getItem('localEvents') || '[]');
    } catch (error) {
      console.error('Error getting local events:', error);
      return [];
    }
  }
  return [];
};

/**
 * Deletes events from localStorage by title
 * @param title The title of the event to delete
 * @returns boolean indicating if any events were deleted
 */
export const deleteLocalEventsByTitle = (title: string): boolean => {
  if (typeof window !== 'undefined') {
    try {
      const localEvents = JSON.parse(localStorage.getItem('localEvents') || '[]');
      const initialLength = localEvents.length;
      
      // Filter out events with matching title
      const filteredEvents = localEvents.filter((event: Event) => 
        event.title.toLowerCase() !== title.toLowerCase()
      );
      
      // Save the filtered events back to localStorage
      localStorage.setItem('localEvents', JSON.stringify(filteredEvents));
      
      // Also remove from mockEvents array
      const mockEventsIndex = mockEvents.findIndex(event => 
        event.title.toLowerCase() === title.toLowerCase()
      );
      
      if (mockEventsIndex !== -1) {
        mockEvents.splice(mockEventsIndex, 1);
      }
      
      return filteredEvents.length < initialLength;
    } catch (error) {
      console.error('Error deleting local events:', error);
      return false;
    }
  }
  return false;
};

/**
 * Deletes an event from localStorage and mockEvents by ID
 * @param eventId The ID of the event to delete
 * @returns boolean indicating if the event was deleted
 */
export const deleteLocalEventById = (eventId: string): boolean => {
  if (typeof window !== 'undefined') {
    try {
      // Remove from localStorage
      const localEvents = JSON.parse(localStorage.getItem('localEvents') || '[]');
      const initialLocalLength = localEvents.length;
      
      const filteredLocalEvents = localEvents.filter((event: Event) => event.id !== eventId);
      localStorage.setItem('localEvents', JSON.stringify(filteredLocalEvents));
      
      // Remove from mockEvents array
      const initialMockLength = mockEvents.length;
      const mockEventIndex = mockEvents.findIndex(event => event.id === eventId);
      
      if (mockEventIndex !== -1) {
        mockEvents.splice(mockEventIndex, 1);
      }
      
      return filteredLocalEvents.length < initialLocalLength || mockEvents.length < initialMockLength;
    } catch (error) {
      console.error('Error deleting event by ID:', error);
      return false;
    }
  }
  return false;
}; 