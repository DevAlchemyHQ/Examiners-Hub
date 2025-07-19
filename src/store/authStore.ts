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
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  setAuth: (isAuthenticated: boolean) => void;
  setUser: (user: User | null) => void;
  setLoading: (isLoading: boolean) => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  getServiceInfo: () => { isUsingAWS: boolean; featureFlags: any };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false, // Start as not authenticated
  user: null, // Start with no user
  isLoading: false,
  
  setAuth: (isAuthenticated) => {
    localStorage.setItem('isAuthenticated', JSON.stringify(isAuthenticated));
    set({ isAuthenticated });
  },
  
  setUser: (user) => {
    localStorage.setItem('user', JSON.stringify(user));
    set({ user });
  },
  
  setLoading: (isLoading) => {
    set({ isLoading });
  },
  
  logout: async () => {
    set({ isLoading: true });
    try {
      await AuthService.signOut();
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('user');
      set({ isAuthenticated: false, user: null });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      set({ isLoading: false });
    }
  },
  
  checkAuth: async () => {
    try {
      const { user, error } = await AuthService.getCurrentUser();
      
      if (error) {
        console.error('Auth check error:', error);
        set({ isAuthenticated: false, user: null });
        return;
      }
      
      if (user) {
        set({ isAuthenticated: true, user });
      } else {
        set({ isAuthenticated: false, user: null });
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      set({ isAuthenticated: false, user: null });
    }
  },
  
  getServiceInfo: () => {
    return {
      isUsingAWS: false, // Removed ServiceManager.isUsingAWS
      featureFlags: {} // Placeholder, as ServiceManager is removed
    };
  }
}));
