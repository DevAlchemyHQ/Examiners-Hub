import React, { useState, useEffect } from 'react';
import { ImageGrid } from '../ImageGrid';
import { SelectedImagesPanel } from '../SelectedImagesPanel';
import { useMetadataStore } from '../../store/metadataStore';

export const MainContent: React.FC<{ isLoading?: boolean }> = ({ isLoading }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { updateSessionState } = useMetadataStore();

  // Save session state when panel expands/collapses
  useEffect(() => {
    updateSessionState({ panelExpanded: isExpanded });
  }, [isExpanded, updateSessionState]);

  return (
    <div className="lg:col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-120px)] overflow-hidden">
      {/* Image Grid - Hide when expanded */}
      {!isExpanded && (
        <div className="h-full overflow-y-auto content-scrollbar lg:col-span-6">
          <ImageGrid />
        </div>
      )}

      {/* Selected Images Panel - Expand to full width when expanded */}
      <div className={`h-full overflow-y-auto content-scrollbar transition-all duration-300 ${
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