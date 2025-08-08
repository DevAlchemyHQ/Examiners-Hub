import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import { LoginScreen } from './components/LoginScreen';
import MainApp from './pages/MainApp';
import { LandingPage } from './pages/LandingPage';
import { FeedbackAdmin } from './pages/FeedbackAdmin';
import { CalculatorPage } from './pages/calculator.page';
import { GamesPage } from './pages/games.page';
import { GridReferenceFinderPage } from './pages/grid.page';
import { FAQ } from './pages/FAQ';
import { useAnalytics } from './hooks/useAnalytics';

import { ProjectsPage } from './pages/projects.pages';
import { SubscriptionPage } from './pages/subscription.page';
import './index.css';

// Page View Tracker Component
function PageViewTracker() {
  const location = useLocation();
  const { trackPageView } = useAnalytics();

  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname, trackPageView]);

  return null;
}

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App crashed:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="text-center text-white">
            <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
            <p className="mb-4">The app encountered an error. Please refresh the page.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Cache busting version - updated for deployment
const APP_VERSION = '1.1.2-' + Date.now();

function App() {
  const { user, isAuthenticated, checkAuth } = useAuthStore();

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('Initializing app...');
        
        // ONLY check authentication - don't load data yet
        await checkAuth();
        
        console.log('✅ App initialization complete');
      } catch (error) {
        console.error('❌ Error initializing app:', error);
        // Don't force auth to false - just log the error
      }
    };

    initializeApp();
  }, [checkAuth]);

  return (
    <ErrorBoundary>
      <Router>
        <div className="App">
          <Toaster position="top-right" />
          <Routes>
            <Route path="/" element={<LoginScreen />} />
            <Route path="/login" element={<LoginScreen />} />
            <Route path="/app/*" element={<MainApp />} />
            <Route path="/dashboard" element={<MainApp />} />
            <Route path="/subscriptions" element={<MainApp />} />
            <Route path="/bcmi" element={<MainApp />} />
            <Route path="/feedback-admin" element={<FeedbackAdmin />} />
            <Route path="/calculator" element={<CalculatorPage />} />
            <Route path="/games" element={<GamesPage />} />
            <Route path="/grid" element={<GridReferenceFinderPage />} />
            <Route path="/faq" element={<FAQ />} />

            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/subscription" element={<SubscriptionPage />} />
          </Routes>
          <PageViewTracker />
          {/* Cache busting comment */}
          {/* Version: {APP_VERSION} */}
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
// Test deployment - Sat Jul 19 20:28:55 BST 2025
