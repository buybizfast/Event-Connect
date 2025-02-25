// Types for user profiles
export interface UserProfile {
  id: string;
  name: string;
  title?: string;
  company?: string;
  industry?: string;
  interests: string[];
  skills: string[];
  lookingFor: string[];
  events: string[];
  connections: string[];
  isVerified?: boolean;
  verifiedAt?: string;
}

// Calculate similarity score between two users
export function calculateSimilarityScore(user1: UserProfile, user2: UserProfile): number {
  let score = 0;
  
  // Industry match (high weight)
  if (user1.industry && user2.industry && user1.industry === user2.industry) {
    score += 30;
  }
  
  // Verification bonus - verified users get a small boost
  if (user1.isVerified && user2.isVerified) {
    score += 10; // Both users are verified
  } else if (user1.isVerified || user2.isVerified) {
    score += 5; // At least one user is verified
  }
  
  // Interest match (medium weight)
  const commonInterests = user1.interests.filter(interest => 
    user2.interests.includes(interest)
  );
  
  score += commonInterests.length * 10;
  
  // Skills match (medium weight)
  const commonSkills = user1.skills.filter(skill => 
    user2.skills.includes(skill)
  );
  
  score += commonSkills.length * 5;
  
  // Looking for match (medium weight)
  const commonLookingFor = user1.lookingFor.filter(item => 
    user2.lookingFor.includes(item)
  );
  
  score += commonLookingFor.length * 8;
  
  // Company match (low weight)
  if (user1.company && user2.company && user1.company === user2.company) {
    score += 15;
  }
  
  // Title similarity (low weight)
  if (user1.title && user2.title) {
    const titleSimilarity = calculateTitleSimilarity(user1.title, user2.title);
    score += titleSimilarity * 10;
  }
  
  return score;
}

// Helper function to calculate title similarity
function calculateTitleSimilarity(title1: string, title2: string): number {
  const title1Lower = title1.toLowerCase();
  const title2Lower = title2.toLowerCase();
  
  // Check for exact match
  if (title1Lower === title2Lower) {
    return 1;
  }
  
  // Check for partial matches
  const jobTitles = [
    ['developer', 'engineer', 'programmer', 'coder'],
    ['manager', 'director', 'lead', 'head'],
    ['designer', 'ux', 'ui', 'creative'],
    ['marketing', 'growth', 'brand'],
    ['sales', 'business development', 'account'],
    ['product', 'project'],
    ['data', 'analytics', 'scientist'],
    ['founder', 'ceo', 'cto', 'coo', 'cfo', 'chief']
  ];
  
  for (const group of jobTitles) {
    const inGroup1 = group.some(title => title1Lower.includes(title));
    const inGroup2 = group.some(title => title2Lower.includes(title));
    
    if (inGroup1 && inGroup2) {
      return 0.8;
    }
  }
  
  return 0;
}

// Get top matches for a user
export function getTopMatches(
  currentUser: UserProfile, 
  allUsers: UserProfile[], 
  limit: number = 5
): { user: UserProfile; score: number; matchReason: string }[] {
  const matches = allUsers
    .filter(user => user.id !== currentUser.id)
    .map(user => ({
      user,
      score: calculateSimilarityScore(currentUser, user),
      matchReason: generateMatchReason(currentUser, user)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  
  return matches;
}

// Generate a human-readable reason for the match
export function generateMatchReason(user1: UserProfile, user2: UserProfile): string {
  // Find common interests
  const commonInterests = user1.interests.filter(interest => 
    user2.interests.includes(interest)
  );
  
  // Find common skills
  const commonSkills = user1.skills.filter(skill => 
    user2.skills.includes(skill)
  );
  
  // Industry match
  if (user1.industry && user2.industry && user1.industry === user2.industry) {
    return `Both in the ${user1.industry} industry${commonInterests.length > 0 
      ? ` with shared interests in ${commonInterests.slice(0, 2).join(', ')}` 
      : ''}`;
  }
  
  // Verification status
  if (user1.isVerified && user2.isVerified) {
    return `Both verified users${commonInterests.length > 0 
      ? ` with shared interests in ${commonInterests.slice(0, 2).join(', ')}` 
      : ''}`;
  }
  
  // Company match
  if (user1.company && user2.company && user1.company === user2.company) {
    return `Both work at ${user1.company}${commonInterests.length > 0 
      ? ` with shared interests in ${commonInterests.slice(0, 2).join(', ')}` 
      : ''}`;
  }
  
  // Common interests
  if (commonInterests.length > 0) {
    return `Shared interests in ${commonInterests.slice(0, 3).join(', ')}`;
  }
  
  // Common skills
  if (commonSkills.length > 0) {
    return `Shared skills in ${commonSkills.slice(0, 3).join(', ')}`;
  }
  
  // Default reason
  return 'Potential networking opportunity';
}

// Generate conversation starters based on user profiles
export function generateConversationStarters(user1: UserProfile, user2: UserProfile): string[] {
  const starters: string[] = [];
  
  // Find common interests
  const commonInterests = user1.interests.filter(interest => 
    user2.interests.includes(interest)
  );
  
  // Industry-based starters
  if (user1.industry && user2.industry) {
    if (user1.industry === user2.industry) {
      starters.push(`I see we're both in the ${user2.industry} industry. What trends are you most excited about right now?`);
      starters.push(`How long have you been working in the ${user2.industry} industry?`);
    } else {
      starters.push(`I'm in ${user1.industry} and noticed you're in ${user2.industry}. Do you see any interesting overlaps between our industries?`);
    }
  }
  
  // Verification-based starters
  if (user2.isVerified) {
    starters.push(`I noticed you're a verified user. How has your experience been at this event so far?`);
  }
  
  // Title-based starters
  if (user2.title) {
    starters.push(`I see you're a ${user2.title}. What does your typical day look like?`);
    starters.push(`What's the most challenging part of being a ${user2.title}?`);
  }
  
  // Company-based starters
  if (user1.company && user2.company) {
    if (user1.company === user2.company) {
      starters.push(`I didn't realize we both work at ${user2.company}! Which department are you in?`);
    } else {
      starters.push(`How long have you been with ${user2.company}?`);
      starters.push(`What's it like working at ${user2.company}?`);
    }
  }
  
  // Interest-based starters
  if (commonInterests.length > 0) {
    commonInterests.forEach(interest => {
      starters.push(`I see we both share an interest in ${interest}. What got you interested in that?`);
    });
  }
  
  // Generic starters
  starters.push("What brings you to this event?");
  starters.push("Have you attended any interesting sessions so far?");
  starters.push("What's been your favorite part of the event so far?");
  starters.push("Are you local to the area or did you travel for this event?");
  
  // Shuffle and return a subset
  return shuffleArray(starters).slice(0, 5);
}

// Helper function to shuffle an array
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
} 