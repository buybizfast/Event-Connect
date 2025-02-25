'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Calendar, Clock, MapPin, Users, Share2, Edit, ArrowLeft, User, QrCode, X, MessageSquare, UserPlus, Zap, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import Navigation from '@/components/Navigation';
import EventQRCode from '@/components/EventQRCode';
import SocialShare from '@/components/SocialShare';
import { useAuth } from '@/lib/hooks/useAuth';
import { getEvent, registerForEvent, cancelEventRegistration, Event } from '@/lib/firebase/eventUtils';
import { getMockEvent } from '@/lib/mockData';
import EventChatRoom from '@/components/events/EventChatRoom';
import EventDiscussionBoard from '@/components/events/EventDiscussionBoard';
import MessageAttendees from '@/components/messaging/MessageAttendees';
import { getUserIdToken } from '@/lib/firebase/firebaseUtils';

// Extended attendee interface for our API
interface ExtendedAttendee {
  id: string;
  name: string;
  title?: string;
  company?: string;
  avatar?: string;
  interests?: string[];
  skills?: string[];
}

export default function EventDetailPage() {
  const { eventId } = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAttending, setIsAttending] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [expandedAttendee, setExpandedAttendee] = useState<string | null>(null);
  const [attendeeMatches, setAttendeeMatches] = useState<any[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [attendees, setAttendees] = useState<ExtendedAttendee[]>([]);
  const [loadingAttendees, setLoadingAttendees] = useState(false);
  const [connectingToEventbrite, setConnectingToEventbrite] = useState(false);
  const [showChatRoom, setShowChatRoom] = useState(false);
  const [showDiscussionBoard, setShowDiscussionBoard] = useState(false);
  const [showMessageAttendees, setShowMessageAttendees] = useState(false);
  
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
          
          // TODO: Check if current user is registered for this event
          // This would require a separate query to check user's registrations
          setIsAttending(false);
        } else {
          // Try to get mock event data
          const mockEventData = getMockEvent(eventIdString);
          
          if (mockEventData) {
            setEvent(mockEventData as Event);
          } else {
            setError('Event not found');
          }
        }
      } catch (err) {
        console.error('Error fetching event:', err);
        
        // Try to get mock event data
        const eventIdString = typeof eventId === 'string' ? eventId : Array.isArray(eventId) ? eventId[0] : '';
        const mockEventData = getMockEvent(eventIdString);
        
        if (mockEventData) {
          setEvent(mockEventData as Event);
        } else {
          setError('Failed to load event details');
        }
      } finally {
        setLoading(false);
      }
    }
    
    fetchEvent();
  }, [eventId]);
  
  // Fetch attendees for this event
  useEffect(() => {
    async function fetchAttendees() {
      if (!eventId || !user) return;
      
      try {
        setLoadingAttendees(true);
        
        const token = await getUserIdToken();
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };
        
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        // Call the event attendees API
        const response = await fetch(`/api/events/attendees?eventId=${eventId}`, {
          headers
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch attendees');
        }
        
        const data = await response.json();
        setAttendees(data.attendees || []);
        
        // Check if current user is attending
        const isUserAttending = data.attendees.some((attendee: any) => attendee.id === user.uid);
        setIsAttending(isUserAttending);
      } catch (err) {
        console.error('Error fetching attendees:', err);
        // Don't set error state here to avoid disrupting the UI
      } finally {
        setLoadingAttendees(false);
      }
    }
    
    fetchAttendees();
  }, [eventId, user]);
  
  const handleAttendEvent = async () => {
    if (!user) {
      router.push('/login');
      return;
    }
    
    try {
      setIsRegistering(true);
      
      const token = await getUserIdToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/events/attendees', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          eventId,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to register for event');
      }
      
      const data = await response.json();
      setIsAttending(true);
      // Update attendee count in the UI
      setEvent(prev => prev ? { ...prev, attendees: prev.attendees + 1 } : null);
    } catch (err) {
      console.error('Error registering for event:', err);
      setError('Failed to register for event');
    } finally {
      setIsRegistering(false);
    }
  };
  
  const handleCancelAttendance = async () => {
    if (!confirm('Are you sure you want to cancel your registration?')) {
      return;
    }
    
    try {
      setIsCancelling(true);
      
      const token = await getUserIdToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`/api/events/attendees?eventId=${eventId}`, {
        method: 'DELETE',
        headers
      });
      
      if (!response.ok) {
        throw new Error('Failed to cancel registration');
      }
      
      const data = await response.json();
      setIsAttending(false);
      // Update attendee count in the UI
      setEvent(prev => prev ? { ...prev, attendees: Math.max(0, prev.attendees - 1) } : null);
    } catch (err) {
      console.error('Error canceling event registration:', err);
      setError('Failed to cancel registration');
    } finally {
      setIsCancelling(false);
    }
  };
  
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };
  
  const getEventUrl = () => {
    return typeof window !== 'undefined' 
      ? `${window.location.origin}/events/${eventId}`
      : `/events/${eventId}`;
  };
  
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: event?.title || 'Event',
          text: `Check out this event: ${event?.title}`,
          url: getEventUrl(),
        });
      } catch (error) {
        console.error('Error sharing:', error);
        // Fallback to showing share options
        setShowShareOptions(true);
      }
    } else {
      // Fallback for browsers that don't support navigator.share
      setShowShareOptions(true);
    }
  };
  
  // New function to fetch networking matches for an attendee
  const fetchAttendeeMatches = async (attendeeId: string) => {
    if (expandedAttendee === attendeeId) {
      // If already expanded, just collapse
      setExpandedAttendee(null);
      return;
    }
    
    try {
      setLoadingMatches(true);
      setExpandedAttendee(attendeeId);
      
      const token = await getUserIdToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      // Call the event attendees API to get networking matches
      const response = await fetch(`/api/events/attendees?eventId=${eventId}&userId=${user?.uid}`, {
        headers
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch attendee matches');
      }
      
      const data = await response.json();
      
      // Find the specific attendee we're interested in
      const attendeeMatch = data.attendees.find((a: any) => a.id === attendeeId);
      
      if (attendeeMatch && attendeeMatch.networkingMatch) {
        setAttendeeMatches([{
          user: {
            id: attendeeId,
            name: attendeeMatch.name,
            title: attendeeMatch.title,
            company: attendeeMatch.company,
            interests: attendeeMatch.interests
          },
          score: attendeeMatch.networkingMatch.score,
          matchReason: attendeeMatch.networkingMatch.matchReason,
          conversationStarters: attendeeMatch.networkingMatch.conversationStarters
        }]);
      } else {
        // No match found, set empty array
        setAttendeeMatches([]);
      }
    } catch (err) {
      console.error('Error fetching attendee matches:', err);
      // Generate mock matches if API fails
      setAttendeeMatches([
        {
          user: {
            id: 'mock1',
            name: 'Alex Thompson',
            title: 'Product Manager',
            company: 'TechCorp',
            interests: ['Product Development', 'UX Design', 'AI']
          },
          score: 85,
          matchReason: 'Similar professional interests',
          conversationStarters: [
            'I see you both work in product development. What projects are you currently working on?',
            'How do you approach UX design in your products?'
          ]
        }
      ]);
    } finally {
      setLoadingMatches(false);
    }
  };
  
  const handleConnectToEventbrite = async () => {
    if (!user || !event) return;
    
    try {
      setConnectingToEventbrite(true);
      
      // Redirect to Eventbrite auth endpoint
      window.location.href = `/api/eventbrite/auth?eventId=${eventId}`;
    } catch (err) {
      console.error('Error connecting to Eventbrite:', err);
      setConnectingToEventbrite(false);
    }
  };
  
  // Show loading state while authentication is being checked
  if (authLoading) {
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
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      {/* Show QR Code Modal */}
      {showQRCode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Event QR Code</h3>
              <button 
                onClick={() => setShowQRCode(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex justify-center">
              <EventQRCode 
                eventId={eventId as string}
                eventTitle={event?.title || ''}
                eventDate={formatDate(event?.date || '')}
                eventImage={event?.imageUrl || ''}
                onClose={() => setShowQRCode(false)}
              />
            </div>
            <p className="text-center mt-4 text-sm text-gray-600">
              Scan this code to access the event details
            </p>
          </div>
        </div>
      )}
      
      {/* Show Share Options Modal */}
      {showShareOptions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Share Event</h3>
              <button 
                onClick={() => setShowShareOptions(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <SocialShare 
              url={getEventUrl()} 
              title={event?.title || 'Check out this event'} 
              description={event?.description || 'Join me at this event'}
            />
          </div>
        </div>
      )}
      
      {/* Message Attendees Modal */}
      {showMessageAttendees && (
        <MessageAttendees 
          eventId={eventId as string} 
          onClose={() => setShowMessageAttendees(false)} 
        />
      )}
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/events" className="inline-flex items-center text-indigo-600 hover:text-indigo-800">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Events
          </Link>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        ) : event ? (
          <>
            <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
              <div className="relative h-64 w-full">
                <Image 
                  src={event.imageUrl || event.image || 'https://placehold.co/800x400'} 
                  alt={event.title} 
                  fill
                  style={{ objectFit: 'cover' }}
                />
              </div>
              
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">{event.title}</h1>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setShowShareOptions(true)}
                      className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
                      title="Share Event"
                    >
                      <Share2 className="h-5 w-5" />
                    </button>
                    
                    <button
                      onClick={() => setShowQRCode(true)}
                      className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
                      title="Show QR Code"
                    >
                      <QrCode className="h-5 w-5" />
                    </button>
                    
                    {event.organizerId === user?.uid && (
                      <Link
                        href={`/events/edit/${eventId}`}
                        className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
                        title="Edit Event"
                      >
                        <Edit className="h-5 w-5" />
                      </Link>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center text-sm text-gray-600 mt-2 mb-4">
                  <div className="flex items-center mr-4 mb-2">
                    <Calendar className="h-4 w-4 mr-1" />
                    <span>{formatDate(event.date)}</span>
                  </div>
                  
                  <div className="flex items-center mr-4 mb-2">
                    <Clock className="h-4 w-4 mr-1" />
                    <span>{event.time}</span>
                  </div>
                  
                  <div className="flex items-center mr-4 mb-2">
                    <MapPin className="h-4 w-4 mr-1" />
                    <span>{event.location}</span>
                  </div>
                  
                  <div className="flex items-center mb-2">
                    <Users className="h-4 w-4 mr-1" />
                    <span>{attendees.length} / {event.maxAttendees || '∞'} attendees</span>
                  </div>
                </div>
                
                {event.organizerId === user?.uid && !event.eventbriteId && (
                  <button
                    onClick={handleConnectToEventbrite}
                    disabled={connectingToEventbrite}
                    className="mb-4 inline-flex items-center px-3 py-1 border border-gray-300 text-sm leading-5 font-medium rounded-md text-gray-700 bg-white hover:text-gray-500 focus:outline-none focus:border-blue-300 focus:shadow-outline-blue active:text-gray-800 active:bg-gray-50 transition ease-in-out duration-150"
                  >
                    {connectingToEventbrite ? (
                      <div className="mr-2 h-4 w-4 border-t-2 border-b-2 border-gray-500 rounded-full animate-spin"></div>
                    ) : (
                      <ExternalLink className="mr-2 h-4 w-4" />
                    )}
                    Connect to Eventbrite
                  </button>
                )}
                
                {event.eventbriteId && (
                  <div className="mb-4 inline-flex items-center px-3 py-1 border border-green-300 text-sm leading-5 font-medium rounded-md text-green-700 bg-green-50">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Connected to Eventbrite
                  </div>
                )}
                
                <p className="text-gray-700 mb-6 whitespace-pre-line">{event.description}</p>
                
                <div className="flex flex-wrap gap-2 mb-6">
                  {event.category && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                      {event.category}
                    </span>
                  )}
                  
                  {(event as any).tags && Array.isArray((event as any).tags) && (event as any).tags.map((tag: string) => (
                    <span 
                      key={tag}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                
                <div className="flex flex-wrap gap-3">
                  {isAttending ? (
                    <button
                      onClick={handleCancelAttendance}
                      disabled={isCancelling}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      {isCancelling ? (
                        <div className="mr-2 h-4 w-4 border-t-2 border-b-2 border-gray-500 rounded-full animate-spin"></div>
                      ) : (
                        <X className="mr-2 h-4 w-4" />
                      )}
                      Cancel Registration
                    </button>
                  ) : (
                    <button
                      onClick={handleAttendEvent}
                      disabled={isRegistering || (!!event.maxAttendees && attendees.length >= event.maxAttendees)}
                      className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                        !!event.maxAttendees && attendees.length >= event.maxAttendees
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-indigo-600 hover:bg-indigo-700'
                      }`}
                    >
                      {isRegistering ? (
                        <div className="mr-2 h-4 w-4 border-t-2 border-b-2 border-white rounded-full animate-spin"></div>
                      ) : (
                        <UserPlus className="mr-2 h-4 w-4" />
                      )}
                      {!!event.maxAttendees && attendees.length >= event.maxAttendees
                        ? 'Event Full'
                        : 'Register for Event'}
                    </button>
                  )}
                  
                  <button
                    onClick={() => setShowChatRoom(!showChatRoom)}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Event Chat
                  </button>
                  
                  <button
                    onClick={() => setShowDiscussionBoard(!showDiscussionBoard)}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Discussion Board
                  </button>
                  
                  {isAttending && (
                    <button
                      onClick={() => setShowMessageAttendees(true)}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Message Attendees
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            {/* Event Chat Room */}
            {showChatRoom && (
              <div className="mb-8">
                <EventChatRoom 
                  eventId={eventId as string} 
                  eventTitle={event.title} 
                  isOrganizer={event.organizerId === user?.uid} 
                />
              </div>
            )}
            
            {/* Event Discussion Board */}
            {showDiscussionBoard && (
              <div className="mb-8">
                <EventDiscussionBoard 
                  eventId={eventId as string} 
                  eventTitle={event.title} 
                  isOrganizer={event.organizerId === user?.uid} 
                />
              </div>
            )}
            
            {/* Attendees Section */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Attendees</h2>
                
                {loadingAttendees ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
                  </div>
                ) : attendees.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No attendees yet. Be the first to register!</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {attendees.map(attendee => (
                      <div 
                        key={attendee.id}
                        className="border border-gray-200 rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                              {attendee.avatar ? (
                                <Image 
                                  src={attendee.avatar} 
                                  alt={attendee.name} 
                                  width={40}
                                  height={40}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center">
                                  <User className="h-5 w-5 text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div className="ml-3">
                              <h3 className="text-sm font-medium text-gray-900">{attendee.name}</h3>
                              {attendee.title && (
                                <p className="text-xs text-gray-500">{attendee.title}</p>
                              )}
                            </div>
                          </div>
                          
                          <button
                            onClick={() => {
                              if (expandedAttendee === attendee.id) {
                                setExpandedAttendee(null);
                              } else {
                                setExpandedAttendee(attendee.id);
                                fetchAttendeeMatches(attendee.id);
                              }
                            }}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            {expandedAttendee === attendee.id ? (
                              <ChevronUp className="h-5 w-5" />
                            ) : (
                              <ChevronDown className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                        
                        {expandedAttendee === attendee.id && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            {attendee.interests && attendee.interests.length > 0 && (
                              <div className="mb-3">
                                <h4 className="text-xs font-medium text-gray-500 mb-1">Interests</h4>
                                <div className="flex flex-wrap gap-1">
                                  {attendee.interests.map(interest => (
                                    <span 
                                      key={interest}
                                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                                    >
                                      {interest}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {attendee.skills && attendee.skills.length > 0 && (
                              <div className="mb-3">
                                <h4 className="text-xs font-medium text-gray-500 mb-1">Skills</h4>
                                <div className="flex flex-wrap gap-1">
                                  {attendee.skills.map(skill => (
                                    <span 
                                      key={skill}
                                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800"
                                    >
                                      {skill}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            <div className="mt-3 flex justify-between">
                              <Link
                                href={`/profile/${attendee.id}`}
                                className="text-xs text-indigo-600 hover:text-indigo-800"
                              >
                                View Profile
                              </Link>
                              
                              <Link
                                href={`/messages/${attendee.id}`}
                                className="text-xs text-indigo-600 hover:text-indigo-800"
                              >
                                Send Message
                              </Link>
                            </div>
                            
                            {user?.uid === attendee.id && (
                              <div className="mt-3 pt-3 border-t border-gray-200">
                                <h4 className="text-xs font-medium text-gray-500 mb-2">Networking Matches</h4>
                                
                                {loadingMatches ? (
                                  <div className="flex justify-center py-2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-indigo-500"></div>
                                  </div>
                                ) : attendeeMatches.length === 0 ? (
                                  <p className="text-xs text-gray-500">No matches found</p>
                                ) : (
                                  <div className="space-y-2">
                                    {attendeeMatches.slice(0, 3).map(match => (
                                      <div key={match.id} className="flex items-center justify-between">
                                        <div className="flex items-center">
                                          <div className="h-6 w-6 rounded-full overflow-hidden bg-gray-200">
                                            {match.avatar ? (
                                              <Image 
                                                src={match.avatar} 
                                                alt={match.name} 
                                                width={24}
                                                height={24}
                                                className="h-full w-full object-cover"
                                              />
                                            ) : (
                                              <div className="h-full w-full flex items-center justify-center">
                                                <User className="h-3 w-3 text-gray-400" />
                                              </div>
                                            )}
                                          </div>
                                          <div className="ml-2">
                                            <p className="text-xs font-medium text-gray-900">{match.name}</p>
                                            <div className="flex items-center">
                                              <Zap className="h-3 w-3 text-yellow-500 mr-1" />
                                              <p className="text-xs text-gray-500">{match.score}% match</p>
                                            </div>
                                          </div>
                                        </div>
                                        <Link
                                          href={`/messages/${match.id}`}
                                          className="text-xs text-indigo-600 hover:text-indigo-800"
                                        >
                                          Connect
                                        </Link>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
} 