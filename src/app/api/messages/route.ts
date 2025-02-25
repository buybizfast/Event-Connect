import { NextRequest, NextResponse } from 'next/server';

// Mock database for messages
let messages = [
  {
    id: '1',
    conversationId: 'conv1',
    senderId: 'user1',
    receiverId: 'currentUser',
    text: 'Hi there! Looking forward to connecting.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    read: true
  },
  {
    id: '2',
    conversationId: 'conv1',
    senderId: 'currentUser',
    receiverId: 'user1',
    text: 'Hello! Thanks for reaching out. What brings you to the platform?',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 23).toISOString(),
    read: true
  },
  // More mock messages would be here
];

// GET /api/messages?conversationId=X
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');
    const userId = searchParams.get('userId');
    
    let filteredMessages = [...messages];
    
    if (conversationId) {
      filteredMessages = filteredMessages.filter(msg => msg.conversationId === conversationId);
    } else if (userId) {
      // For direct messages between two users
      filteredMessages = filteredMessages.filter(
        msg => (msg.senderId === userId && msg.receiverId === 'currentUser') || 
               (msg.senderId === 'currentUser' && msg.receiverId === userId)
      );
    }
    
    // Sort by timestamp
    filteredMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    return NextResponse.json({ messages: filteredMessages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

// POST /api/messages
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversationId, senderId, receiverId, text } = body;
    
    if (!senderId || !text || !(conversationId || receiverId)) {
      return NextResponse.json(
        { error: 'Missing required fields' }, 
        { status: 400 }
      );
    }
    
    const newMessage = {
      id: `msg-${Date.now()}`,
      conversationId: conversationId || `conv-${senderId}-${receiverId}`,
      senderId,
      receiverId,
      text,
      timestamp: new Date().toISOString(),
      read: false
    };
    
    // In a real app, save to database
    messages.push(newMessage);
    
    return NextResponse.json({ message: newMessage });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
} 