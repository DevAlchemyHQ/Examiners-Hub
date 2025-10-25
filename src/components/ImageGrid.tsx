import React, { useEffect, useState } from 'react';
import { useMetadataStore } from '../store/metadataStore';
import { useProjectStore } from '../store/projectStore';
import { useGridWidth } from '../hooks/useGridWidth';
import { useAnalytics } from '../hooks/useAnalytics';
import { ImageGridItem } from './ImageGridItem';
import { ImageUpload } from './ImageUpload';
import { Trash2, Loader2 } from 'lucide-react';

export const ImageGrid: React.FC = () => {
  const { images, formData, setFormData, selectedImages, updateSessionState, loadUserData, isLoading } = useMetadataStore();
  const { clearProject } = useProjectStore();
  const { gridWidth, setGridWidth } = useGridWidth();
  const { trackGridLoad, trackImageSelection, trackUserAction } = useAnalytics();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearingProject, setIsClearingProject] = useState(false);

  // Check if form fields are incomplete
  const isFormIncomplete = () => {
    return !formData.elr?.trim() || !formData.structureNo?.trim() || !formData.date?.trim();
  };

  // Listen for cross-browser form data updates
  useEffect(() => {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel('exametry-sync');
      
      channel.onmessage = (event) => {
        console.log('📡 Cross-browser message received:', event.data);
        const { type, data } = event.data;
        
        if (type === 'formDataUpdate') {
          console.log('🔄 Cross-browser form data update received');
          console.log('🔄 Incoming data:', data);
          
          const currentState = useMetadataStore.getState();
          const currentTimestamp = currentState.sessionState.lastActiveTime || 0;
          const incomingTimestamp = data.timestamp || 0;
          
          console.log('🔄 Timestamp comparison:', { currentTimestamp, incomingTimestamp });
          
          // Only update if incoming data is newer
          if (incomingTimestamp > currentTimestamp) {
            console.log('✅ Updating form data from other browser');
            setFormData(data.formData);
          } else {
            console.log('⚠️ Ignoring older form data update');
          }
        }
      };
      
      return () => {
        channel.close();
      };
    }
  }, [setFormData]);

  // Track grid load and image selection
  useEffect(() => {
    if (images.length > 0) {
      trackGridLoad(images.length, 'image_grid');
    }
  }, [images.length, trackGridLoad]);

  useEffect(() => {
    if (images.length > 0) {
      trackImageSelection(selectedImages?.length || 0, images.length);
    }
  }, [selectedImages?.length, images.length, trackImageSelection]);

  // Handlers for project details
  const handleELRChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.toUpperCase();
    setFormData({ elr: newValue });
    
    // Broadcast form data changes to other tabs
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel('exametry-sync');
      channel.postMessage({ 
        type: 'formDataUpdate', 
        data: { formData: { ...formData, elr: newValue }, timestamp: Date.now() } 
      });
      console.log('📡 ELR change broadcast sent:', newValue);
      channel.close();
    }
    
    trackUserAction('form_input', 'elr_change');
  };
  const handleStructureNoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setFormData({ structureNo: newValue });
    
    // Broadcast form data changes to other tabs
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel('exametry-sync');
      channel.postMessage({ 
        type: 'formDataUpdate', 
        data: { formData: { ...formData, structureNo: newValue }, timestamp: Date.now() } 
      });
      console.log('📡 Structure No change broadcast sent:', newValue);
      channel.close();
    }
    
    trackUserAction('form_input', 'structure_no_change');
  };
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setFormData({ date: newValue });
    
    // Broadcast form data changes to other tabs
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel('exametry-sync');
      channel.postMessage({ 
        type: 'formDataUpdate', 
        data: { formData: { ...formData, date: newValue }, timestamp: Date.now() } 
      });
      console.log('📡 Date change broadcast sent:', newValue);
      channel.close();
    }
    
    trackUserAction('form_input', 'date_change');
  };

  // Track grid width changes
  const handleGridWidthChange = (newWidth: number) => {
    setGridWidth(newWidth);
    trackUserAction('grid_resize', 'width_change', newWidth);
    
    // Save session state
    updateSessionState({ gridWidth: newWidth });
  };

  // Clear project handler
  const handleClearProject = async () => {
    setIsClearingProject(true);
    try {
      console.log('🚀 handleClearProject called - starting clear process...');
      
      // Call the actual clearProject function from project store
      await clearProject();
      console.log('✅ clearProject function completed');
      
      setShowClearConfirm(false);
      trackUserAction('project_clear', 'clear_project');
      console.log('✅ Clear project completed successfully');
    } catch (error) {
      console.error('❌ Error clearing project:', error);
    } finally {
      setIsClearingProject(false);
    }
  };

  // Separate sketches and defects
  const sketchImages = images.filter(img => img.isSketch);
  const defectImages = images.filter(img => !img.isSketch);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-slate-200 dark:border-gray-700 h-full flex flex-col">
      {/* Responsive header: Project details form and controls */}
      <div className="p-2 border-b border-slate-200 dark:border-gray-700">
        {/* Mobile: Stack vertically with better responsive design */}
        <div className="md:hidden space-y-2">
          {/* Form fields row - ensure they stay on one line */}
          <div className="flex items-center gap-1 min-w-0">
            <div className="flex items-center gap-1 flex-shrink-0">
              <label className="text-xs font-medium text-slate-600 dark:text-gray-400 whitespace-nowrap">ELR</label>
              <input
                type="text"
                value={formData.elr}
                onChange={handleELRChange}
                className={`p-1 text-xs border rounded text-slate-900 dark:text-white w-12 flex-shrink-0 ${
                  !formData.elr?.trim() ? 'bg-amber-50/30 dark:bg-amber-900/20 border-amber-300' : 'bg-white dark:bg-gray-800 border-slate-200 dark:border-gray-600'
                }`}
                placeholder="ELR"
                maxLength={8}
              />
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <label className="text-xs font-medium text-slate-600 dark:text-gray-400 whitespace-nowrap">No</label>
              <input
                type="text"
                value={formData.structureNo}
                onChange={handleStructureNoChange}
                className={`p-1 text-xs border rounded text-slate-900 dark:text-white w-12 flex-shrink-0 ${
                  !formData.structureNo?.trim() ? 'bg-amber-50/30 dark:bg-amber-900/20 border-amber-300' : 'bg-white dark:bg-gray-800 border-slate-200 dark:border-gray-600'
                }`}
                placeholder="No"
                maxLength={8}
              />
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <label className="text-xs font-medium text-slate-600 dark:text-gray-400 whitespace-nowrap">Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={handleDateChange}
                className={`p-1 text-xs border rounded text-slate-900 dark:text-white w-24 flex-shrink-0 ${
                  !formData.date?.trim() ? 'bg-amber-50/30 dark:bg-amber-900/20 border-amber-300' : 'bg-white dark:bg-gray-800 border-slate-200 dark:border-gray-600'
                }`}
              />
            </div>
          </div>
          {/* Controls row - keep upload and grid controls together */}
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="flex-shrink-0">
              <ImageUpload compact={true} />
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className="text-xs text-slate-500 dark:text-gray-400 whitespace-nowrap">Grid: {gridWidth}</span>
              <button
                onClick={() => handleGridWidthChange(Math.max(3, gridWidth - 1))}
                className="px-1.5 py-0.5 text-xs bg-slate-100 dark:bg-gray-700 rounded hover:bg-slate-200 dark:hover:bg-gray-600 flex-shrink-0"
              >
                -
              </button>
              <button
                onClick={() => handleGridWidthChange(Math.min(8, gridWidth + 1))}
                className="px-1.5 py-0.5 text-xs bg-slate-100 dark:bg-gray-700 rounded hover:bg-slate-200 dark:hover:bg-gray-600 flex-shrink-0"
              >
                +
              </button>
              {/* Clear Project button - only show when images are uploaded */}
              {images.length > 0 && (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  disabled={isClearingProject || isLoading}
                  className="flex items-center gap-1 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                >
                  {isClearingProject ? (
                    <Loader2 size={10} className="animate-spin" />
                  ) : (
                    <Trash2 size={10} />
                  )}
                  {isClearingProject ? 'Clearing...' : 'Clear'}
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Desktop: Horizontal layout with overflow protection */}
        <div className="hidden md:flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <div className="flex items-center gap-1 flex-shrink-0">
              <label className="text-xs font-medium text-slate-600 dark:text-gray-400 whitespace-nowrap">ELR</label>
              <input
                type="text"
                value={formData.elr}
                onChange={handleELRChange}
                className={`p-1 text-xs border rounded text-slate-900 dark:text-white w-16 flex-shrink-0 ${
                  !formData.elr?.trim() ? 'bg-amber-50/30 dark:bg-amber-900/20 border-amber-300' : 'bg-white dark:bg-gray-800 border-slate-200 dark:border-gray-600'
                }`}
                placeholder="ELR"
                maxLength={8}
              />
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <label className="text-xs font-medium text-slate-600 dark:text-gray-400 whitespace-nowrap">No</label>
              <input
                type="text"
                value={formData.structureNo}
                onChange={handleStructureNoChange}
                className={`p-1 text-xs border rounded text-slate-900 dark:text-white w-16 flex-shrink-0 ${
                  !formData.structureNo?.trim() ? 'bg-amber-50/30 dark:bg-amber-900/20 border-amber-300' : 'bg-white dark:bg-gray-800 border-slate-200 dark:border-gray-600'
                }`}
                placeholder="No"
                maxLength={8}
              />
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <label className="text-xs font-medium text-slate-600 dark:text-gray-400 whitespace-nowrap">Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={handleDateChange}
                className={`p-1 text-xs border rounded text-slate-900 dark:text-white w-28 flex-shrink-0 ${
                  !formData.date?.trim() ? 'bg-amber-50/30 dark:bg-amber-900/20 border-amber-300' : 'bg-white dark:bg-gray-800 border-slate-200 dark:border-gray-600'
                }`}
              />
            </div>
            <div className="flex-shrink-0">
              <ImageUpload compact={true} />
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-slate-500 dark:text-gray-400 whitespace-nowrap">
              Grid: {gridWidth}
            </span>
            <button
              onClick={() => handleGridWidthChange(Math.max(3, gridWidth - 1))}
              className="px-2 py-1 text-xs bg-slate-100 dark:bg-gray-700 rounded hover:bg-slate-200 dark:hover:bg-gray-600 flex-shrink-0"
            >
              -
            </button>
            <button
              onClick={() => handleGridWidthChange(Math.min(8, gridWidth + 1))}
              className="px-2 py-1 text-xs bg-slate-100 dark:bg-gray-700 rounded hover:bg-slate-200 dark:hover:bg-gray-600 flex-shrink-0"
            >
              +
            </button>
            {/* Clear Project button - only show when images are uploaded */}
            {images.length > 0 && (
              <button
                onClick={() => setShowClearConfirm(true)}
                disabled={isClearingProject || isLoading}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              >
                {isClearingProject ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Trash2 size={12} />
                )}
                {isClearingProject ? 'Clearing...' : 'Clear Project'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent hover:scrollbar-thumb-slate-400 dark:hover:scrollbar-thumb-gray-500" style={{ maxHeight: 'calc(100vh - 200px)' }}>
        {images.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-gray-400 p-8">
            <div className="text-6xl mb-4">📷</div>
            <p className="text-lg font-medium mb-2">No images uploaded yet</p>
            <p className="text-sm text-center">
              Upload some images to get started with your project
            </p>
          </div>
        ) : (
          <div className="p-2">
            <ImageGridItem images={images} gridWidth={gridWidth} />
          </div>
        )}
      </div>

      {/* Clear Project Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Clear All Project Data
            </h3>
            <div className="text-gray-600 dark:text-gray-300 mb-6 space-y-2">
              <p className="font-medium">This will permanently delete:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>All uploaded images from AWS S3</li>
                <li>All project data from AWS DynamoDB</li>
                <li>All form data and bulk defects</li>
                <li>All data from localStorage and sessionStorage</li>
                <li>All cookies and IndexedDB data</li>
              </ul>
              <p className="text-red-600 dark:text-red-400 font-medium mt-3">
                ⚠️ This action cannot be undone!
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClearProject}
                disabled={isClearingProject}
                className="px-4 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isClearingProject ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Clearing All Data...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Clear Everything
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};