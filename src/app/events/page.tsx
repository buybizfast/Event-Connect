'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Calendar, MapPin, Users, Filter, Search, Plus, Sparkles, Trash2, User } from 'lucide-react';
import Navigation from '@/components/Navigation';
import { getAllEvents, Event } from '@/lib/firebase/eventUtils';
import { getAllMockEvents, getLocalEvents } from '@/lib/mockData';
import { checkFirebaseConnection } from '@/lib/firebase/checkFirebase';
import { useAuth } from '@/lib/hooks/useAuth';

// Categories for filtering
const categories = ['All', 'Technology', 'Networking', 'Marketing', 'Design', 'Business'];

export default function EventsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showLocalEvents, setShowLocalEvents] = useState(false);
  const [firebaseStatus, setFirebaseStatus] = useState<any>(null);
  const { user } = useAuth();
  
  // Check if user is admin
  const isAdmin = user?.email === 'jacques@rebrandmint.com';
  
  // Function to check Firebase connection status
  const checkConnection = async () => {
    try {
      const status = await checkFirebaseConnection();
      setFirebaseStatus(status);
      
      if (!status.initialized || !status.firestoreConnected || !status.storageConnected) {
        console.log('Firebase connection issues detected:', status.errors);
        return status.errors;
      }
      
      return null;
    } catch (err) {
      console.error('Error checking Firebase connection:', err);
      return { general: 'Failed to check Firebase connection' };
    }
  };
  
  useEffect(() => {
    async function fetchEvents() {
      try {
        setLoading(true);
        setError('');
        
        // Check Firebase connection
        const connectionIssues = await checkConnection();
        
        // Try to get events from Firebase
        let allEvents: Event[] = [];
        try {
          allEvents = await getAllEvents();
          console.log('Fetched events from Firebase:', allEvents.length);
        } catch (firebaseErr) {
          console.error('Error fetching events from Firebase:', firebaseErr);
          setError('Failed to load events from server. Showing local events.');
          setShowLocalEvents(true);
        }
        
        // Get local events from localStorage
        const localEvents = getLocalEvents();
        console.log('Fetched local events:', localEvents.length);
        
        // If Firebase failed or returned no events, use mock data
        if (allEvents.length === 0) {
          const mockEvents = getAllMockEvents();
          console.log('Using mock events:', mockEvents.length);
          
          // Combine mock events and local events
          allEvents = [...mockEvents, ...localEvents];
        } else {
          // Combine Firebase events and local events
          // Use a Map to deduplicate by ID
          const eventMap = new Map<string, Event>();
          
          // Add Firebase events to the map
          allEvents.forEach(event => {
            eventMap.set(event.id, event);
          });
          
          // Add local events to the map (will overwrite Firebase events with same ID)
          localEvents.forEach(event => {
            if (!eventMap.has(event.id)) {
              eventMap.set(event.id, event);
            }
          });
          
          // Convert map back to array
          allEvents = Array.from(eventMap.values());
        }
        
        // Sort events by date
        allEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        setEvents(allEvents);
      } catch (err) {
        console.error('Error fetching events:', err);
        setError('Failed to load events. Please try again later.');
      } finally {
        setLoading(false);
      }
    }
    
    fetchEvents();
  }, []);
  
  // Filter events based on search query and category
  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          event.location.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'All' || event.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });
  
  // Format date to be more readable
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Upcoming Events</h1>
            <p className="mt-1 text-gray-500">
              Discover and join events in your industry
            </p>
          </div>
          
          <div className="mt-4 md:mt-0 flex flex-col sm:flex-row gap-3">
            <Link
              href="/events/recommendations"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              AI Recommendations
            </Link>
            <Link
              href="/events/create"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
            >
              <Calendar className="mr-2 h-4 w-4" />
              Create Event
            </Link>
            {isAdmin && (
              <Link
                href="/admin/events"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700"
              >
                <User className="mr-2 h-4 w-4" />
                Admin Panel
              </Link>
            )}
          </div>
        </div>
        
        {/* Firebase connection status */}
        {firebaseStatus && (!firebaseStatus.initialized || !firebaseStatus.firestoreConnected || !firebaseStatus.storageConnected) && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-yellow-700">
              <strong>Firebase connection issues detected:</strong> {firebaseStatus.errors.firestore || firebaseStatus.errors.storage}
            </p>
          </div>
        )}
        
        {/* Search and filters */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-grow">
              <input
                type="text"
                placeholder="Search events..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
            
            <div className="relative">
              <select
                className="appearance-none pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <Filter className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
          </div>
        </div>
        
        {/* Loading state */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        )}
        
        {showLocalEvents && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-yellow-700">
              <strong>Note:</strong> Showing locally saved events. Some features may be limited.
            </p>
          </div>
        )}
        
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700">{error}</p>
          </div>
        )}
        
        {/* Events grid */}
        {!loading && !error && filteredEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event, index) => (
              <Link 
                key={event.id}
                href={`/events/${event.id}`}
                className="bg-white rounded-lg shadow overflow-hidden hover:shadow-md transition-shadow duration-300"
              >
                <div className="h-48 overflow-hidden relative">
                  <Image 
                    src={event.image || 'https://placehold.co/800x400'} 
                    alt={event.title} 
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover"
                    priority={index === 0}
                  />
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                      {event.category}
                    </span>
                    <span className="text-sm text-gray-500">{event.price}</span>
                  </div>
                  <h2 className="mt-2 text-xl font-semibold text-gray-900 line-clamp-1">
                    {event.title}
                  </h2>
                  <p className="mt-1 text-gray-500 line-clamp-2">
                    {event.description}
                  </p>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center text-sm text-gray-500">
                      <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                      {formatDate(event.date)} • {event.time}
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                      {event.location}
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <Users className="h-4 w-4 mr-2 text-gray-400" />
                      {event.attendees} attendees
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : !loading && !error ? (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <Calendar className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">No events found</h3>
            <p className="mt-1 text-gray-500">
              {searchQuery || selectedCategory !== 'All' 
                ? 'Try adjusting your search or filters'
                : 'Be the first to create an event!'}
            </p>
            {(searchQuery || selectedCategory !== 'All') && (
              <div className="mt-6">
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('All');
                  }}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        ) : null}
      </main>
    </div>
  );
} 