import { getUserProfile } from '@/lib/firebase/firebaseUtils';
import { getAllEvents, Event, getEvent as getEventFromFirebase } from '@/lib/firebase/eventUtils';

interface UserProfile {
  displayName: string;
  email: string;
  company: string;
  title: string;
  bio?: string;
  website?: string;
  twitter?: string;
  interests: string[];
  photoURL?: string;
  isVerified?: boolean;
  verifiedAt?: string;
  industry?: string;
}

interface MatchScore {
  userId: string;
  score: number;
  matchReasons: string[];
  profile: UserProfile;
}

interface EventMatchScore {
  eventId: string;
  score: number;
  matchReasons: string[];
  event: Event;
}

// Mock user profiles for development and testing
interface MockUser {
  id: string;
  name: string;
  title: string;
  company: string;
  industry?: string;
  interests: string[];
  skills?: string[];
  lookingFor?: string[];
  events?: string[];
  connections?: string[];
  photoURL?: string;
  bio?: string;
  isVerified?: boolean;
  verifiedAt?: string;
}

// Mock user data
const mockUsers: MockUser[] = [
  {
    id: 'user1',
    name: 'John Smith',
    title: 'Software Engineer',
    company: 'TechCorp',
    industry: 'Technology',
    interests: ['AI', 'Machine Learning', 'Web Development', 'Hiking'],
    skills: ['JavaScript', 'Python', 'React', 'Node.js'],
    lookingFor: ['Job Opportunities', 'Mentorship', 'Networking'],
    events: ['Tech Conference 2023', 'AI Summit', 'Local Hackathon'],
    connections: ['user3', 'user5'],
    bio: 'Passionate software engineer with 5+ years of experience in web development and AI.',
    isVerified: true,
    verifiedAt: '2023-06-01T12:00:00Z'
  },
  {
    id: 'user2',
    name: 'Sarah Johnson',
    title: 'Marketing Director',
    company: 'CreativeAgency',
    industry: 'Marketing',
    interests: ['Digital Marketing', 'Content Strategy', 'Social Media', 'Travel'],
    skills: ['SEO', 'Content Creation', 'Analytics', 'Campaign Management'],
    lookingFor: ['Partnerships', 'Networking', 'Industry Insights'],
    events: ['Marketing Summit', 'Digital Innovation Conference'],
    connections: ['user4', 'user7'],
    bio: 'Marketing professional specializing in digital strategy and brand development.',
    isVerified: true,
    verifiedAt: '2023-07-15T09:30:00Z'
  },
  {
    id: 'user3',
    name: 'Michael Brown',
    title: 'Product Manager',
    company: 'StartupInc',
    industry: 'Technology',
    interests: ['Product Development', 'UX Design', 'AI', 'Basketball'],
    skills: ['Agile Methodology', 'User Research', 'Roadmapping', 'Stakeholder Management'],
    lookingFor: ['Talent Recruitment', 'Partnerships', 'Mentorship'],
    events: ['Product Management Summit', 'Tech Conference 2023'],
    connections: ['user1', 'user6'],
    bio: 'Product manager focused on building user-centric solutions that solve real problems.',
    isVerified: false
  }
];

/**
 * Calculate similarity between two arrays of interests
 * @param userInterests User's interests
 * @param otherInterests Other user's interests
 * @returns Similarity score between 0 and 1
 */
const calculateInterestSimilarity = (userInterests: string[], otherInterests: string[]): number => {
  if (userInterests.length === 0 || otherInterests.length === 0) return 0;
  
  // Count matching interests
  const matchingInterests = userInterests.filter(interest => 
    otherInterests.some(otherInterest => 
      otherInterest.toLowerCase() === interest.toLowerCase()
    )
  );
  
  // Calculate Jaccard similarity (intersection over union)
  const union = new Set([...userInterests, ...otherInterests]);
  return matchingInterests.length / union.size;
};

/**
 * Calculate similarity between two job titles
 * @param userTitle User's job title
 * @param otherTitle Other user's job title
 * @returns Similarity score between 0 and 1
 */
