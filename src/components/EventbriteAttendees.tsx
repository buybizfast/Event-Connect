'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { RefreshCw, Download, AlertCircle, Check, User } from 'lucide-react';

interface Attendee {
  id: string;
  name: string;
  email: string;
  ticketType?: string;
  status?: string;
  checkedIn?: boolean;
  city?: string;
  source: string;
}

interface EventbriteAttendeesProps {
  eventId: string;
  eventbriteId?: string;
  onImportSuccess?: (attendees: Attendee[]) => void;
}

export default function EventbriteAttendees({ 
  eventId, 
  eventbriteId,
  onImportSuccess 
}: EventbriteAttendeesProps) {
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);
  const { user } = useAuth();

  // Function to get the base URL
  const getBaseUrl = () => {
    return process.env.NEXT_PUBLIC_BASE_URL || 
      (typeof window !== 'undefined' ? window.location.origin : 'https://event-connect.vercel.app');
  };

  // Fetch attendees from Eventbrite
  const fetchAttendees = async () => {
    if (!eventId && !eventbriteId) return;
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const baseUrl = getBaseUrl();
      const queryParams = new URLSearchParams();
      
      if (eventId) queryParams.append('eventId', eventId);
      if (eventbriteId) queryParams.append('eventbriteId', eventbriteId);
      
      const response = await fetch(`${baseUrl}/api/eventbrite/attendees?${queryParams.toString()}`);
      const data = await response.json();
      
      if (response.ok) {
        if (data.authenticated) {
          setAttendees(data.attendees || []);
          setAuthRequired(false);
          
          if (data.message) {
            setSuccess(data.message);
          }
        } else {
          // If authentication failed, update the status
          setAttendees([]);
          
          // Check if authentication is required
          if (data.authRequired) {
            setAuthRequired(true);
            setError(data.message || 'Eventbrite authentication required');
          } else if (data.message) {
            setError(data.message);
          } else if (data.error) {
            setError(data.error);
          } else {
            setError('Failed to fetch attendees');
          }
        }
      } else {
        setError(data.message || data.error || 'Failed to fetch attendees');
      }
    } catch (err) {
      console.error('Error fetching Eventbrite attendees:', err);
      setError('Error fetching attendees. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Import attendees from Eventbrite to our event
  const importAttendees = async () => {
    if (!eventId) return;
    
    setImporting(true);
    setError(null);
    setSuccess(null);
    
    try {
      const baseUrl = getBaseUrl();
      const response = await fetch(`${baseUrl}/api/eventbrite/attendees`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId,
          eventbriteId,
        }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setSuccess(data.message || `Successfully imported ${data.imported} attendees`);
        
        // Refresh the attendees list
        fetchAttendees();
        
        // Call the onImportSuccess callback if provided
        if (onImportSuccess && attendees.length > 0) {
          onImportSuccess(attendees);
        }
      } else {
        setError(data.message || data.error || 'Failed to import attendees');
        
        // Check if authentication is required
        if (data.authRequired) {
          setAuthRequired(true);
        }
      }
    } catch (err) {
      console.error('Error importing Eventbrite attendees:', err);
      setError('Error importing attendees. Please try again later.');
    } finally {
      setImporting(false);
    }
  };

  // Connect to Eventbrite
  const connectToEventbrite = () => {
    const baseUrl = getBaseUrl();
    // Redirect to the Eventbrite auth endpoint
    window.location.href = `${baseUrl}/api/eventbrite/auth${eventId ? `?eventId=${eventId}` : ''}`;
  };

  // Fetch attendees on component mount
  useEffect(() => {
    if (eventId || eventbriteId) {
      fetchAttendees();
    }
  }, [eventId, eventbriteId]);

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Eventbrite Attendees</h2>
      
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
            You need to connect your Eventbrite account to access attendees.
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
            <div className="flex items-center">
              <User className="h-5 w-5 text-gray-500 mr-2" />
              <span className="text-gray-700 font-medium">
                {attendees.length} {attendees.length === 1 ? 'Attendee' : 'Attendees'}
              </span>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={fetchAttendees}
                disabled={loading}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={importAttendees}
                disabled={importing || attendees.length === 0}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300 disabled:cursor-not-allowed"
              >
                <Download className="h-4 w-4 mr-1.5" />
                Import
              </button>
            </div>
          </div>
          
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
              <p className="mt-2 text-gray-500">Loading attendees...</p>
            </div>
          ) : attendees.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
              <p className="text-gray-500">No attendees found for this event.</p>
            </div>
          ) : (
            <div className="overflow-hidden border border-gray-200 rounded-md">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ticket Type
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {attendees.map((attendee) => (
                    <tr key={attendee.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {attendee.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {attendee.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {attendee.ticketType || 'Standard'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {attendee.checkedIn ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Checked In
                          </span>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                            {attendee.status || 'Registered'}
                          </span>
                        )}
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