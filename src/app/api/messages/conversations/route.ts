import { NextRequest, NextResponse } from 'next/server';

// Define interfaces for our data types
interface Message {
  id?: string;
  text: string;
  senderId: string;
  senderName?: string;
  timestamp: string;
  read?: boolean;
}

interface Conversation {
  id: string;
  participants: string[];
  lastMessage: Message;
  unreadCount: number;
  isGroup: boolean;
  name?: string;
  avatar?: string;
}

// Mock database for conversations
const conversations: Conversation[] = [
  {
    id: 'conv1',
    participants: ['currentUser', 'user1'],
    lastMessage: {
      text: 'Looking forward to the tech conference!',
      senderId: 'user1',
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString()
    },
    unreadCount: 2,
    isGroup: false
  },
  {
    id: 'conv2',
    participants: ['currentUser', 'user2'],
    lastMessage: {
      text: 'Great meeting you at the networking event',
      senderId: 'user2',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
    },
    unreadCount: 0,
    isGroup: false
  },
  {
    id: 'conv3',
    participants: ['currentUser', 'user3'],
    lastMessage: {
      text: 'Can we schedule a call to discuss the project?',
      senderId: 'user3',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString()
    },
    unreadCount: 1,
    isGroup: false
  },
  {
    id: 'conv4',
    participants: ['currentUser', 'user4', 'user5', 'user6'],
    name: 'Tech Startup Meetup',
    lastMessage: {
      text: 'Is anyone bringing their pitch deck?',
      senderId: 'user4',
      senderName: 'David',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString()
    },
    unreadCount: 0,
    isGroup: true
  }
];

// Mock user data for populating conversation info
const users: Record<string, { id: string; name: string; avatar: string }> = {
  'user1': {
    id: 'user1',
    name: 'John Smith',
    avatar: 'https://placehold.co/100x100'
  },
  'user2': {
    id: 'user2',
    name: 'Sarah Johnson',
    avatar: 'https://placehold.co/100x100'
  },
  'user3': {
    id: 'user3',
    name: 'Michael Brown',
    avatar: 'https://placehold.co/100x100'
  },
  'user4': {
    id: 'user4',
    name: 'David Wilson',
    avatar: 'https://placehold.co/100x100'
  },
  'user5': {
    id: 'user5',
    name: 'Emily Davis',
    avatar: 'https://placehold.co/100x100'
  },
  'user6': {
    id: 'user6',
    name: 'Alex Thompson',
    avatar: 'https://placehold.co/100x100'
  }
};

// GET /api/messages/conversations
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'currentUser';
    
    // Filter conversations where the user is a participant
    const userConversations = conversations.filter(conv => 
      conv.participants.includes(userId)
    );
    
    // Enrich conversations with user data
    const enrichedConversations = userConversations.map(conv => {
      if (conv.isGroup) {
        return {
          ...conv,
          // For groups, we already have the name
          avatar: 'https://placehold.co/100x100' // Group avatar
        };
      } else {
        // For direct messages, get the other participant's info
        const otherParticipantId = conv.participants.find(p => p !== userId);
        const otherUser = otherParticipantId ? users[otherParticipantId as keyof typeof users] : null;
        
        return {
          ...conv,
          name: otherUser?.name || 'Unknown User',
          avatar: otherUser?.avatar || null
        };
      }
    });
    
    // Sort by last message timestamp (newest first)
    enrichedConversations.sort((a, b) => 
      new Date(b.lastMessage.timestamp).getTime() - new Date(a.lastMessage.timestamp).getTime()
    );
    
    return NextResponse.json({ conversations: enrichedConversations });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
  }
}

// POST /api/messages/conversations - Create a new conversation
export async function POST(request: NextRequest) {
  try {
    const { participants, isGroup, name } = await request.json();
    
    // Validate request
    if (!participants || !Array.isArray(participants) || participants.length < 2) {
      return NextResponse.json(
        { error: 'Invalid participants. Must provide at least 2 participants.' },
        { status: 400 }
      );
    }
    
    // Create new conversation
    const newConversation: Conversation = {
      id: `conv-${Date.now()}`,
      participants,
      lastMessage: {
        text: 'Conversation started',
        senderId: 'currentUser',
        timestamp: new Date().toISOString()
      },
      unreadCount: 0,
      isGroup: isGroup || false
    };
    
    if (isGroup && name) {
      newConversation.name = name;
    }
    
    // In a real app, save to database
    conversations.push(newConversation);
    
    return NextResponse.json({ conversation: newConversation });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
  }
} 