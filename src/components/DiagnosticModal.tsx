'use client';

import { useState, useEffect } from 'react';
import { runDiagnostics } from '@/lib/utils/extensionDetector';
import { forceCleanReload } from '@/lib/utils/extensionBlocker';

export default function DiagnosticModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);
  const [diagnosticResults, setDiagnosticResults] = useState<{
    problematicExtensions: string[];
    isPrivateMode: boolean;
    recommendations: string;
  } | null>(null);

  // Check if we should show the diagnostic modal based on URL parameters
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const hasErrors = urlParams.get('has_errors') === 'true';
    const emergencyReset = urlParams.get('emergency_reset') === 'true';
    
    // Show diagnostic modal if there are errors or after emergency reset
    if (hasErrors || emergencyReset) {
      setIsOpen(true);
    }
  }, []);

  // Run diagnostics when modal is opened
  useEffect(() => {
    if (isOpen && !diagnosticResults) {
      runDiagnosticsCheck();
    }
  }, [isOpen, diagnosticResults]);

  const runDiagnosticsCheck = async () => {
    setIsRunningDiagnostics(true);
    try {
      const results = await runDiagnostics();
      setDiagnosticResults(results);
    } catch (error) {
      console.error('Error running diagnostics:', error);
    } finally {
      setIsRunningDiagnostics(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleOpenClick = () => {
    setIsOpen(true);
    if (!diagnosticResults) {
      runDiagnosticsCheck();
    }
  };

  const handleEmergencyReset = () => {
    forceCleanReload();
  };

  if (!isOpen) {
    return (
      <button
        onClick={handleOpenClick}
        className="fixed bottom-4 left-4 z-50 px-4 py-2 bg-blue-600 text-white font-bold rounded-md shadow-lg hover:bg-blue-700 transition-colors duration-200 flex items-center space-x-2"
        title="Run diagnostics to identify and fix issues"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        <span>Run Diagnostics</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Website Diagnostics</h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="mb-6">
          {isRunningDiagnostics ? (
            <div className="flex flex-col items-center justify-center py-4">
              <svg className="animate-spin h-8 w-8 text-blue-600 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-gray-600">Running diagnostics...</p>
            </div>
          ) : diagnosticResults ? (
            <div>
              <div className="mb-4">
                <h3 className="font-semibold text-gray-700 mb-2">Browser Extensions</h3>
                {diagnosticResults.problematicExtensions.length > 0 ? (
                  <div>
                    <p className="text-yellow-600 mb-2">We detected potentially problematic browser extensions:</p>
                    <ul className="list-disc pl-5 mb-2">
                      {diagnosticResults.problematicExtensions.map((ext, index) => (
                        <li key={index} className="text-gray-600">{ext}</li>
                      ))}
                    </ul>
                    <p className="text-sm text-gray-500">Try disabling these extensions temporarily.</p>
                  </div>
                ) : (
                  <p className="text-green-600">No problematic browser extensions detected.</p>
                )}
              </div>
              
              <div className="mb-4">
                <h3 className="font-semibold text-gray-700 mb-2">Browsing Mode</h3>
                {diagnosticResults.isPrivateMode ? (
                  <p className="text-blue-600">You're using private/incognito browsing mode, which is good for testing.</p>
                ) : (
                  <p className="text-gray-600">You're using normal browsing mode. If issues persist, try private/incognito mode.</p>
                )}
              </div>
              
              <div className="mb-4">
                <h3 className="font-semibold text-gray-700 mb-2">Recommendations</h3>
                <div className="bg-gray-50 p-3 rounded-md text-gray-700 whitespace-pre-line">
                  {diagnosticResults.recommendations}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-600">Unable to run diagnostics. Please try again.</p>
          )}
        </div>
        
        <div className="flex flex-col space-y-2">
          <button
            onClick={runDiagnosticsCheck}
            className="w-full py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors duration-200"
            disabled={isRunningDiagnostics}
          >
            Run Diagnostics Again
          </button>
          
          <button
            onClick={handleEmergencyReset}
            className="w-full py-2 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 transition-colors duration-200"
          >
            Emergency Reset
          </button>
          
          <button
            onClick={handleClose}
            className="w-full py-2 bg-gray-200 text-gray-800 font-medium rounded-md hover:bg-gray-300 transition-colors duration-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
} 