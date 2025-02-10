import React from 'react';
import { AreaCalculator } from './AreaCalculator';
import { ChainsConverter } from './ChainsConverter';
import { UnitConverter } from './UnitConverter';

export const CalculatorTabs: React.FC = () => {
  return (
    <div className="h-[calc(100vh-120px)] overflow-auto p-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <AreaCalculator />
        <ChainsConverter />
        <UnitConverter />
      </div>
    </div>
  );
};