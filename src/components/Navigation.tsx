'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';
import { User, LogOut, Calendar, Users, MessageSquare } from 'lucide-react';

export default function Navigation() {
  const { user, signOut } = useAuth();

  // Check if user is admin
  const isAdmin = user?.email === 'jacques@rebrandmint.com';

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link href="/" className="flex items-center px-2 text-gray-900 font-semibold">
              EventConnect
            </Link>
            
            {user && (
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  href="/events"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-gray-700"
                >
                  <Calendar className="h-4 w-4 mr-1" />
                  Events
                </Link>
                <Link
                  href="/networking"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-gray-700"
                >
                  <Users className="h-4 w-4 mr-1" />
                  Networking
                </Link>
                <Link
                  href="/messages"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-gray-700"
                >
                  <MessageSquare className="h-4 w-4 mr-1" />
                  Messages
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin/events"
                    className="inline-flex items-center px-1 pt-1 text-sm font-medium text-red-500 hover:text-red-700"
                  >
                    <User className="h-4 w-4 mr-1" />
                    Admin
                  </Link>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center">
            {user ? (
              <div className="flex items-center space-x-4">
                <Link
                  href="/profile"
                  className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
                >
                  <User className="h-5 w-5 mr-1" />
                  Profile
                </Link>
                <button
                  onClick={() => signOut()}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <LogOut className="h-4 w-4 mr-1" />
                  Sign Out
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
} 