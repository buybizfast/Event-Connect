'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { EventbriteEvent } from '@/lib/api/eventbrite';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, RefreshCw } from 'lucide-react';

interface EventbriteIntegrationProps {
  onEventSelect?: (event: EventbriteEvent) => void;
}

export default function EventbriteIntegration({ onEventSelect }: EventbriteIntegrationProps) {
  const [events, setEvents] = useState<EventbriteEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const { user } = useAuth();

  // Function to get the base URL
  const getBaseUrl = () => {
    if (typeof window === 'undefined') return '';
    return window.location.origin;
  };

  // Fetch events from Eventbrite
  const fetchEvents = async () => {
    if (!user) {
      setError('Please sign in to connect with Eventbrite');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const baseUrl = getBaseUrl();
      const response = await fetch(`${baseUrl}/api/eventbrite/events?userId=${user.uid}`);
      const data = await response.json();
      
      if (response.ok) {
        setEvents(data.events || []);
        setIsConnected(true);
        setError(null);
        
        if (data.message) {
          setSuccess(data.message);
        }
      } else {
        setEvents([]);
        setError(data.message || data.error || 'Failed to fetch events');
        
        // If authentication is required, update the connection status
        if (data.authRequired) {
          setIsConnected(false);
          setError('Please connect your Eventbrite account to continue');
        }
      }
    } catch (err) {
      console.error('Error fetching Eventbrite events:', err);
      setError('Error connecting to Eventbrite. Please try again later.');
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  // Connect to Eventbrite
  const connectToEventbrite = async () => {
    if (!user) {
      setError('Please sign in to connect with Eventbrite');
      return;
    }
    
    setIsConnecting(true);
    setError(null);
    
    try {
      const baseUrl = getBaseUrl();
      // Redirect to the Eventbrite auth endpoint
      window.location.href = `${baseUrl}/api/eventbrite/auth`;
    } catch (err) {
      console.error('Error connecting to Eventbrite:', err);
      setError('Error initiating Eventbrite connection. Please try again.');
      setIsConnecting(false);
    }
  };

  // Handle event selection
  const handleEventSelect = (event: EventbriteEvent) => {
    if (onEventSelect) {
      onEventSelect(event);
    }
  };

  // Check connection status and fetch events on component mount
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
      setIsConnected(true);
      fetchEvents();
    }
    if (urlParams.get('eventbrite_error')) {
      const errorMsg = urlParams.get('eventbrite_error');
      setError(`Error connecting to Eventbrite: ${decodeURIComponent(errorMsg || '')}`);
      setIsConnected(false);
    }
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Eventbrite Integration</h2>
        {!isConnected ? (
          <Button 
            onClick={connectToEventbrite} 
            disabled={loading || isConnecting || !user}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {(loading || isConnecting) ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              'Connect to Eventbrite'
            )}
          </Button>
        ) : (
          <Button 
            onClick={fetchEvents} 
            disabled={loading}
            variant="outline"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh Events
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {isConnected && events.length === 0 && !loading && !error && (
        <Alert>
          <AlertDescription>
            No events found in your Eventbrite account. 
            <a 
              href="https://www.eventbrite.com/manage/events/create" 
              target="_blank" 
              rel="noopener noreferrer"
              className="ml-2 text-blue-600 hover:text-blue-800"
            >
              Create an event on Eventbrite
            </a>
          </AlertDescription>
        </Alert>
      )}

      {events.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <div
              key={event.id}
              className="rounded-lg border p-4 hover:border-primary cursor-pointer transition-all duration-200 hover:shadow-md"
              onClick={() => handleEventSelect(event)}
            >
              {event.logo && (
                <img
                  src={event.logo.url}
                  alt={event.name.text}
                  className="w-full h-40 object-cover rounded-md mb-4"
                />
              )}
              <h3 className="font-semibold mb-2 line-clamp-2">{event.name.text}</h3>
              <p className="text-sm text-gray-500">
                {new Date(event.start.local).toLocaleDateString()}
              </p>
              <div className="mt-2">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  event.status === 'live' ? 'bg-green-100 text-green-800' : 
                  event.status === 'started' ? 'bg-blue-100 text-blue-800' : 
                  event.status === 'ended' ? 'bg-gray-100 text-gray-800' : 
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {event.status || 'Draft'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 