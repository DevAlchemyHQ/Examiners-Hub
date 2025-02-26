// authStore.ts
import { create } from 'zustand';
import { User } from '@supabase/supabase-js';

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  setAuth: (isAuthenticated: boolean) => void;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: JSON.parse(localStorage.getItem('isAuthenticated') || 'false'),
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  setAuth: (isAuthenticated) => {
    localStorage.setItem('isAuthenticated', JSON.stringify(isAuthenticated));
    set({ isAuthenticated });
  },
  setUser: (user) => {
    localStorage.setItem('user', JSON.stringify(user));
    set({ user });
  },
  logout: () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('user');
    set({ isAuthenticated: false, user: null });
  }
}));
