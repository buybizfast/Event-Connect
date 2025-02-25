'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Trash2, Calendar, Clock, MapPin, Image as ImageIcon, Tag, DollarSign, Users } from 'lucide-react';
import Navigation from '@/components/Navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { getEvent, updateEvent, deleteEvent, Event } from '@/lib/firebase/eventUtils';
import { getMockEvent } from '@/lib/mockData';

export default function EditEventPage() {
  const { eventId } = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    endTime: '',
    location: '',
    address: '',
    category: '',
    image: '',
    price: '',
    maxAttendees: ''
  });
  
  useEffect(() => {
    async function fetchEvent() {
      if (!eventId) return;
      
      try {
        setLoading(true);
        setError('');
        
        // Ensure eventId is a string
        const eventIdString = typeof eventId === 'string' ? eventId : Array.isArray(eventId) ? eventId[0] : '';
        
        const eventData = await getEvent(eventIdString);
        
        if (eventData) {
          setEvent(eventData);
          
          // Initialize form data with event data
          setFormData({
            title: eventData.title || '',
            description: eventData.description || '',
            date: eventData.date || '',
            time: eventData.time || '',
            endTime: eventData.endTime || '',
            location: eventData.location || '',
            address: eventData.address || '',
            category: eventData.category || '',
            image: eventData.image || '',
            price: eventData.price || '',
            maxAttendees: eventData.maxAttendees?.toString() || ''
          });
        } else {
          // Try to get mock event data
          const mockEventData = getMockEvent(eventIdString);
          
          if (mockEventData) {
            setEvent(mockEventData as Event);
            
            // Initialize form data with mock event data
            setFormData({
              title: mockEventData.title || '',
              description: mockEventData.description || '',
              date: mockEventData.date || '',
              time: mockEventData.time || '',
              endTime: mockEventData.endTime || '',
              location: mockEventData.location || '',
              address: mockEventData.address || '',
              category: mockEventData.category || '',
              image: mockEventData.image || '',
              price: mockEventData.price || '',
              maxAttendees: mockEventData.maxAttendees?.toString() || ''
            });
          } else {
            setError('Event not found');
          }
        }
      } catch (err) {
        console.error('Error fetching event:', err);
        setError('Failed to load event details');
      } finally {
        setLoading(false);
      }
    }
    
    fetchEvent();
  }, [eventId]);
  
  // Check if user is authorized to edit this event
  useEffect(() => {
    if (!authLoading && user && event && event.organizerId !== user.uid) {
      setError('You are not authorized to edit this event');
    }
  }, [authLoading, user, event]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !event) return;
    
    try {
      setSaving(true);
      setError('');
      
      // Ensure eventId is a string
      const eventIdString = typeof eventId === 'string' ? eventId : Array.isArray(eventId) ? eventId[0] : '';
      
      // Prepare updated event data
      const updatedEventData = {
        title: formData.title,
        description: formData.description,
        date: formData.date,
        time: formData.time,
        endTime: formData.endTime || undefined,
        location: formData.location,
        address: formData.address || undefined,
        category: formData.category,
        image: formData.image,
        price: formData.price,
        maxAttendees: formData.maxAttendees ? parseInt(formData.maxAttendees) : undefined
      };
      
      await updateEvent(eventIdString, updatedEventData);
      
      // Redirect to event page
      router.push(`/events/${eventIdString}`);
    } catch (err) {
      console.error('Error updating event:', err);
      setError('Failed to update event');
    } finally {
      setSaving(false);
    }
  };
  
  const handleDelete = async () => {
    if (!user || !event) return;
    
    if (!window.confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      return;
    }
    
    try {
      setDeleting(true);
      setError('');
      
      // Ensure eventId is a string
      const eventIdString = typeof eventId === 'string' ? eventId : Array.isArray(eventId) ? eventId[0] : '';
      
      await deleteEvent(eventIdString);
      
      // Redirect to events page
      router.push('/events');
    } catch (err) {
      console.error('Error deleting event:', err);
      setError('Failed to delete event');
    } finally {
      setDeleting(false);
    }
  };
  
  // Show loading state while authentication is being checked
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        </div>
      </div>
    );
  }
  
  // Show error if user is not authorized or event not found
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Error</h2>
            <p className="text-gray-500 mb-6">{error}</p>
            <Link href="/events" className="text-indigo-600 hover:text-indigo-800 flex items-center justify-center">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Events
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex justify-between items-center">
          <Link href={`/events/${eventId}`} className="text-indigo-600 hover:text-indigo-800 flex items-center">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Event
          </Link>
          <div className="flex space-x-4">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50"
            >
              {deleting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-700 mr-2"></div>
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Delete Event
            </button>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Event</h1>
            
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                    Event Title
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      name="title"
                      id="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      required
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <div className="mt-1">
                    <textarea
                      name="description"
                      id="description"
                      rows={5}
                      value={formData.description}
                      onChange={handleInputChange}
                      required
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Date
                    </label>
                    <div className="mt-1">
                      <input
                        type="date"
                        name="date"
                        id="date"
                        value={formData.date}
                        onChange={handleInputChange}
                        required
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="time" className="block text-sm font-medium text-gray-700">
                      <Clock className="w-4 h-4 inline mr-1" />
                      Start Time
                    </label>
                    <div className="mt-1">
                      <input
                        type="time"
                        name="time"
                        id="time"
                        value={formData.time}
                        onChange={handleInputChange}
                        required
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="endTime" className="block text-sm font-medium text-gray-700">
                      <Clock className="w-4 h-4 inline mr-1" />
                      End Time (Optional)
                    </label>
                    <div className="mt-1">
                      <input
                        type="time"
                        name="endTime"
                        id="endTime"
                        value={formData.endTime}
                        onChange={handleInputChange}
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                      <MapPin className="w-4 h-4 inline mr-1" />
                      Location
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        name="location"
                        id="location"
                        value={formData.location}
                        onChange={handleInputChange}
                        required
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                      <MapPin className="w-4 h-4 inline mr-1" />
                      Address (Optional)
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        name="address"
                        id="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                      <Tag className="w-4 h-4 inline mr-1" />
                      Category
                    </label>
                    <div className="mt-1">
                      <select
                        name="category"
                        id="category"
                        value={formData.category}
                        onChange={handleInputChange}
                        required
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      >
                        <option value="">Select a category</option>
                        <option value="Conference">Conference</option>
                        <option value="Workshop">Workshop</option>
                        <option value="Networking">Networking</option>
                        <option value="Seminar">Seminar</option>
                        <option value="Webinar">Webinar</option>
                        <option value="Trade Show">Trade Show</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="image" className="block text-sm font-medium text-gray-700">
                      <ImageIcon className="w-4 h-4 inline mr-1" />
                      Image URL
                    </label>
                    <div className="mt-1">
                      <input
                        type="url"
                        name="image"
                        id="image"
                        value={formData.image}
                        onChange={handleInputChange}
                        required
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                      <DollarSign className="w-4 h-4 inline mr-1" />
                      Price
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        name="price"
                        id="price"
                        value={formData.price}
                        onChange={handleInputChange}
                        required
                        placeholder="Free or $XX.XX"
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="maxAttendees" className="block text-sm font-medium text-gray-700">
                      <Users className="w-4 h-4 inline mr-1" />
                      Max Attendees (Optional)
                    </label>
                    <div className="mt-1">
                      <input
                        type="number"
                        name="maxAttendees"
                        id="maxAttendees"
                        value={formData.maxAttendees}
                        onChange={handleInputChange}
                        min="1"
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="pt-5">
                  <div className="flex justify-end">
                    <Link
                      href={`/events/${eventId}`}
                      className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Cancel
                    </Link>
                    <button
                      type="submit"
                      disabled={saving}
                      className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      {saving ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
} 