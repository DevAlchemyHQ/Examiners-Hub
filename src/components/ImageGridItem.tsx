import React, { useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useMetadataStore } from '../store/metadataStore';
import { Maximize2 } from 'lucide-react';
import { ImageZoom } from './ImageZoom';
import { ImageMetadata } from '../types';
import { useLocation } from 'react-router-dom';

interface ImageGridItemProps {
  images: ImageMetadata[];
  gridWidth: number;
}

export const ImageGridItem: React.FC<ImageGridItemProps> = ({ images, gridWidth }) => {
  const { 
    selectedImages, 
    bulkSelectedImages, 
    toggleImageSelection, 
    toggleBulkImageSelection,
    viewMode,
    bulkDefects,
    setBulkDefects 
  } = useMetadataStore();
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const parentRef = React.useRef<HTMLDivElement>(null);
  const location = useLocation();
  
  // Use the correct selection set based on viewMode
  const selections = viewMode === 'bulk' ? bulkSelectedImages : selectedImages;
  const toggleSelection = viewMode === 'bulk' ? toggleBulkImageSelection : toggleImageSelection;

  const getDefectNumbers = (img: ImageMetadata) => {
    if (img.isSketch) return [];
    
    if (viewMode === 'bulk') {
      // In bulk mode, show bulk defect numbers
      return bulkDefects
        .filter(defect => defect.selectedFile === img.file.name)
        .map(defect => defect.photoNumber)
        .sort((a, b) => {
          const aNum = parseInt(a);
          const bNum = parseInt(b);
          return aNum - bNum;
        });
    } else {
      // In images mode, show the image's own number if selected
      return selectedImages.has(img.id) && img.photoNumber ? [img.photoNumber] : [];
    }
  };

  const rowVirtualizer = useVirtualizer({
    count: Math.ceil(images.length / gridWidth),
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200,
    overscan: 5,
  });

  const handleDefectNumberChange = (fileName: string, newNumber: string) => {
    setBulkDefects((prevDefects) => {
      const defectIndex = prevDefects.findIndex(d => d.selectedFile === fileName);
      if (defectIndex >= 0) {
        // Update existing defect
        const updatedDefects = [...prevDefects];
        updatedDefects[defectIndex] = {
          ...updatedDefects[defectIndex],
          photoNumber: newNumber
        };
        return updatedDefects;
      }
      // Add new defect
      return [...prevDefects, {
        photoNumber: newNumber,
        description: '',
        selectedFile: fileName
      }];
    });
  };

  // Remove or comment out the sorting logic for images
  const sortImages = (images: ImageMetadata[]) => {
    return images; // Return images without sorting
  };

  return (
    <>
      <div 
        ref={parentRef} 
        className="h-full overflow-y-auto scrollbar-thin"
        style={{ 
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const startIndex = virtualRow.index * gridWidth;
            const rowImages = images.slice(startIndex, startIndex + gridWidth);

            return (
              <div
                key={virtualRow.index}
                className="absolute top-0 left-0 w-full grid gap-2 p-2"
                style={{
                  transform: `translateY(${virtualRow.start}px)`,
                  gridTemplateColumns: `repeat(${gridWidth}, 1fr)`,
                }}
              >
                {rowImages.map((img) => {
                  const isSelected = selections.has(img.id);
                  const defectNumbers = getDefectNumbers(img);
                  
                  return (
                    <div 
                      key={img.id} 
                      className="relative aspect-square cursor-pointer group touch-manipulation"
                      onClick={() => toggleSelection(img.id)}
                    >
                      <div className={`relative rounded-lg overflow-hidden h-full ${
                        isSelected ? 'ring-2 ring-indigo-500' : ''
                      }`}>
                        <img
                          src={img.preview}
                          alt={img.file.name}
                          className="w-full h-full object-cover select-none"
                          loading="lazy"
                          draggable="false"
                        />
                        
                        {/* Show numbers based on mode */}
                        {defectNumbers.length > 0 && (
                          <div className="absolute top-2 left-2 flex flex-wrap gap-1 max-w-[calc(100%-16px)]">
                            {defectNumbers.map((number) => (
                              <span
                                key={number}
                                className="px-2 py-0.5 text-xs font-medium bg-indigo-500 text-white 
                                  rounded-full shadow-sm backdrop-blur-sm"
                              >
                                {number}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-1.5 text-xs truncate">
                          {img.file.name}
                        </div>
                        
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEnlargedImage(img.preview);
                            }}
                            className="absolute bottom-2 right-2 bg-white text-gray-800 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Maximize2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {enlargedImage && (
        <div className="fixed inset-0 bg-black/75 z-[9999] flex items-center justify-center">
          <ImageZoom
            src={enlargedImage}
            alt="Enlarged view"
            onClose={() => setEnlargedImage(null)}
          />
        </div>
      )}
    </>
  );
};