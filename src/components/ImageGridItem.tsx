import React, { useState } from 'react';
import { useMetadataStore } from '../store/metadataStore';
import { Maximize2 } from 'lucide-react';
import { ImageZoom } from './ImageZoom';
import { ImageMetadata } from '../types';

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
  const [enlargedImageIndex, setEnlargedImageIndex] = useState<number | null>(null);
  const [clickPosition, setClickPosition] = useState<{ x: number; y: number } | null>(null);
  const [draggedImage, setDraggedImage] = useState<ImageMetadata | null>(null);
  
  // Use the correct selection set based on viewMode
  const selections = viewMode === 'bulk' ? bulkSelectedImages : selectedImages;
  const toggleSelection = viewMode === 'bulk' ? toggleBulkImageSelection : toggleImageSelection;

  const getDefectNumbers = (img: ImageMetadata) => {
    if (img.isSketch) return [];
    
    if (viewMode === 'bulk') {
      // In bulk mode, show bulk defect numbers
      return bulkDefects
        .filter(defect => defect.selectedFile === (img.fileName || img.file?.name || ''))
        .map(defect => defect.photoNumber)
        .sort((a, b) => {
          const aNum = parseInt(a);
          const bNum = parseInt(b);
          return aNum - bNum;
        });
    } else {
      // In images mode, show all instance numbers for this image
      if (selectedImages.some(item => item.id === img.id)) {
        const { instanceMetadata } = useMetadataStore.getState();
        const instanceNumbers: string[] = [];
        
        // Get all instances of this image from the selectedImages array
        selectedImages.forEach((item) => {
          if (item.id === img.id) {
            const instanceData = instanceMetadata[item.instanceId];
            if (instanceData?.photoNumber) {
              instanceNumbers.push(instanceData.photoNumber);
            }
          }
        });
        
        // Also include the image's own photo number if it has one
        if (img.photoNumber) {
          instanceNumbers.push(img.photoNumber);
        }
        
        // Remove duplicates and sort
        return [...new Set(instanceNumbers)].sort((a, b) => {
          const aNum = parseInt(a) || 0;
          const bNum = parseInt(b) || 0;
          return aNum - bNum;
        });
      }
      return [];
    }
  };

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

  // Handle drag start for images
  const handleDragStart = (e: React.DragEvent, img: ImageMetadata) => {
    if (viewMode === 'bulk') {
      e.dataTransfer.setData('application/json', JSON.stringify({
        type: 'image',
        imageId: img.id,
        fileName: img.fileName || img.file?.name || '',
        imageData: img
      }));
      e.dataTransfer.effectAllowed = 'copy';
      setDraggedImage(img);
    }
  };

  const handleDragEnd = () => {
    setDraggedImage(null);
  };

  const handleImageEnlarge = (imageIndex: number, clickEvent: React.MouseEvent) => {
    const rect = document.body.getBoundingClientRect();
    setClickPosition({
      x: clickEvent.clientX - rect.left,
      y: clickEvent.clientY - rect.top
    });
    setEnlargedImageIndex(imageIndex);
  };

  const handlePreviousImage = () => {
    if (enlargedImageIndex !== null && enlargedImageIndex > 0) {
      setEnlargedImageIndex(enlargedImageIndex - 1);
    }
  };

  const handleNextImage = () => {
    if (enlargedImageIndex !== null && enlargedImageIndex < images.length - 1) {
      setEnlargedImageIndex(enlargedImageIndex + 1);
    }
  };

  const handleCloseEnlarged = () => {
    setEnlargedImageIndex(null);
    setClickPosition(null);
  };

  return (
    <>
      <div 
        className="h-full relative w-full overflow-hidden"
        style={{ 
          overscrollBehavior: 'contain',
          padding: '2px'
        }}
      >
        <div
          className="grid h-full overflow-hidden"
          style={{
            gridTemplateColumns: `repeat(auto-fit, minmax(max(120px, calc(100% / ${gridWidth} - 8px)), 1fr))`,
            alignContent: 'start',
            gridAutoRows: 'auto',
            columnGap: '8px',
            rowGap: '4px'
          }}
        >
          {/* Show message when no images */}
          {images.length === 0 && (
            <div className="col-span-full text-center text-gray-500 py-8">
              No images loaded
            </div>
          )}
          
          {images.map((img, index) => {
                  const isSelected = viewMode === 'bulk' ? selections.includes(img.id) : selections.some(item => item.id === img.id);
                  const defectNumbers = getDefectNumbers(img);
                  
                  return (
                    <div 
                      key={img.id} 
                      className="relative aspect-square cursor-pointer group touch-manipulation"
                      onClick={() => toggleSelection(img.id)}
                      draggable={viewMode === 'bulk'}
                      onDragStart={(e) => handleDragStart(e, img)}
                      onDragEnd={handleDragEnd}
                      style={{ touchAction: 'manipulation' }}
                    >
                      <div className={`relative rounded-lg overflow-hidden h-full ${
                        isSelected ? 'ring-2 ring-indigo-500' : ''
                      } ${draggedImage?.id === img.id ? 'opacity-50 scale-95' : ''}`}>
                        <img
                          src={img.preview}
                          alt={img.fileName || img.file?.name || 'Image'}
                          className="w-full h-full object-cover select-none"
                          loading="lazy"
                          draggable="false"
                          onLoad={() => console.log('✅ Image loaded:', img.fileName)}
                          onError={(e) => console.error('❌ Image failed to load:', img.fileName, e)}
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
                          {img.fileName || img.file?.name || 'Unknown file'}
                        </div>
                        
                        {/* Drag indicator for bulk mode */}
                        {viewMode === 'bulk' && (
                          <div className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                            Drag
                          </div>
                        )}
                        
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                        handleImageEnlarge(index, e);
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

        {/* ImageZoom positioned within the images section */}
        {enlargedImageIndex !== null && (
          <ImageZoom
            src={images[enlargedImageIndex].preview}
            alt={images[enlargedImageIndex].fileName || images[enlargedImageIndex].file?.name || 'Image'}
            title={images[enlargedImageIndex].fileName || images[enlargedImageIndex].file?.name || 'Image'}
            onClose={handleCloseEnlarged}
            onPrevious={handlePreviousImage}
            onNext={handleNextImage}
            hasPrevious={enlargedImageIndex > 0}
            hasNext={enlargedImageIndex < images.length - 1}
            position={clickPosition}
          />
        )}
        </div>
    </>
  );
};