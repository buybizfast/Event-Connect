'use client';

import { useState } from 'react';
import EventbriteIntegration from '@/components/EventbriteIntegration';
import EventbriteAttendees from '@/components/EventbriteAttendees';
import { useAuth } from '@/lib/hooks/useAuth';

export default function EventbriteTestPage() {
  const { user } = useAuth();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedEventbriteId, setSelectedEventbriteId] = useState<string | null>(null);

  // Handle event selection from the EventbriteIntegration component
  const handleEventSelect = (event: any) => {
    setSelectedEventbriteId(event.id);
    console.log('Selected Eventbrite event:', event);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Eventbrite Integration Test</h1>
      
      {!user ? (
        <div className="bg-yellow-50 p-4 rounded-md mb-6">
          <p className="text-yellow-700">
            Please log in to test the Eventbrite integration.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-8 mb-8">
            <EventbriteIntegration onEventSelect={handleEventSelect} />
          </div>
          
          {selectedEventbriteId && (
            <div className="mt-8">
              <h2 className="text-2xl font-semibold mb-4">Eventbrite Attendees</h2>
              <EventbriteAttendees 
                eventId={selectedEventId || 'test-event-id'} 
                eventbriteId={selectedEventbriteId}
                onImportSuccess={(attendees) => {
                  console.log('Imported attendees:', attendees);
                }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
} 