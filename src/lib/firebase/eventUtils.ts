import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  deleteDoc,
  Timestamp,
  increment,
} from 'firebase/firestore';
import { db } from './firebase';

interface AgendaItem {
  time: string;
  title: string;
  speaker?: string;
}

interface Attendee {
  id: string;
  name: string;
  title?: string;
  avatar?: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  endTime?: string;
  location: string;
  address?: string;
  organizer: string;
  organizerId: string;
  category: string;
  image: string;
  imageUrl?: string;
  attendees: number;
  maxAttendees?: number;
  price: string;
  createdAt: string;
  agenda?: AgendaItem[];
  attendeeList?: Attendee[];
  eventbriteId?: string;
  eventbriteUrl?: string;
}

/**
 * Creates a new event in Firestore
 * @param event The event data to save
 * @returns The created event
 */
export const createEvent = async (event: Event): Promise<Event> => {
  try {
    console.log('Creating event in Firestore:', event.id);
    await setDoc(doc(db, 'events', event.id), {
      ...event,
      createdAt: Timestamp.now(),
    });
    console.log('Event created successfully in Firestore');
    return event;
  } catch (error: any) {
    console.error('Error creating event:', error);
    
    // Add more detailed error information
    if (error.code === 'permission-denied') {
      console.error('Permission denied. Check Firestore security rules.');
      
      // Try to save to localStorage as a fallback
      try {
        if (typeof window !== 'undefined') {
          const localEvents = JSON.parse(localStorage.getItem('localEvents') || '[]');
          localEvents.push(event);
          localStorage.setItem('localEvents', JSON.stringify(localEvents));
          console.log('Event saved to localStorage as fallback');
        }
      } catch (localError) {
        console.error('Failed to save to localStorage:', localError);
      }
    }
    
    throw error;
  }
};

/**
 * Gets an event by ID
 * @param eventId The event ID
 * @returns The event data or null if not found
 */
export const getEvent = async (eventId: string): Promise<Event | null> => {
  try {
    const docRef = doc(db, 'events', eventId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Event;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting event:', error);
    // Return null instead of throwing error
    return null;
  }
};

/**
 * Gets all events
 * @returns Array of events
 */
export const getAllEvents = async (): Promise<Event[]> => {
  try {
    const eventsRef = collection(db, 'events');
    const q = query(eventsRef, orderBy('date', 'asc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Event));
  } catch (error) {
    console.error('Error getting all events:', error);
    // Return empty array instead of throwing error
    return [];
  }
};

/**
 * Gets events by category
 * @param category The category to filter by
 * @returns Array of events in the specified category
 */
export const getEventsByCategory = async (category: string): Promise<Event[]> => {
  try {
    const eventsRef = collection(db, 'events');
    const q = query(
      eventsRef,
      where('category', '==', category),
      orderBy('date', 'asc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Event));
  } catch (error) {
    console.error('Error getting events by category:', error);
    // Return empty array instead of throwing error
    return [];
  }
};

/**
 * Gets events organized by a specific user
 * @param userId The user ID of the organizer
 * @returns Array of events organized by the user
 */
export const getEventsByOrganizer = async (userId: string): Promise<Event[]> => {
  try {
    const eventsRef = collection(db, 'events');
    const q = query(
      eventsRef,
      where('organizerId', '==', userId),
      orderBy('date', 'asc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Event));
  } catch (error) {
    console.error('Error getting events by organizer:', error);
    // Return empty array instead of throwing error
    return [];
  }
};

/**
 * Updates an existing event
 * @param eventId The event ID
 * @param eventData The updated event data
 */
export const updateEvent = async (eventId: string, eventData: Partial<Event>): Promise<void> => {
  try {
    const eventRef = doc(db, 'events', eventId);
    await updateDoc(eventRef, eventData);
  } catch (error) {
    console.error('Error updating event:', error);
    // Don't throw the error, just log it
  }
};

/**
 * Deletes an event
 * @param eventId The event ID to delete
 */
export const deleteEvent = async (eventId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'events', eventId));
  } catch (error) {
    console.error('Error deleting event:', error);
    // Don't throw the error, just log it
  }
};

/**
 * Registers a user for an event
 * @param eventId The event ID
 * @param userId The user ID
 */
export const registerForEvent = async (eventId: string, userId: string): Promise<void> => {
  try {
    // Add user to event attendees
    const attendeeRef = doc(db, 'events', eventId, 'attendees', userId);
    await setDoc(attendeeRef, {
      userId,
      registeredAt: Timestamp.now()
    });
    
    // Increment attendee count
    const eventRef = doc(db, 'events', eventId);
    await updateDoc(eventRef, {
      attendees: increment(1)
    });
    
    // Add event to user's registered events
    const userEventRef = doc(db, 'users', userId, 'registeredEvents', eventId);
    await setDoc(userEventRef, {
      eventId,
      registeredAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error registering for event:', error);
    // Don't throw the error, just log it
  }
};

/**
 * Cancels a user's registration for an event
 * @param eventId The event ID
 * @param userId The user ID
 */
export const cancelEventRegistration = async (eventId: string, userId: string): Promise<void> => {
  try {
    // Remove user from event attendees
    await deleteDoc(doc(db, 'events', eventId, 'attendees', userId));
    
    // Decrement attendee count
    const eventRef = doc(db, 'events', eventId);
    await updateDoc(eventRef, {
      attendees: increment(-1)
    });
    
    // Remove event from user's registered events
    await deleteDoc(doc(db, 'users', userId, 'registeredEvents', eventId));
  } catch (error) {
    console.error('Error canceling event registration:', error);
    // Don't throw the error, just log it
  }
};

/**
 * Gets events that a user is registered for
 * @param userId The user ID
 * @returns Array of events the user is registered for
 */
export const getUserRegisteredEvents = async (userId: string): Promise<Event[]> => {
  try {
    const registeredEventsRef = collection(db, 'users', userId, 'registeredEvents');
    const querySnapshot = await getDocs(registeredEventsRef);
    
    const events: Event[] = [];
    
    for (const doc of querySnapshot.docs) {
      const eventId = doc.id;
      const event = await getEvent(eventId);
      if (event) {
        events.push(event);
      }
    }
    
    return events;
  } catch (error) {
    console.error('Error getting user registered events:', error);
    throw error;
  }
}; 