import React, { useState, useEffect, useRef } from 'react';
import { SelectedImagesPanel } from '../SelectedImagesPanel';
import { useMetadataStore } from '../../store/metadataStore';

export const MainContent: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { updateSessionState, sessionState } = useMetadataStore();
  const selectedPanelRef = useRef<HTMLDivElement>(null);

  // Save session state when panel expands/collapses
  useEffect(() => {
    updateSessionState({ panelExpanded: isExpanded });
  }, [isExpanded, updateSessionState]);

  // Restore scroll positions on mount
  useEffect(() => {
    if (sessionState.scrollPositions) {
      // Restore selected panel scroll position
      if (selectedPanelRef.current && sessionState.scrollPositions.selectedPanel > 0) {
        setTimeout(() => {
          if (selectedPanelRef.current) {
            selectedPanelRef.current.scrollTop = sessionState.scrollPositions.selectedPanel;
          }
        }, 100);
      }
    }
  }, [sessionState.scrollPositions]);

  // Save scroll positions periodically
  useEffect(() => {
    const saveScrollPositions = () => {
      const scrollPositions = {
        imageGrid: 0, // ImageGrid is now in MainLayout
        selectedPanel: selectedPanelRef.current?.scrollTop || 0,
        bulkPanel: 0, // Will be updated by bulk component
      };
      updateSessionState({ scrollPositions });
    };

    // Save scroll positions every 5 seconds
    const interval = setInterval(saveScrollPositions, 5000);

    // Save scroll positions on scroll events
    const selectedPanelElement = selectedPanelRef.current;

    if (selectedPanelElement) {
      selectedPanelElement.addEventListener('scroll', saveScrollPositions);
    }

    return () => {
      clearInterval(interval);
      if (selectedPanelElement) {
        selectedPanelElement.removeEventListener('scroll', saveScrollPositions);
      }
    };
  }, [updateSessionState]);

  return (
    <div className="h-[calc(100vh-120px)]">
      {/* Selected Images Panel - Full width */}
      <div className="h-full">
        <div ref={selectedPanelRef} className="h-full overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent hover:scrollbar-thumb-slate-400 dark:hover:scrollbar-thumb-gray-500">
          <SelectedImagesPanel 
            onExpand={() => setIsExpanded(!isExpanded)} 
            isExpanded={isExpanded} 
          />
        </div>
      </div>
    </div>
  );
};