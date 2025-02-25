'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { UserPlus, MessageSquare, User, Zap, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import Navigation from '@/components/Navigation';
import { UserProfile } from '@/lib/utils/matchmaking';
import ProtectedRoute from '@/components/client/ProtectedRoute';

interface Match {
  user: UserProfile;
  score: number;
  matchReason: string;
  conversationStarters: string[];
}

export default function NetworkingPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchMatches = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/matchmaking');
        
        if (!response.ok) {
          throw new Error('Failed to fetch matches');
        }
        
        const data = await response.json();
        setMatches(data.matches);
      } catch (err) {
        setError('Failed to load networking recommendations. Please try again later.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchMatches();
  }, []);
  
  const toggleExpand = (userId: string) => {
    if (expandedMatch === userId) {
      setExpandedMatch(null);
    } else {
      setExpandedMatch(userId);
    }
  };
  
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900">Smart Networking</h1>
            <p className="mt-2 text-lg text-gray-600">
              AI-powered recommendations to help you connect with the right people
            </p>
            <div className="mt-4">
              <Link
                href="/networking/recommendations"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                View AI Recommendations
              </Link>
            </div>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 text-center text-red-700">
              {error}
            </div>
          ) : matches.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <User className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">No matches found</h3>
              <p className="mt-1 text-gray-500">
                Complete your profile to get better networking recommendations.
              </p>
              <div className="mt-6">
                <Link
                  href="/profile"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Update Profile
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {matches.map((match) => (
                <div key={match.user.id} className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="p-4 sm:p-6">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center">
                          <User className="h-6 w-6 text-indigo-600" />
                        </div>
                      </div>
                      <div className="ml-4 flex-1">
                        <div className="flex items-center justify-between">
                          <h2 className="text-lg font-medium text-gray-900">{match.user.name}</h2>
                          <div className="flex items-center">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                              <Zap className="h-3 w-3 mr-1" />
                              {match.score}% Match
                            </span>
                          </div>
                        </div>
                        <p className="mt-1 text-sm text-gray-500">
                          {match.user.title} at {match.user.company}
                        </p>
                        <p className="mt-2 text-sm font-medium text-indigo-600">
                          {match.matchReason}
                        </p>
                        
                        <div className="mt-4 flex flex-wrap gap-2">
                          {match.user.interests.slice(0, 3).map((interest, index) => (
                            <span 
                              key={index}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                            >
                              {interest}
                            </span>
                          ))}
                          {match.user.interests.length > 3 && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                              +{match.user.interests.length - 3} more
                            </span>
                          )}
                        </div>
                        
                        <div className="mt-4 flex justify-between items-center">
                          <div className="flex space-x-2">
                            <Link
                              href={`/messages/${match.user.id}`}
                              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                            >
                              <MessageSquare className="h-3.5 w-3.5 mr-1" />
                              Message
                            </Link>
                            <button
                              className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                            >
                              <UserPlus className="h-3.5 w-3.5 mr-1" />
                              Connect
                            </button>
                          </div>
                          
                          <button
                            onClick={() => toggleExpand(match.user.id)}
                            className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-500"
                          >
                            {expandedMatch === match.user.id ? (
                              <>
                                Hide conversation starters
                                <ChevronUp className="ml-1 h-4 w-4" />
                              </>
                            ) : (
                              <>
                                Show conversation starters
                                <ChevronDown className="ml-1 h-4 w-4" />
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {expandedMatch === match.user.id && (
                      <div className="mt-6 bg-indigo-50 rounded-md p-4">
                        <h3 className="text-sm font-medium text-indigo-800 mb-2">
                          Conversation Starters
                        </h3>
                        <ul className="space-y-2">
                          {match.conversationStarters.map((starter, index) => (
                            <li key={index} className="text-sm text-gray-700 flex items-start">
                              <span className="inline-block h-5 w-5 rounded-full bg-indigo-200 text-indigo-700 text-xs flex items-center justify-center mr-2 mt-0.5">
                                {index + 1}
                              </span>
                              {starter}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
} 