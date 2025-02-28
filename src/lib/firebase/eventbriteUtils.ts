import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface EventbriteTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  organizationId?: string;
}

/**
 * Store Eventbrite tokens in Firestore for a user
 */
export const storeEventbriteTokens = async (userId: string, tokens: EventbriteTokens) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      eventbriteToken: tokens.accessToken,
      eventbriteRefreshToken: tokens.refreshToken,
      eventbriteTokenExpiry: Date.now() + (tokens.expiresIn * 1000),
      eventbriteOrganizationId: tokens.organizationId
    });
    return true;
  } catch (error) {
    console.error('Error storing Eventbrite tokens:', error);
    throw error;
  }
};

/**
 * Clear Eventbrite tokens from Firestore for a user
 */
export const clearEventbriteTokens = async (userId: string) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      eventbriteToken: null,
      eventbriteRefreshToken: null,
      eventbriteTokenExpiry: null,
      eventbriteOrganizationId: null
    });
    return true;
  } catch (error) {
    console.error('Error clearing Eventbrite tokens:', error);
    throw error;
  }
};

/**
 * Get Eventbrite tokens from Firestore for a user
 */
export const getEventbriteTokens = async (userId: string): Promise<EventbriteTokens | null> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return null;
    }
    
    const userData = userDoc.data();
    
    if (!userData.eventbriteToken || !userData.eventbriteRefreshToken) {
      return null;
    }
    
    return {
      accessToken: userData.eventbriteToken,
      refreshToken: userData.eventbriteRefreshToken,
      expiresIn: Math.floor((userData.eventbriteTokenExpiry - Date.now()) / 1000),
      organizationId: userData.eventbriteOrganizationId
    };
  } catch (error) {
    console.error('Error getting Eventbrite tokens:', error);
    throw error;
  }
};

/**
 * Check if Eventbrite tokens are valid and not expired
 */
export const isEventbriteTokenValid = async (userId: string): Promise<boolean> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return false;
    }
    
    const userData = userDoc.data();
    
    return !!(
      userData.eventbriteToken &&
      userData.eventbriteTokenExpiry &&
      userData.eventbriteTokenExpiry > Date.now()
    );
  } catch (error) {
    console.error('Error checking Eventbrite token validity:', error);
    return false;
  }
}; 