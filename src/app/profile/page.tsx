'use client';

import Navigation from '@/components/Navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { useState, useEffect } from 'react';
import { Camera, Building2, Briefcase, Mail, Globe, Twitter, Linkedin, User, RefreshCw, X, Plus, Shield } from 'lucide-react';
import ProtectedRoute from '@/components/client/ProtectedRoute';
import { getUserProfile, updateUserProfile } from '@/lib/firebase/firebaseUtils';
import { uploadProfileImage } from '@/lib/firebase/storageUtils';
import ProfileImageUpload from '@/components/ProfileImageUpload';
import Image from 'next/image';
import EventbriteIntegration from '@/components/EventbriteIntegration';
import LinkedInIntegration from '@/components/LinkedInIntegration';
import AccountConnections from '@/app/components/AccountConnections';
import { toast } from 'react-hot-toast';
import SkillsManager from '@/components/SkillsManager';
import ExperienceManager from '@/components/ExperienceManager';
import VerificationBadge from '@/components/VerificationBadge';

interface UserProfile {
  id?: string;
  displayName: string;
  email: string;
  company: string;
  title: string;
  bio?: string;
  website?: string;
  twitter?: string;
  linkedin?: string;
  interests: string[];
  photoURL?: string;
  skills?: string[];
  positions?: Array<{
    title: string;
    company: string;
    startDate: string;
    endDate?: string;
    description?: string;
  }>;
  isVerified?: boolean;
  linkedinProfile?: {
    id: string;
    firstName: string;
    lastName: string;
    name?: string;
    headline?: string;
    summary?: string;
    industry?: string;
    location?: string;
    positions?: Array<{
      title: string;
      company: string;
      startDate: string;
      endDate?: string;
      description?: string;
    }>;
    profilePicture?: string;
    profileUrl?: string;
    skills?: string[];
  };
}

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({
    displayName: '',
    email: '',
    company: '',
    title: '',
    interests: [],
    photoURL: '',
    skills: [],
    positions: []
  });
  const [newInterest, setNewInterest] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [isSaving, setIsSaving] = useState(false);

  const fetchUserProfile = async () => {
    if (user) {
      try {
        setLoading(true);
        // Try to get the user profile from Firestore
        const userProfile = await getUserProfile(user.uid);
        console.log('User profile from Firestore:', userProfile);
        
        // Also fetch LinkedIn profile data from the API
        try {
          // Add a timestamp to prevent caching
          const timestamp = new Date().getTime();
          const linkedinResponse = await fetch(`/api/linkedin/profile?userId=${user.uid}&t=${timestamp}`);
          if (linkedinResponse.ok) {
            const linkedinData = await linkedinResponse.json();
            console.log('Full LinkedIn data from API:', linkedinData);
            
            if (linkedinData.profile) {
              console.log('LinkedIn profile fetched from API:', linkedinData.profile);
              
              // If we have a profile from Firestore, merge the LinkedIn data
              if (userProfile) {
                // Update the linkedinProfile with the latest data from the API
                userProfile.linkedinProfile = linkedinData.profile;
                
                // Update the LinkedIn URL if needed
                if (linkedinData.profile.profileUrl) {
                  userProfile.linkedin = linkedinData.profile.profileUrl;
                }
                
                // Update user profile fields from LinkedIn data if they are empty
                if (!userProfile.company && linkedinData.profile.positions && linkedinData.profile.positions.length > 0) {
                  userProfile.company = linkedinData.profile.positions[0].company;
                }
                
                if (!userProfile.title && linkedinData.profile.headline) {
                  userProfile.title = linkedinData.profile.headline;
                }
                
                if (!userProfile.bio && linkedinData.profile.summary) {
                  userProfile.bio = linkedinData.profile.summary;
                }
              }
            }
          }
        } catch (linkedinError) {
          console.error('Error fetching LinkedIn profile from API:', linkedinError);
        }
        
        if (userProfile) {
          setProfile({
            displayName: userProfile.displayName || user.displayName || '',
            email: userProfile.email || user.email || '',
            company: userProfile.company || '',
            title: userProfile.title || '',
            bio: userProfile.bio || '',
            website: userProfile.website || '',
            twitter: userProfile.twitter || '',
            linkedin: userProfile.linkedin || '',
            interests: userProfile.interests || [],
            photoURL: userProfile.photoURL || user.photoURL || '',
            linkedinProfile: userProfile.linkedinProfile || undefined,
            skills: userProfile.skills || [],
            positions: userProfile.positions || [],
            isVerified: userProfile.isVerified
          });
        } else {
          // If no profile exists, use the Firebase auth user data
          setProfile({
            displayName: user.displayName || '',
            email: user.email || '',
            company: '',
            title: '',
            interests: [],
            photoURL: user.photoURL || '',
            linkedinProfile: undefined,
            skills: [],
            positions: [],
            isVerified: false
          });
        }
      } catch (err) {
        console.error('Error fetching user profile:', err);
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    }
  };
  
  // Check for LinkedIn verification success in URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('linkedin_connected') === 'true') {
      // If we have a successful LinkedIn connection, refresh the profile
      // after a short delay to ensure the database has been updated
      setTimeout(() => {
        fetchUserProfile();
      }, 1500);
      
      // Clean up URL parameters
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, []);
  
  useEffect(() => {
    fetchUserProfile();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    try {
      setIsSaving(true);
      
      let photoURL = profile.photoURL;
      
      // If there's a new profile image, upload it first
      if (profileImage) {
        setUploadingImage(true);
        photoURL = await uploadProfileImage(user.uid, profileImage);
        setUploadingImage(false);
      }
      
      // Ensure LinkedIn profile data is complete if it exists
      if (profile.linkedinProfile) {
        // Make sure LinkedIn URL is set correctly
        if (!profile.linkedin && profile.linkedinProfile.profileUrl) {
          profile.linkedin = profile.linkedinProfile.profileUrl;
        } else if (!profile.linkedin && profile.linkedinProfile.id) {
          profile.linkedin = `https://www.linkedin.com/in/${profile.linkedinProfile.id}`;
        }
      }
      
      // Create a profile object without ID
      const profileData = {
        ...profile,
        photoURL,
        skills: profile.skills || [],
        positions: profile.positions || []
      };
      
      // Update the profile in Firestore
      await updateUserProfile(user.uid, profileData);
      
      // Update the Firebase Auth profile
      await updateProfile({
        displayName: profile.displayName,
        photoURL
      });
      
      setIsEditing(false);
      toast.success('Profile updated successfully');
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const addInterest = () => {
    if (newInterest.trim() && !profile.interests.includes(newInterest.trim())) {
      setProfile({
        ...profile,
        interests: [...profile.interests, newInterest.trim()]
      });
      setNewInterest('');
    }
  };

  const removeInterest = (interest: string) => {
    setProfile({
      ...profile,
      interests: profile.interests.filter(i => i !== interest)
    });
  };

  const handleImageChange = (file: File | null) => {
    setProfileImage(file);
  };

  // Check if we're on the profile page with integrations query param
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('eventbrite_connected') === 'true' || urlParams.get('eventbrite_error')) {
        setActiveTab('integrations');
      }
      if (urlParams.get('linkedin_connected') === 'true' || urlParams.get('linkedin_error')) {
        setActiveTab('integrations');
      }
      
      // If import_profile is true, trigger the LinkedIn integration component
      if (urlParams.get('import_profile') === 'true' && urlParams.get('linkedin_connected') === 'true') {
        // Remove the query parameters to prevent repeated imports
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
        
        // Reload the page after a short delay to trigger the LinkedIn integration component
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    }
  }, []);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Profile Information</h3>
                  <p className="mt-1 max-w-2xl text-sm text-gray-500">Personal details and preferences.</p>
                </div>
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Edit Profile
                  </button>
                ) : (
                  <button
                    onClick={() => setIsEditing(false)}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Cancel
                  </button>
                )}
              </div>
              
              {error && (
                <div className="px-4 py-3 bg-red-50 text-red-700 border-t border-b border-red-200">
                  {error}
                </div>
              )}
              
              <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
                {loading ? (
                  <div className="flex justify-center">
                    <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
                  </div>
                ) : (
                  <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                      {/* Profile Image */}
                      <div className="sm:col-span-6 flex justify-center sm:justify-start">
                        <div className="relative">
                          <div className="h-24 w-24 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                            {profile.photoURL ? (
                              <Image 
                                src={profile.photoURL} 
                                alt={profile.displayName} 
                                width={96} 
                                height={96}
                                className="h-24 w-24 object-cover"
                              />
                            ) : (
                              <User className="h-12 w-12 text-gray-400" />
                            )}
                          </div>
                          {isEditing && (
                            <ProfileImageUpload
                              onImageSelected={handleImageChange}
                              className="absolute bottom-0 right-0 h-8 w-8 bg-white rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                            >
                              <Camera className="h-4 w-4 text-gray-500" />
                            </ProfileImageUpload>
                          )}
                        </div>
                      </div>
                      
                      {/* Display Name */}
                      <div className="sm:col-span-3">
                        <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">
                          Display Name
                        </label>
                        <div className="mt-1">
                          {isEditing ? (
                            <input
                              type="text"
                              name="displayName"
                              id="displayName"
                              value={profile.displayName}
                              onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            />
                          ) : (
                            <div className="flex items-center">
                              <p className="text-gray-900">{profile.displayName}</p>
                              {profile.isVerified && (
                                <VerificationBadge className="ml-2" />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Email */}
                      <div className="sm:col-span-3">
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                          Email
                        </label>
                        <div className="mt-1 flex items-center">
                          <Mail className="h-5 w-5 text-gray-400 mr-2" />
                          <p className="text-gray-900">{profile.email}</p>
                        </div>
                      </div>
                      
                      {/* Company */}
                      <div className="sm:col-span-3">
                        <label htmlFor="company" className="block text-sm font-medium text-gray-700">
                          Company
                        </label>
                        <div className="mt-1 flex items-center">
                          {isEditing ? (
                            <input
                              type="text"
                              name="company"
                              id="company"
                              value={profile.company}
                              onChange={(e) => setProfile({ ...profile, company: e.target.value })}
                              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            />
                          ) : (
                            <>
                              <Building2 className="h-5 w-5 text-gray-400 mr-2" />
                              <p className="text-gray-900">{profile.company || 'Not specified'}</p>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {/* Title */}
                      <div className="sm:col-span-3">
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                          Title
                        </label>
                        <div className="mt-1 flex items-center">
                          {isEditing ? (
                            <input
                              type="text"
                              name="title"
                              id="title"
                              value={profile.title}
                              onChange={(e) => setProfile({ ...profile, title: e.target.value })}
                              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            />
                          ) : (
                            <>
                              <Briefcase className="h-5 w-5 text-gray-400 mr-2" />
                              <p className="text-gray-900">{profile.title || 'Not specified'}</p>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {/* Bio */}
                      <div className="sm:col-span-6">
                        <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
                          Bio
                        </label>
                        <div className="mt-1">
                          {isEditing ? (
                            <textarea
                              id="bio"
                              name="bio"
                              rows={3}
                              value={profile.bio || ''}
                              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                              placeholder="Write a few sentences about yourself"
                            />
                          ) : (
                            <p className="text-gray-900">{profile.bio || 'No bio provided'}</p>
                          )}
                        </div>
                      </div>
                      
                      {/* Website */}
                      <div className="sm:col-span-3">
                        <label htmlFor="website" className="block text-sm font-medium text-gray-700">
                          Website
                        </label>
                        <div className="mt-1 flex items-center">
                          {isEditing ? (
                            <input
                              type="text"
                              name="website"
                              id="website"
                              value={profile.website || ''}
                              onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                              placeholder="https://example.com"
                            />
                          ) : (
                            <>
                              <Globe className="h-5 w-5 text-gray-400 mr-2" />
                              {profile.website ? (
                                <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                                  {profile.website}
                                </a>
                              ) : (
                                <p className="text-gray-500">Not specified</p>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      
                      {/* Twitter */}
                      <div className="sm:col-span-3">
                        <label htmlFor="twitter" className="block text-sm font-medium text-gray-700">
                          Twitter
                        </label>
                        <div className="mt-1 flex items-center">
                          {isEditing ? (
                            <input
                              type="text"
                              name="twitter"
                              id="twitter"
                              value={profile.twitter || ''}
                              onChange={(e) => setProfile({ ...profile, twitter: e.target.value })}
                              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                              placeholder="@username"
                            />
                          ) : (
                            <>
                              <Twitter className="h-5 w-5 text-gray-400 mr-2" />
                              {profile.twitter ? (
                                <a href={`https://twitter.com/${profile.twitter.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                                  {profile.twitter}
                                </a>
                              ) : (
                                <p className="text-gray-500">Not specified</p>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      
                      {/* LinkedIn */}
                      <div className="sm:col-span-3">
                        <label htmlFor="linkedin" className="block text-sm font-medium text-gray-700">
                          LinkedIn
                        </label>
                        <div className="mt-1 flex items-center">
                          {isEditing ? (
                            <input
                              type="text"
                              name="linkedin"
                              id="linkedin"
                              value={profile.linkedin || ''}
                              onChange={(e) => setProfile({ ...profile, linkedin: e.target.value })}
                              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                              placeholder="https://linkedin.com/in/username"
                            />
                          ) : (
                            <>
                              <Linkedin className="h-5 w-5 text-gray-400 mr-2" />
                              {profile.linkedin ? (
                                <a href={profile.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                                  {profile.linkedin}
                                </a>
                              ) : (
                                <p className="text-gray-500">Not specified</p>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      
                      {/* Skills Section */}
                      <div className="sm:col-span-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Skills
                        </label>
                        {isEditing ? (
                          <div className="mt-1">
                            <p className="text-sm text-gray-500 mb-4">
                              Add skills that showcase your expertise. These will be used for matchmaking and recommendations.
                            </p>
                            <SkillsManager 
                              skills={profile.skills || []} 
                              onChange={(skills) => setProfile({ ...profile, skills })} 
                            />
                          </div>
                        ) : (
                          <div className="mt-1">
                            {profile.skills && profile.skills.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {profile.skills.map((skill, index) => (
                                  <span 
                                    key={index} 
                                    className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                                  >
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="text-gray-500">No skills specified</p>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Work Experience Section */}
                      <div className="sm:col-span-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Work Experience
                        </label>
                        {isEditing ? (
                          <div className="mt-1">
                            <p className="text-sm text-gray-500 mb-4">
                              Add your work experience to help others understand your background and expertise.
                            </p>
                            <ExperienceManager 
                              positions={profile.positions || []} 
                              onChange={(positions) => setProfile({ ...profile, positions })} 
                            />
                          </div>
                        ) : (
                          <div className="mt-1">
                            {profile.positions && profile.positions.length > 0 ? (
                              <div className="space-y-4">
                                {profile.positions.map((position, index) => (
                                  <div key={index} className="border-b border-gray-200 pb-4 last:border-b-0">
                                    <h4 className="font-medium text-gray-900">{position.title}</h4>
                                    <p className="text-gray-600">{position.company}</p>
                                    <p className="text-sm text-gray-500">
                                      {position.startDate} {position.endDate ? `- ${position.endDate}` : '- Present'}
                                    </p>
                                    {position.description && (
                                      <p className="mt-2 text-gray-700">{position.description}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-gray-500">No work experience specified</p>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Interests */}
                      <div className="sm:col-span-6">
                        <label htmlFor="interests" className="block text-sm font-medium text-gray-700">
                          Interests
                        </label>
                        <div className="mt-1">
                          {isEditing ? (
                            <div>
                              <div className="flex flex-wrap gap-2 mb-2">
                                {profile.interests.map((interest, index) => (
                                  <div 
                                    key={index} 
                                    className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full flex items-center text-sm"
                                  >
                                    <span>{interest}</span>
                                    <button 
                                      onClick={() => removeInterest(interest)}
                                      className="ml-2 text-blue-600 hover:text-blue-800"
                                    >
                                      <X size={14} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                              <div className="flex">
                                <input
                                  type="text"
                                  value={newInterest}
                                  onChange={(e) => setNewInterest(e.target.value)}
                                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addInterest())}
                                  placeholder="Add an interest"
                                  className="flex-grow px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <button
                                  onClick={addInterest}
                                  className="bg-blue-600 text-white px-4 py-2 rounded-r-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                >
                                  <Plus size={20} />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {profile.interests.length > 0 ? (
                                profile.interests.map((interest, index) => (
                                  <span 
                                    key={index} 
                                    className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                                  >
                                    {interest}
                                  </span>
                                ))
                              ) : (
                                <p className="text-gray-500">No interests specified</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {isEditing && (
                      <div className="mt-6 flex justify-end">
                        <button
                          type="submit"
                          disabled={isSaving || uploadingImage}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          {(isSaving || uploadingImage) ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : 'Save'}
                        </button>
                      </div>
                    )}
                  </form>
                )}
              </div>
            </div>
            
            {/* Tabs for additional sections */}
            <div className="mt-6">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                  <button
                    onClick={() => setActiveTab('profile')}
                    className={`${
                      activeTab === 'profile'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                  >
                    Profile
                  </button>
                  <button
                    onClick={() => setActiveTab('connections')}
                    className={`${
                      activeTab === 'connections'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                  >
                    Connections
                  </button>
                </nav>
              </div>
              
              {activeTab === 'connections' && (
                <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <LinkedInIntegration />
                  <EventbriteIntegration />
                </div>
              )}
            </div>

            {/* Add a verification status section in the profile */}
            <div className="sm:col-span-6 mt-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Verification Status</h3>
              </div>
              <div className="mt-2 p-4 bg-gray-50 rounded-md">
                {profile.isVerified ? (
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <VerificationBadge size="lg" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Your account is verified</p>
                      <p className="text-sm text-gray-500">
                        Your LinkedIn verification is active. This verification badge will be displayed on your profile and in events.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 text-gray-400">
                      <Shield className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Your account is not verified</p>
                      <p className="text-sm text-gray-500">
                        Verify your account with LinkedIn to receive a verification badge on your profile.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
} 