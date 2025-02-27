import { NextResponse } from 'next/server';

/**
 * Health check endpoint
 * 
 * This endpoint is used to check if the server is running and accessible.
 * It returns a 200 OK response with a simple JSON payload.
 */
export async function GET() {
  return NextResponse.json(
    { 
      status: 'ok',
      timestamp: Date.now(),
      environment: process.env.NODE_ENV || 'development'
    },
    { status: 200 }
  );
}

/**
 * Health check HEAD endpoint
 * 
 * This endpoint is used for lightweight health checks.
 * It returns a 200 OK response with no body.
 */
export async function HEAD() {
  return new Response(null, {
    status: 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
} 