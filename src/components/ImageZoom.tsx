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
    
    document.addEventListener('keydown', handleEscape);
    document.addEventListener('keydown', handleArrowKeys);
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('keydown', handleArrowKeys);
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
    // Always center the modal in the images section
    return {
      position: 'absolute' as const,
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)'
    };
  };

  return (
    <div 
      className="absolute inset-0 bg-black/80 flex items-center justify-center z-[9999] rounded-lg"
      onClick={onClose}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div 
        className="relative bg-black/90 rounded-lg overflow-hidden"
        style={{
          width: '90%',
          height: '90%',
          maxWidth: '600px',
          maxHeight: '500px',
          ...getModalPosition()
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Compact Title Bar */}
        {title && (
          <div className="absolute top-2 left-2 right-2 bg-black/60 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg z-[10000]">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium truncate">{title}</h3>
              <span className="text-xs text-gray-300">
                {Math.round(scale * 100)}%
              </span>
            </div>
          </div>
        )}

        {/* Compact Navigation Buttons */}
        {hasPrevious && onPrevious && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPrevious();
            }}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors z-[10000]"
            title="Previous image (←)"
          >
            <ChevronLeft size={18} />
          </button>
        )}

        {hasNext && onNext && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors z-[10000]"
            title="Next image (→)"
          >
            <ChevronRight size={18} />
          </button>
        )}

        {/* Compact Control Buttons */}
        <div className="absolute top-2 right-2 flex items-center gap-1 z-[10000]">
          <button
            onClick={handleReset}
            className="p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors"
            title="Reset zoom"
          >
            <RotateCcw size={14} />
          </button>
        <button
          onClick={handleZoomOut}
            className="p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors"
          title="Zoom Out"
        >
            <ZoomOut size={14} />
        </button>
        <button
          onClick={handleZoomIn}
            className="p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors"
          title="Zoom In"
        >
            <ZoomIn size={14} />
        </button>
        <button
          onClick={onClose}
            className="p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors"
            title="Close (Esc)"
        >
            <X size={14} />
        </button>
      </div>
      
        {/* Compact Image Container */}
      <div 
          className="relative w-full h-full select-none touch-none cursor-grab active:cursor-grabbing flex items-center justify-center"
          onMouseDown={handleMouseDown}
        style={{ 
            transform: `scale(${scale}) translate(${panPosition.x / scale}px, ${panPosition.y / scale}px)`,
          transition: isDragging ? 'none' : 'transform 0.2s'
        }}
      >
        <img
          src={src}
          alt={alt}
          className="max-w-full max-h-full object-contain"
          draggable="false"
        />
        </div>

        {/* Compact Zoom Level Indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded-full text-xs z-[10000]">
          {Math.round(scale * 100)}%
        </div>
      </div>
    </div>
  );
};