'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { RefreshCw, AlertCircle, Check, ExternalLink } from 'lucide-react';
import { EventbriteEvent } from '@/lib/api/eventbrite';

interface EventbriteIntegrationProps {
  onEventSelect?: (event: EventbriteEvent) => void;
}

export default function EventbriteIntegration({ onEventSelect }: EventbriteIntegrationProps) {
  const [events, setEvents] = useState<EventbriteEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);
  const { user } = useAuth();

  // Function to get the base URL
  const getBaseUrl = () => {
    if (typeof window === 'undefined') return '';
    return window.location.origin;
  };

  // Fetch events from Eventbrite
  const fetchEvents = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const baseUrl = getBaseUrl();
      const response = await fetch(`${baseUrl}/api/eventbrite/events?userId=${user.uid}`);
      const data = await response.json();
      
      if (response.ok) {
        if (data.authenticated) {
          setEvents(data.events || []);
          setAuthRequired(false);
          
          if (data.message) {
            setSuccess(data.message);
          }
        } else {
          // If authentication failed, update the status
          setEvents([]);
          
          // Check if authentication is required
          if (data.authRequired) {
            setAuthRequired(true);
            setError(data.message || 'Eventbrite authentication required');
          } else if (data.message) {
            setError(data.message);
          } else if (data.error) {
            setError(data.error);
          } else {
            setError('Failed to fetch events');
          }
        }
      } else {
        setError(data.message || data.error || 'Failed to fetch events');
      }
    } catch (err) {
      console.error('Error fetching Eventbrite events:', err);
      setError('Error fetching events. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Connect to Eventbrite
  const connectToEventbrite = () => {
    const baseUrl = getBaseUrl();
    // Redirect to the Eventbrite auth endpoint
    window.location.href = `${baseUrl}/api/eventbrite/auth`;
  };

  // Handle event selection
  const handleEventSelect = (event: EventbriteEvent) => {
    if (onEventSelect) {
      onEventSelect(event);
    }
  };

  // Fetch events on component mount
  useEffect(() => {
    if (user) {
      fetchEvents();
    }
  }, [user]);

  // Check for URL parameters indicating connection status
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('eventbrite_connected') === 'true') {
      setSuccess('Successfully connected to Eventbrite!');
      fetchEvents();
    }
    if (urlParams.get('eventbrite_error')) {
      setError(`Error connecting to Eventbrite: ${urlParams.get('eventbrite_error')}`);
    }
  }, []);

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Import from Eventbrite</h2>
      
      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-md flex items-start">
          <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-4 bg-green-50 text-green-700 rounded-md flex items-start">
          <Check className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
          <p>{success}</p>
        </div>
      )}
      
      {authRequired ? (
        <div className="text-center py-6">
          <p className="text-gray-600 mb-4">
            Connect your Eventbrite account to import your events to this platform.
          </p>
          <button
            onClick={connectToEventbrite}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
          >
            Connect to Eventbrite
          </button>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Your Eventbrite Events</h3>
            <button
              onClick={fetchEvents}
              disabled={loading}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
          
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
              <p className="mt-2 text-gray-500">Loading events...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
              <p className="text-gray-500">No Eventbrite events found.</p>
              <a 
                href="https://www.eventbrite.com/manage/events/create" 
                target="_blank" 
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center text-indigo-600 hover:text-indigo-800"
              >
                <span className="mr-1">Create an event on Eventbrite</span>
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          ) : (
            <div className="overflow-hidden border border-gray-200 rounded-md">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Event Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {events.map((event) => (
                    <tr key={event.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {event.name.text}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(event.start.local).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          event.status === 'live' ? 'bg-green-100 text-green-800' : 
                          event.status === 'started' ? 'bg-blue-100 text-blue-800' : 
                          event.status === 'ended' ? 'bg-gray-100 text-gray-800' : 
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {event.status || 'Draft'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEventSelect(event)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Select
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
} 