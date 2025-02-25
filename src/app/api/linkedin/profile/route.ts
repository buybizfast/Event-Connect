import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';

export async function GET(request: NextRequest) {
  try {
    // Get the user ID from the query parameters or cookies
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId') || cookies().get('uid')?.value;
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    console.log('Checking LinkedIn verification status for user:', userId);
    
    // Get the user document from Firestore
    try {
      const userDoc = doc(db, 'users', userId);
      const userSnapshot = await getDoc(userDoc);
      
      if (userSnapshot.exists()) {
        const userData = userSnapshot.data();
        console.log('User data from Firestore:', userData);
        
        // Check if the user is verified
        const isVerified = userData.isVerified || false;
        const verifiedAt = userData.verifiedAt || null;
        
        return NextResponse.json({
          isVerified,
          verifiedAt
        });
      }
      
      // If no user document found
      console.log('No user document found for user:', userId);
      
      // Check if there's a pending verification cookie
      const pendingVerification = cookies().get('linkedin_pending_verification')?.value === 'true';
      if (pendingVerification) {
        console.log('Pending verification found for user:', userId);
        
        // Create a new user document with verification status
        try {
          const userDocRef = doc(db, 'users', userId);
          await setDoc(userDocRef, {
            uid: userId,
            isVerified: true,
            verifiedAt: new Date().toISOString(),
            // Add minimal required fields to avoid errors
            displayName: '',
            email: '',
            company: '',
            title: '',
            interests: []
          });
          console.log(`Successfully created user document with verification status for user: ${userId}`);
          
          // Clear the pending verification cookie
          cookies().set('linkedin_pending_verification', '', { maxAge: 0 });
          
          return NextResponse.json({ 
            isVerified: true,
            verifiedAt: new Date().toISOString()
          });
        } catch (error) {
          console.error('Error creating user document:', error);
        }
      }
      
      return NextResponse.json({ isVerified: false });
    } catch (error) {
      console.error('Error accessing Firestore:', error);
      return NextResponse.json({ isVerified: false });
    }
  } catch (error) {
    console.error('Error checking verification status:', error);
    return NextResponse.json({ error: 'Failed to check verification status' }, { status: 500 });
  }
} 