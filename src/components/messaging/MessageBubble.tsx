import { User } from 'lucide-react';

interface MessageBubbleProps {
  message: {
    id: string;
    text: string;
    timestamp: string;
    senderId: string;
    senderName?: string;
    read?: boolean;
  };
  isCurrentUser: boolean;
  isGroupChat?: boolean;
  showAvatar?: boolean;
  avatar?: string | null;
}

export default function MessageBubble({
  message,
  isCurrentUser,
  isGroupChat = false,
  showAvatar = true,
  avatar = null
}: MessageBubbleProps) {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  return (
    <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-4`}>
      {!isCurrentUser && showAvatar && (
        <div className="flex-shrink-0 h-8 w-8 rounded-full overflow-hidden bg-gray-200 mr-2">
          {avatar ? (
            <img src={avatar} alt="Avatar" className="h-full w-full object-cover" />
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
        {isGroupChat && message.senderName && !isCurrentUser && (
          <p className="text-xs font-medium text-indigo-600 mb-1">{message.senderName}</p>
        )}
        <p className="text-sm">{message.text}</p>
        <div className="flex items-center justify-end mt-1">
          <p className={`text-xs ${isCurrentUser ? 'text-indigo-200' : 'text-gray-500'}`}>
            {formatTime(message.timestamp)}
          </p>
          {isCurrentUser && (
            <span className="ml-1">
              {message.read ? (
                <svg className="h-3 w-3 text-indigo-200" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                </svg>
              ) : (
                <svg className="h-3 w-3 text-indigo-200" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                </svg>
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
} 