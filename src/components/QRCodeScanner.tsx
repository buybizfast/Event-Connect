'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QRCodeScannerProps {
  onScan: (data: string) => void;
  onError?: (error: string) => void;
  width?: number;
  height?: number;
}

export default function QRCodeScanner({
  onScan,
  onError,
  width = 300,
  height = 300
}: QRCodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [hasCamera, setHasCamera] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if camera is available
    Html5Qrcode.getCameras()
      .then(devices => {
        setHasCamera(devices.length > 0);
      })
      .catch(err => {
        console.error('Error getting cameras', err);
        setHasCamera(false);
      });

    return () => {
      // Clean up scanner on unmount
      if (scannerRef.current && isScanning) {
        scannerRef.current.stop()
          .catch(err => console.error('Error stopping scanner:', err));
      }
    };
  }, [isScanning]);

  const startScanner = () => {
    if (!containerRef.current) return;
    
    const scannerId = 'qr-scanner';
    
    // Create scanner container if it doesn't exist
    if (!document.getElementById(scannerId)) {
      const scannerDiv = document.createElement('div');
      scannerDiv.id = scannerId;
      containerRef.current.appendChild(scannerDiv);
    }
    
    // Initialize scanner
    scannerRef.current = new Html5Qrcode(scannerId);
    
    // Start scanning
    scannerRef.current.start(
      { facingMode: 'environment' }, // Use back camera
      {
        fps: 10,
        qrbox: { width: width * 0.7, height: height * 0.7 },
      },
      (decodedText) => {
        // On successful scan
        onScan(decodedText);
        
        // Stop scanning after successful scan
        if (scannerRef.current) {
          scannerRef.current.stop()
            .then(() => {
              setIsScanning(false);
            })
            .catch(err => console.error('Error stopping scanner:', err));
        }
      },
      (errorMessage) => {
        // Ignore errors during scanning as they're usually just frames without QR codes
        // Only report critical errors
        if (errorMessage.includes('permission')) {
          setPermissionDenied(true);
          if (onError) onError(errorMessage);
        }
      }
    )
      .then(() => {
        setIsScanning(true);
        setPermissionDenied(false);
      })
      .catch(err => {
        console.error('Error starting scanner:', err);
        if (err.toString().includes('permission')) {
          setPermissionDenied(true);
        }
        if (onError) onError(err.toString());
      });
  };

  const stopScanner = () => {
    if (scannerRef.current && isScanning) {
      scannerRef.current.stop()
        .then(() => {
          setIsScanning(false);
        })
        .catch(err => console.error('Error stopping scanner:', err));
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div 
        ref={containerRef} 
        className="relative overflow-hidden rounded-lg bg-gray-100"
        style={{ width: `${width}px`, height: `${height}px` }}
      >
        {!hasCamera && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-500">
            <p>No camera detected</p>
          </div>
        )}
        
        {permissionDenied && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-500 p-4 text-center">
            <p>Camera permission denied. Please allow camera access to scan QR codes.</p>
          </div>
        )}
        
        {!isScanning && hasCamera && !permissionDenied && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-500">
            <p>Click Start to scan a QR code</p>
          </div>
        )}
      </div>
      
      <div className="mt-4 flex space-x-4">
        {!isScanning ? (
          <button
            onClick={startScanner}
            disabled={!hasCamera || permissionDenied}
            className={`px-4 py-2 rounded-md text-white ${
              !hasCamera || permissionDenied
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            Start Scanning
          </button>
        ) : (
          <button
            onClick={stopScanner}
            className="px-4 py-2 rounded-md text-white bg-red-600 hover:bg-red-700"
          >
            Stop Scanning
          </button>
        )}
      </div>
    </div>
  );
} 