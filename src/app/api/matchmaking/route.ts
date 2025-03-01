import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { findUserMatches } from '@/lib/ai/matchmaking';
import { getUserProfile } from '@/lib/firebase/firebaseUtils';
import { auth } from '@/lib/firebase/firebase';

// Mark this route as dynamic since it uses cookies
export const dynamic = 'force-dynamic';

// Define the UserProfile interface to match the one in firebaseUtils.ts
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
}

// Define a separate interface for mock users
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
  email?: string;
}

// Mock user profiles for demonstration
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
    email: 'john.smith@example.com',
    photoURL: 'https://example.com/john-smith.jpg',
    bio: 'Passionate about AI and machine learning'
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
    email: 'sarah.johnson@example.com',
    photoURL: 'https://example.com/sarah-johnson.jpg',
    bio: 'Experienced in digital marketing and content strategy'
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
    email: 'michael.brown@example.com',
    photoURL: 'https://example.com/michael-brown.jpg',
    bio: 'Product manager with a focus on user experience'
  },
  {
    id: 'user4',
    name: 'Emily Davis',
    title: 'Data Scientist',
    company: 'AnalyticsPro',
    industry: 'Technology',
    interests: ['Machine Learning', 'Data Visualization', 'Statistics', 'Reading'],
    skills: ['Python', 'R', 'TensorFlow', 'SQL'],
    lookingFor: ['Research Collaboration', 'Job Opportunities', 'Networking'],
    events: ['AI Summit', 'Data Science Conference'],
    connections: ['user2', 'user8'],
    email: 'emily.davis@example.com',
    photoURL: 'https://example.com/emily-davis.jpg',
    bio: 'Data scientist with a passion for machine learning'
  },
  {
    id: 'user5',
    name: 'David Wilson',
    title: 'Startup Founder',
    company: 'InnovateTech',
    industry: 'Technology',
    interests: ['Entrepreneurship', 'Venture Capital', 'AI', 'Cycling'],
    skills: ['Leadership', 'Fundraising', 'Business Strategy', 'Product Development'],
    lookingFor: ['Investment Opportunities', 'Partnerships', 'Mentorship'],
    events: ['Startup Summit', 'Venture Capital Forum', 'Tech Conference 2023'],
    connections: ['user1', 'user7'],
    email: 'david.wilson@example.com',
    photoURL: 'https://example.com/david-wilson.jpg',
    bio: 'Entrepreneur and startup founder'
  },
  {
    id: 'user6',
    name: 'Jessica Martinez',
    title: 'UX Designer',
    company: 'DesignStudio',
    industry: 'Design',
    interests: ['User Experience', 'Interface Design', 'Accessibility', 'Photography'],
    skills: ['Figma', 'Adobe XD', 'User Research', 'Prototyping'],
    lookingFor: ['Job Opportunities', 'Networking', 'Portfolio Feedback'],
    events: ['Design Conference', 'UX Workshop', 'Local Hackathon'],
    connections: ['user3', 'user8'],
    email: 'jessica.martinez@example.com',
    photoURL: 'https://example.com/jessica-martinez.jpg',
    bio: 'UX designer with a focus on accessibility and interface design'
  },
  {
    id: 'user7',
    name: 'Alex Thompson',
    title: 'Sales Director',
    company: 'GrowthCorp',
    industry: 'Sales',
    interests: ['B2B Sales', 'Negotiation', 'Business Development', 'Golf'],
    skills: ['Relationship Building', 'CRM', 'Sales Strategy', 'Presentation'],
    lookingFor: ['Partnerships', 'Networking', 'Industry Insights'],
    events: ['Sales Summit', 'Business Networking Event'],
    connections: ['user2', 'user5'],
    email: 'alex.thompson@example.com',
    photoURL: 'https://example.com/alex-thompson.jpg',
    bio: 'Sales director with a focus on relationship building'
  },
  {
    id: 'user8',
    name: 'Ryan Taylor',
    title: 'Frontend Developer',
    company: 'WebSolutions',
    industry: 'Technology',
    interests: ['Web Development', 'UI Design', 'JavaScript', 'Gaming'],
    skills: ['React', 'TypeScript', 'CSS', 'Responsive Design'],
    lookingFor: ['Job Opportunities', 'Mentorship', 'Skill Development'],
    events: ['Frontend Conference', 'JavaScript Meetup', 'Local Hackathon'],
    connections: ['user4', 'user6'],
    email: 'ryan.taylor@example.com',
    photoURL: 'https://example.com/ryan-taylor.jpg',
    bio: 'Frontend developer with a focus on responsive design'
  },
  {
    id: 'currentUser',
    name: 'Current User',
    title: 'Full Stack Developer',
    company: 'TechStartup',
    industry: 'Technology',
    interests: ['Web Development', 'AI', 'Open Source', 'Hiking'],
    skills: ['JavaScript', 'React', 'Node.js', 'Python'],
    lookingFor: ['Job Opportunities', 'Networking', 'Skill Development'],
    events: ['Tech Conference 2023', 'Local Hackathon', 'JavaScript Meetup'],
    connections: [],
    email: 'current.user@example.com',
    photoURL: 'https://example.com/current-user.jpg',
    bio: 'Full stack developer with a focus on web development'
  }
];

