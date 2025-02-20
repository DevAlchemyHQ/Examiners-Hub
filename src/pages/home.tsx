import React, { useState, useEffect } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { useMetadataStore } from '../store/metadataStore';
import { useProjectStore } from '../store/projectStore';
import { Header } from '../components/Header';
import { Sidebar } from '../components/layout/Sidebar';
import { MainContent } from '../components/layout/MainContent';

interface MainLayoutProps {
    children?: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
    const { images, loadUserData } = useMetadataStore();
    const { clearProject, isLoading: isClearingProject } = useProjectStore();
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [isInitialLoad, setIsInitialLoad] = useState(true);

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

    const handleClearProject = async () => {
        try {
        setIsLoadingData(true);
        await clearProject();
        await loadUserData();
        setShowClearConfirm(false);
        } catch (error) {
        console.error('Error clearing project:', error);
        } finally {
        setIsLoadingData(false);
        }
    };

    const isLoading = isClearingProject || isLoadingData;

    if (children) {
        return (
        <>
            <Header />
            {children}
        </>
        );
    }

    if (isInitialLoad) {
        return (
        <div className="min-h-screen bg-slate-50 dark:bg-gray-900 flex flex-col">
            <Header />
            <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto mb-4" />
                <p className="text-slate-600 dark:text-gray-400">Just a Moment...</p>
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

            <div className="h-full grid grid-cols-1 lg:grid-cols-12 gap-4 mt-5">
                <div className="lg:col-span-2 overflow-hidden">
                    <Sidebar />
                </div>
                <MainContent />
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
        </div>
    );
};