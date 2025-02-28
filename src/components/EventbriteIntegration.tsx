'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { EventbriteEvent } from '@/lib/api/eventbrite';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

interface EventbriteIntegrationProps {
  onEventSelect?: (event: EventbriteEvent) => void;
}

export default function EventbriteIntegration({ onEventSelect }: EventbriteIntegrationProps) {
  const [events, setEvents] = useState<EventbriteEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
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
    
    try {
      const baseUrl = getBaseUrl();
      const response = await fetch(`${baseUrl}/api/eventbrite/events?userId=${user.uid}`);
      const data = await response.json();
      
      if (response.ok) {
        setEvents(data.events || []);
        setIsConnected(true);
        setError(null);
      } else {
        setEvents([]);
        setError(data.message || data.error || 'Failed to fetch events');
        
        // If authentication is required, update the connection status
        if (data.authRequired) {
          setIsConnected(false);
        }
      }
    } catch (err) {
      console.error('Error fetching Eventbrite events:', err);
      setError('Error fetching events. Please try again later.');
      setIsConnected(false);
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
      setError(`Error connecting to Eventbrite: ${urlParams.get('eventbrite_error')}`);
      setIsConnected(false);
    }
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Eventbrite Integration</h2>
        {!isConnected ? (
          <Button onClick={connectToEventbrite} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Connect to Eventbrite
          </Button>
        ) : (
          <Button onClick={fetchEvents} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
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
          <AlertDescription>No events found in your Eventbrite account.</AlertDescription>
        </Alert>
      )}

      {events.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <div
              key={event.id}
              className="rounded-lg border p-4 hover:border-primary cursor-pointer"
              onClick={() => handleEventSelect(event)}
            >
              {event.logo && (
                <img
                  src={event.logo.url}
                  alt={event.name.text}
                  className="w-full h-40 object-cover rounded-md mb-4"
                />
              )}
              <h3 className="font-semibold mb-2">{event.name.text}</h3>
              <p className="text-sm text-gray-500">
                {new Date(event.start.local).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 