// authStore.ts
import { create } from 'zustand';
import { AuthService } from '../lib/services';

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
  validateSession: () => Promise<boolean>;
  getServiceInfo: () => { isUsingAWS: boolean; featureFlags: any };
  checkForStaleUserData: () => Promise<void>;
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
      // Clear all session data first
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('user');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('session');
      
      // Then call AWS signout
      await AuthService.signOut();
      
      // Update state
      set({ isAuthenticated: false, user: null });
      
      console.log('✅ Logout completed successfully');
    } catch (error) {
      console.error('Logout error:', error);
      // Even if signOut fails, clear local state
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('user');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('session');
      set({ isAuthenticated: false, user: null });
    } finally {
      set({ isLoading: false });
    }
  },
  
  checkAuth: async () => {
    try {
      console.log('Checking authentication status...');
      
      // CRITICAL FIX: Check for stale user data and clear if needed
      await get().checkForStaleUserData();
      
      // First, validate the session with AWS
      const { valid, user } = await AuthService.validateSession();
      
      if (valid && user) {
        console.log('✅ Valid session found for user:', user.email);
        set({ isAuthenticated: true, user });
        localStorage.setItem('isAuthenticated', 'true');
      } else {
        console.log('❌ No valid session found');
        // Clear any invalid data
        localStorage.removeItem('user');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('session');
        localStorage.removeItem('isAuthenticated');
        set({ isAuthenticated: false, user: null });
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      // Clear invalid data on error
      localStorage.removeItem('user');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('session');
      localStorage.removeItem('isAuthenticated');
      set({ isAuthenticated: false, user: null });
    }
  },
  
  // CRITICAL FIX: Check for stale user data
  checkForStaleUserData: async () => {
    try {
      console.log('🔍 Checking for stale user data...');
      
      const storedUser = localStorage.getItem('user');
      const storedSession = localStorage.getItem('session');
      const storedUserEmail = localStorage.getItem('userEmail');
      
      if (storedUser || storedSession || storedUserEmail) {
        console.log('⚠️ Found potentially stale user data:');
        console.log('  - User:', storedUser ? 'present' : 'none');
        console.log('  - Session:', storedSession ? 'present' : 'none');
        console.log('  - UserEmail:', storedUserEmail || 'none');
        
        // Clear all user-related data to prevent cross-user leakage
        console.log('🧹 Clearing stale user data...');
        localStorage.removeItem('user');
        localStorage.removeItem('session');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('isAuthenticated');
        
        // Also clear any project-related data that might belong to previous user
        const keysToRemove = [
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
          'pdf-storage',
          'pdf1Name',
          'pdf2Name',
          'pageStates1',
          'pageStates2'
        ];
        
        keysToRemove.forEach(key => {
          try {
            localStorage.removeItem(key);
            console.log(`🗑️ Removed: ${key}`);
          } catch (error) {
            console.error(`Error removing key ${key}:`, error);
          }
        });
        
        console.log('✅ Stale user data cleared');
      } else {
        console.log('✅ No stale user data found');
      }
    } catch (error) {
      console.error('Error checking for stale user data:', error);
    }
  },
  
  validateSession: async () => {
    try {
      const { valid, user } = await AuthService.validateSession();
      
      if (!valid) {
        // Auto-logout if session is invalid
        await get().logout();
        return false;
      }
      
      // Update state if user changed
      if (user && (!get().user || get().user?.email !== user.email)) {
        set({ user, isAuthenticated: true });
      }
      
      return valid;
    } catch (error) {
      console.error('Session validation error:', error);
      await get().logout();
      return false;
    }
  },
  
  getServiceInfo: () => {
    return {
      isUsingAWS: true, // Always using AWS now
      featureFlags: {} // Placeholder, as ServiceManager is removed
    };
  }
}));
