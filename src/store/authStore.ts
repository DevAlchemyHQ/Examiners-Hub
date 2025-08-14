// authStore.ts
import { create } from 'zustand';
import { AuthService, ProfileService } from '../lib/services';

// Define our own User type to match AWS service response
interface User {
  id: string;
  email: string;
  user_metadata: {
    full_name?: string;
    avatar_url?: string;
    subscription_plan?: string;
    subscription_status?: string;
    subscription_end_date?: string;
  };
}

interface AuthState {
  isAuthenticated: boolean | null; // null = loading, true = authenticated, false = not authenticated
  user: User | null;
  isLoading: boolean;
  setAuth: (isAuthenticated: boolean) => void;
  setUser: (user: User | null) => void;
  setLoading: (isLoading: boolean) => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  getServiceInfo: () => { isUsingAWS: boolean; featureFlags: any };
  clearApplicationData: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: null, // Start as null (loading)
  user: null, // Start with no user
  isLoading: false,
  
  setAuth: (isAuthenticated) => {
    localStorage.setItem('isAuthenticated', JSON.stringify(isAuthenticated));
    set({ isAuthenticated });
  },
  
  setUser: (user) => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('userEmail', user.email);
    } else {
      localStorage.removeItem('user');
      localStorage.removeItem('userEmail');
    }
    set({ user });
  },
  
  setLoading: (isLoading) => {
    set({ isLoading });
  },
  
  logout: async () => {
    set({ isLoading: true });
    try {
      // Save ALL user data to AWS before logout for cross-browser persistence
      try {
        const { useMetadataStore } = await import('./metadataStore');
        console.log('💾 Saving comprehensive user data to AWS before logout...');
        await useMetadataStore.getState().saveAllUserDataToAWS();
        console.log('✅ Comprehensive user data saved to AWS before logout');
      } catch (error) {
        console.error('❌ Error saving comprehensive user data before logout:', error);
        
        // Fallback to old save method
        try {
          await useMetadataStore.getState().saveUserData();
          console.log('✅ User data saved to AWS using fallback method');
        } catch (fallbackError) {
          console.error('❌ Fallback save also failed:', fallbackError);
        }
      }
      
      await AuthService.signOut();
      
      // Clear authentication data
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('user');
      localStorage.removeItem('userEmail');
      
      // Clear ALL application data to prevent data leakage between users
      console.log('🗑️ Clearing all application data on logout...');
      
      const keysToRemove = [
        // Authentication keys
        'isAuthenticated',
        'user',
        'userEmail',
        
        // Application data keys
        'clean-app-images',
        'clean-app-form-data',
        'clean-app-bulk-data',
        'clean-app-selected-images',
        'clean-app-selections',
        'viewMode',
        'selected-images',
        'project-data',
        'form-data',
        'image-selections',
        'bulk-data',
        'metadata-storage',
        'defectSets',
        'user-pdfs',
        'pdf-storage',
        'pdf1Name',
        'pdf2Name',
        'pageStates1',
        'pageStates2',
        
        // Additional form-related keys
        'elr',
        'structureNo', 
        'date',
        'project-details',
        'project-form',
        'form-settings',
        'project-settings',
        
        // User-specific keys (will be cleared by pattern)
        'clean-app-form-data-',
        'clean-app-images-',
        'clean-app-bulk-data-',
        'clean-app-selections-',
        'user-pdfs-',
        'saved-pdfs-'
      ];
      
      // Remove specific keys
      keysToRemove.forEach(key => {
        try {
          localStorage.removeItem(key);
          sessionStorage.removeItem(key);
          console.log(`🗑️ Removed key: ${key}`);
        } catch (error) {
          console.error(`Error removing key ${key}:`, error);
        }
      });
      
      // Clear all user-specific keys by pattern
      const allKeys = Object.keys(localStorage);
      const userSpecificKeys = allKeys.filter(key => 
        key.includes('clean-app-') ||
        key.includes('user-pdfs') ||
        key.includes('saved-pdfs') ||
        key.includes('project-') ||
        key.includes('form-') ||
        key.includes('image-') ||
        key.includes('bulk-') ||
        key.includes('defect-') ||
        key.includes('pdf-')
      );
      
      userSpecificKeys.forEach(key => {
        try {
          localStorage.removeItem(key);
          sessionStorage.removeItem(key);
          console.log(`🗑️ Removed user-specific key: ${key}`);
        } catch (error) {
          console.error(`Error removing user-specific key ${key}:`, error);
        }
      });
      
      console.log('✅ All application data cleared successfully');
      
      // Reset all stores to initial state
      try {
        const { useMetadataStore } = await import('./metadataStore');
        const { useProjectStore } = await import('./projectStore');
        
        useMetadataStore.getState().reset();
        useProjectStore.getState().clearProject();
        
        console.log('✅ All stores reset to initial state');
      } catch (error) {
        console.error('Error resetting stores:', error);
      }
      
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      set({ isAuthenticated: false, user: null, isLoading: false });
    }
  },
  
  checkAuth: async () => {
    try {
      console.log('Checking authentication status...');
      
      // Use AuthService.getCurrentUser() to fetch fresh user data from AWS
      const { user, error } = await AuthService.getCurrentUser();
      
      if (user && !error) {
        console.log('✅ Valid user session found:', user.email);
        
        // Check if this is a different user than before (to prevent data leakage)
        const currentUserEmail = get().user?.email;
        if (currentUserEmail && currentUserEmail !== user.email) {
          console.log('🔄 Different user detected, clearing previous user data...');
          // Clear all application data for the previous user
          await get().clearApplicationData();
        }
        
        // Load profile data to get avatar_url and other metadata
        try {
          const profileResult = await ProfileService.getOrCreateUserProfile(user.id, user.email);
          if (profileResult) {
            // Update user with profile data including avatar_url
            const updatedUser = {
              ...user,
              user_metadata: {
                ...user.user_metadata,
                avatar_url: profileResult.avatar_url,
                subscription_plan: (profileResult as any).subscription_plan || 'Basic',
                subscription_status: (profileResult as any).subscription_status || 'active',
                subscription_end_date: (profileResult as any).subscription_end_date || null
              }
            };
            set({ isAuthenticated: true, user: updatedUser });
          } else {
            set({ isAuthenticated: true, user });
          }
        } catch (profileError) {
          console.error('Error loading profile data:', profileError);
          // Still set user even if profile loading fails
          set({ isAuthenticated: true, user });
        }
      } else {
        console.log('❌ No valid user session found');
        set({ isAuthenticated: false, user: null });
      }
    } catch (error) {
      console.error('Error checking authentication:', error);
      set({ isAuthenticated: false, user: null });
    }
  },

  // Clear all application data to prevent data leakage
  clearApplicationData: async () => {
    console.log('🗑️ Clearing application data for user switch...');
    
    const keysToRemove = [
      // Application data keys
      'clean-app-images',
      'clean-app-form-data',
      'clean-app-bulk-data',
      'clean-app-selected-images',
      'clean-app-selections',
      'viewMode',
      'selected-images',
      'project-data',
      'form-data',
      'image-selections',
      'bulk-data',
      'metadata-storage',
      'defectSets',
      'user-pdfs',
      'pdf-storage',
      'pdf1Name',
      'pdf2Name',
      'pageStates1',
      'pageStates2',
      
      // Additional form-related keys
      'elr',
      'structureNo', 
      'date',
      'project-details',
      'project-form',
      'form-settings',
      'project-settings'
    ];
    
    // Remove specific keys
    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
        console.log(`🗑️ Removed key: ${key}`);
      } catch (error) {
        console.error(`Error removing key ${key}:`, error);
      }
    });
    
    // Clear all user-specific keys by pattern
    const allKeys = Object.keys(localStorage);
    const userSpecificKeys = allKeys.filter(key => 
      key.includes('clean-app-') ||
      key.includes('user-pdfs') ||
      key.includes('saved-pdfs') ||
      key.includes('project-') ||
      key.includes('form-') ||
      key.includes('image-') ||
      key.includes('bulk-') ||
      key.includes('defect-') ||
      key.includes('pdf-')
    );
    
    userSpecificKeys.forEach(key => {
      try {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
        console.log(`🗑️ Removed user-specific key: ${key}`);
      } catch (error) {
        console.error(`Error removing user-specific key ${key}:`, error);
      }
    });
    
    // Reset all Zustand stores
    try {
      const { useMetadataStore } = await import('./metadataStore');
      useMetadataStore.getState().reset();
      console.log('✅ Metadata store reset for user switch');
      
      const { usePDFStore } = await import('./pdfStore');
      usePDFStore.getState().reset();
      console.log('✅ PDF store reset for user switch');
      
      const { useProjectStore } = await import('./projectStore');
      useProjectStore.setState({ isLoading: false, error: null, isClearing: false });
      console.log('✅ Project store reset for user switch');
    } catch (error) {
      console.error('Error resetting stores for user switch:', error);
    }
    
    console.log('✅ All application data cleared for user switch');
  },
  
  getServiceInfo: () => {
    return {
      isUsingAWS: true, // Always using AWS now
      featureFlags: {} // Placeholder, as ServiceManager is removed
    };
  }
}));
