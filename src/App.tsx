import React, { useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import { LoginScreen } from './components/LoginScreen';
import { MainLayout } from './components/layout/MainLayout';
import { FeedbackAdmin } from './pages/FeedbackAdmin';
import { UserProfile } from './components/profile/UserProfile';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useThemeStore } from './store/themeStore';

const App: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const isDark = useThemeStore((state) => state.isDark);

  // Apply dark mode class
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/feedback" 
          element={isAuthenticated ? <FeedbackAdmin /> : <Navigate to="/" replace />} 
        />
        <Route
          path="/profile"
          element={
            isAuthenticated ? (
              <div className="min-h-screen bg-slate-50 dark:bg-gray-900">
                <MainLayout>
                  <UserProfile />
                </MainLayout>
              </div>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route 
          path="/" 
          element={isAuthenticated ? <MainLayout /> : <LoginScreen />} 
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;