'use client';

import { useState } from 'react';
import { X, Users, Search, Check } from 'lucide-react';

// Mock user data
const mockUsers = [
  { id: 'user1', name: 'John Smith', avatar: 'https://placehold.co/100x100' },
  { id: 'user2', name: 'Sarah Johnson', avatar: 'https://placehold.co/100x100' },
  { id: 'user3', name: 'Michael Brown', avatar: 'https://placehold.co/100x100' },
  { id: 'user4', name: 'David Wilson', avatar: 'https://placehold.co/100x100' },
  { id: 'user5', name: 'Emily Davis', avatar: 'https://placehold.co/100x100' },
  { id: 'user6', name: 'Alex Thompson', avatar: 'https://placehold.co/100x100' },
  { id: 'user7', name: 'Jessica Martinez', avatar: 'https://placehold.co/100x100' },
  { id: 'user8', name: 'Ryan Taylor', avatar: 'https://placehold.co/100x100' }
];

interface User {
  id: string;
  name: string;
  avatar: string;
}

interface CreateGroupChatProps {
  onClose: () => void;
  onCreateGroup: (name: string, participants: string[]) => void;
}

export default function CreateGroupChat({ onClose, onCreateGroup }: CreateGroupChatProps) {
  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  
  const filteredUsers = mockUsers.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !selectedUsers.some(selected => selected.id === user.id)
  );
  
  const handleSelectUser = (user: User) => {
    setSelectedUsers([...selectedUsers, user]);
    setSearchQuery('');
  };
  
  const handleRemoveUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter(user => user.id !== userId));
  };
  
  const handleCreateGroup = () => {
    if (groupName.trim() && selectedUsers.length >= 2) {
      onCreateGroup(
        groupName,
        selectedUsers.map(user => user.id)
      );
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Create Group Chat</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-4">
          <div className="mb-4">
            <label htmlFor="group-name" className="block text-sm font-medium text-gray-700 mb-1">
              Group Name
            </label>
            <input
              type="text"
              id="group-name"
              placeholder="Enter group name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="search-users" className="block text-sm font-medium text-gray-700 mb-1">
              Add Participants
            </label>
            <div className="relative">
              <input
                type="text"
                id="search-users"
                placeholder="Search users..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
          </div>
          
          {/* Selected users */}
          {selectedUsers.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Selected ({selectedUsers.length})</h3>
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map(user => (
                  <div 
                    key={user.id}
                    className="flex items-center bg-indigo-100 rounded-full pl-2 pr-1 py-1"
                  >
                    <img 
                      src={user.avatar} 
                      alt={user.name} 
                      className="h-5 w-5 rounded-full mr-1" 
                    />
                    <span className="text-xs text-indigo-800">{user.name}</span>
                    <button 
                      onClick={() => handleRemoveUser(user.id)}
                      className="ml-1 text-indigo-500 hover:text-indigo-700 focus:outline-none"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* User search results */}
          {searchQuery && filteredUsers.length > 0 && (
            <div className="mb-4 max-h-48 overflow-y-auto border border-gray-200 rounded-md">
              {filteredUsers.map(user => (
                <div 
                  key={user.id}
                  className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleSelectUser(user)}
                >
                  <img 
                    src={user.avatar} 
                    alt={user.name} 
                    className="h-8 w-8 rounded-full mr-3" 
                  />
                  <span className="text-sm text-gray-900">{user.name}</span>
                </div>
              ))}
            </div>
          )}
          
          {searchQuery && filteredUsers.length === 0 && (
            <p className="text-sm text-gray-500 mb-4">No users found</p>
          )}
          
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 mr-2"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateGroup}
              disabled={!groupName.trim() || selectedUsers.length < 2}
              className={`px-4 py-2 rounded-md text-sm font-medium flex items-center ${
                groupName.trim() && selectedUsers.length >= 2
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-indigo-300 text-white cursor-not-allowed'
              }`}
            >
              <Users className="h-4 w-4 mr-1" />
              Create Group
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 