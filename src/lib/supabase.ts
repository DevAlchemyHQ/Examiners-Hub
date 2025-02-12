import { createClient } from '@supabase/supabase-js';
import type { UserProfile } from '../types/profile';
import { useAuthStore } from '../store/authStore';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  }
});

// Auth Functions with enhanced security and logging
export const signInWithEmail = async (email: string, password: string) => {
  try {
    console.log(`Attempting login for email: ${email}`);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error('Login error:', error.message);
      throw error;
    }

    // Fetch the logged-in user
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      console.log('User logged in:', user);
      useAuthStore.getState().setUser(user);
      useAuthStore.getState().setAuth(true);
    }

    console.log('Login successful');
    return data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

export const signUpWithEmail = async (email: string, password: string, fullName: string) => {
  try {
    console.log(`Attempting signup for email: ${email}`);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          full_name: fullName,
          avatar_emoji: '😊',
        }
      }
    });
    
    if (error) {
      console.error('Signup error:', error.message);
      throw error;
    }
    
    // Create profile immediately after signup
    if (data.user) {
      await createProfile(data.user.id, email, fullName);
    }
    
    console.log('Signup successful');
    return data;
  } catch (error) {
    console.error('Signup error:', error);
    throw error;
  }
};

export const resetPassword = async (email: string) => {
  try {
    console.log(`Attempting password reset for email: ${email}`);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    
    if (error) {
      console.error('Password reset error:', error.message);
      throw error;
    }
    
    console.log('Password reset email sent');
  } catch (error) {
    console.error('Password reset error:', error);
    throw error;
  }
};

export const updatePassword = async (newPassword: string) => {
  try {
    console.log('Attempting password update');
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      console.error('Password update error:', error.message);
      throw error;
    }
    
    console.log('Password updated successfully');
  } catch (error) {
    console.error('Password update error:', error);
    throw error;
  }
};

export const verifyOTP = async (email: string, token: string) => {
  try {
    console.log(`Attempting OTP verification for email: ${email}`);
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'signup'
    });

    if (error) {
      console.error('OTP verification error:', error.message);
      throw error;
    }
    
    console.log('OTP verification successful');
    return data;
  } catch (error) {
    console.error('OTP verification error:', error);
    throw error;
  }
};

export const verifyResetOTP = async (email: string, token: string) => {
  try {
    console.log(`Attempting reset OTP verification for email: ${email}`);
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'recovery'
    });

    if (error) {
      console.error('Reset OTP verification error:', error.message);
      throw error;
    }
    
    console.log('Reset OTP verification successful');
    return data;
  } catch (error) {
    console.error('Reset OTP verification error:', error);
    throw error;
  }
};

export const signOut = async () => {
  try {
    console.log('Attempting sign out');
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Sign out error:', error.message);
      throw error;
    }
    console.log('Sign out successful');
  } catch (error) {
    console.error('Sign out error:', error);
    throw error;
  }
};

export const getCurrentUser = async () => {
  try {
    console.log('Getting current user');
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.error('Get current user error:', error.message);
      throw error;
    }
    return user;
  } catch (error) {
    console.error('Get current user error:', error);
    throw error;
  }
};

const createProfile = async (userId: string, email: string, fullName: string) => {
  const { error } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      email,
      full_name: fullName,
      avatar_emoji: '😊',
      subscription_status: 'basic',
      downloads_remaining: 5
    });

  if (error) {
    console.error('Error creating profile:', error);
    throw error;
  }
};

export const getOrCreateUserProfile = async (userId: string, userEmail: string): Promise<UserProfile> => {
  try {
    console.log(`Getting profile for user: ${userId}`);
    
    // First try to get existing profile
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching profile:', fetchError);
      throw fetchError;
    }

    if (profile) {
      console.log('Found existing profile:', profile);
      return profile as UserProfile;
    }

    // If no profile exists, create one
    console.log('Creating new profile for user:', userId);
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;

    const newProfile = {
      id: userId,
      email: userEmail,
      full_name: user?.user_metadata?.full_name || '',
      avatar_emoji: '😊',
      subscription_status: 'basic',
      downloads_remaining: 5
    };

    const { data: createdProfile, error: insertError } = await supabase
      .from('profiles')
      .insert(newProfile)
      .select()
      .single();

    if (insertError) {
      console.error('Error creating profile:', insertError);
      throw insertError;
    }

    if (!createdProfile) {
      throw new Error('Failed to create profile');
    }

    console.log('Created new profile:', createdProfile);
    return createdProfile as UserProfile;
  } catch (error) {
    console.error('Error in getOrCreateUserProfile:', error);
    throw error;
  }
};

export const updateUserProfile = async (userId: string, updates: Partial<UserProfile>) => {
  try {
    console.log(`Updating profile for user: ${userId} with updates:`, updates);
    
    // Update auth metadata if name or emoji is being updated
    if (updates.full_name || updates.avatar_emoji) {
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          full_name: updates.full_name,
          avatar_emoji: updates.avatar_emoji,
          subscription_plan: updates.subscription_status
        }
      });

      if (authError) throw authError;
    }

    // Update profile in database
    const { data: updatedProfile, error: dbError } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (dbError) {
      console.error('Database update error:', dbError);
      throw dbError;
    }

    if (!updatedProfile) {
      throw new Error('Failed to update profile');
    }

    console.log('Profile updated successfully:', updatedProfile);
    return updatedProfile as UserProfile;
  } catch (error) {
    console.error('Error in updateUserProfile:', error);
    throw error;
  }
};

export const uploadAvatar = async (userId: string, file: File): Promise<string> => {
  try {
    console.log(`Uploading avatar for user: ${userId}`);
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('Invalid file type. Please upload an image.');
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('File too large. Maximum size is 5MB.');
    }

    // Delete old avatar if exists
    const { data: existingFiles } = await supabase.storage
      .from('avatars')
      .list(userId);

    if (existingFiles && existingFiles.length > 0) {
      await supabase.storage
        .from('avatars')
        .remove(existingFiles.map(f => `${userId}/${f.name}`));
    }

    // Generate unique file path
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    // Upload file
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    if (!publicUrl) {
      throw new Error('Failed to get public URL for uploaded file');
    }

    console.log('Avatar uploaded successfully:', publicUrl);
    return publicUrl;
  } catch (error) {
    console.error('Error uploading avatar:', error);
    throw error;
  }
};

export const cancelSubscription = async (userId: string) => {
  try {
    console.log(`Cancelling subscription for user: ${userId}`);
    const { error } = await supabase
      .from('profiles')
      .update({ subscription_status: 'cancelled' })
      .eq('id', userId);

    if (error) {
      console.error('Subscription cancellation error:', error);
      throw error;
    }

    console.log('Subscription cancelled successfully');
  } catch (error) {
    console.error('Subscription cancellation error:', error);
    throw error;
  }
};