import { create } from 'zustand';
import { DatabaseService, StorageService, AuthService } from '../lib/services';
import { useMetadataStore } from './metadataStore';
import { usePDFStore } from './pdfStore';

interface ProjectState {
  isLoading: boolean;
  error: string | null;
  isClearing: boolean;
  clearProject: () => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set) => ({
  isLoading: false,
  error: null,
  isClearing: false, // Add flag to prevent auto-save during clearing

  // Test function to verify AWS operations
  testAWSOperations: async () => {
    try {
      console.log('🧪 Testing AWS operations...');
      
      const userEmail = localStorage.getItem('userEmail');
      if (!userEmail) {
        console.error('❌ No user email found for testing');
        return;
      }

      console.log('🔍 Testing S3 listFiles...');
      const s3Test = await StorageService.listFiles(`users/${userEmail}/images/`);
      console.log('📊 S3 test result:', s3Test);

      console.log('🔍 Testing DynamoDB getProject...');
      const dbTest = await DatabaseService.getProject(userEmail, 'current');
      console.log('📊 DynamoDB test result:', dbTest);

      console.log('✅ AWS operations test completed');
    } catch (error) {
      console.error('❌ AWS operations test failed:', error);
    }
  },

  clearProject: async () => {
    try {
      set({ isLoading: true, error: null, isClearing: true }); // Set clearing flag

      // Get current user from localStorage
      const userEmail = localStorage.getItem('userEmail');
      if (!userEmail) {
        console.warn('No user email found, clearing local data only');
      }

      console.log('🗑️ Starting comprehensive project clear for user:', userEmail);

      // --- Clear AWS data (don't throw errors, just log them) ---
      
      if (userEmail) {
        console.log('🔍 Step 1: Clearing project data from DynamoDB...');
        try {
          // 1. Clear project details from projects table
          const projectResult = await DatabaseService.clearUserProject(userEmail, userEmail);
          console.log('📊 Project clear result:', projectResult);
          if (projectResult.error) {
            console.error('Failed to clear project data:', projectResult.error);
          } else {
            console.log('✅ Cleared project data from AWS');
          }
        } catch (error) {
          console.error('Error clearing project data from AWS:', error);
        }

        console.log('🔍 Step 2: Clearing bulk defects...');
        try {
          // 2. Clear current bulk defect entries
          const bulkDefectsResult = await DatabaseService.updateBulkDefects(userEmail, []);
          console.log('📊 Bulk defects clear result:', bulkDefectsResult);
          if (bulkDefectsResult.error) {
            console.error('Failed to clear bulk defects:', bulkDefectsResult.error);
          } else {
            console.log('✅ Cleared bulk defects from AWS');
          }
        } catch (error) {
          console.error('Error clearing bulk defects from AWS:', error);
        }

        console.log('🔍 Step 3: Clearing PDF states...');
        try {
          // 3. Clear user PDFs and PDF state
          const userPdfsResult = await DatabaseService.updatePdfState(userEmail, 'clear', {});
          console.log('📊 PDF states clear result:', userPdfsResult);
          if (userPdfsResult.error) {
            console.error('Failed to clear user PDFs:', userPdfsResult.error);
          } else {
            console.log('✅ Cleared PDF states from AWS');
          }
        } catch (error) {
          console.error('Error clearing PDF states from AWS:', error);
        }

        // 4. Clear ALL S3 files for this user (including images)
        console.log('🔍 Step 4: Clearing S3 files...');
        try {
          // Clear project files
          console.log('🔍 Step 4a: Checking for project files...');
          const projectFiles = await StorageService.listFiles(`users/${userEmail}/project-files/`);
          console.log('📊 Project files result:', projectFiles);
          if (projectFiles.files && projectFiles.files.length > 0) {
            console.log(`🗑️ Deleting ${projectFiles.files.length} project files from S3`);
            for (const file of projectFiles.files) {
              try {
                // Construct the full S3 key from the prefix and filename
                const fileKey = `users/${userEmail}/project-files/${file.name}`;
                await StorageService.deleteFile(fileKey);
                console.log(`✅ Deleted project file: ${fileKey}`);
              } catch (error) {
                console.error(`Failed to delete file ${file.name}:`, error);
              }
            }
          } else {
            console.log('📊 No project files found in S3');
          }

          // Clear PDF files
          console.log('🔍 Step 4b: Checking for PDF files...');
          const pdfFiles = await StorageService.listFiles(`users/${userEmail}/pdfs/`);
          console.log('📊 PDF files result:', pdfFiles);
          if (pdfFiles.files && pdfFiles.files.length > 0) {
            console.log(`🗑️ Deleting ${pdfFiles.files.length} PDF files from S3`);
            for (const file of pdfFiles.files) {
              try {
                // Construct the full S3 key from the prefix and filename
                const fileKey = `users/${userEmail}/pdfs/${file.name}`;
                await StorageService.deleteFile(fileKey);
                console.log(`✅ Deleted PDF file: ${fileKey}`);
              } catch (error) {
                console.error(`Failed to delete PDF file ${file.name}:`, error);
              }
            }
          } else {
            console.log('📊 No PDF files found in S3');
          }

          // Clear ALL user images from S3 (this is the key part!)
          console.log('🔍 Step 4c: Checking for user images...');
          const userImages = await StorageService.listFiles(`users/${userEmail}/images/`);
          console.log('📊 User images result:', userImages);
          if (userImages.files && userImages.files.length > 0) {
            console.log(`🗑️ Deleting ${userImages.files.length} user images from S3`);
            for (const file of userImages.files) {
              try {
                // Construct the full S3 key from the prefix and filename
                const fileKey = `users/${userEmail}/images/${file.name}`;
                await StorageService.deleteFile(fileKey);
                console.log(`✅ Deleted image file: ${fileKey}`);
              } catch (error) {
                console.error(`Failed to delete image file ${file.name}:`, error);
              }
            }
          } else {
            console.log('📊 No user images found in S3');
          }

          // Clear any other user files (but preserve Load Defects data)
          console.log('🔍 Step 4d: Checking for other user files...');
          const userFiles = await StorageService.listFiles(`users/${userEmail}/`);
          console.log('📊 All user files result:', userFiles);
          if (userFiles.files && userFiles.files.length > 0) {
            console.log(`🗑️ Deleting ${userFiles.files.length} user files from S3`);
            for (const file of userFiles.files) {
              // Skip any files that might be needed for Load Defects functionality
              if (!file.name.includes('load-defects') && 
                  !file.name.includes('defects-data') && 
                  !file.name.includes('defect-sets') &&
                  !file.name.includes('saved-defects')) {
                try {
                  // Construct the full S3 key from the prefix and filename
                  const fileKey = `users/${userEmail}/${file.name}`;
                  await StorageService.deleteFile(fileKey);
                  console.log(`✅ Deleted user file: ${fileKey}`);
                } catch (error) {
                  console.error(`Failed to delete file ${file.name}:`, error);
                }
              } else {
                console.log(`⏸️ Skipping Load Defects file: ${file.name}`);
              }
            }
          } else {
            console.log('📊 No other user files found in S3');
          }
        } catch (error) {
          console.error('Error clearing S3 files:', error);
        }
      }

      // --- Clear local state and storage (this is the most important part) ---
      
      console.log('🔄 Step 5: Clearing local state and storage...');
      
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
      
      console.log('🗑️ Step 6: Clearing localStorage keys...');
      keysToRemove.forEach(key => {
        try {
          const beforeValue = localStorage.getItem(key);
          localStorage.removeItem(key);
          sessionStorage.removeItem(key);
          console.log(`🗑️ Removed localStorage key: ${key} (was: ${beforeValue ? 'present' : 'not present'})`);
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
        
        console.log(`🔍 Found ${projectKeys.length} additional project keys to remove:`, projectKeys);
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

      // DON'T reload user data - this was causing the data to come back!
      // The stores are already reset and localStorage is cleared
      console.log('✅ Clear completed - data will not be reloaded automatically');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to clear project';
      console.error('❌ Error clearing project:', errorMessage);
      set({ error: errorMessage });
      // Don't throw the error - just log it and continue
    } finally {
      // Wait a bit before re-enabling auto-save to prevent immediate restoration
      setTimeout(() => {
        set({ isLoading: false, isClearing: false });
        console.log('✅ Auto-save re-enabled after clearing');
      }, 2000);
    }
  }
}));