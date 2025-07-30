import React, { useEffect } from 'react';
import { useThemeStore } from '../store/themeStore';

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const { isDark } = useThemeStore();

  useEffect(() => {
    // Apply theme to HTML element
    const html = document.documentElement;
    console.log('ThemeProvider: isDark =', isDark);
    console.log('ThemeProvider: Current HTML classes =', html.className);
    
    if (isDark) {
      html.classList.add('dark');
      console.log('ThemeProvider: Added dark class to HTML');
    } else {
      html.classList.remove('dark');
      console.log('ThemeProvider: Removed dark class from HTML');
    }
    
    // Log the final state
    console.log('ThemeProvider: Final HTML classes =', html.className);
    console.log('ThemeProvider: HTML has dark class =', html.classList.contains('dark'));
  }, [isDark]);

  // Also apply on mount
  useEffect(() => {
    const html = document.documentElement;
    html.classList.add('dark');
    console.log('ThemeProvider: Force applied dark class on mount');
    console.log('ThemeProvider: HTML classes after mount =', html.className);
  }, []);

  return <>{children}</>;
}; 