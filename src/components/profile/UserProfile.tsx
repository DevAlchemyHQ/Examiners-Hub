import React, { useState, useEffect } from 'react';
import { User, Mail, Package, Crown, Loader2, AlertCircle, Check } from 'lucide-react';
import { getCurrentUser, getOrCreateUserProfile, updateUserProfile } from '../../lib/supabase';
import type { UserProfile as UserProfileType } from '../../types/profile';

export const UserProfile: React.FC = () => {
  const [profile, setProfile] = useState<UserProfileType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedEmoji, setSelectedEmoji] = useState<string>('😊');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const user = await getCurrentUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      // Use getOrCreateUserProfile to ensure we always have a valid profile
      const userProfile = await getOrCreateUserProfile(user.id, user.email || '');
      setProfile(userProfile);
      setSelectedEmoji(userProfile.avatar_emoji);
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

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto p-6 flex items-center justify-center text-red-500">
        <AlertCircle className="w-6 h-6 mr-2" />
        Failed to load profile
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <button
              className="w-16 h-16 text-3xl bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center hover:bg-indigo-200 dark:hover:bg-indigo-900 transition-colors"
              onClick={() => {
                const currentIndex = EMOJIS.indexOf(selectedEmoji);
                const nextEmoji = EMOJIS[(currentIndex + 1) % EMOJIS.length];
                setSelectedEmoji(nextEmoji);
                handleUpdateProfile({ avatar_emoji: nextEmoji });
              }}
            >
              {selectedEmoji}
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
                {profile.full_name || 'Your Profile'}
              </h1>
              <p className="text-slate-500 dark:text-gray-400">
                Manage your account settings
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Messages */}
          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
              <AlertCircle size={18} />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {message && (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
              <Check size={18} />
              <p className="text-sm">{message}</p>
            </div>
          )}

          {/* Profile Form */}
          <div className="grid gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
                <div className="flex items-center gap-2">
                  <User size={16} className="text-indigo-500" />
                  Full Name
                </div>
              </label>
              <input
                type="text"
                value={profile.full_name}
                onChange={(e) =>
                  handleUpdateProfile({ full_name: e.target.value })
                }
                className="w-full p-2.5 border border-slate-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
                <div className="flex items-center gap-2">
                  <Mail size={16} className="text-indigo-500" />
                  Email Address
                </div>
              </label>
              <input
                type="email"
                value={profile.email}
                disabled
                className="w-full p-2.5 border border-slate-200 dark:border-gray-700 rounded-lg bg-slate-50 dark:bg-gray-700 text-slate-500 dark:text-gray-400 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
                <div className="flex items-center gap-2">
                  <Package size={16} className="text-indigo-500" />
                  Downloads Remaining
                </div>
              </label>
              <div className="p-2.5 border border-slate-200 dark:border-gray-700 rounded-lg bg-slate-50 dark:bg-gray-700">
                <span className="text-slate-700 dark:text-gray-300">
                  {profile.downloads_remaining === null
                    ? 'Unlimited'
                    : profile.downloads_remaining}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
                <div className="flex items-center gap-2">
                  <Crown size={16} className="text-indigo-500" />
                  Subscription Status
                </div>
              </label>
              <div className="p-2.5 border border-slate-200 dark:border-gray-700 rounded-lg bg-slate-50 dark:bg-gray-700">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
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
          </div>
        </div>
      </div>
    </div>
  );
};

const EMOJIS = ['😊', '🚀', '🌟', '🎯', '🎨', '🎮', '🎸', '📚', '🎭', '🌈'];