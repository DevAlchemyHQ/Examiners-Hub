import React, { useState, useEffect } from 'react';
import { Header } from '../Header';
import { Sidebar } from './Sidebar';
import { MainContent } from './MainContent';
import { GridReferenceFinder } from '../GridReferenceFinder/GridReferenceFinder';

import { CalculatorTabs } from '../calculators/CalculatorTabs';
import { GameTabs } from '../games/GameTabs';
import { Images, Map, Calculator, Brain, Trash2, TowerControl as GameController, Loader2, FolderOpen } from 'lucide-react';
import { useMetadataStore } from '../../store/metadataStore';
import { usePDFStore } from '../../store/pdfStore';
import { useProjectStore } from '../../store/projectStore';
import { FeedbackTab } from '../FeedbackTab';
import { MigrationStatus } from '../MigrationStatus';
import { MigrationControls } from '../MigrationControls';
import { useLocation } from 'react-router-dom';

type TabType = 'images' | 'calculator' | 'bcmi' | 'grid' | 'games' | 'project';

interface MainLayoutProps {
  children?: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<TabType>('images');
  const { images, selectedImages, loadUserData, isLoading, isInitialized } = useMetadataStore();
  // const { file1, file2 } = usePDFStore();
  const { clearProject, isLoading: isClearingProject, isClearing } = useProjectStore();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearResult, setClearResult] = useState<'success' | 'error' | null>(null);
  const [clearError, setClearError] = useState<string | null>(null);

  // Load user data only on initial mount
  useEffect(() => {
    if (!isInitialized) {
      const initialLoad = async () => {
        try {
          await loadUserData();
        } catch (error) {
          console.error('Error loading user data:', error);
        }
      };
      initialLoad();
    }
  }, [isInitialized, loadUserData]);

  // Auto-save changes (but not during clearing)
  useEffect(() => {
    if (images.length > 0 && isInitialized && !isClearing) {
      const saveTimeout = setTimeout(() => {
        useMetadataStore.getState().saveUserData().catch(error => {
          console.error('Error saving user data:', error);
        });
      }, 15000);

      return () => clearTimeout(saveTimeout);
    }
  }, [images, selectedImages, isInitialized, isClearing]);

  const handleClearProject = async () => {
    try {
      console.log('🚀 handleClearProject called - starting clear process...');
      setClearResult(null);
      setClearError(null);
      
      // Call the clearProject function (which handles everything)
      console.log('📞 Calling clearProject function...');
      await clearProject();
      console.log('✅ clearProject function completed');
      
      // Don't reset stores again - clearProject already does this
      // Just log the final state
      console.log('📊 Final state after clear:', {
        images: useMetadataStore.getState().images,
        formData: useMetadataStore.getState().formData,
        pdf1: usePDFStore.getState().file1,
        pdf2: usePDFStore.getState().file2
      });
      
      setShowClearConfirm(false);
      setClearResult('success');
      console.log('✅ Clear project completed successfully');
    } catch (error) {
      console.error('❌ Error clearing project:', error);
      setClearResult('error');
      setClearError(error instanceof Error ? error.message : 'Failed to clear project');
    }
  };

  // If we're rendering children (like the profile page), just show the header
  if (children) {
    return (
      <>
        <Header />
        {children}
        <MigrationStatus />
        <MigrationControls />
        <FeedbackTab />
      </>
    );
  }

  const isLoading = isClearingProject || isLoading;

  return (
    <div className="h-screen w-full bg-gray-900 flex flex-col overflow-hidden">
      <Header />
      <MigrationStatus />
      <MigrationControls />
      <main className="flex-1 w-full px-2 overflow-hidden bg-gray-900 h-full">
        <div className="flex-shrink-0">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-gray-700">
            <div className="flex items-center gap-0.5">
              {[
                { id: 'images', icon: Images, label: 'Images' },
                { id: 'calculator', icon: Calculator, label: 'Calc' },
                { id: 'grid', icon: Map, label: 'Grid' },
                { id: 'bcmi', icon: Brain, label: 'BCMI & AI' },
                { id: 'games', icon: GameController, label: 'Games' },
                { id: 'project', icon: FolderOpen, label: 'Project' }
              ].map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as TabType)}
                  className={`flex items-center gap-1 px-2 py-1.5 min-w-[70px] ${
                    activeTab === id
                      ? 'border-b-2 border-indigo-500 text-indigo-500'
                      : 'text-slate-600 dark:text-gray-300'
                  }`}
                >
                  <Icon size={14} />
                  <span className="text-xs whitespace-nowrap">{label}</span>
                </button>
              ))}
            </div>
            
            {/* Clear project buttons - always visible when on Images tab */}
            {activeTab === 'images' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => useProjectStore.getState().testAWSOperations()}
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors"
                >
                  <Brain size={12} />
                  Test AWS
                </button>
                <button
                  onClick={() => setShowClearConfirm(true)}
                  disabled={isClearingProject || isLoading}
                  className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white rounded text-xs hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 size={12} />
                  {isClearingProject || isLoading ? 'Clearing...' : 'Clear Project'}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 h-[calc(100vh-120px)] overflow-hidden">
          {/* Remove opacity transition to prevent flickering */}
          <div className="h-full">
            {activeTab === 'images' ? (
              <div className="h-full grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-2 overflow-hidden">
                  {/* Pass isLoading to Sidebar for skeletons */}
                  <Sidebar isLoading={isLoading} />
                </div>
                {/* Pass isLoading to MainContent for skeletons */}
                <MainContent isLoading={isLoading} />
              </div>
            ) : activeTab === 'calculator' ? (
              <CalculatorTabs />
            ) : activeTab === 'grid' ? (
              <GridReferenceFinder />
            ) : activeTab === 'games' ? (
              <GameTabs />
            ) : activeTab === 'project' ? (
              <div className="h-full flex items-center justify-center">
                <div className="max-w-md w-full p-6 bg-white dark:bg-gray-800 rounded-lg shadow-xl">
                  <div className="text-center mb-6">
                    <FolderOpen size={48} className="mx-auto mb-4 text-indigo-500" />
                    <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">
                      Project Management
                    </h2>
                    <p className="text-slate-600 dark:text-gray-300">
                      Manage your current project data and settings
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="p-4 border border-slate-200 dark:border-gray-700 rounded-lg">
                      <h3 className="font-medium text-slate-800 dark:text-white mb-2">Current Project Status</h3>
                      <div className="space-y-2 text-sm text-slate-600 dark:text-gray-300">
                        <div className="flex justify-between">
                          <span>Images:</span>
                          <span className="font-medium">{images.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Selected Images:</span>
                          <span className="font-medium">{selectedImages.size}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => useProjectStore.getState().testAWSOperations()}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        <Brain size={16} />
                        Test AWS
                      </button>
                      
                      <button
                        onClick={() => setShowClearConfirm(true)}
                        disabled={isClearingProject || isLoading}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isClearingProject || isLoading ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            Clearing Project...
                          </>
                        ) : (
                          <>
                            <Trash2 size={16} />
                            Clear Project
                          </>
                        )}
                      </button>
                    </div>
                    
                    <div className="text-xs text-slate-500 dark:text-gray-400 text-center">
                      This will clear all project details, saved images, bulk defect entries, and selected images. Load defects functionality will remain intact.
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 dark:text-gray-500">
                <div className="text-center">
                  <Brain size={48} className="mx-auto mb-4 opacity-50" />
                  <p>BCMI & AI features coming soon!</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">
              Clear Project Data?
            </h3>
            <p className="text-slate-600 dark:text-gray-300 mb-6">
              This will clear all project details, saved images, bulk defect entries, and selected images. Load defects functionality will remain intact. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 text-sm text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClearProject}
                disabled={isClearingProject || isLoading}
                className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isClearingProject || isLoading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Clearing...
                  </>
                ) : (
                  'Clear Project'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {clearResult && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            {clearResult === 'success' ? (
              <>
                <h3 className="text-lg font-semibold text-green-700 dark:text-green-400 mb-4">Project Data Cleared</h3>
                <p className="text-slate-600 dark:text-gray-300 mb-6">All project details, saved images, bulk defect entries, and selected images have been cleared. Load defects functionality remains available. The canvas is now empty.</p>
                <div className="flex justify-end">
                  <button
                    onClick={() => setClearResult(null)}
                    className="px-4 py-2 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    OK
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-4">Failed to Delete Project Data</h3>
                <p className="text-slate-600 dark:text-gray-300 mb-6">{clearError || 'An unknown error occurred. Please try again.'}</p>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setClearResult(null)}
                    className="px-4 py-2 text-sm bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleClearProject}
                    className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <FeedbackTab />
    </div>
  );
};