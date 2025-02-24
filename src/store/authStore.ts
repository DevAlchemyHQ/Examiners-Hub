import { create } from 'zustand';
import { User,  } from '@supabase/supabase-js';

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  setAuth: (isAuthenticated: boolean) => void;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,
  setAuth: (isAuthenticated) => set({ isAuthenticated }),
  setUser: (user) => set({ user }),
  logout: () => set({ isAuthenticated: false, user: null })
}));