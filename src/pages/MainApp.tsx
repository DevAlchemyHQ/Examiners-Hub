import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useMetadataStore } from '../store/metadataStore';
import { LoginScreen } from '../components/LoginScreen';
import { Header } from '../components/Header';
import { MainLayout } from '../components/layout/MainLayout';
import { UserProfile } from '../components/profile/UserProfile';
import { CalculatorTabs } from '../components/calculators/CalculatorTabs';
import { GameTabs } from '../components/games/GameTabs';
import { GridReferenceFinder } from '../components/GridReferenceFinder/GridReferenceFinder';
import RefreshBanner from '../components/RefreshBanner';

const MainApp = () => {
  const { isAuthenticated } = useAuthStore();
  const { loadUserData, loadAllUserDataFromAWS } = useMetadataStore();

  const [isInitialized, setIsInitialized] = useState(false);

  // Load user data when authenticated (no duplicate auth check - handled by App.tsx)
  useEffect(() => {
    if (isAuthenticated) {
      const loadData = async () => {
        try {
          // Check if project is being cleared - don't load data during clearing
          const { useProjectStore } = await import('../store/projectStore');
          const projectStore = useProjectStore.getState();
          if (projectStore.isClearing) {
            console.log('⏸️ Skipping data load during project clear');
            return;
          }
          
          // Check if project was recently cleared (within last 30 seconds)
          if (projectStore.clearCompletedAt && (Date.now() - projectStore.clearCompletedAt) < 30000) {
            console.log('⏸️ Skipping data load - project was recently cleared');
            return;
          }
          
          console.log('🔄 Loading user data for authenticated user...');
          
          // CLOUD-FIRST APPROACH: Load from AWS first for true cross-browser consistency
          // This matches the working commit 278db7e - simple and stable
          console.log('☁️ Loading data from AWS (Cloud-First)...');
          await loadAllUserDataFromAWS();
          
          console.log('✅ User data loaded successfully from AWS (Cloud-First)');
        } catch (error) {
          console.error('❌ Error loading user data from AWS:', error);
          
          // If AWS fails, try localStorage as fallback
          try {
            console.log('📱 Falling back to localStorage...');
            await loadUserData();
            console.log('✅ User data loaded from localStorage fallback');
          } catch (fallbackError) {
            console.error('❌ Fallback to localStorage also failed:', fallbackError);
          }
        } finally {
          setIsInitialized(true);
        }
      };
      
      loadData();
    } else {
      // If not authenticated, mark as initialized immediately (to show login screen)
      setIsInitialized(true);
    }
  }, [isAuthenticated, loadUserData, loadAllUserDataFromAWS]);

  // Periodic session state saving to both localStorage and AWS
  useEffect(() => {
    if (isAuthenticated) {
      const { saveSessionState, smartAutoSave } = useMetadataStore.getState();
      
      // Save session state to localStorage every 2 minutes
      const localStorageInterval = setInterval(() => {
        saveSessionState();
      }, 120000);
      
      // Save comprehensive data to AWS every 10 minutes for cross-browser persistence
      const awsInterval = setInterval(async () => {
        try {
          console.log('🔄 Periodic AWS save for cross-browser persistence...');
          await smartAutoSave('all');
          console.log('✅ Periodic AWS save completed successfully');
        } catch (error) {
          console.error('❌ Periodic AWS save failed:', error);
        }
      }, 600000); // 10 minutes
      
      // Save session state when user leaves the page
      const handleBeforeUnload = () => {
        saveSessionState();
        // Only save to AWS, don't reload data
        smartAutoSave('all').catch(error => {
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
  }, [isAuthenticated]);

  // Show dark background while loading - prevents blank page flicker
  // This ensures no white flash - page stays dark until data loads
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gray-900" style={{ backgroundColor: '#111827' }}>
        {/* Dark background - no content until loaded */}
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
      <Routes>
        <Route path="/" element={<MainLayout />} />
        <Route path="profile" element={<UserProfile />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
};

export default MainApp;