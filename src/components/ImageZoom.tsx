import React, { useState, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';

interface ImageZoomProps {
  src: string;
  alt: string;
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  title?: string;
  description?: string;
  photoNumber?: string;
  position?: { x: number; y: number };
}

export const ImageZoom: React.FC<ImageZoomProps> = ({ 
  src, 
  alt, 
  onClose, 
  onPrevious, 
  onNext, 
  hasPrevious = false,
  hasNext = false,
  title,
  description,
  photoNumber,
  position
}) => {
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    const handleArrowKeys = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && hasPrevious && onPrevious) {
        onPrevious();
      } else if (e.key === 'ArrowRight' && hasNext && onNext) {
        onNext();
      }
    };
    
    // Add wheel event for scrolling between images
    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY > 0 && hasNext && onNext) {
        // Scroll down - go to next image
        onNext();
      } else if (e.deltaY < 0 && hasPrevious && onPrevious) {
        // Scroll up - go to previous image
        onPrevious();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    document.addEventListener('keydown', handleArrowKeys);
    document.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('keydown', handleArrowKeys);
      document.removeEventListener('wheel', handleWheel);
    };
  }, [onClose, onPrevious, onNext, hasPrevious, hasNext]);

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale(1);
    setPanPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setStartPos({ x: e.clientX - panPosition.x, y: e.clientY - panPosition.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPanPosition({
        x: e.clientX - startPos.x,
        y: e.clientY - startPos.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Calculate modal position based on click position
  const getModalPosition = () => {
    if (position) {
      // Use the click position to position the modal near where the user clicked
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const modalWidth = Math.min(900, viewportWidth * 0.95);
      const modalHeight = Math.min(700, viewportHeight * 0.95);
      
      // Calculate position to keep modal within viewport
      let left = position.x - (modalWidth / 2);
      let top = position.y - (modalHeight / 2);
      
      // Ensure modal stays within viewport bounds
      if (left < 20) left = 20;
      if (left + modalWidth > viewportWidth - 20) left = viewportWidth - modalWidth - 20;
      if (top < 20) top = 20;
      if (top + modalHeight > viewportHeight - 20) top = viewportHeight - modalHeight - 20;
      
      return {
        position: 'fixed' as const,
        left: `${left}px`,
        top: `${top}px`,
        transform: 'none'
      };
    }
    
    // Fallback to center if no position provided
    return {
      position: 'fixed' as const,
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)'
    };
  };

  return (
    <div 
      className="fixed inset-0 bg-black/90 z-[9999]"
      onClick={onClose}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div 
        className="relative bg-black/95 rounded-xl overflow-hidden shadow-2xl"
        style={{
          width: '95%',
          height: '95%',
          maxWidth: '900px',
          maxHeight: '700px',
          ...getModalPosition()
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Enhanced Title Bar */}
        {title && (
          <div className="absolute top-3 left-3 right-3 bg-black/70 backdrop-blur-sm text-white px-4 py-2 rounded-lg z-[10000]">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-medium truncate">{title}</h3>
                {photoNumber && (
                  <div className="text-sm text-gray-300 mt-1">
                    Photo #{photoNumber}
                  </div>
                )}
                {description && (
                  <div className="text-sm text-gray-300 mt-1 truncate">
                    {description}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Navigation Buttons - Much Bigger */}
        {hasPrevious && onPrevious && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPrevious();
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-4 bg-black/70 hover:bg-black/90 text-white rounded-full transition-all duration-200 z-[10000] shadow-lg hover:shadow-xl"
            title="Previous image (← or scroll up)"
          >
            <ChevronLeft size={32} />
          </button>
        )}

        {hasNext && onNext && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-4 bg-black/70 hover:bg-black/90 text-white rounded-full transition-all duration-200 z-[10000] shadow-lg hover:shadow-xl"
            title="Next image (→ or scroll down)"
          >
            <ChevronRight size={32} />
          </button>
        )}

        {/* Enhanced Control Buttons - Bigger */}
        <div className="absolute top-3 right-3 flex items-center gap-2 z-[10000]">
          <button
            onClick={handleReset}
            className="p-3 bg-black/70 hover:bg-black/90 text-white rounded-full transition-all duration-200 shadow-lg hover:shadow-xl"
            title="Reset zoom"
          >
            <RotateCcw size={20} />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-3 bg-black/70 hover:bg-black/90 text-white rounded-full transition-all duration-200 shadow-lg hover:shadow-xl"
            title="Zoom Out"
          >
            <ZoomOut size={20} />
          </button>
          <button
            onClick={handleZoomIn}
            className="p-3 bg-black/70 hover:bg-black/90 text-white rounded-full transition-all duration-200 shadow-lg hover:shadow-xl"
            title="Zoom In"
          >
            <ZoomIn size={20} />
          </button>
          <button
            onClick={onClose}
            className="p-3 bg-red-600/80 hover:bg-red-600 text-white rounded-full transition-all duration-200 shadow-lg hover:shadow-xl"
            title="Close (Esc)"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Enhanced Image Container */}
        <div 
          className="relative w-full h-full select-none touch-none cursor-grab active:cursor-grabbing flex items-center justify-center"
          onMouseDown={handleMouseDown}
          style={{ 
            transform: `scale(${scale}) translate(${panPosition.x / scale}px, ${panPosition.y / scale}px)`,
            transition: isDragging ? 'none' : 'transform 0.2s ease-out'
          }}
        >
          <img
            src={src}
            alt={alt}
            className="max-w-full max-h-full object-contain rounded-lg"
            draggable="false"
          />
        </div>

        {/* Enhanced Zoom Level Indicator */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-mono z-[10000] shadow-lg">
          {Math.round(scale * 100)}%
        </div>

        {/* Navigation Hint */}
        {(hasPrevious || hasNext) && (
          <div className="absolute bottom-4 right-4 bg-black/70 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-xs z-[10000] shadow-lg">
            <div className="flex items-center gap-2">
              <span>Use ← → keys or scroll to navigate</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};