import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { LoginScreen } from './components/LoginScreen';
import MainApp from './pages/MainApp';
import { migrationMonitor } from './lib/migrationMonitor';
import './lib/migrationTest'; // Import migration test
import './index.css';

function App() {
  const { isAuthenticated, checkAuth } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  
  // Check authentication on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await checkAuth();
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeAuth();
  }, [checkAuth]);

  // Initialize migration monitoring
  useEffect(() => {
    migrationMonitor.initialize();
    
    // Test services every 30 seconds
    const interval = setInterval(() => {
      migrationMonitor.testAllServices();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <Router>
      <div className="App">
        <Routes>
          {isAuthenticated ? (
            <>
              <Route path="/" element={<Navigate to="/app" replace />} />
              <Route path="/app/*" element={<MainApp />} />
              <Route path="/*" element={<Navigate to="/app" replace />} />
            </>
          ) : (
            <>
              <Route path="/" element={<LoginScreen />} />
              <Route path="/*" element={<Navigate to="/" replace />} />
            </>
          )}
        </Routes>
      </div>
    </Router>
  );
}

export default App;
