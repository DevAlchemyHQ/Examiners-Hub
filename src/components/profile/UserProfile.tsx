import React, { useState, useEffect } from 'react';
import { User, Mail, Package, Crown, Loader2, AlertCircle, Check, Camera, LogOut, Edit3, Save, X, Settings, Database, Cloud } from 'lucide-react';
import { getCurrentUser, getOrCreateUserProfile, updateUserProfile } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import { signOut } from '../../lib/supabase';
import type { UserProfile as UserProfileType } from '../../types/profile';
import { ServiceManager } from '../../lib/services';
import { StorageService } from '../../lib/services';

export const UserProfile: React.FC = () => {
  const [profile, setProfile] = useState<UserProfileType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedEmoji, setSelectedEmoji] = useState<string>('😊');
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const { logout, user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // For testing mode, create a mock profile
      if (user?.id === 'test-user-id' || user?.id?.startsWith('mock-user-')) {
        const mockProfile: UserProfileType = {
          id: user.id,
          user_id: user.id,
          full_name: user.user_metadata?.full_name || 'Mock User',
          email: user.email || 'mock@example.com',
          avatar_url: null,
          avatar_emoji: '😊',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        setProfile(mockProfile);
        setSelectedEmoji(mockProfile.avatar_emoji);
        setEditName(mockProfile.full_name);
        return;
      }

      const user = await getCurrentUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      // Use getOrCreateUserProfile to ensure we always have a valid profile
      const userProfile = await getOrCreateUserProfile(user.id, user.email || '');
      setProfile(userProfile);
      setSelectedEmoji(userProfile.avatar_emoji);
      setEditName(userProfile.full_name);
    } catch (err) {
      console.error('Error loading profile:', err);
      setError('Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = async (updates: Partial<UserProfileType>) => {
    if (!profile) return;
    try {
      setIsLoading(true);
      setError(null);
      setMessage(null);

      await updateUserProfile(profile.id, updates);
      setProfile(prev => prev ? { ...prev, ...updates } : null);
      setMessage('Profile updated successfully');

      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveName = async () => {
    if (!profile) return;
    try {
      await handleUpdateProfile({ full_name: editName });
      setIsEditing(false);
    } catch (err) {
      console.error('Error saving name:', err);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      await logout();
      navigate("/");
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    setError(null);

    try {
      // Generate file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `avatars/${user.id}/${fileName}`;

      // Upload to S3 using StorageService
      const uploadResult = await StorageService.uploadFile(file, filePath);
      
      if (uploadResult.error) {
        console.error('Upload error:', uploadResult.error);
        throw uploadResult.error;
      }

      // Update user profile
      await updateUserProfile(user.id, { avatar_url: uploadResult.url });
      setProfile(prev => prev ? { ...prev, avatar_url: uploadResult.url } : null);
      setMessage('Profile picture updated successfully');
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Image upload error:', error);
      setError('Failed to upload profile picture');
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center text-red-500">
          <AlertCircle className="w-8 h-8 mx-auto mb-4" />
          <p>Failed to load profile</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-8 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center text-4xl backdrop-blur-sm">
                    {profile.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt="Profile"
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      selectedEmoji
                    )}
                  </div>
                  
                  {/* Upload Button */}
                  <label className="absolute -bottom-2 -right-2 bg-white text-gray-700 p-2 rounded-full shadow-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <Camera size={16} />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={isUploading}
                    />
                  </label>
                  
                  {isUploading && (
                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                      <Loader2 size={20} className="animate-spin text-white" />
                    </div>
                  )}
                </div>
                
                <div>
                  <h1 className="text-3xl font-bold">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="bg-white/20 text-white placeholder-white/70 rounded px-3 py-1 text-2xl font-bold"
                          placeholder="Enter your name"
                        />
                        <button
                          onClick={handleSaveName}
                          className="p-1 bg-white/20 rounded hover:bg-white/30 transition-colors"
                        >
                          <Save size={16} />
                        </button>
                        <button
                          onClick={() => {
                            setIsEditing(false);
                            setEditName(profile.full_name);
                          }}
                          className="p-1 bg-white/20 rounded hover:bg-white/30 transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {profile.full_name || 'Your Profile'}
                        <button
                          onClick={() => setIsEditing(true)}
                          className="p-1 bg-white/20 rounded hover:bg-white/30 transition-colors"
                        >
                          <Edit3 size={16} />
                        </button>
                      </div>
                    )}
                  </h1>
                  <p className="text-indigo-100 mt-1">
                    Manage your account settings
                  </p>
                </div>
              </div>
              
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-8 space-y-6">
            {/* Messages */}
            {error && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                <AlertCircle size={18} />
                <p className="text-sm">{error}</p>
              </div>
            )}

            {message && (
              <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <Check size={18} />
                <p className="text-sm">{message}</p>
              </div>
            )}

            {/* Profile Information */}
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Account Information
                </h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <div className="flex items-center gap-2">
                      <Mail size={16} className="text-indigo-500" />
                      Email Address
                    </div>
                  </label>
                  <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700">
                    <span className="text-gray-700 dark:text-gray-300">
                      {profile.email}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <div className="flex items-center gap-2">
                      <Package size={16} className="text-indigo-500" />
                      Downloads Remaining
                    </div>
                  </label>
                  <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700">
                    <span className="text-gray-700 dark:text-gray-300">
                      {profile.downloads_remaining === null
                        ? 'Unlimited'
                        : profile.downloads_remaining}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Subscription Details
                </h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <div className="flex items-center gap-2">
                      <Crown size={16} className="text-indigo-500" />
                      Subscription Status
                    </div>
                  </label>
                  <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        profile.subscription_status === 'premium'
                          ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
                      }`}
                    >
                      {profile.subscription_status.charAt(0).toUpperCase() +
                        profile.subscription_status.slice(1)}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <div className="flex items-center gap-2">
                      <User size={16} className="text-indigo-500" />
                      Avatar Emoji
                    </div>
                  </label>
                  <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700">
                    <button
                      className="text-2xl hover:scale-110 transition-transform"
                      onClick={() => {
                        const currentIndex = EMOJIS.indexOf(selectedEmoji);
                        const nextEmoji = EMOJIS[(currentIndex + 1) % EMOJIS.length];
                        setSelectedEmoji(nextEmoji);
                        handleUpdateProfile({ avatar_emoji: nextEmoji });
                      }}
                    >
                      {selectedEmoji}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => navigate('/subscriptions')}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
              >
                <Crown size={16} />
                Manage Subscription
              </button>
              
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-2 px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                <User size={16} />
                Back to Dashboard
              </button>
            </div>

            {/* Service Control Panel */}
            <div className="mt-8 p-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center gap-2 mb-4">
                <Settings size={20} className="text-gray-600 dark:text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Service Configuration</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Auth Service */}
                <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Database size={16} className="text-blue-500" />
                      <span className="font-medium text-gray-900 dark:text-white">Authentication</span>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      ServiceManager.isUsingAWS('AUTH_USE_AWS') 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                    }`}>
                      {ServiceManager.isUsingAWS('AUTH_USE_AWS') ? 'AWS' : 'Supabase'}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      if (ServiceManager.isUsingAWS('AUTH_USE_AWS')) {
                        ServiceManager.disableAWSFeature('AUTH_USE_AWS');
                      } else {
                        ServiceManager.enableAWSFeature('AUTH_USE_AWS');
                      }
                    }}
                    className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Switch to {ServiceManager.isUsingAWS('AUTH_USE_AWS') ? 'Supabase' : 'AWS'}
                  </button>
                </div>

                {/* Storage Service */}
                <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Cloud size={16} className="text-green-500" />
                      <span className="font-medium text-gray-900 dark:text-white">Storage</span>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      ServiceManager.isUsingAWS('STORAGE_USE_AWS') 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                    }`}>
                      {ServiceManager.isUsingAWS('STORAGE_USE_AWS') ? 'AWS S3' : 'Supabase'}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      if (ServiceManager.isUsingAWS('STORAGE_USE_AWS')) {
                        ServiceManager.disableAWSFeature('STORAGE_USE_AWS');
                      } else {
                        ServiceManager.enableAWSFeature('STORAGE_USE_AWS');
                      }
                    }}
                    className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Switch to {ServiceManager.isUsingAWS('STORAGE_USE_AWS') ? 'Supabase' : 'AWS S3'}
                  </button>
                </div>

                {/* Profile Service */}
                <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <User size={16} className="text-purple-500" />
                      <span className="font-medium text-gray-900 dark:text-white">Profile</span>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      ServiceManager.isUsingAWS('PROFILE_USE_AWS') 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                    }`}>
                      {ServiceManager.isUsingAWS('PROFILE_USE_AWS') ? 'AWS' : 'Supabase'}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      if (ServiceManager.isUsingAWS('PROFILE_USE_AWS')) {
                        ServiceManager.disableAWSFeature('PROFILE_USE_AWS');
                      } else {
                        ServiceManager.enableAWSFeature('PROFILE_USE_AWS');
                      }
                    }}
                    className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Switch to {ServiceManager.isUsingAWS('PROFILE_USE_AWS') ? 'Supabase' : 'AWS'}
                  </button>
                </div>
              </div>

              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Note:</strong> Service switching is for testing purposes. All features currently use Supabase by default.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const EMOJIS = ['😊', '🚀', '🌟', '🎯', '🎨', '🎮', '🎸', '📚', '🎭', '🌈'];