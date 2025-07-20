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
      if (!userEmail) {
        console.warn('No user email found, clearing local data only');
      }

      console.log('🗑️ Starting comprehensive project clear for user:', userEmail);

      // --- Clear AWS data (don't throw errors, just log them) ---
      
      if (userEmail) {
        try {
          // 1. Clear project details from projects table
          const projectResult = await DatabaseService.clearUserProject(userEmail, userEmail);
          if (projectResult.error) {
            console.error('Failed to clear project data:', projectResult.error);
          } else {
            console.log('✅ Cleared project data from AWS');
          }
        } catch (error) {
          console.error('Error clearing project data from AWS:', error);
        }

        try {
          // 2. Clear current bulk defect entries
          const bulkDefectsResult = await DatabaseService.updateBulkDefects(userEmail, []);
          if (bulkDefectsResult.error) {
            console.error('Failed to clear bulk defects:', bulkDefectsResult.error);
          } else {
            console.log('✅ Cleared bulk defects from AWS');
          }
        } catch (error) {
          console.error('Error clearing bulk defects from AWS:', error);
        }

        try {
          // 3. Clear user PDFs and PDF state
          const userPdfsResult = await DatabaseService.updatePdfState(userEmail, 'clear', {});
          if (userPdfsResult.error) {
            console.error('Failed to clear user PDFs:', userPdfsResult.error);
          } else {
            console.log('✅ Cleared PDF states from AWS');
          }
        } catch (error) {
          console.error('Error clearing PDF states from AWS:', error);
        }

        // 4. Clear ALL S3 files for this user (including images)
        try {
          // Clear project files
          const projectFiles = await StorageService.listFiles(`users/${userEmail}/project-files/`);
          if (projectFiles.success && projectFiles.data.length > 0) {
            console.log(`🗑️ Deleting ${projectFiles.data.length} project files from S3`);
            for (const file of projectFiles.data) {
              try {
                await StorageService.deleteFile(file.key);
              } catch (error) {
                console.error(`Failed to delete file ${file.key}:`, error);
              }
            }
          }

          // Clear PDF files
          const pdfFiles = await StorageService.listFiles(`users/${userEmail}/pdfs/`);
          if (pdfFiles.success && pdfFiles.data.length > 0) {
            console.log(`🗑️ Deleting ${pdfFiles.data.length} PDF files from S3`);
            for (const file of pdfFiles.data) {
              try {
                await StorageService.deleteFile(file.key);
              } catch (error) {
                console.error(`Failed to delete PDF file ${file.key}:`, error);
              }
            }
          }

          // Clear ALL user images from S3 (this is the key part!)
          const userImages = await StorageService.listFiles(`users/${userEmail}/images/`);
          if (userImages.success && userImages.data.length > 0) {
            console.log(`🗑️ Deleting ${userImages.data.length} user images from S3`);
            for (const file of userImages.data) {
              try {
                await StorageService.deleteFile(file.key);
              } catch (error) {
                console.error(`Failed to delete image file ${file.key}:`, error);
              }
            }
          }

          // Clear any other user files (but preserve Load Defects data)
          const userFiles = await StorageService.listFiles(`users/${userEmail}/`);
          if (userFiles.success && userFiles.data.length > 0) {
            console.log(`🗑️ Deleting ${userFiles.data.length} user files from S3`);
            for (const file of userFiles.data) {
              // Skip any files that might be needed for Load Defects functionality
              if (!file.key.includes('load-defects') && 
                  !file.key.includes('defects-data') && 
                  !file.key.includes('defect-sets') &&
                  !file.key.includes('saved-defects')) {
                try {
                  await StorageService.deleteFile(file.key);
                } catch (error) {
                  console.error(`Failed to delete file ${file.key}:`, error);
                }
              }
            }
          }
        } catch (error) {
          console.error('Error clearing S3 files:', error);
        }
      }

      // --- Clear local state and storage (this is the most important part) ---
      
      console.log('🔄 Clearing local state and storage...');
      
      // Reset all Zustand stores
      try {
        useMetadataStore.getState().reset();
        console.log('✅ Metadata store reset');
      } catch (error) {
        console.error('Error resetting metadata store:', error);
      }

      try {
        if (usePDFStore.getState().clearFiles) {
          usePDFStore.getState().clearFiles();
        }
        if (usePDFStore.getState().reset) {
          usePDFStore.getState().reset();
        }
        console.log('✅ PDF store reset');
      } catch (error) {
        console.error('Error resetting PDF store:', error);
      }

      // Clear ALL localStorage keys (but preserve authentication)
      const keysToRemove = [
        'clean-app-images',           // Images
        'clean-app-form-data',        // Form data
        'clean-app-bulk-data',        // Bulk defects
        'clean-app-selections',       // Selected images
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
        'image-selections',
        'defectSets',                 // Defect sets (but preserve Load Defects)
        'user-pdfs'                   // User PDFs
      ];
      
      console.log('🗑️ Clearing localStorage keys...');
      keysToRemove.forEach(key => {
        try {
          localStorage.removeItem(key);
          sessionStorage.removeItem(key);
        } catch (error) {
          console.error(`Error removing key ${key}:`, error);
        }
      });

      // Clear Zustand persisted storage
      try {
        if (usePDFStore.persist && usePDFStore.persist.clearStorage) {
          await usePDFStore.persist.clearStorage();
          console.log('✅ PDF store persisted storage cleared');
        }
      } catch (error) {
        console.error('Failed to clear PDF store persisted storage:', error);
      }

      // Clear any remaining project-related data (but preserve authentication and Load Defects)
      try {
        const remainingKeys = Object.keys(localStorage);
        const projectKeys = remainingKeys.filter(key => 
          (key.includes('project') || 
           key.includes('image') || 
           key.includes('form') ||
           key.includes('selection') ||
           key.includes('bulk') ||
           key.includes('pdf')) &&
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
          try {
            localStorage.removeItem(key);
            console.log(`🗑️ Removed additional key: ${key}`);
          } catch (error) {
            console.error(`Error removing key ${key}:`, error);
          }
        });
      } catch (error) {
        console.error('Error clearing additional localStorage keys:', error);
      }

      console.log('✅ Project clear completed successfully');
      console.log('📋 Load Defects functionality preserved - users can still load saved defect sets');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to clear project';
      console.error('❌ Error clearing project:', errorMessage);
      set({ error: errorMessage });
      // Don't throw the error - just log it and continue
    } finally {
      set({ isLoading: false });
    }
  }
}));