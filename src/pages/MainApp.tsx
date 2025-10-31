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
          
          // PHASE 1: Initial Load - Set context for localStorage-first loading
          const { useMetadataStore } = await import('../store/metadataStore');
          useMetadataStore.setState({
            loadContext: {
              phase: 'initial-load',
              source: 'localStorage',
              isFirstRender: true,
            },
          });
          
          // LOCAL-FIRST FOR INSTANT DISPLAY: Load localStorage first (instant), then sync AWS (latest)
          // This prevents empty state flicker and preserves selections if AWS hasn't synced
          console.log('📱 Loading data from localStorage first (instant display)...');
          await loadUserData();
          console.log('✅ User data loaded from localStorage (instant display)');
          
          // PHASE 2: Background Sync - Set context for AWS sync
          useMetadataStore.setState({
            loadContext: {
              phase: 'sync',
              source: 'aws',
              isFirstRender: false,
            },
            syncState: {
              syncInProgress: true,
              lastSyncAttempt: Date.now(),
              lastSuccessfulSync: useMetadataStore.getState().syncState.lastSuccessfulSync,
            },
          });
          
          // THEN SYNC AWS: Load from AWS to get latest cross-browser data
          // AWS will only overwrite if it has data, preserving localStorage if AWS is empty
          console.log('☁️ Syncing with AWS for latest data...');
          await loadAllUserDataFromAWS();
          console.log('✅ AWS sync completed (latest data)');
          
          // Update sync state after completion
          useMetadataStore.setState({
            syncState: {
              syncInProgress: false,
              lastSyncAttempt: Date.now(),
              lastSuccessfulSync: Date.now(),
            },
          });
        } catch (error) {
          console.error('❌ Error loading user data:', error);
          // Data already loaded from localStorage above, so user sees something
        } finally {
          setIsInitialized(true);
          // Enable transitions ONLY after data is fully loaded (prevents flicker during refresh)
          // Add small delay to ensure all components have finished rendering
          setTimeout(() => {
            document.documentElement.classList.add('loaded');
          }, 100);
        }
      };
      
      loadData();
    } else {
      // If not authenticated, mark as initialized immediately (to show login screen)
      setIsInitialized(true);
      // Enable transitions immediately for login screen (no data to load)
      requestAnimationFrame(() => {
        document.documentElement.classList.add('loaded');
      });
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

  // Show nothing while loading - App.tsx already handles dark background
  // This prevents blank page flicker - page stays dark via App.tsx styling
  if (!isInitialized) {
    return null; // App.tsx has dark background styling, so no need to render div
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