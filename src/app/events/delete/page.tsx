'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import { deleteEvent } from '@/lib/firebase/eventUtils';
import { deleteLocalEventsByTitle } from '@/lib/mockData';
import { ArrowLeft, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function DeleteEventsPage() {
  const router = useRouter();
  const [titles, setTitles] = useState<string[]>([]);
  const [currentTitle, setCurrentTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Add a title to the list
  const addTitle = () => {
    if (currentTitle.trim() && !titles.includes(currentTitle.trim())) {
      setTitles([...titles, currentTitle.trim()]);
      setCurrentTitle('');
    }
  };

  // Remove a title from the list
  const removeTitle = (index: number) => {
    const newTitles = [...titles];
    newTitles.splice(index, 1);
    setTitles(newTitles);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (titles.length === 0) {
      setError('Please add at least one event title to delete');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${titles.length} event(s)? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      let deletedCount = 0;

      // Delete each event by title
      for (const title of titles) {
        const deleted = deleteLocalEventsByTitle(title);
        if (deleted) {
          deletedCount++;
        }
      }

      if (deletedCount > 0) {
        setMessage(`Successfully deleted ${deletedCount} event(s)`);
        setTitles([]);
      } else {
        setError('No events were found with the specified titles');
      }
    } catch (err) {
      console.error('Error deleting events:', err);
      setError('Failed to delete events. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle key press in the input field
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTitle();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-6 flex items-center">
          <Link href="/events" className="text-indigo-600 hover:text-indigo-800 flex items-center">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Events
          </Link>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Delete Events by Title</h1>
          
          {message && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-700">{message}</p>
            </div>
          )}
          
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-700">{error}</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Event Title
              </label>
              <div className="flex">
                <input
                  type="text"
                  id="title"
                  value={currentTitle}
                  onChange={(e) => setCurrentTitle(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1 border border-gray-300 rounded-l-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter event title to delete"
                />
                <button
                  type="button"
                  onClick={addTitle}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-r-md hover:bg-indigo-700"
                >
                  Add
                </button>
              </div>
            </div>
            
            {titles.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Events to delete:</h3>
                <ul className="bg-gray-50 rounded-md p-3">
                  {titles.map((title, index) => (
                    <li key={index} className="flex justify-between items-center py-1">
                      <span>{title}</span>
                      <button
                        type="button"
                        onClick={() => removeTitle(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading || titles.length === 0}
                className={`flex items-center px-4 py-2 rounded-md shadow-sm text-white ${
                  loading || titles.length === 0
                    ? 'bg-red-300 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Events
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
} 