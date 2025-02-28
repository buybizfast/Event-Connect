import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';

// Function to get base URL
const getBaseUrl = () => {
  return process.env.NEXT_PUBLIC_BASE_URL || 'https://event-connect-git-main-mindfulelementsinc-gmailcoms-projects.vercel.app';
};

// Initiate direct token auth
export async function GET(request: NextRequest) {
  const EVENTBRITE_PRIVATE_TOKEN = process.env.EVENTBRITE_PRIVATE_TOKEN;
  
  if (!EVENTBRITE_PRIVATE_TOKEN) {
    console.error('Eventbrite Private Token is not configured');
    return NextResponse.redirect(
      `${getBaseUrl()}/profile?eventbrite_error=Eventbrite%20configuration%20error`
    );
  }

  try {
    // Get user ID from cookies
    const userId = cookies().get('userId')?.value;
    if (!userId) {
      return NextResponse.redirect(
        `${getBaseUrl()}/profile?eventbrite_error=User%20not%20authenticated`
      );
    }

    // Get organization ID
    const orgResponse = await fetch('https://www.eventbriteapi.com/v3/users/me/organizations', {
      headers: {
        'Authorization': `Bearer ${EVENTBRITE_PRIVATE_TOKEN}`,
      },
    });

    if (!orgResponse.ok) {
      console.error('Failed to fetch organization:', await orgResponse.text());
      return NextResponse.redirect(
        `${getBaseUrl()}/profile?eventbrite_error=Failed%20to%20fetch%20organization`
      );
    }

    const orgData = await orgResponse.json();
    const organizationId = orgData.organizations?.[0]?.id;

    // Store the token in Firestore
    await setDoc(doc(db, 'users', userId), {
      eventbriteToken: EVENTBRITE_PRIVATE_TOKEN,
      eventbriteTokenExpiry: Date.now() + (365 * 24 * 60 * 60 * 1000), // 1 year expiry
      eventbriteOrganizationId: organizationId,
    }, { merge: true });

    // Redirect back to profile with success
    return NextResponse.redirect(
      `${getBaseUrl()}/profile?eventbrite_connected=true`
    );
  } catch (error) {
    console.error('Error in auth:', error);
    return NextResponse.redirect(
      `${getBaseUrl()}/profile?eventbrite_error=Internal%20server%20error`
    );
  }
} 