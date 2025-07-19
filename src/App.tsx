import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import { useMetadataStore } from './store/metadataStore';
import { LoginScreen } from './components/LoginScreen';
import MainApp from './pages/MainApp';
import { LandingPage } from './pages/LandingPage';
import { FeedbackAdmin } from './pages/FeedbackAdmin';
import { CalculatorPage } from './pages/calculator.page';
import { GamesPage } from './pages/games.page';
import { GridReferenceFinderPage } from './pages/grid.page';
import { PDFViewerPage } from './pages/pdf.page';
import { ProjectsPage } from './pages/projects.pages';
import { SubscriptionPage } from './pages/subscription.page';
import './index.css';

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

function App() {
  const { user, isAuthenticated, checkAuth } = useAuthStore();
  const { loadUserData, loadBulkData } = useMetadataStore();

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('Initializing app...');
        
        // Check authentication status
        await checkAuth();
        
        // If user is authenticated, load their data
        if (isAuthenticated && user) {
          console.log('User authenticated, loading data for:', user.email);
          
          // Load user data (form data, images, etc.)
          await loadUserData();
          
          // Load bulk defects data
          await loadBulkData();
          
          console.log('✅ App initialization complete');
        } else {
          console.log('No authenticated user found');
        }
      } catch (error) {
        console.error('❌ Error initializing app:', error);
      }
    };

    initializeApp();
  }, [isAuthenticated, user, checkAuth, loadUserData, loadBulkData]);

  return (
    <Router>
      <div className="App">
        <Toaster position="top-right" />
        <Routes>
          <Route path="/" element={
            isAuthenticated === null ? (
              // Show loading while checking auth
              <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-center text-white">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
                  <p>Loading...</p>
                </div>
              </div>
            ) : isAuthenticated ? (
              <MainApp />
            ) : (
              <LandingPage />
            )
          } />
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/app" element={<MainApp />} />
          <Route path="/feedback-admin" element={<FeedbackAdmin />} />
          <Route path="/calculator" element={<CalculatorPage />} />
          <Route path="/games" element={<GamesPage />} />
          <Route path="/grid" element={<GridReferenceFinderPage />} />
          <Route path="/pdf" element={<PDFViewerPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/subscription" element={<SubscriptionPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
