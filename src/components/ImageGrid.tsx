import React from 'react';
import { useMetadataStore } from '../store/metadataStore';
import { useGridWidth } from '../hooks/useGridWidth';
import { ImageGridItem } from './ImageGridItem';

export const ImageGrid: React.FC = () => {
  const { images } = useMetadataStore();
  const { gridWidth, setGridWidth } = useGridWidth();

  // Separate sketches and defects
  const sketchImages = images.filter(img => img.isSketch);
  const defectImages = images.filter(img => !img.isSketch);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm h-full flex flex-col">
      <div className="p-4 border-b border-slate-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
            Images ({images.length})
          </h2>
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
        <div className="text-sm text-slate-500 dark:text-gray-400 mt-1">
          {sketchImages.length} Sketches, {defectImages.length} Exam Photos
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
