'use client';

// Updated to fix Vercel build error - removing name property from Message interface
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Send, Paperclip, Smile, User } from 'lucide-react';
import Navigation from '@/components/Navigation';
import ProtectedRoute from '@/components/client/ProtectedRoute';

// Define interfaces for our data types
interface UserProfile {
  id: string;
  name: string;
  avatar: string;
  status?: string;
  title?: string;
  isGroup?: boolean;
  members?: string[];
}

interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
  read: boolean;
  senderName?: string;
}

// Type for grouped messages by date
interface GroupedMessages {
  [date: string]: Message[];
}

// Mock user data
const mockUsers: Record<string, UserProfile> = {
  'user1': {
    id: 'user1',
    name: 'John Smith',
    avatar: 'https://placehold.co/100x100',
    status: 'online',
    title: 'Software Engineer at TechCorp'
  },
  'user2': {
    id: 'user2',
    name: 'Sarah Johnson',
    avatar: 'https://placehold.co/100x100',
    status: 'offline',
    title: 'Marketing Director at CreativeAgency'
  },
  'user3': {
    id: 'user3',
    name: 'Michael Brown',
    avatar: 'https://placehold.co/100x100',
    status: 'away',
    title: 'Product Manager at StartupInc'
  },
  'user4': {
    id: 'user4',
    name: 'Tech Startup Meetup',
    avatar: 'https://placehold.co/100x100',
    isGroup: true,
    members: ['You', 'David', 'Emily', 'Alex']
  }
};

// Helper function to create properly typed messages
const createMessage = (message: Message): Message => {
  return message;
};

