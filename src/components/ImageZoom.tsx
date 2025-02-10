import React, { useState, useEffect } from 'react';
import { X, ZoomIn, ZoomOut } from 'lucide-react';

interface ImageZoomProps {
  src: string;
  alt: string;
  onClose: () => void;
}

export const ImageZoom: React.FC<ImageZoomProps> = ({ src, alt, onClose }) => {
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale(prev => Math.max(prev - 0.25, 0.5));
  };

  return (
    <div 
      className="relative w-full h-full flex items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute top-4 right-4 flex items-center gap-2 z-[9999]">
        <button
          onClick={handleZoomOut}
          className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          title="Zoom Out"
        >
          <ZoomOut size={24} className="text-white" />
        </button>
        <button
          onClick={handleZoomIn}
          className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          title="Zoom In"
        >
          <ZoomIn size={24} className="text-white" />
        </button>
        <button
          onClick={onClose}
          className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          title="Close"
        >
          <X size={24} className="text-white" />
        </button>
      </div>
      
      <div 
        className="relative max-w-[90vw] max-h-[90vh] select-none touch-none"
        onClick={e => e.stopPropagation()}
        style={{ 
          transform: `scale(${scale})`,
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
    </div>
  );
};