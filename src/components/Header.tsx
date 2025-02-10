import React, { useState } from 'react';
import { LogOut, Sun, Moon, Info } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { WeatherDate } from './WeatherDate';
import { signOut } from '../lib/supabase';

const PROFILE_EMOJI = '🚂';

export const Header: React.FC = () => {
  const { logout } = useAuthStore();
  const { isDark, toggle } = useThemeStore();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showBetaInfo, setShowBetaInfo] = useState(false);

  const handleLogout = async () => {
    try {
      setShowProfileMenu(false);
      await signOut();
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Close profile menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.profile-menu') && !target.closest('.profile-button')) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div className="h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-800 dark:text-white">
            Welcome to Exametry 🙂
          </h1>
          
          <div className="flex items-center gap-4">
            <WeatherDate />
            
            <button
              onClick={toggle}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="profile-button w-10 h-10 rounded-full bg-indigo-500 text-white flex items-center justify-center text-lg hover:bg-indigo-600 transition overflow-hidden"
              >
                {PROFILE_EMOJI}
              </button>

              {showProfileMenu && (
                <div className="profile-menu absolute right-0 mt-2 w-48 bg-gray-800/90 rounded-lg shadow-xl border border-gray-700 backdrop-blur-lg z-50">
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-red-900/20 flex items-center gap-2"
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowBetaInfo(true)}
              className="text-xs font-medium px-2 py-1 bg-indigo-900/50 text-indigo-400 rounded-full hover:bg-indigo-900/70 transition-colors flex items-center gap-1"
            >
              <Info size={12} />
              BETA
            </button>
          </div>
        </div>
      </div>

      {showBetaInfo && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg">
                <Info className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
                Beta Version
              </h3>
            </div>
            <p className="text-slate-600 dark:text-gray-300 mb-6">
              Some features may be incomplete or have occasional glitches. We value your
              feedback and patience!
            </p>
            <button
              onClick={() => setShowBetaInfo(false)}
              className="w-full px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </header>
  );
};