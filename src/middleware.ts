import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Get the response
  const response = NextResponse.next();
  
  // Add Content Security Policy headers
  response.headers.set(
    'Content-Security-Policy',
    `
      default-src 'self';
      script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://*.firebaseio.com https://*.googleapis.com;
      style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.zip.co https://*.linkedin.com;
      font-src 'self' https://fonts.gstatic.com data: https://*.zip.co https://*.linkedin.com;
      img-src 'self' data: https://*.googleapis.com https://*.gstatic.com https://*.firebaseio.com https://*.firebase.com https://*.linkedin.com https://*.licdn.com;
      connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://*.firebase.com https://*.replicate.com https://*.anthropic.com https://*.openai.com https://*.deepgram.com https://*.linkedin.com https://api.linkedin.com;
      frame-src 'self' https://*.firebaseio.com https://*.firebase.com https://*.linkedin.com;
      object-src 'none';
      base-uri 'self';
      form-action 'self';
      frame-ancestors 'self';
      block-all-mixed-content;
      upgrade-insecure-requests;
    `.replace(/\s+/g, ' ').trim()
  );
  
  return response;
}

// Only apply middleware to API routes and pages, not to static files
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}; 