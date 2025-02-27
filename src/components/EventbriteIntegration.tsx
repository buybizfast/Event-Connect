'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { EventbriteEvent } from '@/lib/api/eventbrite';
import { ExternalLink, RefreshCw, Plus, Check, AlertCircle } from 'lucide-react';
import { safeFetch } from '@/lib/utils/browserUtils';

// Define a type that includes the imported property
type EventbriteEventWithImported = EventbriteEvent & { imported?: boolean };

// Define the type for Eventbrite API response
interface EventbriteApiResponse {
  events: EventbriteEvent[];
  authenticated: boolean;
  authRequired?: boolean;
  message?: string;
  error?: string;
}

interface EventbriteIntegrationProps {
  onEventSelect?: (event: EventbriteEvent) => void;
}

export default function EventbriteIntegration({ onEventSelect }: EventbriteIntegrationProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [events, setEvents] = useState<EventbriteEventWithImported[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  // Check if user is connected to Eventbrite
  useEffect(() => {
    const checkConnection = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const { data, error: fetchError } = await safeFetch<EventbriteApiResponse>(
          '/api/eventbrite/events',
          undefined,
          true,  // use cache busting
          1,     // only retry once
          true   // use stable cache busting
        );
        
        if (fetchError) {
          throw fetchError;
        }
        
        if (data) {
          if (data.authenticated) {
            setIsConnected(true);
            setEvents(data.events || []);
            setAuthRequired(false);
            
            // Show success message if provided
            if (data.message) {
              setSuccess(data.message);
            }
          } else {
            setIsConnected(false);
            
            // Check if authentication is required
            if (data.authRequired) {
              setAuthRequired(true);
            }
            
            // If there's a message, display it
            if (data.message) {
              setError(data.message);
            } else if (data.error) {
              setError(data.error);
            }
          }
        }
      } catch (err) {
        console.error('Error checking Eventbrite connection:', err);
        setIsConnected(false);
        setError('Error connecting to Eventbrite. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    checkConnection();
  }, []);

  const fetchEvents = useCallback(async () => {
    if (!isConnected && !authRequired) return;

    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const { data, error: fetchError } = await safeFetch<EventbriteApiResponse>(
        '/api/eventbrite/events',
        undefined,
        true,  // use cache busting
        1,     // only retry once
        true   // use stable cache busting
      );
      
      if (fetchError) {
        throw fetchError;
      }
      
      if (data) {
        if (data.authenticated) {
          setIsConnected(true);
          setEvents(data.events || []);
          setAuthRequired(false);
          
          // Show success message if provided
          if (data.message) {
            setSuccess(data.message);
          }
        } else {
          // If authentication failed, update the connection status
          setIsConnected(false);
          
          // Check if authentication is required
          if (data.authRequired) {
            setAuthRequired(true);
            setError(data.message || 'Your Eventbrite connection has expired. Please reconnect.');
          } else if (data.message) {
            setError(data.message);
          } else if (data.error) {
            setError(data.error);
          } else {
            setError('Failed to fetch Eventbrite events');
          }
        }
      }
    } catch (err) {
      console.error('Error fetching Eventbrite events:', err);
      setError('Error fetching Eventbrite events. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [isConnected, authRequired]);

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
  }, [fetchEvents]);

  const connectToEventbrite = () => {
    window.location.href = '/api/eventbrite/auth';
  };

  const importEvent = async (eventbriteId: string) => {
    if (!user) return;

    setImporting(prev => ({ ...prev, [eventbriteId]: true }));
    try {
      const response = await fetch('/api/eventbrite/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventbriteId,
          userId: user.uid,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess(`Event imported successfully! Event ID: ${data.eventId}`);
        // Mark this event as imported
        setEvents(prev => 
          prev.map(event => 
            event.id === eventbriteId 
              ? { ...event, imported: true } 
              : event
          )
        );
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to import event');
      }
    } catch (err) {
      setError('Error importing event');
    } finally {
      setImporting(prev => ({ ...prev, [eventbriteId]: false }));
    }
  };

  // Function to handle selecting an event for the form
  const handleSelectEvent = (event: EventbriteEvent) => {
    if (onEventSelect) {
      onEventSelect(event);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Eventbrite Integration</h2>
      
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
      
      {!isConnected ? (
        <div>
          <p className="text-gray-600 mb-4">
            Connect your Eventbrite account to import your events to this platform.
          </p>
          <button
            onClick={connectToEventbrite}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Connect to Eventbrite
          </button>
        </div>
      ) : (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-green-600 flex items-center">
              <Check className="h-5 w-5 mr-2" />
              Connected to Eventbrite
            </p>
            <button
              onClick={fetchEvents}
              disabled={loading}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh Events
            </button>
          </div>
          
          {events.length === 0 ? (
            <p className="text-gray-500 py-4">No events found in your Eventbrite account.</p>
          ) : (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Your Eventbrite Events</h3>
              <div className="divide-y divide-gray-200">
                {events.map((event) => (
                  <div key={event.id} className="py-4">
                    <div className="flex justify-between">
                      <div>
                        <h4 className="text-base font-medium text-gray-900">{event.name.text}</h4>
                        <p className="text-sm text-gray-500">
                          {new Date(event.start.local).toLocaleDateString()} at{' '}
                          {new Date(event.start.local).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        {onEventSelect && (
                          <button
                            onClick={() => handleSelectEvent(event)}
                            className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Select
                          </button>
                        )}
                        
                        {!onEventSelect && (
                          event.imported ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <Check className="h-3 w-3 mr-1" />
                              Imported
                            </span>
                          ) : (
                            <button
                              onClick={() => importEvent(event.id)}
                              disabled={importing[event.id]}
                              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                              {importing[event.id] ? (
                                <>
                                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                  Importing...
                                </>
                              ) : (
                                <>
                                  <Plus className="h-3 w-3 mr-1" />
                                  Import
                                </>
                              )}
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 