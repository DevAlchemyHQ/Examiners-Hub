import React, { useState } from 'react';
import { useMetadataStore } from '../store/metadataStore';
import { X, Trash2, ArrowUpDown, AlertTriangle, Maximize2, Minimize2, Images, FileText } from 'lucide-react';
import { ImageZoom } from './ImageZoom';
import { validateDescription } from '../utils/fileValidation';
import { BulkTextInput } from './BulkTextInput';
import type { ImageMetadata } from '../types';


type ViewMode = 'images' | 'text' | 'bulk';

const SortButton: React.FC<{
  direction: 'asc' | 'desc' | null;
  onChange: (direction: 'asc' | 'desc' | null) => void;
}> = ({ direction, onChange }) => (
  <button
    onClick={() => onChange(
      direction === null ? 'asc' : 
      direction === 'asc' ? 'desc' : 
      null
    )}
    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
      direction 
        ? 'bg-indigo-500 text-white' 
        : 'text-slate-600 hover:bg-slate-100 dark:text-gray-300 dark:hover:bg-gray-700'
    }`}
    title={direction === null ? 'Enable sorting' : 'Change sort order'}
  >
    <ArrowUpDown 
      size={16} 
      className={`transition-transform ${
        direction === 'desc' ? 'rotate-180' : ''
      }`}
    />
    {direction && (
      <span className="text-sm">
        {direction === 'asc' ? 'Lowest to Highest' : 'Highest to Lowest'}
      </span>
    )}
  </button>
);

interface SelectedImagesPanelProps {
  onExpand: () => void;
  isExpanded: boolean;
}

export const SelectedImagesPanel: React.FC<SelectedImagesPanelProps> = ({ onExpand, isExpanded }) => {
  const {
    images,
    selectedImages,
    toggleImageSelection,
    updateImageMetadata,
    clearSelectedImages,
    defectSortDirection,
    sketchSortDirection,
    setDefectSortDirection,
    setSketchSortDirection,
    getSelectedCounts,
    viewMode,
    setViewMode
  } = useMetadataStore();
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  
  const selectedImagesList = React.useMemo(() => {
    return images.filter(img => selectedImages.has(img.id));
  }, [images, selectedImages]);

  const { sketches, defects } = getSelectedCounts();

  const sortImages = (images: ImageMetadata[], direction: 'asc' | 'desc' | null) => {
    if (!direction) return images;

    return [...images].sort((a, b) => {
      // Put images without numbers at the bottom
      const aNum = a.photoNumber ? parseInt(a.photoNumber) : Infinity;
      const bNum = b.photoNumber ? parseInt(b.photoNumber) : Infinity;

      if (aNum === Infinity && bNum === Infinity) {
        return 0;
      }
      if (aNum === Infinity) return 1;
      if (bNum === Infinity) return -1;

      return direction === 'asc' ? aNum - bNum : bNum - aNum;
    });
  };

  const defectImages = sortImages(
    selectedImagesList.filter(img => !img.isSketch),
    defectSortDirection
  );

  const sketchImages = sortImages(
    selectedImagesList.filter(img => img.isSketch),
    sketchSortDirection
  );

  const renderDescriptionField = (img: ImageMetadata) => {
    if (img.isSketch) return null;

    const { isValid, invalidChars } = validateDescription(img.description || '');

    return (
      <div>
        <textarea
          value={img.description}
          onChange={(e) => updateImageMetadata(img.id, { description: e.target.value })}
          maxLength={100}
          className={`w-full p-1.5 text-sm border rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-slate-900 dark:text-white resize-y min-h-[60px] ${
            !isValid ? 'border-amber-300' : 'border-slate-200 dark:border-gray-600'
          }`}
          placeholder="Description"
        />
        <div className="flex items-center justify-between mt-1 text-xs">
          <div className="text-slate-400 dark:text-gray-500">
            {img.description?.length || 0}/100
          </div>
          {!isValid && invalidChars.length > 0 && (
            <div className="flex items-center gap-1 text-amber-600">
              <AlertTriangle size={12} />
              <span>
                Slashes not allowed: {invalidChars.join(' ')}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (images.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm h-[calc(100vh-96px)] flex items-center justify-center p-8 text-slate-400 dark:text-gray-500">
        No images uploaded
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm h-[calc(100vh-96px)] flex flex-col">
      <div className="p-4 border-b border-slate-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
            {viewMode === 'images' ? `Selected Images (${selectedImagesList.length})` : viewMode === 'bulk' ? 'Bulk Defect Entry' : 'Bulk'}
          </h3>
          {viewMode === 'images' && <div className="text-sm text-slate-500 dark:text-gray-400 mt-1">
            {sketches} Sketches, {defects} Exam Photos
          </div>}
        </div>
        
        <div className="flex items-center gap-4 mx-4">
          <div className="flex p-1 bg-slate-100 dark:bg-gray-700 rounded-lg">
            <button
              onClick={() => setViewMode('images')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all ${
                viewMode === 'images'
                  ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Images size={18} />
              <span className="text-sm font-medium">Images</span>
            </button>
            <button
              onClick={() => setViewMode('bulk')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all ${
                viewMode === 'bulk'
                  ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileText size={18} />
              <span className="text-sm font-medium">Bulk</span>
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={onExpand}
            className="p-2 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title={isExpanded ? "Collapse view" : "Expand view"}
          >
            {isExpanded ? (
              <Minimize2 size={20} className="text-slate-600 dark:text-gray-300" />
            ) : (
              <Maximize2 size={20} className="text-slate-600 dark:text-gray-300" />
            )}
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden">
        {viewMode === 'images' ? (
          <div 
            className="h-full overflow-y-auto scrollbar-thin"
            style={{ 
              overscrollBehavior: 'contain',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            <div className={`grid gap-2 p-2 ${
              isExpanded 
                ? 'grid-cols-3 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8' 
                : 'grid-cols-2 lg:grid-cols-4'
            }`}>
              {/* Sketches Section */}
              {sketchImages.length > 0 && (
                <>
                  <div className="col-span-full flex items-center justify-between py-2">
                    <h4 className="text-sm font-medium text-slate-500 dark:text-gray-400">
                      SKETCHES ({sketchImages.length})
                    </h4>
                    <div className="flex items-center gap-2">
                      <SortButton
                        direction={sketchSortDirection}
                        onChange={setSketchSortDirection}
                      />
                    </div>
                  </div>
                  {sketchImages.map((img) => (
                    <div key={img.id} className="flex flex-col bg-slate-50 dark:bg-gray-700 rounded-lg overflow-hidden">
                      <div className="relative aspect-square">
                        <img
                          src={img.preview}
                          alt={img.file.name}
                          className="w-full h-full object-cover cursor-pointer hover:opacity-95 transition-opacity select-none"
                          onClick={() => setEnlargedImage(img.preview)}
                          draggable="false"
                        />
                        <button
                          onClick={() => toggleImageSelection(img.id)}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-sm"
                        >
                          <X size={12} />
                        </button>
                      </div>
                      
                      <div className="p-2">
                        <div className="text-xs text-slate-500 dark:text-gray-400 truncate mb-1">
                          {img.file.name}
                        </div>
                        <input
                          type="number"
                          value={img.photoNumber}
                          onChange={(e) => updateImageMetadata(img.id, { photoNumber: e.target.value })}
                          className="w-full p-1 text-sm border border-slate-200 dark:border-gray-600 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-slate-900 dark:text-white"
                          placeholder="Sketch #"
                        />
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Defects Section */}
              {defectImages.length > 0 && (
                <>
                  <div className="col-span-full flex items-center justify-between py-2">
                    <h4 className="text-sm font-medium text-slate-500 dark:text-gray-400">
                      EXAM PHOTOS ({defectImages.length})
                    </h4>
                    <div className="flex items-center gap-2">
                      <SortButton
                        direction={defectSortDirection}
                        onChange={setDefectSortDirection}
                      />
                      <button
                        onClick={clearSelectedImages}
                        className="p-1.5 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Clear all selected images"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                  {defectImages.map((img) => (
                    <div key={img.id} className="flex flex-col bg-slate-50 dark:bg-gray-700 rounded-lg overflow-hidden">
                      <div className="relative aspect-square">
                        <img
                          src={img.preview}
                          alt={img.file.name}
                          className="w-full h-full object-cover cursor-pointer hover:opacity-95 transition-opacity select-none"
                          onClick={() => setEnlargedImage(img.preview)}
                          draggable="false"
                        />
                        <button
                          onClick={() => toggleImageSelection(img.id)}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-sm"
                        >
                          <X size={12} />
                        </button>
                      </div>
                      
                      <div className="p-2 space-y-1">
                        <div className="text-xs text-slate-500 dark:text-gray-400 truncate">
                          {img.file.name}
                        </div>
                        <input
                          type="number"
                          value={img.photoNumber}
                          onChange={(e) => updateImageMetadata(img.id, { photoNumber: e.target.value })}
                          className="w-full p-1 text-sm border border-slate-200 dark:border-gray-600 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-slate-900 dark:text-white"
                          placeholder="#"
                        />
                        {renderDescriptionField(img)}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        ) : viewMode === 'bulk' ? (
          <BulkTextInput />
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm h-[calc(100vh-96px)] flex items-center justify-center p-8 text-slate-400 dark:text-gray-500">
            Coming Soon!
          </div>
        )}
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
    </div>
  );
};