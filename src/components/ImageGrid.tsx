import React from 'react';
import { useMetadataStore } from '../store/metadataStore';
import { useGridWidth } from '../hooks/useGridWidth';
import { ImageGridItem } from './ImageGridItem';
import { ImageUpload } from './ImageUpload';

export const ImageGrid: React.FC = () => {
  const { images, formData, setFormData } = useMetadataStore();
  const { gridWidth, setGridWidth } = useGridWidth();

  // Handlers for project details
  const handleELRChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ elr: e.target.value.toUpperCase() });
  };
  const handleStructureNoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ structureNo: e.target.value });
  };
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ date: e.target.value });
  };

  // Separate sketches and defects
  const sketchImages = images.filter(img => img.isSketch);
  const defectImages = images.filter(img => !img.isSketch);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-slate-200 dark:border-gray-700 h-full flex flex-col">
      {/* Single horizontal header: Project details form (left), Upload, Grid controls (right) */}
      <div className="flex items-center justify-between p-2 border-b border-slate-200 dark:border-gray-700">
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
            onClick={() => setGridWidth(Math.max(3, gridWidth - 1))}
            className="px-2 py-1 text-sm bg-slate-100 dark:bg-gray-700 rounded hover:bg-slate-200 dark:hover:bg-gray-600"
          >
            -
          </button>
          <button
            onClick={() => setGridWidth(Math.min(8, gridWidth + 1))}
            className="px-2 py-1 text-sm bg-slate-100 dark:bg-gray-700 rounded hover:bg-slate-200 dark:hover:bg-gray-600"
          >
            +
          </button>
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
