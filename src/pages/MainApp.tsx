import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useMetadataStore } from '../store/metadataStore';

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
import RefreshBanner from '../components/RefreshBanner';


const MainApp = () => {
  const { isAuthenticated, checkAuth } = useAuthStore();
  const { loadUserData } = useMetadataStore();

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
          console.log('User data loaded successfully');
        } catch (error) {
          console.error('Error loading user data:', error);
        }
      };
      
      loadData();
    }
  }, [isAuthenticated, loadUserData]);

  // Periodic session state saving
  useEffect(() => {
    if (isAuthenticated) {
      const { saveSessionState } = useMetadataStore.getState();
      
      // Save session state every 30 seconds
      const interval = setInterval(() => {
        saveSessionState();
      }, 30000);
      
      // Save session state when user leaves the page
      const handleBeforeUnload = () => {
        saveSessionState();
      };
      
      window.addEventListener('beforeunload', handleBeforeUnload);
      
      return () => {
        clearInterval(interval);
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [isAuthenticated]);

  // Show loading only if we haven't initialized yet (first time check)
  if (!isInitialized) {
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
      <RefreshBanner />
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