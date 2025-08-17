import React, { useState, useEffect, useRef } from 'react';
import { ImageGrid } from '../ImageGrid';
import { SelectedImagesPanel } from '../SelectedImagesPanel';
import { useMetadataStore } from '../../store/metadataStore';

export const MainContent: React.FC<{ isLoading?: boolean }> = ({ isLoading }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { updateSessionState, sessionState } = useMetadataStore();
  const imageGridRef = useRef<HTMLDivElement>(null);
  const selectedPanelRef = useRef<HTMLDivElement>(null);

  // Save session state when panel expands/collapses
  useEffect(() => {
    updateSessionState({ panelExpanded: isExpanded });
  }, [isExpanded, updateSessionState]);

  // Restore scroll positions on mount
  useEffect(() => {
    if (sessionState.scrollPositions) {
      // Restore image grid scroll position
      if (imageGridRef.current && sessionState.scrollPositions.imageGrid > 0) {
        setTimeout(() => {
          if (imageGridRef.current) {
            imageGridRef.current.scrollTop = sessionState.scrollPositions.imageGrid;
          }
        }, 100);
      }

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
        imageGrid: imageGridRef.current?.scrollTop || 0,
        selectedPanel: selectedPanelRef.current?.scrollTop || 0,
        bulkPanel: 0, // Will be updated by bulk component
      };
      updateSessionState({ scrollPositions });
    };

    // Save scroll positions every 5 seconds
    const interval = setInterval(saveScrollPositions, 5000);

    // Save scroll positions on scroll events
    const imageGridElement = imageGridRef.current;
    const selectedPanelElement = selectedPanelRef.current;

    if (imageGridElement) {
      imageGridElement.addEventListener('scroll', saveScrollPositions);
    }
    if (selectedPanelElement) {
      selectedPanelElement.addEventListener('scroll', saveScrollPositions);
    }

    return () => {
      clearInterval(interval);
      if (imageGridElement) {
        imageGridElement.removeEventListener('scroll', saveScrollPositions);
      }
      if (selectedPanelElement) {
        selectedPanelElement.removeEventListener('scroll', saveScrollPositions);
      }
    };
  }, [updateSessionState]);

  return (
    <div className="h-full flex gap-4">
      {/* Image Grid - Hide when expanded */}
      {!isExpanded && (
        <div className="h-full flex-1">
          <div ref={imageGridRef} className="h-full">
            <ImageGrid />
          </div>
        </div>
      )}

      {/* Selected Images Panel - Expand to full width when expanded */}
      <div 
        className={`h-full transition-all duration-300 ${
          isExpanded ? 'flex-1' : 'flex-1'
        }`}
      >
        <div ref={selectedPanelRef} className="h-full overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent hover:scrollbar-thumb-slate-400 dark:hover:scrollbar-thumb-slate-400">
          <SelectedImagesPanel 
            onExpand={() => setIsExpanded(!isExpanded)} 
            isExpanded={isExpanded} 
          />
        </div>
      </div>
    </div>
  );
};