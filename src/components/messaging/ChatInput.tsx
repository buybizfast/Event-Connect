import { useState } from 'react';
import { Send, Paperclip, Smile } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function ChatInput({ 
  onSendMessage, 
  placeholder = 'Type a message...', 
  disabled = false 
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || disabled) return;
    
    onSendMessage(message);
    setMessage('');
  };
  
  return (
    <div className="bg-white border-t border-gray-200 px-4 py-3">
      <form onSubmit={handleSubmit} className="flex items-center">
        <button 
          type="button" 
          className="p-2 rounded-full text-gray-500 hover:text-gray-600 focus:outline-none"
          disabled={disabled}
        >
          <Paperclip className="h-5 w-5" />
        </button>
        <input
          type="text"
          placeholder={placeholder}
          className="flex-1 border-0 focus:ring-0 focus:outline-none px-3 py-2 text-black"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={disabled}
        />
        <button 
          type="button" 
          className="p-2 rounded-full text-gray-500 hover:text-gray-600 focus:outline-none"
          disabled={disabled}
        >
          <Smile className="h-5 w-5" />
        </button>
        <button 
          type="submit" 
          className={`ml-2 p-2 rounded-full ${
            message.trim() && !disabled
              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
              : 'bg-indigo-300 text-white cursor-not-allowed'
          } focus:outline-none`}
          disabled={!message.trim() || disabled}
        >
          <Send className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
} 