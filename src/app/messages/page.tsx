'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MessageSquare, Search, User } from 'lucide-react';
import Navigation from '@/components/Navigation';
import ProtectedRoute from '@/components/client/ProtectedRoute';

// Mock data for conversations
const mockConversations = [
  {
    id: '1',
    userId: 'user1',
    name: 'John Smith',
    lastMessage: 'Looking forward to the tech conference!',
    timestamp: '10:30 AM',
    unread: 2,
    avatar: 'https://placehold.co/100x100'
  },
  {
    id: '2',
    userId: 'user2',
    name: 'Sarah Johnson',
    lastMessage: 'Great meeting you at the networking event',
    timestamp: 'Yesterday',
    unread: 0,
    avatar: 'https://placehold.co/100x100'
  },
  {
    id: '3',
    userId: 'user3',
    name: 'Michael Brown',
    lastMessage: 'Can we schedule a call to discuss the project?',
    timestamp: 'Feb 22',
    unread: 1,
    avatar: 'https://placehold.co/100x100'
  },
  {
    id: '4',
    userId: 'user4',
    name: 'Tech Startup Meetup',
    lastMessage: 'David: Is anyone bringing their pitch deck?',
    timestamp: 'Feb 20',
    unread: 0,
    isGroup: true,
    avatar: 'https://placehold.co/100x100'
  }
];

export default function MessagesPage() {
  const [conversations, setConversations] = useState(mockConversations);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter conversations based on search query
  const filteredConversations = conversations.filter(conversation => 
    conversation.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conversation.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h1 className="text-xl font-semibold text-gray-800">Messages</h1>
              <div className="mt-2 relative">
                <input
                  type="text"
                  placeholder="Search messages..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
            </div>
            
            <div className="divide-y divide-gray-200">
              {filteredConversations.length > 0 ? (
                filteredConversations.map(conversation => (
                  <Link 
                    key={conversation.id}
                    href={`/messages/${conversation.userId}`}
                    className="block hover:bg-gray-50"
                  >
                    <div className="px-4 py-4 flex items-center">
                      <div className="flex-shrink-0 h-12 w-12 rounded-full overflow-hidden bg-gray-200">
                        {conversation.avatar ? (
                          <img src={conversation.avatar} alt={conversation.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <User className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="ml-4 flex-1">
                        <div className="flex items-center justify-between">
                          <h2 className="text-sm font-medium text-gray-900">{conversation.name}</h2>
                          <p className="text-xs text-gray-500">{conversation.timestamp}</p>
                        </div>
                        <div className="mt-1 flex items-center justify-between">
                          <p className="text-sm text-gray-500 truncate">{conversation.lastMessage}</p>
                          {conversation.unread > 0 && (
                            <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-indigo-600 text-xs font-medium text-white">
                              {conversation.unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="px-4 py-6 text-center">
                  <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No messages</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchQuery ? 'No messages match your search' : 'Start a conversation with someone from the directory'}
                  </p>
                  {!searchQuery && (
                    <div className="mt-6">
                      <Link
                        href="/directory"
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                      >
                        Browse Directory
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
} 