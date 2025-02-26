'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Send, User, MessageSquare } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { getUserIdToken } from '@/lib/firebase/firebaseUtils';

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName?: string;
  timestamp: string;
  avatar?: string;
  read?: boolean;
}

interface EventChatRoomProps {
  eventId: string;
  eventTitle: string;
  isOrganizer: boolean;
}

export default function EventChatRoom({ eventId, eventTitle, isOrganizer }: EventChatRoomProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setLoading(true);
        const token = await getUserIdToken();
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };
        
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch(`/api/events/chat?eventId=${eventId}`, {
          headers
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch chat messages');
        }
        
        const data = await response.json();
        setMessages(data.messages || []);
      } catch (err) {
        console.error('Error fetching chat messages:', err);
        setError('Failed to load chat messages. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
    
    // Set up real-time updates (could use WebSockets or Firebase)
    const interval = setInterval(fetchMessages, 10000); // Poll every 10 seconds
    
    return () => clearInterval(interval);
  }, [eventId]);
  
  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    try {
      setSending(true);
      const token = await getUserIdToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/events/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          eventId,
          message: newMessage,
          isAnnouncement: false
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      
      // Add the message locally for immediate feedback
      const newMsg: Message = {
        id: `temp-${Date.now()}`,
        text: newMessage,
        senderId: user?.uid || 'dev_user_123',
        senderName: user?.displayName || 'Anonymous',
        timestamp: new Date().toISOString(),
        avatar: user?.photoURL || undefined
      };
      
      setMessages([...messages, newMsg]);
      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };
  
  const handleSendAnnouncement = async () => {
    if (!newMessage.trim()) return;
    
    try {
      setSending(true);
      
      const response = await fetch('/api/events/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId,
          message: newMessage,
          isAnnouncement: true
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to send announcement');
      }
      
      // Add the announcement locally for immediate feedback
      const newAnnouncement: Message = {
        id: `temp-${Date.now()}`,
        text: newMessage,
        senderId: user?.uid || 'dev_user_123',
        senderName: user?.displayName || 'Event Organizer',
        timestamp: new Date().toISOString(),
        avatar: user?.photoURL || undefined
      };
      
      setMessages([...messages, newAnnouncement]);
      setNewMessage('');
    } catch (err) {
      console.error('Error sending announcement:', err);
      setError('Failed to send announcement. Please try again.');
    } finally {
      setSending(false);
    }
  };
  
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="text-red-500 text-center py-4">{error}</div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800">Event Chat: {eventTitle}</h2>
        <p className="text-sm text-gray-500">Chat with other attendees and the event organizer</p>
      </div>
      
      <div className="h-96 overflow-y-auto p-4 bg-gray-50">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <MessageSquare className="h-12 w-12 mb-2" />
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isCurrentUser = message.senderId === user?.uid;
            const isAnnouncement = message.senderId === 'announcement' || (isOrganizer && message.senderId === user?.uid);
            
            return (
              <div 
                key={message.id} 
                className={`mb-4 ${isCurrentUser ? 'text-right' : 'text-left'} ${isAnnouncement ? 'mx-4' : ''}`}
              >
                {isAnnouncement ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-2">
                    <div className="flex items-center mb-1">
                      <div className="h-6 w-6 rounded-full bg-yellow-500 flex items-center justify-center mr-2">
                        <span className="text-xs text-white">📢</span>
                      </div>
                      <span className="font-medium text-yellow-800">Announcement from Organizer</span>
                    </div>
                    <p className="text-sm text-gray-800">{message.text}</p>
                    <p className="text-xs text-gray-500 mt-1 text-right">{formatTime(message.timestamp)}</p>
                  </div>
                ) : (
                  <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                    {!isCurrentUser && (
                      <div className="flex-shrink-0 h-8 w-8 rounded-full overflow-hidden bg-gray-200 mr-2">
                        {message.avatar ? (
                          <img src={message.avatar} alt={message.senderName || ''} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <User className="h-4 w-4 text-gray-400" />
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className={`max-w-xs lg:max-w-md ${
                      isCurrentUser 
                        ? 'bg-indigo-600 text-white rounded-tl-lg rounded-tr-lg rounded-bl-lg' 
                        : 'bg-white text-gray-800 rounded-tl-lg rounded-tr-lg rounded-br-lg'
                    } px-4 py-2 shadow`}>
                      {!isCurrentUser && (
                        <p className="text-xs font-medium text-indigo-600 mb-1">{message.senderName}</p>
                      )}
                      <p className="text-sm">{message.text}</p>
                      <p className={`text-xs mt-1 text-right ${
                        isCurrentUser ? 'text-indigo-200' : 'text-gray-500'
                      }`}>
                        {formatTime(message.timestamp)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="p-4 border-t border-gray-200">
        <form onSubmit={handleSendMessage} className="flex items-center">
          <input
            type="text"
            placeholder="Type a message..."
            className="flex-1 border border-gray-300 rounded-l-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className={`px-4 py-2 rounded-r-md ${
              newMessage.trim() && !sending
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'bg-indigo-300 text-white cursor-not-allowed'
            }`}
          >
            {sending ? (
              <div className="h-5 w-5 border-t-2 border-b-2 border-white rounded-full animate-spin"></div>
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </form>
        
        {isOrganizer && (
          <div className="mt-2 flex justify-end">
            <button
              onClick={handleSendAnnouncement}
              disabled={!newMessage.trim() || sending}
              className={`px-4 py-2 text-sm rounded-md ${
                newMessage.trim() && !sending
                  ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                  : 'bg-yellow-300 text-white cursor-not-allowed'
              }`}
            >
              Send as Announcement
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 