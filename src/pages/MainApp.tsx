import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useMetadataStore } from '../store/metadataStore';
import LoginScreen from '../components/LoginScreen';
import Header from '../components/layout/Header';
import MainLayout from '../components/layout/MainLayout';
import FeedbackAdmin from '../components/FeedbackAdmin';
import UserProfile from '../components/UserProfile';
import SubscriptionPage from '../components/SubscriptionPage';
import CalculatorPage from '../components/CalculatorPage';
import GamesPage from '../components/GamesPage';
import GridReferenceFinderPage from '../components/GridReferenceFinderPage';
import RefreshBanner from '../components/RefreshBanner';

const MainApp = () => {
  const { isAuthenticated, checkAuth } = useAuthStore();
  const { loadUserData, loadAllUserDataFromAWS, saveAllUserDataToAWS } = useMetadataStore();

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
          console.log('🔄 Loading user data for authenticated user...');
          
          // First try to load from AWS for cross-browser persistence
          console.log('☁️ Attempting to load data from AWS...');
          await loadAllUserDataFromAWS();
          
          // Then load from localStorage as fallback
          console.log('📱 Loading data from localStorage as fallback...');
          await loadUserData();
          
          console.log('✅ User data loaded successfully from both sources');
        } catch (error) {
          console.error('❌ Error loading user data:', error);
          
          // If AWS fails, still try localStorage
          try {
            console.log('📱 Falling back to localStorage only...');
            await loadUserData();
            console.log('✅ User data loaded from localStorage fallback');
          } catch (fallbackError) {
            console.error('❌ Fallback to localStorage also failed:', fallbackError);
          }
        }
      };
      
      loadData();
    }
  }, [isAuthenticated, loadUserData, loadAllUserDataFromAWS]);

  // Periodic session state saving to both localStorage and AWS
  useEffect(() => {
    if (isAuthenticated) {
      const { saveSessionState } = useMetadataStore.getState();
      
      // Save session state to localStorage every 30 seconds
      const localStorageInterval = setInterval(() => {
        saveSessionState();
      }, 30000);
      
      // Save comprehensive data to AWS every 2 minutes for cross-browser persistence
      const awsInterval = setInterval(async () => {
        try {
          console.log('🔄 Periodic AWS save for cross-browser persistence...');
          await saveAllUserDataToAWS();
        } catch (error) {
          console.error('❌ Periodic AWS save failed:', error);
        }
      }, 120000); // 2 minutes
      
      // Save session state when user leaves the page
      const handleBeforeUnload = () => {
        saveSessionState();
        // Also save to AWS before leaving
        saveAllUserDataToAWS().catch(error => {
          console.error('❌ AWS save before unload failed:', error);
        });
      };
      
      window.addEventListener('beforeunload', handleBeforeUnload);
      
      return () => {
        clearInterval(localStorageInterval);
        clearInterval(awsInterval);
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [isAuthenticated, saveAllUserDataToAWS]);

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