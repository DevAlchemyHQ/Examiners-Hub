import React, { useState } from 'react';
import { ImageGrid } from '../ImageGrid';
import { SelectedImagesPanel } from '../SelectedImagesPanel';

export const MainContent: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="lg:col-span-10 grid grid-cols-1 lg:grid-cols-12 gap-4 h-full overflow-hidden">
      {/* Image Grid - Hide when expanded */}
      {!isExpanded && (
        <div className="h-full overflow-hidden lg:col-span-6">
          <ImageGrid />
        </div>
      )}

      {/* Selected Images Panel - Expand to full width when expanded */}
      <div className={`h-full overflow-hidden transition-all duration-300 ${
        isExpanded ? 'lg:col-span-12' : 'lg:col-span-6'
      }`}>
        <SelectedImagesPanel 
          onExpand={() => setIsExpanded(!isExpanded)} 
          isExpanded={isExpanded} 
        />
      </div>
    </div>
  );
};