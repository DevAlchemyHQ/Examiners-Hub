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

  // Group defect images by upload timestamp (within 5 seconds = same upload)
  const groupImagesByUpload = (images: any[]) => {
    if (images.length === 0) return [];
    
    const groups = [];
    let currentGroup = [images[0]];
    let lastTimestamp = images[0].uploadTimestamp || 0;
    
    for (let i = 1; i < images.length; i++) {
      const img = images[i];
      const timestamp = img.uploadTimestamp || 0;
      
      // If images were uploaded within 5 seconds of each other, group them
      if (Math.abs(timestamp - lastTimestamp) < 5000) {
        currentGroup.push(img);
      } else {
        // New upload group
        groups.push(currentGroup);
        currentGroup = [img];
        lastTimestamp = timestamp;
      }
    }
    
    // Add the last group
    groups.push(currentGroup);
    return groups;
  };

  const defectImageGroups = groupImagesByUpload(defectImages);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm h-full flex flex-col">
      <div className="p-4 border-b border-slate-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
            Images ({images.length})
          </h2>
          <GridWidthControl value={gridWidth} onChange={setGridWidth} />
        </div>
      </div>
      <div 
        className="flex-1 min-h-0 overflow-y-auto scrollbar-thin"
        style={{ 
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch'
        }}
      >
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
              {defectImageGroups.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-slate-500 dark:text-gray-400 px-2 py-2 sticky top-0 bg-white dark:bg-gray-800 z-10">
                    EXAM PHOTOS ({defectImages.length})
                  </h3>
                  {defectImageGroups.map((group, groupIndex) => (
                    <div key={groupIndex}>
                      {groupIndex > 0 && (
                        <div className="my-4 border-t border-slate-200 dark:border-gray-700">
                          <div className="text-xs text-slate-400 dark:text-gray-500 px-2 py-1 bg-slate-50 dark:bg-gray-800 rounded-lg inline-block mt-2">
                            New Upload
                          </div>
                        </div>
                      )}
                      <ImageGridItem images={group} gridWidth={gridWidth} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
      </div>
    </div>
  );
};
