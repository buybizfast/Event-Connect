'use client';

import Navigation from '@/components/Navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { useState, useEffect } from 'react';
import { Camera, Building2, Briefcase, Mail, Globe, Twitter, User, RefreshCw, X, Plus, Shield, CheckCircle, AlertCircle } from 'lucide-react';
import ProtectedRoute from '@/components/client/ProtectedRoute';
import { getUserProfile, updateUserProfile } from '@/lib/firebase/firebaseUtils';
import { uploadProfileImage } from '@/lib/firebase/storageUtils';
import ProfileImageUpload from '@/components/ProfileImageUpload';
import Image from 'next/image';
import EventbriteIntegration from '@/components/EventbriteIntegration';
import AccountConnections from '@/app/components/AccountConnections';
import { toast } from 'react-hot-toast';
import SkillsManager from '@/components/SkillsManager';
import ExperienceManager from '@/components/ExperienceManager';
import VerificationBadge from '@/components/VerificationBadge';

// Define the UserProfile interface
interface UserProfile {
  id?: string;
  displayName: string;
  email: string;
  company: string;
  title: string;
  bio?: string;
  website?: string;
  twitter?: string;
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
}

export default function ProfilePage() {
  const { user, updateProfile, isEmailVerified, resendVerificationEmail } = useAuth();
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
  const [isProfileFetched, setIsProfileFetched] = useState(false);
  const [sendingVerification, setSendingVerification] = useState(false);

  const fetchUserProfile = async () => {
    // Prevent duplicate fetches
    if (loading || isProfileFetched) return;
    
    if (user) {
      try {
        setLoading(true);
        // Try to get the user profile from Firestore
        const userProfile = await getUserProfile(user.uid);
        
        if (userProfile) {
          setProfile({
            displayName: userProfile.displayName || user.displayName || '',
            email: userProfile.email || user.email || '',
            company: userProfile.company || '',
            title: userProfile.title || '',
            bio: userProfile.bio || '',
            website: userProfile.website || '',
            twitter: userProfile.twitter || '',
            interests: userProfile.interests || [],
            photoURL: userProfile.photoURL || user.photoURL || '',
            skills: userProfile.skills || [],
            positions: userProfile.positions || [],
            isVerified: userProfile.isVerified || false
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
            skills: [],
            positions: [],
            isVerified: false
          });
          
          // Create a basic profile for the user if none exists
          try {
            await updateUserProfile(user.uid, {
              displayName: user.displayName || '',
              email: user.email || '',
              company: '',
              title: '',
              interests: [],
              photoURL: user.photoURL || '',
              skills: [],
              positions: []
            });
          } catch (createError) {
            console.error('Error creating initial user profile:', createError);
          }
        }
        
        setIsProfileFetched(true);
      } catch (error) {
        console.error('Error fetching user profile:', error);
        setError('Failed to load profile. Please try again later.');
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    // Initialize loading to false to allow fetchUserProfile to execute
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user && !loading) {
      fetchUserProfile();
    }
  }, [user, loading]);

  // Handle email verification
  const handleResendVerification = async () => {
    if (!user) return;
    
    try {
      setSendingVerification(true);
      await resendVerificationEmail(user);
      toast.success('Verification email sent! Please check your inbox.');
    } catch (error) {
      console.error('Error sending verification email:', error);
      // Check if this is a rate limiting error with a custom message
      const errorMessage = String(error);
      if (errorMessage.includes('too many verification emails')) {
        toast.error('You have requested too many verification emails. Please wait a while before trying again.');
      } else {
        toast.error('Failed to send verification email. Please try again later.');
      }
    } finally {
      setSendingVerification(false);
    }
  };

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

  // Check for URL parameters and handle page reloads
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('eventbrite_connected') === 'true' || urlParams.get('eventbrite_error')) {
        setActiveTab('integrations');
      }
    }
  }, []);

  // Email Verification Component
  const EmailVerificationStatus = () => {
    const verified = user ? isEmailVerified(user) : false;
    
    return (
      <div className="bg-white rounded-lg shadow-md p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-blue-500" />
            <h3 className="text-lg font-medium">Email Verification</h3>
          </div>
          {verified ? (
            <div className="flex items-center space-x-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Verified</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 text-amber-600">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">Not Verified</span>
            </div>
          )}
        </div>
        <p className="mt-2 text-gray-600">
          {verified 
            ? 'Your email has been verified successfully.' 
            : 'Please verify your email address to unlock all features.'}
        </p>
        
        {!verified && (
          <button
            onClick={handleResendVerification}
            disabled={sendingVerification}
            className="mt-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {sendingVerification ? 'Sending...' : 'Resend Verification Email'}
          </button>
        )}
      </div>
    );
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Left column - Profile info */}
              <div className="md:w-2/3 space-y-6">
                {/* Email Verification Status */}
                <EmailVerificationStatus />
                
                {/* Profile Card */}
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
                                  {user && isEmailVerified(user) && (
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
              </div>
              
              {/* Right column - Account connections */}
              <div className="md:w-1/3 space-y-6">
                <AccountConnections userId={user?.uid || ''} />
                <EventbriteIntegration />
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
} 