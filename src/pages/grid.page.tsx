import React from 'react';
import { Header } from '../components/Header';

export const GridReferenceFinderPage: React.FC = () => {
    return (
        <div className="min-h-screen overflow-auto p-4 bg-gray-900 text-white relative">
            <Header />

            <div className="h-[calc(100vh-120px)] bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-slate-200 dark:border-gray-700 overflow-hidden">
                <iframe
                    src="https://gridreferencefinder.com"
                    className="w-full h-full border-0"
                    title="Grid Reference Finder"
                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                    style={{ minHeight: '600px' }}
                />
            </div>
        </div>
    );
};