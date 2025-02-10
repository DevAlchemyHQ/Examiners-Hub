import React, { useState } from 'react';
import { Snake } from './Snake';
import { Grid } from 'lucide-react';

export const GameTabs: React.FC = () => {
  return (
    <div className="h-[calc(100vh-120px)] bg-[#1A1D24] rounded-lg shadow-sm overflow-hidden flex flex-col">
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
    </div>
  );
};