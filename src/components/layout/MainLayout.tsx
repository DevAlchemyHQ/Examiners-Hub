import React, { useState, useEffect } from 'react';
// import { useLocation } from 'react-router-dom';
import { Images, Map, FileText, Calculator, Brain, Trash2, TowerControl as GameController, Loader2, WalletCards } from 'lucide-react';
import { useMetadataStore } from '../../store/metadataStore';
import { useProjectStore } from '../../store/projectStore';
// import { usePDFStore } from '../../store/pdfStore';
import { Header } from '../Header';
import { Sidebar } from './Sidebar';
import { MainContent } from './MainContent';
import { GridReferenceFinder } from '../GridReferenceFinder/GridReferenceFinder';
import { PDFViewer } from '../PDFViewer/PDFViewer';
import { CalculatorTabs } from '../calculators/CalculatorTabs';
import { SubscriptionTab } from '../subscriptions/subscriptionTab';
import { GameTabs } from '../games/GameTabs';
import { FeedbackTab } from '../FeedbackTab';
import { DownloadButton } from '../DownloadButton';

type TabType = 'images' | 'pdf' | 'calculator' | 'bcmi' | 'grid' | 'games' | 'subscription';

interface MainLayoutProps {
  children?: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  // const location = useLocation();
  const [activeTab, setActiveTab] = useState<TabType>('images');
  const { images, selectedImages, loadUserData } = useMetadataStore();
  // const { file1, file2 } = usePDFStore();
  const { clearProject, isLoading: isClearingProject } = useProjectStore();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Load user data only on initial mount
  useEffect(() => {
    const initialLoad = async () => {
      try {
        await loadUserData();
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setIsLoadingData(false);
        setIsInitialLoad(false);
      }
    };
    initialLoad();
  }, []);

  // Auto-save changes
  useEffect(() => {
    if (images.length > 0 && !isInitialLoad) {
      const saveTimeout = setTimeout(() => {
        useMetadataStore.getState().saveUserData().catch(error => {
          console.error('Error saving user data:', error);
        });
      }, 1000);

      return () => clearTimeout(saveTimeout);
    }
  }, [images, selectedImages, isInitialLoad]);

  const handleClearProject = async () => {
    try {
      setIsLoadingData(true);
      await clearProject();
      // Force reload user data after clearing
      await loadUserData();
      setShowClearConfirm(false);
    } catch (error) {
      console.error('Error clearing project:', error);
    } finally {
      setIsLoadingData(false);
    }
  };
  

  const handleUpgradeClick = () => {
    setActiveTab('subscription');
  };


<DownloadButton onUpgradeClick={handleUpgradeClick} setActiveTab={(tab) => setActiveTab(tab as TabType)} />

  // If we're rendering children (like the profile page), just show the header
  if (children) {
    return (
      <>
        <Header />
        {children}
        <FeedbackTab />
      </>
    );
  }

  const isLoading = isClearingProject || isLoadingData;

  // Show loading screen on initial load
  if (isInitialLoad) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-900 flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-gray-400">Loading your project...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900 flex flex-col">
      <Header />
      <main className="flex-1 max-w-[1920px] mx-auto w-full px-2 overflow-hidden">
        <div className="flex-shrink-0">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-gray-700">
            <div className="flex items-center gap-0.5">
              {[
                { id: 'images', icon: Images, label: 'Images' },
                { id: 'pdf', icon: FileText, label: 'PDF' },
                { id: 'calculator', icon: Calculator, label: 'Calc' },
                { id: 'grid', icon: Map, label: 'Grid' },
                { id: 'bcmi', icon: Brain, label: 'BCMI & AI' },
                { id: 'games', icon: GameController, label: 'Games' },
                { id: 'subscription', icon: WalletCards, label: 'Subscription' }
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

            {images.length > 0 && (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="flex items-center gap-1 px-2 py-1 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
                {isLoading ? 'Processing...' : 'New Project'}
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 h-[calc(100vh-96px)] overflow-hidden">
          <div className={`transition-opacity duration-300 ${isLoading ? 'opacity-50' : 'opacity-100'}`}>
            {activeTab === 'images' ? (
              <div className="h-full grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-2 overflow-hidden">
                  <Sidebar />
                </div>
                <MainContent />
              </div>
            ) : activeTab === 'pdf' ? (
              <div className="h-full">
                <PDFViewer />
              </div>
            ) : activeTab === 'calculator' ? (
              <CalculatorTabs />
            ) : activeTab === 'grid' ? (
              <GridReferenceFinder />
            ) : activeTab === 'games' ? (
              <GameTabs />
            ) : activeTab === 'subscription' ? (
              <SubscriptionTab />
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
              Start New Project?
            </h3>
            <p className="text-slate-600 dark:text-gray-300 mb-6">
              This will clear all current images and metadata. This action cannot be undone.
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
                disabled={isLoading}
                className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isLoading ? (
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

      <FeedbackTab />
    </div>
  );
};