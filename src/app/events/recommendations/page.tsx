'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Calendar, MapPin, Clock, Tag, ChevronDown, ChevronUp, ArrowLeft, Sparkles } from 'lucide-react';
import Navigation from '@/components/Navigation';
import ProtectedRoute from '@/components/client/ProtectedRoute';
import { useAuth } from '@/lib/hooks/useAuth';

interface EventRecommendation {
  event: {
    id: string;
    title: string;
    description: string;
    date: string;
    time: string;
    location: string;
    category: string;
    organizer: string;
    imageUrl?: string;
  };
  score: number;
  matchReason: string;
  allReasons: string[];
}

export default function EventRecommendationsPage() {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<EventRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        const response = await fetch('/api/events/recommendations');
        
        if (!response.ok) {
          throw new Error('Failed to fetch event recommendations');
        }
        
        const data = await response.json();
        setRecommendations(data.recommendations);
      } catch (err) {
        setError('Failed to load event recommendations. Please try again later.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRecommendations();
  }, [user]);
  
  const toggleExpand = (eventId: string) => {
    if (expandedEvent === eventId) {
      setExpandedEvent(null);
    } else {
      setExpandedEvent(eventId);
    }
  };
  
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };
  
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="mb-6">
            <Link 
              href="/events" 
              className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back to Events
            </Link>
          </div>
          
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900">Recommended Events</h1>
            <p className="mt-2 text-lg text-gray-600">
              Events tailored to your interests and professional background
            </p>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 text-center text-red-700">
              {error}
            </div>
          ) : recommendations.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <Calendar className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">No event recommendations found</h3>
              <p className="mt-1 text-gray-500">
                Complete your profile to get better event recommendations.
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
            <div className="space-y-6">
              {recommendations.map((recommendation) => (
                <div key={recommendation.event.id} className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="md:flex">
                    {recommendation.event.imageUrl ? (
                      <div className="md:flex-shrink-0">
                        <Image
                          src={recommendation.event.imageUrl}
                          alt={recommendation.event.title}
                          width={200}
                          height={150}
                          className="h-48 w-full object-cover md:h-full md:w-48"
                        />
                      </div>
                    ) : (
                      <div className="md:flex-shrink-0 bg-indigo-100 flex items-center justify-center h-48 w-full md:h-full md:w-48">
                        <Calendar className="h-12 w-12 text-indigo-500" />
                      </div>
                    )}
                    
                    <div className="p-4 md:p-6 flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center">
                            <h2 className="text-xl font-semibold text-gray-900">{recommendation.event.title}</h2>
                            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                              <Sparkles className="h-3 w-3 mr-1" />
                              {recommendation.score}% Match
                            </span>
                          </div>
                          
                          <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                            {recommendation.event.description}
                          </p>
                        </div>
                      </div>
                      
                      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <div className="flex items-center text-sm text-gray-500">
                          <Calendar className="mr-1.5 h-4 w-4 text-gray-400" />
                          {formatDate(recommendation.event.date)}
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <Clock className="mr-1.5 h-4 w-4 text-gray-400" />
                          {recommendation.event.time}
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <MapPin className="mr-1.5 h-4 w-4 text-gray-400" />
                          {recommendation.event.location}
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <Tag className="mr-1.5 h-4 w-4 text-gray-400" />
                          {recommendation.event.category}
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <p className="text-sm font-medium text-indigo-600">
                          {recommendation.matchReason}
                        </p>
                        
                        {recommendation.allReasons.length > 1 && (
                          <button
                            onClick={() => toggleExpand(recommendation.event.id)}
                            className="mt-1 text-xs text-indigo-600 hover:text-indigo-500 flex items-center"
                          >
                            {expandedEvent === recommendation.event.id ? (
                              <>
                                Hide all reasons
                                <ChevronUp className="ml-1 h-3 w-3" />
                              </>
                            ) : (
                              <>
                                Show all reasons
                                <ChevronDown className="ml-1 h-3 w-3" />
                              </>
                            )}
                          </button>
                        )}
                        
                        {expandedEvent === recommendation.event.id && (
                          <div className="mt-2 text-sm text-gray-600">
                            <ul className="list-disc pl-5 space-y-1">
                              {recommendation.allReasons.map((reason, idx) => (
                                <li key={idx}>{reason}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-6">
                        <Link
                          href={`/events/${recommendation.event.id}`}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                        >
                          View Event Details
                        </Link>
                      </div>
                    </div>
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