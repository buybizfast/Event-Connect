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

  // Check connection status and fetch events on component mount
  useEffect(() => {
    const checkConnectionStatus = async () => {
      if (!user) return;
      
      try {
        const baseUrl = getBaseUrl();
        const response = await fetch(`${baseUrl}/api/eventbrite/status?userId=${user.uid}`);
        const data = await response.json();
        
        if (response.ok) {
          setIsConnected(data.isConnected || false);
          if (data.isConnected) {
            fetchEvents();
          }
        } else {
          setError(data.message || 'Failed to check Eventbrite connection status');
          setIsConnected(false);
        }
      } catch (err) {
        console.error('Error checking Eventbrite connection status:', err);
        setError('Error checking Eventbrite connection. Please try again.');
        setIsConnected(false);
      }
    };

    checkConnectionStatus();
  }, [user]);

  // Fetch events from Eventbrite
  const fetchEvents = async () => {
    if (!user) {
      setError('Please sign in to connect with Eventbrite');
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
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
        
        if (response.status === 401) {
          setIsConnected(false);
          setError('Please reconnect your Eventbrite account to continue');
          // Trigger reconnection
          connectToEventbrite();
        } else {
          setError(data.message || data.error || 'Failed to fetch events');
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
      // Clear any existing Eventbrite cookies
      document.cookie = 'eventbrite_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = 'eventbrite_csrf_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      
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

      {isConnected && !loading && events.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-600">No events found in your Eventbrite account.</p>
        </div>
      )}

      {isConnected && events.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <div
              key={event.id}
              className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleEventSelect(event)}
            >
              {event.logo && (
                <img
                  src={event.logo.url}
                  alt={event.name.text}
                  className="w-full h-40 object-cover rounded-md mb-4"
                />
              )}
              <h3 className="font-semibold text-lg mb-2">{event.name.text}</h3>
              <p className="text-gray-600 text-sm mb-2">
                {new Date(event.start.local).toLocaleDateString()}
              </p>
              {event.venue && (
                <p className="text-gray-500 text-sm">{event.venue.name}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 