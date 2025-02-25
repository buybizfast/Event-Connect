'use client';

import { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Share2, X } from 'lucide-react';
import Image from 'next/image';

interface EventQRCodeProps {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventImage?: string;
  onClose: () => void;
}

export default function EventQRCode({
  eventId,
  eventTitle,
  eventDate,
  eventImage,
  onClose
}: EventQRCodeProps) {
  const [copied, setCopied] = useState(false);
  const qrCodeRef = useRef<HTMLDivElement>(null);
  
  // Generate the event URL for registration
  const eventUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/events/${eventId}`
    : `/events/${eventId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(eventUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!qrCodeRef.current) return;
    
    const svgElement = qrCodeRef.current.querySelector('svg');
    if (!svgElement) return;
    
    // Create a canvas element
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas dimensions
    const size = 256;
    canvas.width = size;
    canvas.height = size;
    
    // Create an image from the SVG
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    
    // Use the image constructor in a way that TypeScript understands
    const img = document.createElement('img');
    
    img.onload = () => {
      // Draw the image on the canvas
      ctx.drawImage(img, 0, 0);
      
      // Convert canvas to data URL and trigger download
      const pngUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = `event-qr-${eventId}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(url);
    };
    
    img.src = url;
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: eventTitle,
          text: `Join me at ${eventTitle} on ${eventDate}`,
          url: eventUrl,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Event QR Code</h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-6">
          <div className="flex flex-col items-center">
            {eventImage && (
              <div className="mb-4 w-16 h-16 rounded-full overflow-hidden">
                <Image 
                  src={eventImage} 
                  alt={eventTitle}
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            <h4 className="text-base font-medium text-gray-900 mb-1 text-center">{eventTitle}</h4>
            <p className="text-sm text-gray-500 mb-4">{eventDate}</p>
            
            <div className="bg-white p-2 rounded-lg shadow-sm mb-4" ref={qrCodeRef}>
              <QRCodeSVG
                value={eventUrl}
                size={200}
                level="H" // High error correction capability
                includeMargin={true}
                imageSettings={{
                  src: '/logo.png',
                  x: undefined,
                  y: undefined,
                  height: 24,
                  width: 24,
                  excavate: true,
                }}
              />
            </div>
            
            <p className="text-xs text-gray-500 mb-4 text-center">
              Scan this QR code to register for the event or share it with others
            </p>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={handleCopyLink}
              className="flex flex-col items-center justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <span className={`text-xs ${copied ? 'text-green-600' : 'text-gray-500'}`}>
                {copied ? 'Copied!' : 'Copy Link'}
              </span>
            </button>
            
            <button
              onClick={handleDownload}
              className="flex flex-col items-center justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Download className="h-4 w-4 mb-1 text-gray-500" />
              <span className="text-xs text-gray-500">Download</span>
            </button>
            
            <button
              onClick={handleShare}
              className="flex flex-col items-center justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Share2 className="h-4 w-4 mb-1 text-gray-500" />
              <span className="text-xs text-gray-500">Share</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 