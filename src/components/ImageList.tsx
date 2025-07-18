import React, { useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useMetadataStore } from '../store/metadataStore';
import { Maximize2, Check } from 'lucide-react';
import { ImageZoom } from './ImageZoom';
import { ImageMetadata } from '../types';

interface ImageGridItemProps {
  images: ImageMetadata[];
  gridWidth: number;
}

export const ImageGridItem: React.FC<ImageGridItemProps> = ({ images, gridWidth }) => {
  const { selectedImages, toggleImageSelection } = useMetadataStore();
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const parentRef = React.useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: Math.ceil(images.length / gridWidth),
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200,
    overscan: 5,
  });

  return (
    <>
      <div 
        ref={parentRef} 
        className="h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 relative"
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
                  const isSelected = selectedImages.has(img.id);
                  
                  return (
                    <div 
                      key={img.id} 
                      className="relative aspect-square cursor-pointer group touch-manipulation"
                      onClick={() => toggleImageSelection(img.id)}
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
                        {isSelected && (
                          <div className="absolute top-2 right-2 bg-indigo-500 w-6 h-6 rounded-full flex items-center justify-center">
                            {img.photoNumber ? (
                              <span className="text-white text-sm font-medium">{img.photoNumber}</span>
                            ) : (
                              <Check size={16} className="text-white" />
                            )}
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

        {/* ImageZoom positioned within the images section */}
      {enlargedImage && (
          <ImageZoom
            src={enlargedImage}
            alt="Enlarged view"
            title="Enlarged view"
            onClose={() => setEnlargedImage(null)}
          />
        )}
        </div>
    </>
  );
};