'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import ProtectedRoute from '@/components/client/ProtectedRoute';
import QRCodeScanner from '@/components/QRCodeScanner';
import { useAuth } from '@/lib/hooks/useAuth';
import { getEvent, registerForEvent } from '@/lib/firebase/eventUtils';
import { Check, AlertCircle } from 'lucide-react';

export default function EventCheckInPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    message: string;
    eventId?: string;
    eventTitle?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleScan = async (data: string) => {
    setScanning(true);
    setLoading(true);
    setScanResult(null);
    setError('');

    try {
      // Check if the scanned data is a valid event URL
      // Expected format: https://yourdomain.com/events/register/EVENT_ID
      // or just the EVENT_ID
      let eventId = '';
      
      if (data.includes('/events/register/')) {
        const url = new URL(data);
        const pathParts = url.pathname.split('/');
        eventId = pathParts[pathParts.length - 1];
      } else {
        // Assume the QR code contains just the event ID
        eventId = data;
      }
      
      if (!eventId) {
        setScanResult({
          success: false,
          message: 'Invalid QR code. Could not extract event ID.'
        });
        return;
      }
      
      if (!user) {
        setScanResult({
          success: false,
          message: 'You must be logged in to register for an event.'
        });
        return;
      }
      
      // Get event details
      const event = await getEvent(eventId);
      
      if (!event) {
        setScanResult({
          success: false,
          message: 'Event not found. Please check the QR code and try again.'
        });
        return;
      }
      
      // Register user for the event
      await registerForEvent(eventId, user.uid);
      
      // Success
      setScanResult({
        success: true,
        message: 'Successfully registered for the event!',
        eventId,
        eventTitle: event.title
      });
      
    } catch (err) {
      console.error('Error processing QR code:', err);
      setScanResult({
        success: false,
        message: 'Failed to process QR code. Please try again.'
      });
    } finally {
      setLoading(false);
      setScanning(false);
    }
  };

  const handleScanError = (error: string) => {
    setError(error);
    setScanning(false);
  };

  const resetScan = () => {
    setScanResult(null);
    setError('');
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Event Check-in</h1>
            <p className="mt-1 text-gray-500">
              Scan a QR code to register for an event
            </p>
          </div>
          
          {error && (
            <div className="mb-6 bg-red-50 p-4 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          
          <div className="bg-white shadow-sm rounded-lg overflow-hidden p-6">
            {scanResult ? (
              <div className="flex flex-col items-center">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                  scanResult.success ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {scanResult.success ? (
                    <Check className="h-8 w-8 text-green-600" />
                  ) : (
                    <AlertCircle className="h-8 w-8 text-red-600" />
                  )}
                </div>
                
                <h3 className={`text-lg font-medium ${
                  scanResult.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  {scanResult.success ? 'Success!' : 'Error'}
                </h3>
                
                <p className="mt-2 text-center text-gray-600">
                  {scanResult.message}
                </p>
                
                {scanResult.success && scanResult.eventTitle && (
                  <div className="mt-4 text-center">
                    <p className="font-medium text-gray-900">Event: {scanResult.eventTitle}</p>
                  </div>
                )}
                
                <div className="mt-6 flex space-x-4">
                  <button
                    onClick={resetScan}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Scan Another Code
                  </button>
                  
                  {scanResult.success && scanResult.eventId && (
                    <button
                      onClick={() => router.push(`/events/${scanResult.eventId}`)}
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      View Event
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <QRCodeScanner 
                  onScan={handleScan}
                  onError={handleScanError}
                  width={300}
                  height={300}
                />
                
                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-500">
                    Point your camera at an event QR code to register
                  </p>
                </div>
                
                {loading && (
                  <div className="mt-4 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-indigo-500 mr-2"></div>
                    <p className="text-sm text-gray-500">Processing...</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
} 