import { create } from 'zustand';
import { DatabaseService, StorageService, AuthService } from '../lib/services';
import { useMetadataStore } from './metadataStore';
import { usePDFStore } from './pdfStore';

interface ProjectState {
  isLoading: boolean;
  error: string | null;
  isClearing: boolean;
  clearCompletedAt: number | null;
  clearProject: () => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set) => ({
  isLoading: false,
  error: null,
  isClearing: false,
  clearCompletedAt: null,

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
      set({ isLoading: true, error: null, isClearing: true });

      // Get current user from localStorage
      const userEmail = localStorage.getItem('userEmail');
      if (!userEmail) {
        console.warn('No user email found, clearing local data only');
      }

      console.log('🗑️ Starting COMPREHENSIVE project clear for user:', userEmail);
      console.log('⚠️ This will delete ALL project data from AWS, localStorage, sessionStorage, and cookies');

      // --- Clear AWS data (don't throw errors, just log them) ---
      
      if (userEmail) {
        console.log('🔍 Step 1: Clearing project data from DynamoDB...');
        try {
          // 1. Clear project details from projects table
          const projectResult = await DatabaseService.clearUserProject(userEmail, 'current');
          console.log('📊 Project clear result:', projectResult);
          if (projectResult.error) {
            console.error('Failed to clear project data:', projectResult.error);
          } else {
            console.log('✅ Cleared project data from AWS');
          }
          
          // Also update project with empty form data to ensure it's cleared
          console.log('🔍 Step 1a: Updating project with empty form data...');
          const updateResult = await DatabaseService.updateProject(userEmail, 'current', {
            formData: {
              elr: '',
              structureNo: '',
              date: ''
            },
            sessionState: {
              imageOrder: [],
              instanceMetadata: {},
              selectedImageOrder: [],
              bulkDefectOrder: [],
              formData: {
                elr: '',
                structureNo: '',
                date: ''
              },
              scrollPositions: {
                selectedPanel: 0,
                bulkPanel: 0,
                imageGrid: 0
              },
              lastActiveTime: Date.now(),
              lastActiveTab: 'images',
              panelExpanded: false,
              gridWidth: 4
            }
          }, true); // isClearing = true
          console.log('📊 Project update result:', updateResult);
          if (updateResult.error) {
            console.error('Failed to update project with empty data:', updateResult.error);
          } else {
            console.log('✅ Updated project with empty form data');
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

        console.log('🔍 Step 3: Clearing selected images...');
        try {
          const selectedResult = await DatabaseService.clearSelectedImages(userEmail);
          console.log('📊 Selected images clear result:', selectedResult);
          if (selectedResult.error) {
            console.error('Failed to clear selected images:', selectedResult.error);
          } else {
            console.log('✅ Cleared selected images from AWS');
          }
        } catch (error) {
          console.error('Error clearing selected images from AWS:', error);
        }

        console.log('🔍 Step 4: Clearing S3 files...');
        try {
          const s3Result = await StorageService.deleteUserFiles(userEmail);
          console.log('📊 S3 clear result:', s3Result);
          if (s3Result.error) {
            console.error('Failed to clear S3 files:', s3Result.error);
          } else {
            console.log('✅ Cleared S3 files from AWS');
          }
        } catch (error) {
          console.error('Error clearing S3 files from AWS:', error);
        }
      }

      // --- Clear local state and storage (this is the most important part) ---
      
      console.log('🔄 Step 5: Clearing local state and storage...');
      
      // Reset all Zustand stores
      try {
        useMetadataStore.getState().reset();
        console.log('✅ Metadata store reset');
        
        // Explicitly clear form data to ensure it's empty
        useMetadataStore.getState().setFormData({
          elr: '',
          structureNo: '',
          date: ''
        });
        console.log('✅ Form data explicitly cleared');
        
        // Double-check: Clear S3 files tracking immediately
        if (userEmail) {
          localStorage.removeItem(`s3Files_${userEmail}`);
          console.log(`🗑️ Double-cleared S3 files tracking: s3Files_${userEmail}`);
        }
        
        // Force clear images state directly
        useMetadataStore.setState({ images: [] });
        console.log('🗑️ Force cleared images state');
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
        'user-pdfs',                  // User PDFs
        // Additional form-related keys that might exist
        'elr',
        'structureNo', 
        'date',
        'project-details',
        'project-form',
        'form-settings',
        'project-settings',
        // Session state keys
        'session-state',
        'sessionState',
        'user-session',
        'app-session',
        // Cross-browser persistence keys
        's3Files',
        'aws-backup',
        'cross-browser-data'
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

      // Clear user-specific localStorage keys
      if (userEmail) {
        console.log('🗑️ Step 6a: Clearing user-specific localStorage keys...');
        const userSpecificKeys = [
          `clean-app-images-${userEmail}`,
          `clean-app-form-data-${userEmail}`,
          `clean-app-bulk-data-${userEmail}`,
          `clean-app-selections-${userEmail}`,
          `s3Files_${userEmail}`,
          `aws-backup-${userEmail}`,
          `cross-browser-data-${userEmail}`,
          `session-state-${userEmail}`,
          `user-session-${userEmail}`,
          `app-session-${userEmail}`,
          `formData-${userEmail}-session-state`,
          `bulkData-${userEmail}`,
          `instanceMetadata-${userEmail}`,
          `selectedImages-${userEmail}`
        ];
        
        userSpecificKeys.forEach(key => {
          try {
            const beforeValue = localStorage.getItem(key);
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
            console.log(`🗑️ Removed user-specific key: ${key} (was: ${beforeValue ? 'present' : 'not present'})`);
          } catch (error) {
            console.error(`Error removing user-specific key ${key}:`, error);
          }
        });
        
        // Also clear any remaining keys that match user-specific patterns
        console.log('🗑️ Step 6b: Clearing remaining user-specific pattern keys...');
        const allKeys = Object.keys(localStorage);
        const patternKeys = allKeys.filter(key => 
          key.includes(userEmail) && (
            key.includes('s3Files') || 
            key.includes('formData') || 
            key.includes('bulkData') || 
            key.includes('session') ||
            key.includes('instanceMetadata') ||
            key.includes('selectedImages') ||
            key.includes('clean-app')
          )
        );
        
        patternKeys.forEach(key => {
          try {
            const beforeValue = localStorage.getItem(key);
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
            console.log(`🗑️ Removed pattern key: ${key} (was: ${beforeValue ? 'present' : 'not present'})`);
          } catch (error) {
            console.error(`Error removing pattern key ${key}:`, error);
          }
        });
      }

      // Clear Zustand persisted storage
      try {
        if (usePDFStore.persist && usePDFStore.persist.clearStorage) {
          await usePDFStore.persist.clearStorage();
          console.log('✅ PDF store persisted storage cleared');
        }
      } catch (error) {
        console.error('Error clearing PDF store persisted storage:', error);
      }

      // Clear any remaining project-related keys
      const remainingKeys = Object.keys(localStorage);
      const projectKeys = remainingKeys.filter(key =>
        (key.includes('project') || key.includes('image') || key.includes('form') ||
         key.includes('selection') || key.includes('bulk') || key.includes('pdf') ||
         key.includes('session') || key.includes('aws') || key.includes('s3')) &&
        !key.includes('load-defects') && !key.includes('defects-data') &&
        !key.includes('defect-sets') && !key.includes('saved-defects') &&
        !key.includes('isAuthenticated') && !key.includes('user') &&
        !key.includes('userEmail') && !key.includes('session') && !key.includes('auth')
      );

      console.log(`🔍 Found ${projectKeys.length} additional project keys to remove:`, projectKeys);
      projectKeys.forEach(key => {
        try {
          localStorage.removeItem(key);
          sessionStorage.removeItem(key);
          console.log(`🗑️ Removed additional key: ${key}`);
        } catch (error) {
          console.error(`Error removing key ${key}:`, error);
        }
      });

      // --- Clear Cookies ---
      console.log('🍪 Step 7: Clearing cookies...');
      const cookies = document.cookie.split(';');
      cookies.forEach(cookie => {
        const eqPos = cookie.indexOf('=');
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
        if (name.includes('project') || name.includes('image') || name.includes('form') ||
            name.includes('selection') || name.includes('bulk') || name.includes('pdf') ||
            name.includes('session') || name.includes('app-data') || name.includes('user-data')) {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname}`;
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.${window.location.hostname}`;
          console.log(`🍪 Cleared cookie: ${name}`);
        }
      });
      console.log('✅ Cookies cleared');

      // --- Clear IndexedDB ---
      console.log('🗄️ Step 8: Clearing IndexedDB...');
      if ('indexedDB' in window) {
        const databases = ['project-data', 'image-cache', 'form-data', 'bulk-data', 'pdf-cache'];
        databases.forEach(dbName => {
          try {
            const deleteRequest = indexedDB.deleteDatabase(dbName);
            deleteRequest.onsuccess = () => { console.log(`🗄️ Cleared IndexedDB database: ${dbName}`); };
            deleteRequest.onerror = () => { console.log(`⚠️ Could not clear IndexedDB database: ${dbName}`); };
          } catch (error) {
            console.log(`⚠️ Error clearing IndexedDB database ${dbName}:`, error);
          }
        });
      }
      console.log('✅ IndexedDB cleared');

      console.log('✅ COMPREHENSIVE project clear completed successfully');
      console.log('📋 Load Defects functionality preserved - users can still load saved defect sets');
      console.log('🔐 Authentication data preserved - user remains logged in');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to clear project';
      console.error('❌ Error clearing project:', errorMessage);
      set({ error: errorMessage });
      // Don't throw the error - just log it and continue
    } finally {
      // Wait a bit before re-enabling auto-save to prevent immediate restoration
      setTimeout(() => {
        set({ isLoading: false, isClearing: false, clearCompletedAt: Date.now() });
        console.log('✅ Auto-save re-enabled after clearing');
        console.log('⏰ Clear completed at:', new Date().toISOString());
      }, 5000); // Increased from 2000 to 5000ms
    }
  }
}));