// Generate conversation starters based on shared interests and profiles
const generateConversationStarters = (
  userProfile: any,
  matchProfile: any,
  matchReasons: string[]
): string[] => {
  const starters: string[] = [];
  
  // Add starters based on match reasons
  if (matchReasons.length > 0) {
    // Use the first match reason to create a starter
    starters.push(`I noticed we both have an interest in ${matchReasons[0]}. What aspects of that do you find most interesting?`);
    
    // If there are multiple match reasons, use the second one too
    if (matchReasons.length > 1) {
      starters.push(`I see we also share an interest in ${matchReasons[1]}. Have you been involved with that for long?`);
    }
  }
  
  // Add general industry starter
  starters.push(`What brings you to this event/platform? Are you looking to expand your network in the industry?`);
  
  // Add career path starter
  starters.push(`I'm always interested in learning about different career paths. What led you to your current role at ${matchProfile.company}?`);
  
  return starters;
};

// GET /api/matchmaking?userId=X
export async function GET() {
  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    
    // For development, allow requests without authentication
    const DEV_MODE = true;
    
    if (!sessionCookie && !DEV_MODE) {
      return NextResponse.json(
        { error: 'Unauthorized: No session cookie found' },
        { status: 401 }
      );
    }
    
    // Get the user ID from the session cookie
    let userId: string;
    
    try {
      if (DEV_MODE && !sessionCookie) {
        // Use a mock user ID for development
        userId = 'user1'; // Use a valid mock user ID
      } else if (sessionCookie) {
        try {
          // This is a simplified approach - in production, use proper Firebase Admin verification
          const decodedToken = JSON.parse(atob(sessionCookie.split('.')[1]));
          userId = decodedToken.user_id || decodedToken.uid;
          
          if (!userId) {
            throw new Error('User ID not found in session');
          }
        } catch (decodeError) {
          console.error('Error decoding session:', decodeError);
          // Fallback to mock user ID in case of decoding error
          userId = 'user1';
        }
      } else {
        return NextResponse.json(
          { error: 'Unauthorized: No valid session' },
          { status: 401 }
        );
      }
      
      // Get user matches using our AI matchmaking algorithm
      const matches = await findUserMatches(userId);
      
      // Format the matches for the frontend
      const formattedMatches = matches.map(match => {
        // LinkedIn data has been removed
        
        // Create conversation starters
        const conversationStarters = generateConversationStarters(
          match.profile, 
          match.profile,
          match.matchReasons
        );
        
        // Format the match for the frontend
        return {
          id: match.userId,
          name: match.profile.displayName,
          title: match.profile.title || '',
          company: match.profile.company || '',
          bio: match.profile.bio || '',
          interests: match.profile.interests || [],
          email: match.profile.email,
          photoURL: match.profile.photoURL || null,
          score: match.score,
          matchReasons: match.matchReasons,
          conversationStarters
        };
      });
      
      return NextResponse.json({ matches: formattedMatches });
    } catch (error) {
      console.error('Error in matchmaking API:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Unexpected error in matchmaking API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 