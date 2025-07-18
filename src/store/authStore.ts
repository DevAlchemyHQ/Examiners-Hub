// authStore.ts
import { create } from 'zustand';
import { User } from '@supabase/supabase-js';
import { AuthService, ServiceManager } from '../lib/services';

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
  isAuthenticated: JSON.parse(localStorage.getItem('isAuthenticated') || 'false'), // Start as not authenticated
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
    set({ isLoading: true });
    try {
      const user = await AuthService.getCurrentUser();
      if (user) {
        set({ isAuthenticated: true, user });
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('user', JSON.stringify(user));
      } else {
        set({ isAuthenticated: false, user: null });
        localStorage.setItem('isAuthenticated', 'false');
        localStorage.removeItem('user');
      }
    } catch (error) {
      console.error('Auth check error:', error);
      set({ isAuthenticated: false, user: null });
    } finally {
      set({ isLoading: false });
    }
  },
  
  getServiceInfo: () => {
    const featureFlags = ServiceManager.getFeatureFlags();
    return {
      isUsingAWS: ServiceManager.isUsingAWS('AUTH_USE_AWS'),
      featureFlags
    };
  }
}));