const calculateTitleSimilarity = (userTitle: string, otherTitle: string): number => {
  if (!userTitle || !otherTitle) return 0;
  
  const userTitleLower = userTitle.toLowerCase();
  const otherTitleLower = otherTitle.toLowerCase();
  
  // Check for exact match
  if (userTitleLower === otherTitleLower) return 1;
  
  // Check for partial matches
  const userWords = userTitleLower.split(/\s+/);
  const otherWords = otherTitleLower.split(/\s+/);
  
  // Count matching words
  const matchingWords = userWords.filter(word => 
    otherWords.some(otherWord => otherWord === word)
  );
  
  // Calculate word similarity
  const totalUniqueWords = new Set([...userWords, ...otherWords]).size;
  return matchingWords.length / totalUniqueWords;
};

/**
 * Calculate similarity between two companies
 * @param userCompany User's company
 * @param otherCompany Other user's company
 * @returns Similarity score between 0 and 1
 */
const calculateCompanySimilarity = (userCompany: string, otherCompany: string): number => {
  if (!userCompany || !otherCompany) return 0;
  
  // Check for exact match
  if (userCompany.toLowerCase() === otherCompany.toLowerCase()) return 1;
  
  // For now, just return 0 for different companies
  // Could be enhanced with company industry data or other factors
  return 0;
};

/**
 * Calculate similarity between two industries
 * @param industry1 First industry
 * @param industry2 Second industry
 * @returns Similarity score between 0 and 1
 */
export const calculateIndustrySimilarity = (
  industry1: string,
  industry2: string
): number => {
  // Exact match
  if (industry1.toLowerCase() === industry2.toLowerCase()) {
    return 1.0;
  }
  
  // Define related industry groups
  const industryGroups: { [key: string]: string[] } = {
    'technology': ['software', 'information technology', 'computer', 'tech', 'it services', 'internet', 'saas'],
    'finance': ['banking', 'financial services', 'investment', 'insurance', 'fintech'],
    'healthcare': ['medical', 'health', 'pharmaceutical', 'biotech', 'life sciences'],
    'education': ['academic', 'teaching', 'e-learning', 'edtech'],
    'marketing': ['advertising', 'media', 'public relations', 'digital marketing'],
    'manufacturing': ['industrial', 'production', 'engineering', 'automotive'],
    'retail': ['e-commerce', 'consumer goods', 'shopping', 'merchandising'],
    'consulting': ['professional services', 'business services', 'management consulting'],
    'hospitality': ['travel', 'tourism', 'hotel', 'restaurant', 'food service'],
    'real estate': ['property', 'construction', 'architecture', 'building']
  };
  
  // Check if industries are in the same group
  const industry1Lower = industry1.toLowerCase();
  const industry2Lower = industry2.toLowerCase();
  
  for (const [_, industries] of Object.entries(industryGroups)) {
    const industry1InGroup = industries.some(ind => industry1Lower.includes(ind));
    const industry2InGroup = industries.some(ind => industry2Lower.includes(ind));
    
    if (industry1InGroup && industry2InGroup) {
      return 0.8; // High similarity for related industries
    }
  }
  
  // Check for partial matches (one industry name contains the other)
  if (industry1Lower.includes(industry2Lower) || industry2Lower.includes(industry1Lower)) {
    return 0.6;
  }
  
  // No match
  return 0;
};

/**
 * Find potential matches for a user based on their profile
 * @param userId The user ID to find matches for
 * @param limit Maximum number of matches to return
 * @returns Array of potential matches with scores
 */
