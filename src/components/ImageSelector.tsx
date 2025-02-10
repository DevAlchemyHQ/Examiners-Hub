import React, { useState } from 'react';
import { ChevronDown, Image as ImageIcon } from 'lucide-react';
import { useMetadataStore } from '../store/metadataStore';
import { ImageMetadata } from '../types';

export const ImageSelector: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredImage, setHoveredImage] = useState<ImageMetadata | null>(null);
  const { images } = useMetadataStore();

  return (
    <div className="relative mb-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-white px-4 py-3 rounded-lg shadow-sm border border-slate-200 hover:border-indigo-500 transition-colors"
      >
        <div className="flex items-center gap-2 text-slate-700">
          <ImageIcon size={20} className="text-indigo-500" />
          <span>{images.length} Images Available</span>
        </div>
        <ChevronDown
          size={20}
          className={`text-slate-500 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-lg shadow-lg border border-slate-200 max-h-[300px] overflow-y-auto">
          {images.map((img) => (
            <div
              key={img.id}
              className="relative p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-none"
              onMouseEnter={() => setHoveredImage(img)}
              onMouseLeave={() => setHoveredImage(null)}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-700">
                  {img.photoNumber ? `Photo ${img.photoNumber}` : 'Untitled Photo'}
                </span>
                <span className="text-xs text-slate-500">
                  {img.description || 'No description'}
                </span>
              </div>

              {hoveredImage?.id === img.id && (
                <div className="absolute z-50 left-full ml-2 top-0">
                  <img
                    src={img.preview}
                    alt="Preview"
                    className="w-48 h-48 object-cover rounded-lg shadow-lg border-2 border-white"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};