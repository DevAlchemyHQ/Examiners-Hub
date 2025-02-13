import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useThemeStore } from './store/themeStore';
import React, { useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import { LoginScreen } from './components/LoginScreen';
import { MainLayout } from './components/layout/MainLayout';
import { FeedbackAdmin } from './pages/FeedbackAdmin';
import { UserProfile } from './components/profile/UserProfile';
import { ProjectsPage } from './pages/projects.pages';
import { SubscriptionPage } from './pages/subscription.page';
import { GamesPage } from './pages/games.page';
import { CalculatorPage } from './pages/calculator.page';
import { GridReferenceFinderPage } from './pages/grid.page';

const ProtectedRoute: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <Outlet /> : <Navigate to="/" replace />;
};

const App: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const isDark = useThemeStore((state) => state.isDark);

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
          path="/"
          element={
            isAuthenticated ? (
              <Navigate to={sessionStorage.getItem("lastPath") || "/projects"} replace />
            ) : (
              <LoginScreen />
            )
          }
        />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<MainLayout />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/feedback" element={<FeedbackAdmin />} />
          <Route path="/profile" element={<UserProfile />} />
          <Route path="/subscriptions" element={<SubscriptionPage />} />
          <Route path="/calculator" element={<CalculatorPage />} />
          <Route path="/games" element={<GamesPage />} />
          <Route path="/grid" element={<GridReferenceFinderPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