export const findUserMatches = async (
  userId: string, 
  limit: number = 10
): Promise<MatchScore[]> => {
  try {
    console.log(`Finding matches for user ${userId}`);
    
    // Get the user's profile
    const userProfile = await getUserProfile(userId);
    
    if (!userProfile) {
      console.error('User profile not found');
      return [];
    }
    
    console.log('User profile for matchmaking:', userProfile);
    
    // For development/testing, use mock users
    // In production, this would fetch real users from the database
    const otherUsers = mockUsers.filter(user => user.id !== userId);
    
    // Calculate match scores for each user
    const matchScores: MatchScore[] = await Promise.all(
      otherUsers.map(async (otherUser) => {
        // Convert mock user to UserProfile format
        const otherUserProfile: UserProfile = {
          displayName: otherUser.name,
          email: otherUser.id + '@example.com',
          company: otherUser.company,
          title: otherUser.title,
          bio: otherUser.bio,
          interests: otherUser.interests,
          photoURL: otherUser.photoURL,
          isVerified: otherUser.isVerified,
          verifiedAt: otherUser.verifiedAt
        };
        
        // Calculate various similarity scores
        const interestSimilarity = calculateInterestSimilarity(
          userProfile.interests || [], 
          otherUser.interests
        );
        
        const titleSimilarity = calculateTitleSimilarity(
          userProfile.title || '', 
          otherUser.title
        );
        
        const companySimilarity = calculateCompanySimilarity(
          userProfile.company || '', 
          otherUser.company
        );
        
        // Calculate industry similarity if available
        let industrySimilarity = 0;
        if ((userProfile as any).industry && (otherUser as any).industry) {
          industrySimilarity = calculateIndustrySimilarity(
            (userProfile as any).industry,
            (otherUser as any).industry
          );
        }
        
        // Verification bonus
        let verificationBonus = 0;
        if (userProfile.isVerified && otherUser.isVerified) {
          verificationBonus = 0.15; // Both users are verified
        } else if (userProfile.isVerified || otherUser.isVerified) {
          verificationBonus = 0.05; // At least one user is verified
        }
        
        // Calculate overall match score (weighted average of similarities)
        const weights = {
          interest: 0.4,
          title: 0.2,
          company: 0.1,
          industry: 0.1,
          verification: 0.2
        };
        
        const score = (
          interestSimilarity * weights.interest +
          titleSimilarity * weights.title +
          companySimilarity * weights.company +
          industrySimilarity * weights.industry +
          verificationBonus * weights.verification
        );
        
        // Generate match reasons
        const matchReasons: string[] = [];
        
        if (interestSimilarity > 0) {
          const sharedInterests = userProfile.interests.filter(interest => 
            otherUser.interests.includes(interest)
          );
          matchReasons.push(`You have ${sharedInterests.length} shared interests: ${sharedInterests.join(', ')}`);
        }
        
        if (titleSimilarity > 0.5) {
          matchReasons.push(`Similar job roles: ${userProfile.title} and ${otherUser.title}`);
        }
        
        if (companySimilarity > 0) {
          matchReasons.push(`You both work at the same company: ${otherUser.company}`);
        }
        
        if (industrySimilarity > 0) {
          matchReasons.push(`You both work in the ${(otherUser as any).industry || 'same'} industry`);
        }
        
        if (userProfile.isVerified && otherUser.isVerified) {
          matchReasons.push(`You are both verified users`);
        } else if (otherUser.isVerified) {
          matchReasons.push(`This user is verified`);
        }
        
        return {
          userId: otherUser.id,
          score,
          matchReasons,
          profile: otherUserProfile
        };
      })
    );
    
    // Sort by score (descending) and limit results
    return matchScores
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  } catch (error) {
    console.error('Error finding user matches:', error);
    return [];
  }
};

/**
 * Find event recommendations for a user based on their profile
 * @param userId The user ID to find event recommendations for
 * @param limit Maximum number of recommendations to return
 * @returns Array of recommended events with scores
 */
