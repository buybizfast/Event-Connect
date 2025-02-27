import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Get the response
  const response = NextResponse.next();
  
  // Set Content Security Policy headers
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://accounts.google.com https://*.googleusercontent.com https://*.zip.co;
    child-src 'self' https://accounts.google.com;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.zip.co;
    font-src 'self' https://fonts.gstatic.com data: https://*.zip.co;
    img-src 'self' data: https://*.googleapis.com https://*.gstatic.com https://*.firebaseio.com https://*.firebase.com https://placehold.co https://i.pravatar.cc;
    connect-src 'self' https://*.googleapis.com https://*.google.com https://*.firebaseio.com https://*.firebase.com https://*.zip.co https://*.ai.com https://*.deepgram.com;
    frame-src 'self' https://*.firebaseio.com https://*.firebase.com;
    media-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    block-all-mixed-content;
    upgrade-insecure-requests;
  `.replace(/\s{2,}/g, ' ').trim();

  response.headers.set('Content-Security-Policy', cspHeader);
  
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