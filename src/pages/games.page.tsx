import React, { useEffect, useState } from 'react';
import { Grid, Loader2 } from 'lucide-react';
import { Header } from '../components/Header';
import { Snake } from '../components/games/Snake';

export const GamesPage: React.FC = () => {
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(false);
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-gray-900 flex flex-col">
            <Header />

            {loading ? (
                <main className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto mb-4" />
                        <p className="text-slate-600 dark:text-gray-400">Loading your games...</p>
                    </div>
                </main>
            ) : (
                <>
                    <div className="flex items-center gap-2 p-2 overflow-x-auto scrollbar-hide">
                        <div className="p-2 flex-shrink-0">
                            <Grid className="w-6 h-6 text-indigo-400" />
                        </div>
                        <div
                            className="flex items-center gap-2 px-4 sm:px-6 py-3 rounded-lg font-medium transition-colors flex-shrink-0 bg-indigo-500 text-white"
                        >
                        <Grid size={18} />
                            <span className="whitespace-nowrap">Snake</span>
                        </div>
                        </div>

                        <div className="flex-1 p-4 overflow-hidden">
                            <Snake />
                    </div>
                </>
            )}
        </div>
    )
};