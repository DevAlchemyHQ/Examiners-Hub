import { createClient } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';
import { useAuthStore } from '../store/authStore';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// For local testing, use mock values if environment variables are missing
const mockSupabaseUrl = 'https://mock.supabase.co';
const mockSupabaseKey = 'mock-key-for-local-testing';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables, using mock values for local testing');
}

export const supabase = createClient(supabaseUrl || mockSupabaseUrl, supabaseAnonKey || mockSupabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-js/2.39.3',
    },
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  db: {
    schema: 'public',
  },
});

// Auth Functions
export const signInWithEmail = async (email: string, password: string) => {
  try {
    console.log(`Attempting login for email: ${email}`);
    
    // If using mock Supabase, return mock login success
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      console.log('Mock login successful for local testing');
      const mockUser = {
        id: `mock-user-${Date.now()}`,
        email: email,
        user_metadata: { full_name: 'Mock User' }
      } as unknown as User;
      useAuthStore.getState().setUser(mockUser);
      useAuthStore.getState().setAuth(true);
      return {
        user: mockUser,
        session: null
      };
    }
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error('Login error:', error.message);
      throw error;
    }

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
    
    // If using mock Supabase, return mock signup success
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      console.log('Mock signup successful for local testing');
      return {
        user: {
          id: `mock-user-${Date.now()}`,
          email: email,
          user_metadata: { full_name: fullName }
        },
        session: null
      };
    }
    
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
    
    console.log('Signup successful');
    return data;
  } catch (error) {
    console.error('Signup error:', error);
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
    
    // If using mock Supabase, return mock user
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      console.log('Using mock user for local testing');
      return {
        id: 'mock-user-id',
        email: 'mock@example.com',
        user_metadata: { full_name: 'Mock User' }
      };
    }
    
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

export const resetPassword = async (email: string) => {
  try {
    console.log(`Attempting password reset for email: ${email}`);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    
    if (error) {
      console.error('Password reset error:', error.message);
      throw error;
    }
    
    console.log('Password reset email sent successfully');
  } catch (error) {
    console.error('Password reset error:', error);
    throw error;
  }
};

