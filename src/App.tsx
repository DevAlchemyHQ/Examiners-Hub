import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useThemeStore } from './store/themeStore';
import React, { useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import { LoginScreen } from './components/LoginScreen';
import { MainLayout } from './pages/home';
import { FeedbackAdmin } from './pages/FeedbackAdmin';
import { UserProfile } from './components/profile/UserProfile';
// import { ProjectsPage } from './pages/projects.pages';
import { SubscriptionPage } from './pages/subscription.page';
import { GamesPage } from './pages/games.page';
import { CalculatorPage } from './pages/calculator.page';
import { GridReferenceFinderPage } from './pages/grid.page';
import { PDFViewerPage } from './pages/pdf.page';
import { LandingPage } from './pages/LandingPage';
import MainApp from './pages/MainApp';
import { useMetadataStore } from './store/metadataStore';
import { usePDFStore } from './store/pdfStore';
import { supabase } from './lib/supabase';

const ProtectedRoute: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <Outlet /> : <Navigate to="/" replace />;
};

const App: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const isDark = useThemeStore((state) => state.isDark);
  const { viewMode, setViewMode } = useMetadataStore();

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // Persist view mode in localStorage
  useEffect(() => {
    const savedMode = localStorage.getItem('viewMode');
    if (savedMode === 'bulk' || savedMode === 'images') {
      setViewMode(savedMode);
    }
  }, []);

  // Save view mode changes
  useEffect(() => {
    localStorage.setItem('viewMode', viewMode);
  }, [viewMode]);

  // Initialize Supabase session and sync auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error getting session:', error);
          return;
        }
        
        if (session?.user) {
          useAuthStore.getState().setUser(session.user);
          useAuthStore.getState().setAuth(true);
        } else {
          useAuthStore.getState().setAuth(false);
          useAuthStore.getState().setUser(null);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          useAuthStore.getState().setUser(session.user);
          useAuthStore.getState().setAuth(true);
        } else if (event === 'SIGNED_OUT') {
          useAuthStore.getState().setAuth(false);
          useAuthStore.getState().setUser(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      useMetadataStore.getState().loadUserData().catch(console.error);
      usePDFStore.getState().initializePDFs().catch(console.error);
    }
  }, [isAuthenticated]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={
          isAuthenticated ? (
            <Navigate to="/app/dashboard" replace />
          ) : (
            <LandingPage />
          )
        } />
        <Route path="/login" element={
          isAuthenticated ? (
            <Navigate to="/app/dashboard" replace />
          ) : (
            <LoginScreen />
          )
        } />

        {/* Protected routes */}
        <Route path="/app/*" element={
          isAuthenticated ? (
            <MainApp />
          ) : (
            <Navigate to="/login" replace />
          )
        } />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<MainLayout />} />
          {/* <Route path="/dashboard/:projectId" element={<MainLayout />} /> */}
          {/* <Route path="/projects" element={<ProjectsPage />} /> */}
          <Route path="/feedback" element={<FeedbackAdmin />} />
          <Route path="/profile" element={<UserProfile />} />
          <Route path="/subscriptions" element={<SubscriptionPage />} />
          <Route path="/calculator" element={<CalculatorPage />} />
          <Route path="/games" element={<GamesPage />} />
          <Route path="/grid" element={<GridReferenceFinderPage />} />
          <Route path="/pdf" element={<PDFViewerPage />} />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
