import React, { useState, useEffect } from 'react';
import { ProfileService } from '../../lib/services';
import { User, LogOut, Camera, Edit3, Save, X, Check, AlertCircle, Loader2 } from 'lucide-react';
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

  const formatFileSize = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateImageFile = (file: File): { valid: boolean; error?: string } => {
    const maxSize = 10 * 1024 * 1024; // 10MB for profile images
    
    if (file.size > maxSize) {
      return { 
        valid: false, 
        error: `${file.name} (${formatFileSize(file.size)} - too large). Max size is 10MB for profile images.` 
      };
    }
    
    return { valid: true };
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file size
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error || 'File validation failed');
      return;
    }

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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-green-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center text-red-400">
          <AlertCircle className="w-8 h-8 mx-auto mb-4" />
          <p>Failed to load profile</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-md mx-auto p-6">
        <div className="bg-gray-900 rounded-lg overflow-hidden">
          {/* Header - Spotify style */}
          <div className="bg-gradient-to-r from-green-500 to-green-600 p-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center text-3xl">
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
                <label className="absolute -bottom-1 -right-1 bg-white text-gray-700 p-2 rounded-full shadow-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <Camera size={14} />
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
              
              <div className="flex-1">
                <h1 className="text-2xl font-bold">
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="bg-white/20 text-white placeholder-white/70 rounded px-3 py-2 text-xl font-bold"
                        placeholder="Enter your name"
                      />
                      <button
                        onClick={handleSaveName}
                        className="p-2 bg-white/20 rounded hover:bg-white/30 transition-colors"
                      >
                        <Save size={16} />
                      </button>
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          setEditName(profile.full_name);
                        }}
                        className="p-2 bg-white/20 rounded hover:bg-white/30 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {profile.full_name || 'Your Profile'}
                      <button
                        onClick={() => setIsEditing(true)}
                        className="p-2 bg-white/20 rounded hover:bg-white/30 transition-colors"
                      >
                        <Edit3 size={16} />
                      </button>
                    </div>
                  )}
                </h1>
                <p className="text-green-100 mt-1">
                  {profile.email}
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Messages */}
            {error && (
              <div className="flex items-center gap-2 text-red-400 bg-red-900/20 p-3 rounded border border-red-800">
                <AlertCircle size={16} />
                <p className="text-sm">{error}</p>
              </div>
            )}

            {message && (
              <div className="flex items-center gap-2 text-green-400 bg-green-900/20 p-3 rounded border border-green-800">
                <Check size={16} />
                <p className="text-sm">{message}</p>
              </div>
            )}

            {/* Simple Account Info */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">
                Account
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-700">
                  <span className="text-gray-400">Email</span>
                  <span className="text-white">{profile.email}</span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-gray-700">
                  <span className="text-gray-400">Plan</span>
                  <span className="text-green-400 font-medium">
                    {profile.subscription_status === 'premium' ? 'Premium' : 'Free'}
                  </span>
                </div>
              </div>
            </div>

            {/* Simple Actions */}
            <div className="space-y-3 pt-4 border-t border-gray-700">
              <button
                onClick={() => navigate('/')}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
              >
                <User size={16} />
                Back to App
              </button>
              
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const EMOJIS = ['😊', '🚀', '🌟', '🎯', '🎨', '🎮', '🎸', '📚', '🎭', '🌈'];