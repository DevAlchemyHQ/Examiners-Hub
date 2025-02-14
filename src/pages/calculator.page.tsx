import React, {useEffect, useState} from 'react';
import { Header } from '../components/Header';
import { Loader2 } from 'lucide-react';
import { AreaCalculator } from '../components/calculators/AreaCalculator';
import { ChainsConverter } from '../components/calculators/ChainsConverter';
import { UnitConverter } from '../components/calculators/UnitConverter';

export const CalculatorPage: React.FC = () => {
    const [loading, setLoading] = useState(false);


    useEffect(() => {
        setLoading(false);
    }, []);

    return (
        <div className="min-h-screen overflow-auto p-4 bg-gray-900 text-white relative">
            <Header />

            {loading ? (
                <main className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto mb-4" />
                        <p className="text-slate-600 dark:text-gray-400">Just a Moment...</p>
                    </div>
                </main>
            ) : (
                <div className="h-[calc(100vh-120px)] overflow-auto p-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <AreaCalculator />
                    <ChainsConverter />
                    <UnitConverter />
                </div>
                </div>
            )}
        </div>
    );
};