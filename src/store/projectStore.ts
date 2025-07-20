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

      console.log('🗑️ Starting project clear for user:', userEmail);

      // --- Clear project details from AWS DynamoDB ---
      
      // 1. Clear project details from projects table (but preserve Load Defects data)
      const projectResult = await DatabaseService.clearUserProject(userEmail, userEmail);
      if (projectResult.error) {
        console.error('Failed to clear project data:', projectResult.error);
      }

      // 2. Clear current bulk defect entries (but preserve Load Defects functionality)
      // This clears the current working bulk defects, but Load Defects can still load saved sets
      const bulkDefectsResult = await DatabaseService.updateBulkDefects(userEmail, []);
      if (bulkDefectsResult.error) {
        console.error('Failed to clear bulk defects:', bulkDefectsResult.error);
      }

      // 3. Clear user PDFs and PDF state
      const userPdfsResult = await DatabaseService.updatePdfState(userEmail, 'clear', {});
      if (userPdfsResult.error) {
        console.error('Failed to clear user PDFs:', userPdfsResult.error);
      }

      // --- Clear all files from S3 ---
      
      // 4. Clear saved images from S3
      const projectFiles = await StorageService.listFiles(`users/${userEmail}/project-files/`);
      if (projectFiles.success && projectFiles.data.length > 0) {
        console.log(`🗑️ Deleting ${projectFiles.data.length} project files from S3`);
        for (const file of projectFiles.data) {
          await StorageService.deleteFile(file.key);
        }
      }

      // 5. Clear PDF files from S3
      const pdfFiles = await StorageService.listFiles(`users/${userEmail}/pdfs/`);
      if (pdfFiles.success && pdfFiles.data.length > 0) {
        console.log(`🗑️ Deleting ${pdfFiles.data.length} PDF files from S3`);
        for (const file of pdfFiles.data) {
          await StorageService.deleteFile(file.key);
        }
      }

      // 6. Clear any other user files from S3 (but preserve Load Defects data)
      const userFiles = await StorageService.listFiles(`users/${userEmail}/`);
      if (userFiles.success && userFiles.data.length > 0) {
        console.log(`🗑️ Deleting ${userFiles.data.length} user files from S3`);
        for (const file of userFiles.data) {
          // Skip any files that might be needed for Load Defects functionality
          if (!file.key.includes('load-defects') && 
              !file.key.includes('defects-data') && 
              !file.key.includes('defect-sets') &&
              !file.key.includes('saved-defects')) {
            await StorageService.deleteFile(file.key);
          }
        }
      }

      // --- Clear all local state and storage ---
      
      // 7. Reset all Zustand stores (but preserve Load Defects functionality)
      console.log('🔄 Resetting Zustand stores...');
      
      // Reset metadata store but preserve Load Defects data
      const metadataStore = useMetadataStore.getState();
      metadataStore.reset();
      
      // Clear PDF store
      if (usePDFStore.getState().clearFiles) {
        usePDFStore.getState().clearFiles();
      }
      if (usePDFStore.getState().reset) {
        usePDFStore.getState().reset();
      }

      // 8. Clear project-related localStorage keys (but preserve authentication and Load Defects data)
      const keysToRemove = [
        'clean-app-images',
        'clean-app-form-data', 
        'clean-app-bulk-data', // Clear current bulk data
        'clean-app-selections',
        'viewMode',
        'pdf-storage',
        'metadata-storage',
        'pdf1Name',
        'pdf2Name',
        'pageStates1',
        'pageStates2',
        'selected-images',
        'project-data',
        'form-data',
        'image-selections'
      ];
      
      console.log('🗑️ Clearing localStorage keys...');
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });

      // 9. Clear Zustand persisted storage
      try {
        if (usePDFStore.persist && usePDFStore.persist.clearStorage) {
          await usePDFStore.persist.clearStorage();
          console.log('✅ PDF store persisted storage cleared');
        }
      } catch (error) {
        console.error('Failed to clear PDF store persisted storage:', error);
      }

      // 10. Clear any remaining project-related data (but preserve authentication and Load Defects)
      const remainingKeys = Object.keys(localStorage);
      const projectKeys = remainingKeys.filter(key => 
        (key.includes('project') || 
         key.includes('image') || 
         key.includes('form') ||
         key.includes('selection') ||
         key.includes('bulk')) &&
        !key.includes('load-defects') &&
        !key.includes('defects-data') &&
        !key.includes('defect-sets') &&
        !key.includes('saved-defects') &&
        // Preserve authentication keys
        !key.includes('isAuthenticated') &&
        !key.includes('user') &&
        !key.includes('userEmail') &&
        !key.includes('session')
      );
      
      projectKeys.forEach(key => {
        localStorage.removeItem(key);
        console.log(`🗑️ Removed additional key: ${key}`);
      });

      // --- Verify deletion was successful ---
      console.log('✅ Verifying deletion...');
      
      // Verify files are deleted
      const verifyFiles = await StorageService.listFiles(`users/${userEmail}/project-files/`);
      if (verifyFiles.success && verifyFiles.data.length > 0) {
        console.warn('⚠️ Some project files may still exist in S3');
      }

      // Verify project data is cleared
      const verifyProject = await DatabaseService.getUserProject(userEmail);
      if (verifyProject.success && verifyProject.data) {
        console.warn('⚠️ Some project data may still exist in DynamoDB');
      }

      console.log('✅ Project clear completed successfully');
      console.log('📋 Load Defects functionality preserved - users can still load saved defect sets');

      // --- Reset stores to ensure clean state without page reload ---
      console.log('🔄 Resetting stores for clean state...');
      
      // Reset metadata store to initial state
      useMetadataStore.getState().reset();
      
      // Reset PDF store
      if (usePDFStore.getState().reset) {
        usePDFStore.getState().reset();
      }
      
      console.log('✅ Stores reset successfully - project cleared without page reload');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to clear project';
      console.error('❌ Error clearing project:', errorMessage);
      set({ error: errorMessage });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  }
}));