import React from 'react';
import { AreaCalculator } from './AreaCalculator';
import { ChainsConverter } from './ChainsConverter';
import { UnitConverter } from './UnitConverter';

export const CalculatorTabs: React.FC = () => {
  return (
    <div className="min-h-[calc(100vh-120px)] overflow-auto p-6 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Engineering Calculators
          </h1>
          <p className="text-base text-gray-600 dark:text-gray-300">
            Professional tools for area calculations, distance conversions, and unit conversions
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <AreaCalculator />
          <ChainsConverter />
          <UnitConverter />
        </div>
      </div>
    </div>
  );
};