import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { LoginScreen } from './components/LoginScreen';
import MainApp from './pages/MainApp';
import { migrationMonitor } from './lib/migrationMonitor';
import './lib/migrationTest'; // Import migration test
import './index.css';

function App() {
  const { isAuthenticated } = useAuthStore();
  
  // Use actual authentication state
  const isAuthenticatedForTesting = isAuthenticated;

  // Initialize migration monitoring
  useEffect(() => {
    migrationMonitor.initialize();
    
    // Test services every 30 seconds
    const interval = setInterval(() => {
      migrationMonitor.testAllServices();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Router>
      <div className="App">
        <Routes>
          {isAuthenticatedForTesting ? (
            <>
              <Route path="/" element={<Navigate to="/app" replace />} />
              <Route path="/app/*" element={<MainApp />} />
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
