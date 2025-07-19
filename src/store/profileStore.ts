import { create } from 'zustand';
import { UserProfile } from '../types/profile';
import { StorageService } from '../lib/services';

interface ProfileState {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  fetchProfile: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  updateAvatar: (file: File) => Promise<void>;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: null,
  isLoading: false,
  error: null,

  fetchProfile: async () => {
    try {
      set({ isLoading: true, error: null });
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      set({ profile: data });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch profile' });
    } finally {
      set({ isLoading: false });
    }
  },

  updateProfile: async (updates) => {
    try {
      set({ isLoading: true, error: null });
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (error) throw error;
      
      // Refresh profile
      await get().fetchProfile();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update profile' });
    } finally {
      set({ isLoading: false });
    }
  },

  updateAvatar: async (file) => {
    try {
      set({ isLoading: true, error: null });
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload avatar to S3
      const fileExt = file.name.split('.').pop();
      const filePath = `avatars/${user.id}/${Date.now()}.${fileExt}`;

      const uploadResult = await StorageService.uploadFile(file, filePath);

      if (uploadResult.error) {
        throw uploadResult.error;
      }

      // Update profile with new avatar URL
      await get().updateProfile({ avatar_url: uploadResult.url });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update avatar' });
    } finally {
      set({ isLoading: false });
    }
  },
}));