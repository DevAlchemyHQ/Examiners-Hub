import { create } from 'zustand';
import { supabase } from '../lib/supabase';
// import { useAuthStore } from './authStore';
import { useMetadataStore } from './metadataStore';
import { usePDFStore } from './pdfStore';

interface ProjectState {
  isLoading: boolean;
  error: string | null;
  formData: { elr: string; structureNo: string; date: string };
  setFormData: (data: Partial<ProjectState['formData']>) => void;
  clearProject: () => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set) => ({
  isLoading: false,
  error: null,
  formData: {
    elr: '',
    structureNo: '',
    date: new Date().toISOString().split('T')[0],
  },
  setFormData: (data) =>
    set((state) => ({
      formData: { ...state.formData, ...data },
    })),
  clearProject: async () => {
    try {
      set({ isLoading: true, error: null });

      // Get current auth session
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      if (authError) throw authError;
      if (!session?.user) throw new Error("No authenticated user found");

      const userId = session.user.id;

      // First, delete all files from storage
      const { data: files, error: listError } = await supabase.storage
        .from('user-project-files')
        .list(userId);

      if (listError) {
        throw new Error(`Failed to list files: ${listError.message}`);
      }

      if (files && files.length > 0) {
        // Delete files in batches to prevent timeouts
        const BATCH_SIZE = 50;
        const filePaths = files.map(file => `${userId}/${file.name}`);
        
        for (let i = 0; i < filePaths.length; i += BATCH_SIZE) {
          const batch = filePaths.slice(i, i + BATCH_SIZE);
          const { error: deleteError } = await supabase.storage
            .from('user-project-files')
            .remove(batch);

          if (deleteError) {
            throw new Error(`Failed to delete files: ${deleteError.message}`);
          }

          // Small delay between batches to prevent rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Then delete the project data
      const { error: projectError } = await supabase
        .from('projects')
        .delete()
        .eq('id', userId);

      if (projectError) {
        throw new Error(`Failed to delete project data: ${projectError.message}`);
      }

      // Reset all stores
      useMetadataStore.getState().reset();
      usePDFStore.getState().clearFiles();

      // Verify deletion was successful
      const { data: verifyFiles } = await supabase.storage
        .from('user-project-files')
        .list(userId);

      if (verifyFiles && verifyFiles.length > 0) {
        throw new Error('Failed to delete all files');
      }

      const { data: verifyProject } = await supabase
        .from('projects')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (verifyProject) {
        throw new Error('Failed to delete project data');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to clear project';
      console.error('Error clearing project:', errorMessage);
      set({ error: errorMessage });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  }
}));