import React, { useEffect } from 'react';
import { useMetadataStore } from '../store/metadataStore';
import { useGridWidth } from '../hooks/useGridWidth';
import { useAnalytics } from '../hooks/useAnalytics';
import { ImageGridItem } from './ImageGridItem';
import { ImageUpload } from './ImageUpload';

export const ImageGrid: React.FC = () => {
  const { images, formData, setFormData, selectedImages } = useMetadataStore();
  const { gridWidth, setGridWidth } = useGridWidth();
  const { trackGridLoad, trackImageSelection, trackUserAction } = useAnalytics();

  // Track grid load and image selection
  useEffect(() => {
    if (images.length > 0) {
      trackGridLoad(images.length, 'image_grid');
    }
  }, [images.length, trackGridLoad]);

  useEffect(() => {
    if (images.length > 0) {
      trackImageSelection(selectedImages.size, images.length);
    }
  }, [selectedImages.size, images.length, trackImageSelection]);

  // Handlers for project details
  const handleELRChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ elr: e.target.value.toUpperCase() });
    trackUserAction('form_input', 'elr_change');
  };
  const handleStructureNoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ structureNo: e.target.value });
    trackUserAction('form_input', 'structure_no_change');
  };
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ date: e.target.value });
    trackUserAction('form_input', 'date_change');
  };

  // Track grid width changes
  const handleGridWidthChange = (newWidth: number) => {
    setGridWidth(newWidth);
    trackUserAction('grid_resize', 'width_change', newWidth);
  };

  // Separate sketches and defects
  const sketchImages = images.filter(img => img.isSketch);
  const defectImages = images.filter(img => !img.isSketch);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-slate-200 dark:border-gray-700 h-full flex flex-col">
      {/* Responsive header: Project details form and controls */}
      <div className="p-2 border-b border-slate-200 dark:border-gray-700">
        {/* Mobile: Stack vertically */}
        <div className="md:hidden space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1">
              <label className="text-xs font-medium text-slate-600 dark:text-gray-400">ELR</label>
              <input
                type="text"
                value={formData.elr}
                onChange={handleELRChange}
                className="p-1 text-xs border border-slate-200 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-slate-900 dark:text-white w-16"
                placeholder="ELR"
                maxLength={8}
              />
            </div>
            <div className="flex items-center gap-1">
              <label className="text-xs font-medium text-slate-600 dark:text-gray-400">No</label>
              <input
                type="text"
                value={formData.structureNo}
                onChange={handleStructureNoChange}
                className="p-1 text-xs border border-slate-200 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-slate-900 dark:text-white w-16"
                placeholder="No"
                maxLength={8}
              />
            </div>
            <div className="flex items-center gap-1">
              <label className="text-xs font-medium text-slate-600 dark:text-gray-400">Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={handleDateChange}
                className="p-1 text-xs border border-slate-200 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-slate-900 dark:text-white w-28"
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <ImageUpload compact={true} />
            <div className="flex items-center gap-1">
              <span className="text-xs text-slate-500 dark:text-gray-400">Grid: {gridWidth}</span>
              <button
                onClick={() => handleGridWidthChange(Math.max(3, gridWidth - 1))}
                className="px-1.5 py-0.5 text-xs bg-slate-100 dark:bg-gray-700 rounded hover:bg-slate-200 dark:hover:bg-gray-600"
              >
                -
              </button>
              <button
                onClick={() => handleGridWidthChange(Math.min(8, gridWidth + 1))}
                className="px-1.5 py-0.5 text-xs bg-slate-100 dark:bg-gray-700 rounded hover:bg-slate-200 dark:hover:bg-gray-600"
              >
                +
              </button>
            </div>
          </div>
        </div>
        
        {/* Desktop: Horizontal layout */}
        <div className="hidden md:flex items-center justify-between">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-600 dark:text-gray-400 mr-1 whitespace-nowrap">ELR</label>
            <input
              type="text"
              value={formData.elr}
              onChange={handleELRChange}
              className="p-1 text-xs border border-slate-200 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-slate-900 dark:text-white max-w-[70px] mr-2"
              placeholder="ELR"
              maxLength={8}
            />
            <label className="text-xs font-medium text-slate-600 dark:text-gray-400 mr-1 whitespace-nowrap">Structure No</label>
            <input
              type="text"
              value={formData.structureNo}
              onChange={handleStructureNoChange}
              className="p-1 text-xs border border-slate-200 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-slate-900 dark:text-white max-w-[70px] mr-2"
              placeholder="No"
              maxLength={8}
            />
            <label className="text-xs font-medium text-slate-600 dark:text-gray-400 mr-1 whitespace-nowrap">Date</label>
            <input
              type="date"
              value={formData.date}
              onChange={handleDateChange}
              className="p-1 text-xs border border-slate-200 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-slate-900 dark:text-white max-w-[120px] mr-2"
            />
            <ImageUpload compact={true} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500 dark:text-gray-400">
              Grid: {gridWidth}
            </span>
            <button
              onClick={() => handleGridWidthChange(Math.max(3, gridWidth - 1))}
              className="px-2 py-1 text-sm bg-slate-100 dark:bg-gray-700 rounded hover:bg-slate-200 dark:hover:bg-gray-600"
            >
              -
            </button>
            <button
              onClick={() => handleGridWidthChange(Math.min(8, gridWidth + 1))}
              className="px-2 py-1 text-sm bg-slate-100 dark:bg-gray-700 rounded hover:bg-slate-200 dark:hover:bg-gray-600"
            >
              +
            </button>
          </div>
        </div>
      </div>


      <div className="flex-1 overflow-hidden">
        {images.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-gray-400 p-8">
            <div className="text-6xl mb-4">📷</div>
            <p className="text-lg font-medium mb-2">No images uploaded yet</p>
            <p className="text-sm text-center">
              Upload some images to get started with your project
            </p>
            </div>
          ) : (
          <ImageGridItem images={images} gridWidth={gridWidth} />
              )}
      </div>
    </div>
  );
};
