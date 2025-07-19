import { create } from 'zustand';
import { DatabaseService, StorageService, AuthService } from '../lib/services';
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

      // Get current user from localStorage
      const userEmail = localStorage.getItem('userEmail');
      if (!userEmail) throw new Error("No authenticated user found");

      // --- Delete all files from S3 user-project-files folder ---
      const projectFiles = await StorageService.listFiles(`users/${userEmail}/project-files/`);
      if (projectFiles.success && projectFiles.data.length > 0) {
        for (const file of projectFiles.data) {
          await StorageService.deleteFile(file.key);
        }
      }

      // --- Delete all files from S3 user-pdfs folder ---
      const pdfFiles = await StorageService.listFiles(`users/${userEmail}/pdfs/`);
      if (pdfFiles.success && pdfFiles.data.length > 0) {
        for (const file of pdfFiles.data) {
          await StorageService.deleteFile(file.key);
        }
      }

      // --- Delete from projects table using DatabaseService ---
      const projectResult = await DatabaseService.clearUserProject(userEmail, userEmail);
      if (projectResult.error) {
        throw new Error(`Failed to delete project data: ${projectResult.error}`);
      }

      // --- Delete from bulk_defects table using DatabaseService ---
      const bulkDefectsResult = await DatabaseService.updateBulkDefects(userEmail, []);
      if (bulkDefectsResult.error) {
        throw new Error(`Failed to delete bulk defects: ${bulkDefectsResult.error}`);
      }

      // --- Delete from user_pdfs table using DatabaseService ---
      const userPdfsResult = await DatabaseService.updatePdfState(userEmail, 'clear', {});
      if (userPdfsResult.error) {
        throw new Error(`Failed to delete user PDFs: ${userPdfsResult.error}`);
      }

      // --- Delete from user_pdf_state table using DatabaseService ---
      const userPdfStateResult = await DatabaseService.updatePdfState(userEmail, 'clear', {});
      if (userPdfStateResult.error) {
        throw new Error(`Failed to delete user PDF state: ${userPdfStateResult.error}`);
      }

      // --- Reset all relevant Zustand stores ---
      useMetadataStore.getState().reset();
      usePDFStore.getState().clearFiles && usePDFStore.getState().clearFiles();

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
      ];
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });

      // --- Force UI reload to ensure all state is cleared ---
      setTimeout(() => { window.location.reload(); }, 250);

      // --- Verify deletion was successful (optional) ---
      const verifyFiles = await StorageService.listFiles(`users/${userEmail}/project-files/`);
      if (verifyFiles.success && verifyFiles.data.length > 0) {
        throw new Error('Failed to delete all files');
      }

      const verifyProject = await DatabaseService.getUserProject(userEmail);
      if (verifyProject.success && verifyProject.data) {
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