'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import Navigation from '@/components/Navigation';
import ImageUpload from '@/components/ImageUpload';
import EventbriteIntegration from '@/components/EventbriteIntegration';
import { uploadEventImage } from '@/lib/firebase/storageUtils';
import { createEvent } from '@/lib/firebase/eventUtils';
import { saveMockEvent } from '@/lib/mockData';
import { checkFirebaseConnection } from '@/lib/firebase/checkFirebase';
import { Calendar, Clock, MapPin, Users, DollarSign, Tag, FileText, X, ExternalLink } from 'lucide-react';

// Categories for event creation
const categories = ['Technology', 'Networking', 'Marketing', 'Design', 'Business'];

export default function CreateEventPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [firebaseStatus, setFirebaseStatus] = useState<any>(null);
  const [eventImage, setEventImage] = useState<File | null>(null);
  const [showEventbriteModal, setShowEventbriteModal] = useState(false);
  const [event, setEvent] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    endTime: '',
    location: '',
    category: 'Technology',
    price: 'Free',
    maxAttendees: '50',
  });

  // Add useEffect for authentication check
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/events/create');
    }
  }, [user, authLoading, router]);

  // Check Firebase connection on page load
  useEffect(() => {
    async function checkConnection() {
      try {
        const status = await checkFirebaseConnection();
        setFirebaseStatus(status);
        
        if (!status.initialized || !status.firestoreConnected) {
          console.warn('Firebase connection issues detected:', status.errors);
        }
      } catch (err) {
        console.error('Error checking Firebase connection:', err);
      }
    }
    
    checkConnection();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEvent(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (file: File | null) => {
    setEventImage(file);
  };

  // Handle event import from Eventbrite
  const handleEventImport = (eventbriteEvent: any) => {
    if (!eventbriteEvent) return;
    
    try {
      // Parse the date and time from the Eventbrite event
      const startDate = new Date(eventbriteEvent.start.local);
      const endDate = new Date(eventbriteEvent.end.local);
      
      const formattedDate = startDate.toISOString().split('T')[0];
      const formattedStartTime = startDate.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
      const formattedEndTime = endDate.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
      
      // Extract price from ticket classes if available
      let price = 'Free';
      if (eventbriteEvent.ticket_classes && eventbriteEvent.ticket_classes.length > 0) {
        const paidTicket = eventbriteEvent.ticket_classes.find((ticket: any) => ticket.cost && ticket.cost.value > 0);
        if (paidTicket && paidTicket.cost) {
          price = paidTicket.cost.display;
        }
      }
      
      // Get venue information if available
      const venueName = eventbriteEvent.venue?.name || '';
      const venueAddress = eventbriteEvent.venue?.address?.localized_address_display || '';
      const location = venueName + (venueAddress ? `, ${venueAddress}` : '');
      
      // Update the form with the Eventbrite event data
      setEvent({
        title: eventbriteEvent.name.text || '',
        description: eventbriteEvent.description.text || '',
        date: formattedDate,
        time: formattedStartTime,
        endTime: formattedEndTime,
        location: location || '',
        category: categories.includes(eventbriteEvent.category?.name) 
          ? eventbriteEvent.category?.name 
          : 'Technology',
        price: price,
        maxAttendees: eventbriteEvent.capacity?.toString() || '50',
      });
      
      // Close the modal
      setShowEventbriteModal(false);
      
      // Show success message
      setError(''); // Clear any existing errors
      setSuccess('Event imported successfully from Eventbrite!');
    } catch (err) {
      console.error('Error importing event from Eventbrite:', err);
      setError('Failed to import event from Eventbrite. Please try again or fill the form manually.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('You must be logged in to create an event');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      console.log('Starting event creation process...');
      
      // Check Firebase connection status
      if (firebaseStatus && (!firebaseStatus.initialized || !firebaseStatus.firestoreConnected)) {
        console.warn('Firebase connection issues detected, will use local storage fallback');
      }
      
      // Create a unique ID for the event
      const eventId = `event_${Date.now()}`;
      
      // Upload event image if provided
      let imageUrl = 'https://placehold.co/600x400'; // Default placeholder
      
      if (eventImage) {
        try {
          console.log('Uploading event image...');
          
          // Check if Storage is connected before attempting upload
          if (firebaseStatus && !firebaseStatus.storageConnected) {
            console.warn('Firebase Storage not connected, using placeholder image');
            setError('Firebase Storage not connected. Using placeholder image instead.');
          } else {
            try {
              imageUrl = await uploadEventImage(eventId, eventImage);
              console.log('Image uploaded successfully:', imageUrl);
            } catch (uploadErr) {
              console.error('Error during image upload:', uploadErr);
              
              // If the error is a string or has a message property, log it
              const errorMessage = typeof uploadErr === 'string' 
                ? uploadErr 
                : uploadErr instanceof Error 
                  ? uploadErr.message 
                  : 'Unknown error';
              
              // Check specifically for CORS errors
              if (errorMessage.toLowerCase().includes('cors') || 
                  errorMessage.toLowerCase().includes('access control') ||
                  errorMessage.toLowerCase().includes('preflight')) {
                console.warn('CORS issue detected when uploading image, using placeholder instead');
                setError('CORS issue detected. Using placeholder image. Please update Firebase Storage CORS settings.');
              } else {
                setError(`Image upload failed: ${errorMessage}. Using placeholder image instead.`);
              }
              
              // Continue with event creation using placeholder
            }
          }
        } catch (err) {
          console.error('Error uploading event image:', err);
          setError('Failed to upload event image. Using placeholder image instead.');
          // Continue with event creation using placeholder
        }
      }
      
      // Create event object
      const newEvent = {
        id: eventId,
        title: event.title,
        description: event.description,
        date: event.date,
        time: event.time,
        endTime: event.endTime,
        location: event.location,
        category: event.category,
        price: event.price,
        maxAttendees: parseInt(event.maxAttendees),
        image: imageUrl,
        organizer: user.displayName || 'Anonymous',
        organizerId: user.uid,
        attendees: 0,
        createdAt: new Date().toISOString(),
      };
      
      console.log('Event object created:', newEvent);
      
      // If Firebase is not connected, save to local storage directly
      if (firebaseStatus && (!firebaseStatus.initialized || !firebaseStatus.firestoreConnected)) {
        console.log('Firebase not connected, saving to local storage directly');
        saveMockEvent(newEvent);
        setError('Event saved locally (Firebase not connected). Some features may be limited.');
        
        // Wait 2 seconds to show the message before redirecting
        setTimeout(() => {
          router.push('/events');
        }, 2000);
        return;
      }
      
      try {
        // Save event to Firestore
        console.log('Saving event to Firestore...');
        await createEvent(newEvent);
        console.log('Event saved successfully!');
        
        // Redirect to events page
        router.push('/events');
      } catch (firestoreErr: any) {
        console.error('Error saving to Firestore:', firestoreErr);
        
        if (firestoreErr.code === 'permission-denied') {
          // Try to save as mock data
          try {
            console.log('Attempting to save as mock data...');
            saveMockEvent(newEvent);
            console.log('Event saved as mock data');
            setError('Event saved locally (Firebase permission denied). Some features may be limited.');
            
            // Wait 2 seconds to show the message before redirecting
            setTimeout(() => {
              router.push('/events');
            }, 2000);
            return;
          } catch (mockErr) {
            console.error('Failed to save as mock data:', mockErr);
          }
          
          setError('Permission denied: You may not have access to create events. Please check your account permissions.');
        } else {
          setError(`Failed to create event: ${firestoreErr.message || 'Unknown error'}`);
        }
      }
      
    } catch (err: any) {
      console.error('Error in event creation process:', err);
      setError(`Failed to create event: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      {authLoading ? (
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      ) : !user ? (
        <div className="flex justify-center items-center h-screen">
          <p>Redirecting to login...</p>
        </div>
      ) : (
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Create New Event</h1>
            <p className="mt-1 text-gray-500">
              Fill out the form below to create a new event
            </p>
          </div>
          
          {firebaseStatus && (!firebaseStatus.initialized || !firebaseStatus.firestoreConnected) && (
            <div className="mb-6 bg-yellow-50 p-4 rounded-md">
              <p className="text-sm text-yellow-700">
                Firebase connection issues detected. Events will be saved locally.
              </p>
            </div>
          )}
          
          {error && (
            <div className="mb-6 bg-red-50 p-4 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          
          {success && (
            <div className="mb-6 bg-green-50 p-4 rounded-md">
              <p className="text-sm text-green-700">{success}</p>
            </div>
          )}
          
          {/* Eventbrite Import Button */}
          <div className="mb-6">
            <button
              type="button"
              onClick={() => setShowEventbriteModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            >
              <ExternalLink className="mr-2 h-5 w-5" />
              Import from Eventbrite
            </button>
          </div>
          
          {/* Eventbrite Import Modal */}
          {showEventbriteModal && (
            <div className="fixed inset-0 z-50 overflow-y-auto">
              <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                  <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                </div>
                
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                
                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                  <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <div className="sm:flex sm:items-start">
                      <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                        <div className="flex justify-between items-center">
                          <h3 className="text-lg leading-6 font-medium text-gray-900">Import from Eventbrite</h3>
                          <button
                            type="button"
                            onClick={() => setShowEventbriteModal(false)}
                            className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                          >
                            <span className="sr-only">Close</span>
                            <X className="h-6 w-6" />
                          </button>
                        </div>
                        <div className="mt-4">
                          <EventbriteIntegration onEventSelect={handleEventImport} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="bg-white shadow-sm rounded-lg overflow-hidden">
            <div className="p-6 space-y-6">
              <div>
                <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-2">
                  Event Image
                </label>
                <ImageUpload onImageChange={handleImageChange} />
                <p className="mt-1 text-sm text-gray-500">
                  Upload a cover image for your event. Recommended size: 1200x600px.
                </p>
              </div>
              
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                  Event Title
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  required
                  value={event.title}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-black"
                />
              </div>
              
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  required
                  value={event.description}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-black"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                    Date
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Calendar className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="date"
                      id="date"
                      name="date"
                      required
                      value={event.date}
                      onChange={handleChange}
                      className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md text-black"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="time" className="block text-sm font-medium text-gray-700">
                    Start Time
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Clock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="time"
                      id="time"
                      name="time"
                      required
                      value={event.time}
                      onChange={handleChange}
                      className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md text-black"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="endTime" className="block text-sm font-medium text-gray-700">
                    End Time
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Clock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="time"
                      id="endTime"
                      name="endTime"
                      required
                      value={event.endTime}
                      onChange={handleChange}
                      className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md text-black"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                    Location
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MapPin className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      id="location"
                      name="location"
                      required
                      value={event.location}
                      onChange={handleChange}
                      className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md text-black"
                      placeholder="City, State"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                    Category
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Tag className="h-5 w-5 text-gray-400" />
                    </div>
                    <select
                      id="category"
                      name="category"
                      required
                      value={event.category}
                      onChange={handleChange}
                      className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md text-black"
                    >
                      {categories.map(category => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div>
                  <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                    Price
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <DollarSign className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      id="price"
                      name="price"
                      required
                      value={event.price}
                      onChange={handleChange}
                      className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md text-black"
                      placeholder="Free or amount"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="maxAttendees" className="block text-sm font-medium text-gray-700">
                    Maximum Attendees
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Users className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="number"
                      id="maxAttendees"
                      name="maxAttendees"
                      required
                      min="1"
                      value={event.maxAttendees}
                      onChange={handleChange}
                      className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md text-black"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
              <button
                type="button"
                onClick={() => router.push('/events')}
                className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 mr-3"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${
                  loading ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
              >
                {loading ? 'Creating...' : 'Create Event'}
              </button>
            </div>
          </form>
        </main>
      )}
    </div>
  );
} 