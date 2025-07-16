import React from 'react';
import { useMetadataStore } from '../store/metadataStore';
import { ImageGridItem } from './ImageGridItem';
import { GridWidthControl } from './GridWidthControl';
import { useGridWidth } from '../hooks/useGridWidth';
import { Loader2 } from 'lucide-react';


export const ImageGrid: React.FC<{ isLoading?: boolean }> = ({ isLoading = false }) => {
  const { images } = useMetadataStore();
  const { gridWidth, setGridWidth } = useGridWidth();

  // Separate sketches and defects
  const sketchImages = images.filter(img => img.isSketch);
  const defectImages = images.filter(img => !img.isSketch);

  return (
    <div className="bg-gray-900 rounded-lg shadow-sm h-full flex flex-col">
      <div className="p-4 border-b border-slate-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
            Images ({images.length})
          </h2>
          <GridWidthControl value={gridWidth} onChange={setGridWidth} />
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <div className="h-full overflow-y-auto bg-gray-900">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="grid grid-cols-3 gap-4 w-full p-8">
                {[...Array(9)].map((_, i) => (
                  <div key={i} className="aspect-square bg-slate-200 dark:bg-gray-700 animate-pulse rounded-lg" />
                ))}
              </div>
            </div>
          ) : images.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400 dark:text-gray-500">
              Please upload your Sketch or Exam photos to the canvas.
            </div>
          ) : (
            <div className="p-2">
              {sketchImages.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-slate-500 dark:text-gray-400 px-2 py-2 sticky top-0 bg-white dark:bg-gray-800 z-10">
                    SKETCHES ({sketchImages.length})
                  </h3>
                  <ImageGridItem images={sketchImages} gridWidth={gridWidth} />
                </div>
              )}
              {defectImages.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-slate-500 dark:text-gray-400 px-2 py-2 sticky top-0 bg-white dark:bg-gray-800 z-10">
                    EXAM PHOTOS ({defectImages.length})
                  </h3>
                  <ImageGridItem images={defectImages} gridWidth={gridWidth} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
