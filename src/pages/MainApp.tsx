import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useMetadataStore } from '../store/metadataStore';
import { usePDFStore } from '../store/pdfStore';
import { LoginScreen } from '../components/LoginScreen';
import { Header } from '../components/Header';
import { MainLayout } from './home';
import { FeedbackAdmin } from './FeedbackAdmin';
import { UserProfile } from '../components/profile/UserProfile';
import { SubscriptionPage } from './subscription.page';
import { CalculatorPage } from './calculator.page';
import { GamesPage } from './games.page';
import { GridReferenceFinderPage } from './grid.page';
import { FAQ } from './FAQ';


const MainApp = () => {
  const { isAuthenticated, checkAuth } = useAuthStore();
  const { loadUserData } = useMetadataStore();
  const { initializePDFs } = usePDFStore();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await checkAuth();
      } catch (error) {
        console.error('Auth initialization failed:', error);
      } finally {
        setIsInitialized(true);
      }
    };

    initializeAuth();
  }, [checkAuth]);

  // Load user data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const loadData = async () => {
        try {
          console.log('Loading user data for authenticated user...');
          await loadUserData();
          await initializePDFs();
          console.log('User data loaded successfully');
        } catch (error) {
          console.error('Error loading user data:', error);
        }
      };
      
      loadData();
    }
  }, [isAuthenticated, loadUserData, initializePDFs]);

  // Show loading while initializing
  if (!isInitialized || isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  // Show login if not authenticated
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  // Show app if authenticated
  return (
    <div className="min-h-screen bg-gray-900">
      <Header />
      <Routes>
        <Route path="/" element={<MainLayout />} />
        <Route path="feedback" element={<FeedbackAdmin />} />
        <Route path="profile" element={<UserProfile />} />
        <Route path="subscriptions" element={<SubscriptionPage />} />
        <Route path="calculator" element={<CalculatorPage />} />
        <Route path="games" element={<GamesPage />} />
        <Route path="grid" element={<GridReferenceFinderPage />} />

        <Route path="bcmi" element={<MainLayout />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
};

export default MainApp; 