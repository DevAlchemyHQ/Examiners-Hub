import React, {useEffect, useState} from 'react';
import { Loader2 } from 'lucide-react';
import { Header } from '../components/Header';

export const GridReferenceFinderPage: React.FC = () => {
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setLoading(false);
    }, []);

    
    return (
        <div className="min-h-screen overflow-auto p-4 bg-gray-900 text-white relative">
            <Header />

            { loading ? (
                <main className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto mb-4" />
                        <p className="text-slate-600 dark:text-gray-400">Just a Moment...</p>
                    </div>
                </main>
            ) : (
                <div className="h-[calc(100vh-120px)] bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-slate-200 dark:border-gray-700 overflow-hidden">
                <iframe
                    src="https://gridreferencefinder.com"
                    className="w-full h-full border-0"
                    title="Grid Reference Finder"
                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                    style={{ minHeight: '600px' }}
                />
            </div>
            )};
        </div>
    );
};