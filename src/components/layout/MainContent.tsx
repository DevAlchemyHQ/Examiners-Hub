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
    <div className="h-full grid grid-cols-1 lg:grid-cols-12 gap-0">
      {/* Left side with input fields and image grid */}
      <div className="h-full lg:col-span-6 flex flex-col">
        {/* Input fields section */}
        <div className="flex-shrink-0 p-4 space-y-4 bg-gray-800 border-b border-gray-700">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">ELR</label>
              <input
                type="text"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter ELR"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">No</label>
              <input
                type="text"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter number"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Date</label>
            <input
              type="date"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button className="w-full px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors">
            Upload
          </button>
        </div>
        
        {/* Image Grid - Now extends to left edge */}
        <div className="flex-1 overflow-hidden">
          <div ref={imageGridRef} className="h-full">
            <ImageGrid />
          </div>
        </div>
      </div>

      {/* Selected Images Panel - Expand to full width when expanded */}
      <div 
        className={`h-full transition-all duration-300 ${
          isExpanded ? 'lg:col-span-12' : 'lg:col-span-6'
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