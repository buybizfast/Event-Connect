import Link from 'next/link';
import { User, Users } from 'lucide-react';

interface Conversation {
  id: string;
  name: string;
  lastMessage: {
    text: string;
    senderId: string;
    senderName?: string;
    timestamp: string;
  };
  unreadCount: number;
  isGroup: boolean;
  avatar?: string | null;
}

interface ConversationListProps {
  conversations: Conversation[];
  activeConversationId?: string;
}

export default function ConversationList({ 
  conversations, 
  activeConversationId 
}: ConversationListProps) {
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      // Today, show time
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      // Yesterday
      return 'Yesterday';
    } else if (diffDays < 7) {
      // Within a week, show day name
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      // Older, show date
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };
  
  return (
    <div className="divide-y divide-gray-200">
      {conversations.length > 0 ? (
        conversations.map(conversation => (
          <Link 
            key={conversation.id}
            href={`/messages/${conversation.id}`}
            className={`block hover:bg-gray-50 ${
              activeConversationId === conversation.id ? 'bg-indigo-50' : ''
            }`}
          >
            <div className="px-4 py-4 flex items-center">
              <div className="flex-shrink-0 h-12 w-12 rounded-full overflow-hidden bg-gray-200">
                {conversation.avatar ? (
                  <img 
                    src={conversation.avatar} 
                    alt={conversation.name} 
                    className="h-full w-full object-cover" 
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-indigo-100">
                    {conversation.isGroup ? (
                      <Users className="h-6 w-6 text-indigo-500" />
                    ) : (
                      <User className="h-6 w-6 text-indigo-500" />
                    )}
                  </div>
                )}
              </div>
              <div className="ml-4 flex-1">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-medium text-gray-900">{conversation.name}</h2>
                  <p className="text-xs text-gray-500">
                    {formatTimestamp(conversation.lastMessage.timestamp)}
                  </p>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <p className="text-sm text-gray-500 truncate max-w-[200px]">
                    {conversation.isGroup && conversation.lastMessage.senderName ? (
                      <span>
                        <span className="font-medium">{conversation.lastMessage.senderName}:</span> {conversation.lastMessage.text}
                      </span>
                    ) : (
                      conversation.lastMessage.text
                    )}
                  </p>
                  {conversation.unreadCount > 0 && (
                    <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-indigo-600 text-xs font-medium text-white">
                      {conversation.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Link>
        ))
      ) : (
        <div className="px-4 py-6 text-center">
          <p className="text-sm text-gray-500">No conversations yet</p>
        </div>
      )}
    </div>
  );
} 