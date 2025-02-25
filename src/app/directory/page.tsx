import Navigation from '@/components/Navigation';
import { Search, Filter, MessageSquare, UserPlus, Star } from 'lucide-react';

interface User {
  id: string;
  name: string;
  title: string;
  company: string;
  interests: string[];
  matchScore: number;
  imageUrl: string;
}

// Mock data - will be replaced with real data from Firebase and AI matchmaking
const users: User[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    title: 'CEO',
    company: 'TechStart Inc.',
    interests: ['AI', 'Startups', 'Venture Capital'],
    matchScore: 95,
    imageUrl: 'https://i.pravatar.cc/150?img=1'
  },
  {
    id: '2',
    name: 'Michael Chen',
    title: 'Product Manager',
    company: 'Innovation Labs',
    interests: ['Product Development', 'UX Design', 'Agile'],
    matchScore: 88,
    imageUrl: 'https://i.pravatar.cc/150?img=2'
  },
  // Add more mock users as needed
];

export default function DirectoryPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Networking Directory</h1>
          <div className="flex space-x-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search people..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              />
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
            </div>
            <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {users.map((user) => (
            <div key={user.id} className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-6">
                <div className="flex items-start space-x-4">
                  <img
                    src={user.imageUrl}
                    alt={user.name}
                    className="w-12 h-12 rounded-full"
                  />
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900">{user.name}</h3>
                    <p className="text-sm text-gray-500">{user.title} at {user.company}</p>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Star className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm font-medium text-gray-900">{user.matchScore}%</span>
                  </div>
                </div>
                
                <div className="mt-4">
                  <div className="flex flex-wrap gap-2">
                    {user.interests.map((interest, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-4 flex justify-end space-x-3">
                  <button className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                    <MessageSquare className="w-4 h-4 mr-1" />
                    Message
                  </button>
                  <button className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
                    <UserPlus className="w-4 h-4 mr-1" />
                    Connect
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
} 