import { create } from 'zustand';
import { DatabaseService } from '../lib/services';
// import { useAuthStore } from './authStore';
import { useMetadataStore } from './metadataStore';
import { usePDFStore } from './pdfStore';

interface ProjectState {
  isLoading: boolean;
  error: string | null;
  clearProject: () => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set) => ({
  isLoading: false,
  error: null,

  clearProject: async () => {
    try {
      set({ isLoading: true, error: null });

      // Get current auth session
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      if (authError) throw authError;
      if (!session?.user) throw new Error("No authenticated user found");

      const userId = session.user.id;

      // --- Delete all files from user-project-files bucket ---
      const { data: files, error: listError } = await supabase.storage
        .from('user-project-files')
        .list(userId);
      if (listError) {
        throw new Error(`Failed to list files: ${listError.message}`);
      }
      if (files && files.length > 0) {
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
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // --- Delete all files from user-pdfs bucket ---
      const { data: pdfFiles, error: pdfListError } = await supabase.storage
        .from('user-pdfs')
        .list(userId);
      if (pdfListError) {
        throw new Error(`Failed to list PDF files: ${pdfListError.message}`);
      }
      if (pdfFiles && pdfFiles.length > 0) {
        const BATCH_SIZE = 50;
        const pdfPaths = pdfFiles.map(file => `${userId}/${file.name}`);
        for (let i = 0; i < pdfPaths.length; i += BATCH_SIZE) {
          const batch = pdfPaths.slice(i, i + BATCH_SIZE);
          const { error: deleteError } = await supabase.storage
            .from('user-pdfs')
            .remove(batch);
          if (deleteError) {
            throw new Error(`Failed to delete PDF files: ${deleteError.message}`);
          }
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // --- Delete from projects table using DatabaseService ---
      const projectResult = await DatabaseService.clearUserProject(userId, userId);
      if (projectResult.error) {
        throw new Error(`Failed to delete project data: ${projectResult.error}`);
      }

      // --- Delete from bulk_defects table using DatabaseService ---
      const bulkDefectsResult = await DatabaseService.updateBulkDefects(userId, []);
      if (bulkDefectsResult.error) {
        throw new Error(`Failed to delete bulk defects: ${bulkDefectsResult.error}`);
      }

      // --- Delete from user_pdfs table using DatabaseService ---
      const userPdfsResult = await DatabaseService.updatePdfState(userId, 'clear', {});
      if (userPdfsResult.error) {
        throw new Error(`Failed to delete user PDFs: ${userPdfsResult.error}`);
      }

      // --- Delete from user_pdf_state table using DatabaseService ---
      const userPdfStateResult = await DatabaseService.updatePdfState(userId, 'clear', {});
      if (userPdfStateResult.error) {
        throw new Error(`Failed to delete user PDF state: ${userPdfStateResult.error}`);
      }

      // --- Reset all relevant Zustand stores ---
      useMetadataStore.getState().reset();
      usePDFStore.getState().clearFiles && usePDFStore.getState().clearFiles();
      // Add other store resets if needed

      // --- Remove all app-related localStorage/sessionStorage keys ---
      const keysToRemove = [
        'viewMode',
        'pdf-storage',
        'isAuthenticated',
        'user',
        'pdf1Name',
        'pdf2Name',
        'pageStates1',
        'pageStates2',
        // Add any other keys your app uses
      ];
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });

      // Optionally, clear all localStorage/sessionStorage (uncomment if safe):
      // localStorage.clear();
      // sessionStorage.clear();

      // --- Force UI reload to ensure all state is cleared ---
      setTimeout(() => { window.location.reload(); }, 250);

      // --- Verify deletion was successful (optional) ---
      const { data: verifyFiles } = await supabase.storage
        .from('user-project-files')
        .list(userId);

      if (verifyFiles && verifyFiles.length > 0) {
        throw new Error('Failed to delete all files');
      }

      const { data: verifyProject } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
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