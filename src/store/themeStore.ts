import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
  isDark: boolean;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    () => ({
      isDark: true, // Always dark mode
    }),
    {
      name: 'theme-storage',
    }
  )
);