// Mock messages data
const generateMockMessages = (userId: string): Message[] => {
  const baseMessages = [
    createMessage({
      id: '1',
      senderId: userId,
      text: 'Hi there! Looking forward to connecting.',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      read: true
    }),
    createMessage({
      id: '2',
      senderId: 'currentUser',
      text: 'Hello! Thanks for reaching out. What brings you to the platform?',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 23).toISOString(),
      read: true
    }),
    createMessage({
      id: '3',
      senderId: userId,
      text: 'I\'m attending the upcoming tech conference and wanted to connect with other attendees beforehand.',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString(),
      read: true
    })
  ];
  
  // Add user-specific messages
  if (userId === 'user1') {
    baseMessages.push(
      createMessage({
        id: '4',
        senderId: 'currentUser',
        text: 'Great! I\'ll be there too. Are you presenting?',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        read: true
      }),
      createMessage({
        id: '5',
        senderId: 'user1',
        text: 'Yes, I\'m giving a talk on AI in product development. Looking forward to the tech conference!',
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        read: true
      })
    );
  } else if (userId === 'user2') {
    baseMessages.push(
      createMessage({
        id: '4',
        senderId: 'currentUser',
        text: 'I really enjoyed our conversation at the networking event last week.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
        read: true
      }),
      createMessage({
        id: '5',
        senderId: 'user2',
        text: 'Great meeting you at the networking event! Let\'s catch up soon.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 1).toISOString(),
        read: true
      })
    );
  } else if (userId === 'user3') {
    baseMessages.push(
      createMessage({
        id: '4',
        senderId: 'user3',
        text: 'I saw your profile and thought we might collaborate on a project.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
        read: true
      }),
      createMessage({
        id: '5',
        senderId: 'user3',
        text: 'Can we schedule a call to discuss the project?',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 1).toISOString(),
        read: false
      })
    );
  } else if (userId === 'user4') {
    // Create messages with explicit typing
    const message4: Message = {
      id: '4',
      senderId: 'groupMember1',
      senderName: 'David',
      text: 'Is everyone prepared for the meetup next week?',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
      read: true
    };
    
    const message5: Message = {
      id: '5',
      senderId: 'groupMember2',
      senderName: 'Emily',
      text: 'I\'ll be bringing my presentation materials.',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
      read: true
    };
    
    const message6: Message = {
      id: '6',
      senderId: 'groupMember1',
      senderName: 'David',
      text: 'Is anyone bringing their pitch deck?',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      read: true
    };
    
    baseMessages.push(message4, message5, message6);
  }
  
  return baseMessages;
};

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
  const userId = typeof params.userId === 'string' ? params.userId : '';
  const [user, setUser] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  
  useEffect(() => {
    // In a real app, fetch user and messages from API
    if (userId && mockUsers[userId]) {
      setUser(mockUsers[userId]);
      setMessages(generateMockMessages(userId));
    } else {
      // Handle invalid user ID
      router.push('/messages');
    }
  }, [userId, router]);
  
  useEffect(() => {
    // Scroll to bottom of messages
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    const newMsg = createMessage({
      id: `new-${Date.now()}`,
      senderId: 'currentUser',
      text: newMessage,
      timestamp: new Date().toISOString(),
      read: false
    });
    
    setMessages([...messages, newMsg]);
    setNewMessage('');
  };
  
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };
  
  // Group messages by date for display
  const groupedMessages: GroupedMessages = messages.reduce((groups: GroupedMessages, message) => {
    const date = formatDate(message.timestamp);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {});
  
  if (!user) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      </ProtectedRoute>
    );
  }
  
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navigation />
        
        <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center">
            <Link href="/messages" className="mr-4">
              <ArrowLeft className="h-5 w-5 text-gray-500" />
            </Link>
            
            <div className="flex-shrink-0 h-10 w-10 rounded-full overflow-hidden bg-gray-200">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
              )}
            </div>
            
            <div className="ml-3 flex-1">
              <div className="flex items-center">
                <h2 className="text-sm font-medium text-gray-900">{user.name}</h2>
                {user.status && (
                  <span className={`ml-2 h-2 w-2 rounded-full ${
                    user.status === 'online' ? 'bg-green-500' : 
                    user.status === 'away' ? 'bg-yellow-500' : 'bg-gray-300'
                  }`}></span>
                )}
              </div>
              <p className="text-xs text-gray-500 truncate">
                {user.isGroup 
                  ? `${user.members?.length} members` 
                  : user.title || 'Available'}
              </p>
            </div>
          </div>
          
          {/* Messages */}
          <div className="flex-1 bg-gray-100 p-4 overflow-y-auto">
            {Object.entries(groupedMessages).map(([date, dateMessages]) => (
              <div key={date} className="mb-6">
                <div className="text-center mb-4">
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">
                    {date}
                  </span>
                </div>
                {dateMessages.map((message: Message) => {
                  const isCurrentUser = message.senderId === 'currentUser';
                  return (
                    <div 
                      key={message.id} 
                      className={`mb-4 flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isCurrentUser && user.isGroup && (
                        <div className="flex-shrink-0 h-8 w-8 rounded-full overflow-hidden bg-gray-200 mr-2">
                          <div className="h-full w-full flex items-center justify-center">
                            <User className="h-4 w-4 text-gray-400" />
                          </div>
                        </div>
                      )}
                      
                      <div className={`max-w-xs lg:max-w-md ${
                        isCurrentUser 
                          ? 'bg-indigo-600 text-white rounded-tl-lg rounded-tr-lg rounded-bl-lg' 
                          : 'bg-white text-gray-800 rounded-tl-lg rounded-tr-lg rounded-br-lg'
                      } px-4 py-2 shadow`}>
                        {user.isGroup && !isCurrentUser && (
                          <p className="text-xs font-medium text-indigo-600 mb-1">
                            {message.senderName || message.senderId}
                          </p>
                        )}
                        <p className="text-sm">{message.text}</p>
                        <p className={`text-xs mt-1 text-right ${
                          isCurrentUser ? 'text-indigo-200' : 'text-gray-500'
                        }`}>
                          {formatTime(message.timestamp)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Message Input */}
          <div className="bg-white border-t border-gray-200 px-4 py-3">
            <form onSubmit={handleSendMessage} className="flex items-center">
              <button 
                type="button" 
                className="p-2 rounded-full text-gray-500 hover:text-gray-600 focus:outline-none"
              >
                <Paperclip className="h-5 w-5" />
              </button>
              <input
                type="text"
                placeholder="Type a message..."
                className="flex-1 border-0 focus:ring-0 focus:outline-none px-3 py-2 text-black"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
              />
              <button 
                type="button" 
                className="p-2 rounded-full text-gray-500 hover:text-gray-600 focus:outline-none"
              >
                <Smile className="h-5 w-5" />
              </button>
              <button 
                type="submit" 
                className="ml-2 p-2 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 focus:outline-none"
                disabled={!newMessage.trim()}
              >
                <Send className="h-5 w-5" />
              </button>
            </form>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
} 