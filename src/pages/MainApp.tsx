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
  const { loadUserData, loadAllUserDataFromAWS, startPolling } = useMetadataStore();

  // Initialize immediately if authenticated - no loading screen to prevent flicker
  // Data loads from localStorage first (instant), then AWS syncs in background
  const [isInitialized, setIsInitialized] = useState(() => {
    // If authenticated, show UI immediately (data will load async but UI won't block)
    // localStorage data will appear instantly via loadUserData
    return isAuthenticated === true;
  });

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
          
          // CRITICAL: Wait for next frame to ensure DOM is stable before loading data
          // This prevents any layout shifts or movements during refresh
          await new Promise(resolve => {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                resolve(undefined);
              });
            });
          });
          
          // INSTANT DISPLAY: Load localStorage first for immediate UI (no flicker)
          // NOTE: Critical data (selectedImages, formData) already loaded synchronously in store initialization
          // This just loads remaining data (images from S3, etc.)
          console.log('📱 Loading remaining data from localStorage/S3 (no flicker - critical data already loaded)...');
          await loadUserData();
          console.log('✅ User data loaded from localStorage (instant display)');
          
          // Mark as initialized immediately (UI already showing data)
          setIsInitialized(true);
          
          // BACKGROUND SYNC: Load from AWS in background (non-blocking)
          // This ensures we have latest data without blocking UI
          // Only update if data actually changed (prevents unnecessary movement)
          // CRITICAL: Delay AWS sync to ensure page is fully stable first
          setTimeout(() => {
            console.log('☁️ Syncing with AWS in background (non-blocking)...');
            loadAllUserDataFromAWS().then(() => {
              console.log('✅ AWS sync completed in background - latest state restored');
            }).catch((err) => {
              console.error('⚠️ AWS sync failed (using local data):', err);
            });
          }, 500); // Small delay to ensure page is fully rendered
          
          // Start polling for cross-browser sync
          console.log('🔄 Starting polling for cross-browser sync...');
          startPolling();
        } catch (error) {
          console.error('❌ Error loading user data:', error);
          setIsInitialized(true); // Still show UI even if load fails
        }
      };
      
      loadData();
    } else {
      // If not authenticated, still mark as initialized (to show login screen)
      setIsInitialized(true);
    }
  }, [isAuthenticated, loadUserData, loadAllUserDataFromAWS, startPolling]);

  // Periodic session state saving to both localStorage and AWS
  useEffect(() => {
    if (isAuthenticated) {
      const { saveSessionState, smartAutoSave } = useMetadataStore.getState();
      
      // Save session state to localStorage every 30 seconds
      const localStorageInterval = setInterval(() => {
        saveSessionState();
      }, 30000);
      
      // REMOVED: Periodic AWS saves cause race conditions where one tab overwrites another's data
      // AWS saves are now only triggered by user actions (form changes, etc.) to prevent conflicts
      
      // Save session state when user leaves the page
      const handleBeforeUnload = () => {
        saveSessionState();
        // Also save to AWS before leaving for cross-browser persistence
        smartAutoSave('all').catch(error => {
          console.error('❌ AWS save before unload failed:', error);
        });
      };
      
      window.addEventListener('beforeunload', handleBeforeUnload);
      
      return () => {
        clearInterval(localStorageInterval);
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [isAuthenticated]);

  // Test cross-browser persistence functionality
  const testCrossBrowserPersistence = async () => {
    try {
      console.log('🧪 Testing cross-browser persistence...');
      
      const { smartAutoSave, loadAllUserDataFromAWS } = useMetadataStore.getState();
      
      // Test saving all data to AWS
      console.log('💾 Testing AWS save...');
      await smartAutoSave('all');
      console.log('✅ AWS save test completed');
      
      // Test loading data from AWS
      console.log('📥 Testing AWS load...');
      await loadAllUserDataFromAWS();
      console.log('✅ AWS load test completed');
      
      console.log('🎉 Cross-browser persistence test completed successfully!');
      
      // Show success message to user
      if (typeof window !== 'undefined' && window.toast) {
        window.toast.success('Cross-browser persistence test completed successfully!');
      }
      
    } catch (error) {
      console.error('❌ Cross-browser persistence test failed:', error);
      
      // Show error message to user
      if (typeof window !== 'undefined' && window.toast) {
        window.toast.error('Cross-browser persistence test failed. Check console for details.');
      }
    }
  };

  // Show login if not authenticated (only show if auth check complete)
  // No loading screen - auth initializes from localStorage immediately
  if (isAuthenticated === false) {
    return <LoginScreen />;
  }

  // Show loading only if auth is still being checked (should be rare)
  if (isAuthenticated === null && !isInitialized) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  // Show app if authenticated
  return (
    <div className="min-h-screen bg-gray-900">
      <RefreshBanner />
      <Routes>
        <Route path="/" element={<MainLayout />} />
        <Route path="profile" element={<UserProfile />} />
        <Route path="calculator" element={<CalculatorTabs />} />
        <Route path="games" element={<GameTabs />} />
        <Route path="grid" element={<GridReferenceFinder />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
};

export default MainApp;