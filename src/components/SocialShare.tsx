'use client';

import { useState } from 'react';
import { Twitter, Facebook, Link, Check, X } from 'lucide-react';

interface SocialShareProps {
  title: string;
  description: string;
  url: string;
  onClose?: () => void;
}

export default function SocialShare({ title, description, url, onClose }: SocialShareProps) {
  const [copied, setCopied] = useState(false);

  const encodedTitle = encodeURIComponent(title);
  const encodedDescription = encodeURIComponent(description);
  const encodedUrl = encodeURIComponent(url);

  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  return (
    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 py-1">
      <div className="flex justify-between items-center px-4 py-2 border-b border-gray-100">
        <span className="text-sm font-medium text-gray-700">Share</span>
        {onClose && (
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2 mt-4">
        <a
          href={shareLinks.twitter}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Twitter className="w-4 h-4 mr-3 text-blue-400" />
          Twitter
        </a>
        <a
          href={shareLinks.facebook}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Facebook className="w-4 h-4 mr-3 text-blue-600" />
          Facebook
        </a>
        <button
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          onClick={copyToClipboard}
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 mr-3 text-green-500" />
              Copied!
            </>
          ) : (
            <>
              <Link className="w-4 h-4 mr-3 text-gray-500" />
              Copy URL
            </>
          )}
        </button>
      </div>
    </div>
  );
} 