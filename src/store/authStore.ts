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
      await AuthService.signOut();
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('user');
      localStorage.removeItem('userEmail');
      set({ isAuthenticated: false, user: null });
    } catch (error) {
      console.error('Logout error:', error);
      // Even if signOut fails, clear local state
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('user');
      localStorage.removeItem('userEmail');
      set({ isAuthenticated: false, user: null });
    } finally {
      set({ isLoading: false });
    }
  },
  
  checkAuth: async () => {
    try {
      console.log('Checking authentication status...');
      
      // Check localStorage for stored user session
      const storedUser = localStorage.getItem('user');
      const storedAuth = localStorage.getItem('isAuthenticated');
      
      if (storedUser && storedAuth === 'true') {
        try {
          const user = JSON.parse(storedUser);
          console.log('Found stored user session:', user.email);
          
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
        } catch (parseError) {
          console.error('Error parsing stored user:', parseError);
          // Clear invalid data
          localStorage.removeItem('user');
          localStorage.removeItem('isAuthenticated');
          localStorage.removeItem('userEmail');
          set({ isAuthenticated: false, user: null });
        }
      } else {
        console.log('No stored user session found');
        set({ isAuthenticated: false, user: null });
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      // Don't change auth state on error - just log it
      console.log('Auth check error, keeping current state');
    }
  },
  
  getServiceInfo: () => {
    return {
      isUsingAWS: true, // Always using AWS now
      featureFlags: {} // Placeholder, as ServiceManager is removed
    };
  }
}));
