'use client';

import { useState, useEffect } from 'react';
import { Send, X, Users, Search, Check, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { getUserIdToken } from '@/lib/firebase/firebaseUtils';
import VerificationBadge from '@/components/VerificationBadge';

interface Attendee {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  isVerified?: boolean;
}

interface MessageAttendeesProps {
  eventId: string;
  onClose: () => void;
}

export default function MessageAttendees({ eventId, onClose }: MessageAttendeesProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAttendees, setSelectedAttendees] = useState<Attendee[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    // Fetch attendees for this event
    const fetchAttendees = async () => {
      try {
        setLoading(true);
        
        const token = await getUserIdToken();
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };
        
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch(`/api/events/attendees?eventId=${eventId}`, {
          headers
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch attendees');
        }
        
        const data = await response.json();
        // Map the API response to the Attendee interface
        const mappedAttendees = (data.attendees || []).map((attendee: any) => ({
          id: attendee.id,
          name: attendee.displayName || 'Unknown Attendee',
          email: attendee.email,
          avatar: attendee.photoURL,
          isVerified: attendee.isVerified || false
        }));
        
        setAttendees(mappedAttendees);
      } catch (err) {
        console.error('Error fetching attendees:', err);
        setError('Failed to load attendees. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchAttendees();
  }, [eventId]);

  const filteredAttendees = attendees.filter(attendee => 
    attendee && 
    attendee.name && 
    attendee.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !selectedAttendees.some(selected => selected.id === attendee.id)
  );

  const handleSelectAttendee = (attendee: Attendee) => {
    setSelectedAttendees([...selectedAttendees, attendee]);
    setSearchQuery('');
  };

  const handleSelectAll = () => {
    // Filter out any invalid attendees before setting them
    const validAttendees = attendees.filter(attendee => attendee && attendee.id);
    setSelectedAttendees(validAttendees);
  };

  const handleRemoveAttendee = (attendeeId: string) => {
    setSelectedAttendees(selectedAttendees.filter(attendee => attendee.id !== attendeeId));
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || selectedAttendees.length === 0) return;

    try {
      setSending(true);
      
      // Create a group conversation if multiple attendees, or direct message if just one
      const isGroup = selectedAttendees.length > 1;
      const recipientIds = selectedAttendees.map(a => a.id);
      
      const token = await getUserIdToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          recipients: recipientIds,
          message: messageText,
          isGroup,
          groupName: isGroup ? `Event: ${eventId}` : undefined,
          eventId
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      
      // Redirect to the conversation
      router.push(`/messages/${data.conversationId}`);
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message. Please try again.');
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Message Attendees</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : error ? (
            <div className="text-red-500 text-center py-4">{error}</div>
          ) : (
            <>
              <div className="mb-4">
                <div className="flex justify-between items-center mb-1">
                  <label htmlFor="search-attendees" className="block text-sm font-medium text-gray-700">
                    Select Recipients
                  </label>
                  {attendees.length > 0 && (
                    <button 
                      onClick={handleSelectAll}
                      className="text-xs text-indigo-600 hover:text-indigo-800"
                    >
                      Select All
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    id="search-attendees"
                    placeholder="Search attendees..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                </div>
              </div>
              
              {/* Selected attendees */}
              {selectedAttendees.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    Selected ({selectedAttendees.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedAttendees.map(attendee => (
                      <div 
                        key={attendee.id}
                        className="flex items-center bg-indigo-100 rounded-full pl-2 pr-1 py-1"
                      >
                        {attendee.avatar ? (
                          <img 
                            src={attendee.avatar} 
                            alt={attendee.name || 'Attendee'} 
                            className="h-5 w-5 rounded-full mr-1" 
                          />
                        ) : (
                          <div className="h-5 w-5 rounded-full bg-indigo-300 flex items-center justify-center mr-1">
                            <span className="text-xs text-white">{attendee.name ? attendee.name.charAt(0) : '?'}</span>
                          </div>
                        )}
                        <span className="text-xs text-indigo-800">{attendee.name || 'Unknown Attendee'}</span>
                        {attendee.email && attendee.email.includes('@') && (
                          <VerificationBadge size="sm" className="ml-1" />
                        )}
                        <button 
                          onClick={() => handleRemoveAttendee(attendee.id)}
                          className="ml-1 text-indigo-500 hover:text-indigo-700 focus:outline-none"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Attendee search results */}
              {searchQuery && filteredAttendees.length > 0 && (
                <div className="mb-4 max-h-48 overflow-y-auto border border-gray-200 rounded-md">
                  {filteredAttendees.map(attendee => (
                    <div 
                      key={attendee.id}
                      className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleSelectAttendee(attendee)}
                    >
                      {attendee.avatar ? (
                        <img 
                          src={attendee.avatar} 
                          alt={attendee.name || 'Attendee'} 
                          className="h-8 w-8 rounded-full mr-3" 
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-indigo-300 flex items-center justify-center mr-3">
                          <span className="text-sm text-white">{attendee.name ? attendee.name.charAt(0) : '?'}</span>
                        </div>
                      )}
                      <div className="flex items-center">
                        <span className="text-sm text-gray-900">{attendee.name || 'Unknown Attendee'}</span>
                        {attendee.email && attendee.email.includes('@') && (
                          <VerificationBadge size="sm" className="ml-1" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {searchQuery && filteredAttendees.length === 0 && (
                <p className="text-sm text-gray-500 mb-4">No attendees found</p>
              )}
              
              {/* Message input */}
              <div className="mb-4">
                <label htmlFor="message-text" className="block text-sm font-medium text-gray-700 mb-1">
                  Message
                </label>
                <textarea
                  id="message-text"
                  placeholder="Type your message here..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black"
                  rows={4}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                ></textarea>
              </div>
              
              <div className="flex justify-end">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 mr-2"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendMessage}
                  disabled={!messageText.trim() || selectedAttendees.length === 0 || sending}
                  className={`px-4 py-2 rounded-md text-sm font-medium flex items-center ${
                    messageText.trim() && selectedAttendees.length > 0 && !sending
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : 'bg-indigo-300 text-white cursor-not-allowed'
                  }`}
                >
                  {sending ? (
                    <div className="h-4 w-4 border-t-2 border-b-2 border-white rounded-full animate-spin mr-2"></div>
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Send Message
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 