export const verifyOTP = async (email: string, otp: string) => {
  try {
    console.log(`Attempting OTP verification for email: ${email}`);
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
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

export const verifyResetOTP = async (email: string, otp: string) => {
  try {
    console.log(`Attempting reset OTP verification for email: ${email}`);
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
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

export const updatePassword = async (newPassword: string) => {
  try {
    console.log('Attempting to update password');
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

export const updateUserProfile = async (userId: string, updates: any) => {
  try {
    console.log(`Updating profile for user: ${userId}`);
    
    // If using mock Supabase, just log the update
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      console.log('Mock profile update:', updates);
      return;
    }
    
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);
    
    if (error) {
      console.error('Profile update error:', error.message);
      throw error;
    }
    
    console.log('Profile updated successfully');
  } catch (error) {
    console.error('Profile update error:', error);
    throw error;
  }
};

export const getOrCreateUserProfile = async (userId: string, email: string) => {
  try {
    console.log(`Getting or creating profile for user: ${userId}`);
    
    // If using mock Supabase, return mock profile
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      console.log('Using mock profile for local testing');
      return {
        id: userId,
        user_id: userId,
        email: email,
        full_name: 'Mock User',
        avatar_url: null,
        avatar_emoji: '😊',
        subscription_status: 'basic',
        downloads_remaining: 5,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }
    
    // Try to get existing profile
    const { data: existingProfile, error: getError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (getError && getError.code !== 'PGRST116') {
      // PGRST116 is "not found" error
      throw getError;
    }
    
    if (existingProfile) {
      console.log('Existing profile found');
      return existingProfile;
    }
    
    // Create new profile
    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        email: email,
        full_name: '',
        avatar_emoji: '😊',
        subscription_status: 'basic',
        downloads_remaining: 5
      })
      .select()
      .single();
    
    if (createError) {
      console.error('Profile creation error:', createError.message);
      throw createError;
    }
    
    console.log('New profile created successfully');
    return newProfile;
  } catch (error) {
    console.error('Get or create profile error:', error);
    throw error;
  }
};

export const cancelSubscription = async (subscriptionId: string) => {
  try {
    console.log(`Cancelling subscription: ${subscriptionId}`);
    
    // If using mock Supabase, just log the cancellation
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      console.log('Mock subscription cancellation:', subscriptionId);
      return;
    }
    
    // This would typically call a Stripe API or your backend
    // For now, we'll just update the profile status
    const { error } = await supabase
      .from('profiles')
      .update({
        subscription_status: 'cancelled',
        cancelled_date: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscriptionId);
    
    if (error) {
      console.error('Subscription cancellation error:', error.message);
      throw error;
    }
    
    console.log('Subscription cancelled successfully');
  } catch (error) {
    console.error('Subscription cancellation error:', error);
    throw error;
  }
};

// File upload with timeout
export const uploadFileWithTimeout = async (file: File, filePath: string, timeoutMs: number = 300000) => {
  // If using mock Supabase, return a mock URL
  if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
    console.log('Mock file upload:', filePath);
    return `https://mock-storage.example.com/${filePath}`;
  }

  const timeoutId = setTimeout(() => {
    throw new Error('Upload timed out');
  }, timeoutMs);

  try {
    const { data, error } = await supabase.storage
      .from('user-project-files')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    clearTimeout(timeoutId);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('user-project-files')
      .getPublicUrl(filePath);

    if (!publicUrl) throw new Error('Failed to get public URL');

    return publicUrl;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

// Database Functions for DatabaseService fallbacks
export const getSupabaseProfile = async (userId: string, email: string) => {
  try {
    console.log('Getting Supabase profile for user:', userId);
    
    // If using mock Supabase, return mock profile
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      console.log('Using mock profile for local testing');
      return {
        profile: {
          id: userId,
          user_id: userId,
          full_name: 'Mock User',
          email: email,
          avatar_url: null,
          avatar_emoji: '😊',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        error: null
      };
    }
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      console.error('Get profile error:', error);
      return { profile: null, error };
    }
    
    return { profile: data, error: null };
  } catch (error) {
    console.error('Get profile error:', error);
    return { profile: null, error };
  }
};

export const updateSupabaseProfile = async (userId: string, profileData: any) => {
  try {
    console.log('Updating Supabase profile for user:', userId);
    
    // If using mock Supabase, return success
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      console.log('Mock profile update successful for local testing');
      return { success: true, error: null };
    }
    
    const { error } = await supabase
      .from('profiles')
      .upsert({
        user_id: userId,
        ...profileData,
        updated_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('Update profile error:', error);
      return { success: false, error };
    }
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Update profile error:', error);
    return { success: false, error };
  }
};

export const getSupabaseProject = async (userId: string, projectId: string) => {
  try {
    console.log('Getting Supabase project:', projectId);
    
    // If using mock Supabase, return mock project
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      console.log('Using mock project for local testing');
      return {
        project: {
          id: projectId,
          user_id: userId,
          name: 'Mock Project',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        error: null
      };
    }
    
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .eq('id', projectId)
      .single();
    
    if (error) {
      console.error('Get project error:', error);
      return { project: null, error };
    }
    
    return { project: data, error: null };
  } catch (error) {
    console.error('Get project error:', error);
    return { project: null, error };
  }
};

export const updateSupabaseProject = async (userId: string, projectId: string, projectData: any) => {
  try {
    console.log('Updating Supabase project:', projectId);
    
    // If using mock Supabase, return success
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      console.log('Mock project update successful for local testing');
      return { success: true, error: null };
    }
    
    const { error } = await supabase
      .from('projects')
      .upsert({
        id: projectId,
        user_id: userId,
        ...projectData,
        updated_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('Update project error:', error);
      return { success: false, error };
    }
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Update project error:', error);
    return { success: false, error };
  }
};

export const getSupabaseBulkDefects = async (userId: string) => {
  try {
    console.log('Getting Supabase bulk defects for user:', userId);
    
    // If using mock Supabase, return mock defects
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      console.log('Using mock bulk defects for local testing');
      return {
        defects: [],
        error: null
      };
    }
    
    const { data, error } = await supabase
      .from('bulk_defects')
      .select('*')
      .eq('user_id', userId);
    
    if (error) {
      console.error('Get bulk defects error:', error);
      return { defects: [], error };
    }
    
    return { defects: data || [], error: null };
  } catch (error) {
    console.error('Get bulk defects error:', error);
    return { defects: [], error };
  }
};

export const updateSupabaseBulkDefects = async (userId: string, defects: any[]) => {
  try {
    console.log('Updating Supabase bulk defects for user:', userId);
    
    // If using mock Supabase, return success
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      console.log('Mock bulk defects update successful for local testing');
      return { success: true, error: null };
    }
    
    const { error } = await supabase
      .from('bulk_defects')
      .upsert(defects.map(defect => ({
        user_id: userId,
        ...defect,
        updated_at: new Date().toISOString()
      })));
    
    if (error) {
      console.error('Update bulk defects error:', error);
      return { success: false, error };
    }
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Update bulk defects error:', error);
    return { success: false, error };
  }
};

export const getSupabaseDefectSets = async (userId: string) => {
  try {
    console.log('Getting Supabase defect sets for user:', userId);
    
    // If using mock Supabase, return mock defect sets
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      console.log('Using mock defect sets for local testing');
      return {
        defectSets: [],
        error: null
      };
    }
    
    const { data, error } = await supabase
      .from('defect_sets')
      .select('*')
      .eq('user_id', userId);
    
    if (error) {
      console.error('Get defect sets error:', error);
      return { defectSets: [], error };
    }
    
    return { defectSets: data || [], error: null };
  } catch (error) {
    console.error('Get defect sets error:', error);
    return { defectSets: [], error };
  }
};