export const findEventRecommendations = async (
  userId: string,
  limit: number = 5
): Promise<EventMatchScore[]> => {
  try {
    // Get the user's profile
    const userProfile = await getUserProfile(userId);
    
    if (!userProfile) {
      throw new Error('User profile not found');
    }
    
    // Get all events
    const events = await getAllEvents();
    
    // Calculate match scores for each event
    const recommendations: EventMatchScore[] = events.map(event => {
      const matchReasons: string[] = [];
      let score = 0;
      
      // Check if event category matches user interests (50% weight)
      const categoryMatch = userProfile.interests.some(
        interest => event.category.toLowerCase() === interest.toLowerCase()
      );
      
      if (categoryMatch) {
        score += 0.5;
        matchReasons.push(`Event category (${event.category}) matches your interests`);
      }
      
      // Check for interest keywords in event title and description (30% weight)
      const eventText = `${event.title} ${event.description}`.toLowerCase();
      const matchingInterests = userProfile.interests.filter(interest => 
        eventText.includes(interest.toLowerCase())
      );
      
      if (matchingInterests.length > 0) {
        const interestScore = Math.min(matchingInterests.length / userProfile.interests.length, 1) * 0.3;
        score += interestScore;
        matchReasons.push(`Event mentions topics you're interested in: ${matchingInterests.join(', ')}`);
      }
      
      // Check if the event is organized by the user's company (20% weight)
      const companyMatch = event.organizer.toLowerCase().includes(userProfile.company.toLowerCase());
      
      if (companyMatch) {
        score += 0.2;
        matchReasons.push(`Event is organized by your company or a related organization`);
      }
      
      return {
        eventId: event.id,
        score,
        matchReasons,
        event
      };
    });
    
    // Sort by score (descending) and limit results
    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    
  } catch (error) {
    console.error('Error finding event recommendations:', error);
    throw error;
  }
};

/**
 * Find potential networking connections at a specific event
 * @param userId The user ID to find connections for
 * @param eventId The event ID
 * @param limit Maximum number of connections to return
 * @returns Array of potential connections with scores
 */
export const findEventConnections = async (
  userId: string,
  eventId: string,
  limit: number = 5
): Promise<MatchScore[]> => {
  try {
    // Get the user's profile
    const userProfile = await getUserProfile(userId);
    
    if (!userProfile) {
      throw new Error('User profile not found');
    }
    
    // Get the event
    const event = await getEvent(eventId);
    
    if (!event) {
      throw new Error('Event not found');
    }
    
    // Get all attendees for the event
    // In a real app, this would be a database query
    const attendees: { id: string; profile: UserProfile }[] = [];
    
    // TODO: Replace with actual database query to get event attendees
    // This is a placeholder for demonstration
    
    // Filter out the current user
    const otherAttendees = attendees.filter(a => a.id !== userId);
    
    // Calculate match scores
    const connections: MatchScore[] = otherAttendees.map(({ id, profile }) => {
      const matchReasons: string[] = [];
      
      // Calculate interest similarity (50% weight)
      const interestSimilarity = calculateInterestSimilarity(
        userProfile.interests, 
        profile.interests
      );
      
      if (interestSimilarity > 0) {
        const matchingInterests = userProfile.interests.filter(interest => 
          profile.interests.includes(interest)
        );
        matchReasons.push(`${matchingInterests.length} shared interests: ${matchingInterests.join(', ')}`);
      }
      
      // Calculate title similarity (20% weight)
      const titleSimilarity = calculateTitleSimilarity(
        userProfile.title,
        profile.title
      );
      
      if (titleSimilarity > 0.5) {
        matchReasons.push(`Similar job roles: ${profile.title}`);
      }
      
      // Calculate company similarity (15% weight)
      const companySimilarity = calculateCompanySimilarity(
        userProfile.company,
        profile.company
      );
      
      if (companySimilarity > 0) {
        matchReasons.push(`Works at the same company: ${profile.company}`);
      }
      
      // Verification bonus (15% weight)
      let verificationBonus = 0;
      if (userProfile.isVerified && profile.isVerified) {
        verificationBonus = 1; // Both users are verified
        matchReasons.push(`Both of you are verified users`);
      } else if (profile.isVerified) {
        verificationBonus = 0.5; // Other user is verified
        matchReasons.push(`This user is verified`);
      }
      
      // Calculate weighted score
      const score = (
        interestSimilarity * 0.5 +
        titleSimilarity * 0.2 +
        companySimilarity * 0.15 +
        verificationBonus * 0.15
      );
      
      return {
        userId: id,
        score,
        matchReasons,
        profile
      };
    });
    
    // Sort by score (descending) and limit results
    return connections
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    
  } catch (error) {
    console.error('Error finding event connections:', error);
    throw error;
  }
};

// Helper function to get event by ID (fixed to avoid recursive call)
const getEvent = async (eventId: string): Promise<Event | null> => {
  try {
    return await getEventFromFirebase(eventId);
  } catch (error) {
    console.error('Error getting event:', error);
    return null;
  }
}; 