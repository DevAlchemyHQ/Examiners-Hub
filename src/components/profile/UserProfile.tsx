import React, { useState, useEffect } from 'react';
import { AuthService, ProfileService } from '../../lib/services';
import { EditProfile } from './EditProfile';
import { User, Settings, LogOut, Mail, Calendar, MapPin, Phone, Globe, Award, Star, Heart, Zap, Target, Palette, Music, Gamepad2, BookOpen, Camera, Palette as PaletteIcon, Music as MusicIcon, Gamepad2 as GamepadIcon, BookOpen as BookIcon, Camera as CameraIcon } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import type { UserProfile as UserProfileType } from '../../types/profile';
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

      // Use user from auth store instead of calling AuthService
      if (!user) {
        throw new Error('Not authenticated');
      }

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

      // Use getOrCreateUserProfile to ensure we always have a valid profile
      const userProfile = await ProfileService.getOrCreateUserProfile(user.id, user.email || '');
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

      await ProfileService.updateUserProfile(profile.id, updates);
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
      await logout();
      // Navigate to login after logout
      navigate("/login");
    } catch (error) {
      console.error('Logout error:', error);
      // Even if logout fails, try to navigate to login
      navigate("/login");
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
      await ProfileService.updateUserProfile(user.id, { avatar_url: uploadResult.url });
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
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="max-w-md mx-auto p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gray-800 dark:bg-gray-700 p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center text-2xl">
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
                  <label className="absolute -bottom-1 -right-1 bg-white text-gray-700 p-1 rounded-full shadow-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <Camera size={12} />
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
                      <Loader2 size={16} className="animate-spin text-white" />
                    </div>
                  )}
                </div>
                
                <div>
                  <h1 className="text-xl font-bold">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="bg-white/20 text-white placeholder-white/70 rounded px-2 py-1 text-lg font-bold"
                          placeholder="Enter your name"
                        />
                        <button
                          onClick={handleSaveName}
                          className="p-1 bg-white/20 rounded hover:bg-white/30 transition-colors"
                        >
                          <Save size={12} />
                        </button>
                        <button
                          onClick={() => {
                            setIsEditing(false);
                            setEditName(profile.full_name);
                          }}
                          className="p-1 bg-white/20 rounded hover:bg-white/30 transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {profile.full_name || 'Your Profile'}
                        <button
                          onClick={() => setIsEditing(true)}
                          className="p-1 bg-white/20 rounded hover:bg-white/30 transition-colors"
                        >
                          <Edit3 size={12} />
                        </button>
                      </div>
                    )}
                  </h1>
                  <p className="text-gray-300 mt-1 text-sm">
                    {profile.email}
                  </p>
                </div>
              </div>
              
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                <LogOut size={14} />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Messages */}
            {error && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded border border-red-200 dark:border-red-800">
                <AlertCircle size={16} />
                <p className="text-sm">{error}</p>
              </div>
            )}

            {message && (
              <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-900/20 p-3 rounded border border-green-200 dark:border-green-800">
                <Check size={16} />
                <p className="text-sm">{message}</p>
              </div>
            )}

            {/* Profile Information */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Account Information
                </h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email Address
                    </label>
                    <div className="p-3 border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700">
                      <span className="text-gray-700 dark:text-gray-300">
                        {profile.email}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Downloads Remaining
                    </label>
                    <div className="p-3 border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700">
                      <span className="text-gray-700 dark:text-gray-300">
                        {profile.downloads_remaining === null
                          ? 'Unlimited'
                          : profile.downloads_remaining}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Subscription Details
                </h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Status
                    </label>
                    <div className="p-3 border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded text-sm font-medium ${
                          profile.subscription_status === 'premium'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
                        }`}
                      >
                        {profile.subscription_status.charAt(0).toUpperCase() +
                          profile.subscription_status.slice(1)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Avatar
                    </label>
                    <div className="p-3 border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700">
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
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => navigate('/subscriptions')}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                <Crown size={16} />
                Manage Subscription
              </button>
              
              <button
                onClick={() => navigate('/')}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
              >
                <User size={16} />
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const EMOJIS = ['😊', '🚀', '🌟', '🎯', '🎨', '🎮', '🎸', '📚', '🎭', '🌈'];