export const saveSupabaseDefectSet = async (userId: string, defectSet: any) => {
  try {
    console.log('Saving Supabase defect set for user:', userId);
    
    // If using mock Supabase, return success
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      console.log('Mock defect set save successful for local testing');
      return { success: true, error: null };
    }
    
    const { error } = await supabase
      .from('defect_sets')
      .upsert({
        user_id: userId,
        ...defectSet,
        updated_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('Save defect set error:', error);
      return { success: false, error };
    }
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Save defect set error:', error);
    return { success: false, error };
  }
};

export const getSupabasePdfState = async (userId: string, pdfId: string) => {
  try {
    console.log('Getting Supabase PDF state for user:', userId);
    
    // If using mock Supabase, return mock PDF state
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      console.log('Using mock PDF state for local testing');
      return {
        pdfState: null,
        error: null
      };
    }
    
    const { data, error } = await supabase
      .from('user_pdf_state')
      .select('*')
      .eq('user_id', userId)
      .eq('pdf_id', pdfId)
      .single();
    
    if (error) {
      console.error('Get PDF state error:', error);
      return { pdfState: null, error };
    }
    
    return { pdfState: data, error: null };
  } catch (error) {
    console.error('Get PDF state error:', error);
    return { pdfState: null, error };
  }
};

export const updateSupabasePdfState = async (userId: string, pdfId: string, pdfState: any) => {
  try {
    console.log('Updating Supabase PDF state for user:', userId);
    
    // If using mock Supabase, return success
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      console.log('Mock PDF state update successful for local testing');
      return { success: true, error: null };
    }
    
    const { error } = await supabase
      .from('user_pdf_state')
      .upsert({
        user_id: userId,
        pdf_id: pdfId,
        ...pdfState,
        updated_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('Update PDF state error:', error);
      return { success: false, error };
    }
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Update PDF state error:', error);
    return { success: false, error };
  }
};

export const getSupabaseFeedback = async (userId: string) => {
  try {
    console.log('Getting Supabase feedback for user:', userId);
    
    // If using mock Supabase, return mock feedback
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      console.log('Using mock feedback for local testing');
      return {
        feedback: [],
        error: null
      };
    }
    
    const { data, error } = await supabase
      .from('feedback')
      .select('*')
      .eq('user_id', userId);
    
    if (error) {
      console.error('Get feedback error:', error);
      return { feedback: [], error };
    }
    
    return { feedback: data || [], error: null };
  } catch (error) {
    console.error('Get feedback error:', error);
    return { feedback: [], error };
  }
};

export const saveSupabaseFeedback = async (userId: string, feedback: any) => {
  try {
    console.log('Saving Supabase feedback for user:', userId);
    
    // If using mock Supabase, return success
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      console.log('Mock feedback save successful for local testing');
      return { success: true, error: null };
    }
    
    const { error } = await supabase
      .from('feedback')
      .insert({
        user_id: userId,
        ...feedback,
        created_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('Save feedback error:', error);
      return { success: false, error };
    }
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Save feedback error:', error);
    return { success: false, error };
  }
};

export const clearSupabaseUserProject = async (userId: string, projectId: string) => {
  try {
    console.log('Clearing Supabase project:', projectId);
    
    // If using mock Supabase, return success
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      console.log('Mock project clear successful for local testing');
      return { success: true, error: null };
    }
    
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('user_id', userId)
      .eq('id', projectId);
    
    if (error) {
      console.error('Clear project error:', error);
      return { success: false, error };
    }
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Clear project error:', error);
    return { success: false, error };
  }
};