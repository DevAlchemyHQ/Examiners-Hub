import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useMetadataStore } from '../store/metadataStore';
import { Header } from '../components/Header';
import { Sidebar } from '../components/layout/Sidebar';
import { MainContent } from '../components/layout/MainContent';

interface MainLayoutProps {
    children?: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
    const { loadUserData } = useMetadataStore();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                await loadUserData();
            } catch (error) {
                console.error('Error loading user data:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    if (children) {
        return (
            <>
                <Header />
                {children}
            </>
        );
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-gray-900 flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                <p className="text-slate-600 dark:text-gray-400 mt-4">Just a Moment...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-gray-900 flex flex-col">
            <Header />
            <main className="flex-1 max-w-[1920px] mx-auto w-full px-2 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-4 mt-5">
                <div className="lg:col-span-2">
                    <Sidebar />
                </div>
                <MainContent />
            </main>
        </div>
    );
};