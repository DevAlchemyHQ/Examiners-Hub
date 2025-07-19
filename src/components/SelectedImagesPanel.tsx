import React, { useState } from 'react';
import { useMetadataStore } from '../store/metadataStore';
import { useProjectStore } from '../store/projectStore';
import { X, Trash2, ArrowUpDown, AlertTriangle, Maximize2, Minimize2, Images, FileText } from 'lucide-react';
import { ImageZoom } from './ImageZoom';
import { validateDescription } from '../utils/fileValidation';
import { BulkTextInput } from './BulkTextInput';
// REMOVE: import { saveDefectSet, loadDefectSets, deleteDefectSet } from '../lib/supabase';
// ADD: Local defect set storage helpers

// Helper to get all defect sets from localStorage
function getLocalDefectSets() {
  return JSON.parse(localStorage.getItem('defectSets') || '[]');
}
// Helper to save all defect sets to localStorage
function setLocalDefectSets(sets: any[]) {
  localStorage.setItem('defectSets', JSON.stringify(sets));
}
// Save a new defect set
async function saveDefectSet(title: string, data: any) {
  try {
    // Save to localStorage for immediate access
    const sets = getLocalDefectSets();
    const id = Math.random().toString(36).slice(2) + Date.now();
    const created_at = new Date().toISOString();
    const defectSet = { id, title, data, created_at };
    sets.push(defectSet);
    setLocalDefectSets(sets);
    
    // Save to AWS DynamoDB for cross-device persistence
    const storedUser = localStorage.getItem('user');
    const user = storedUser ? JSON.parse(storedUser) : null;
    
    if (user?.email) {
      const { DatabaseService } = await import('../lib/services');
      await DatabaseService.saveDefectSet(user.email, defectSet);
      console.log('Defect set saved to AWS for user:', user.email);
    }
  } catch (error) {
    console.error('Error saving defect set:', error);
    throw error;
  }
}

// Load all defect sets
async function loadDefectSets() {
  try {
    console.log('Loading defect sets...');
    
    // Try to load from AWS first
    const storedUser = localStorage.getItem('user');
    const user = storedUser ? JSON.parse(storedUser) : null;
    
    if (user?.email) {
      try {
        const { DatabaseService } = await import('../lib/services');
        const { defectSets } = await DatabaseService.getDefectSets(user.email);
        if (defectSets && defectSets.length > 0) {
          console.log('✅ Defect sets loaded from AWS for user:', user.email);
          return defectSets;
        } else {
          console.log('No defect sets found in AWS for user:', user.email);
        }
      } catch (error) {
        console.error('❌ Error loading from AWS:', error);
      }
    }
    
    // Fallback to localStorage only if no user or AWS failed
    const localSets = getLocalDefectSets();
    console.log('📱 Defect sets loaded from localStorage (fallback)');
    return localSets;
  } catch (error) {
    console.error('❌ Error loading defect sets:', error);
    return getLocalDefectSets();
  }
}

// Delete a defect set by id
async function deleteDefectSet(id: string) {
  try {
    // Delete from localStorage
  const sets = getLocalDefectSets();
    const updatedSets = sets.filter((s: any) => s.id !== id);
    setLocalDefectSets(updatedSets);
    
    // Delete from AWS DynamoDB
    const { AuthService } = await import('../lib/services');
    const { user } = await AuthService.getCurrentUser();
    
    if (user?.email) {
      const { DatabaseService } = await import('../lib/services');
      await DatabaseService.clearUserProject(user.email, id);
      console.log('Defect set deleted from AWS for user:', user.email);
    }
  } catch (error) {
    console.error('Error deleting defect set:', error);
    throw error;
  }
}
import { toast } from 'react-hot-toast';
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
    bulkSelectedImages,
    formData,
    toggleImageSelection,
    updateImageMetadata,
    clearSelectedImages,
    defectSortDirection,
    sketchSortDirection,
    setDefectSortDirection,
    setSketchSortDirection,
    viewMode,
    setViewMode,
    bulkDefects,
    setBulkDefects,
    setFormData,
    setSelectedImages
  } = useMetadataStore();
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [showLoadTray, setShowLoadTray] = useState(false);
  const [savedSets, setSavedSets] = useState<{id: string, title: string, data: any, created_at: string}[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Helper to format project details as title
  const getDefectSetTitle = () => {
    const elr = formData?.elr || 'ELR';
    const struct = formData?.structureNo || 'STRUCT';
    const date = formData?.date || new Date().toISOString().slice(0,10);
    return `${elr}_${struct}_${date}`;
  };

  // Save defect set to localStorage
  const handleSaveDefectSet = async () => {
    try {
      // Validate project details
      if (!formData.elr?.trim()) {
        toast.error('Please enter the ELR before saving.');
        return;
      }
      if (!formData.structureNo?.trim()) {
        toast.error('Please enter the Structure Number before saving.');
        return;
      }
      if (!formData.date?.trim()) {
        toast.error('Please enter the Date before saving.');
        return;
      }

      const title = getDefectSetTitle();
      const data = {
        defects: bulkDefects,
        selectedImages: Array.from(selectedImages),
        formData,
        // Also save the current state of selected images with their metadata
        selectedImagesMetadata: images
          .filter(img => selectedImages.has(img.id))
          .map(img => ({
            id: img.id,
            fileName: img.fileName || img.file?.name || '',
            photoNumber: img.photoNumber,
            description: img.description,
            isSketch: img.isSketch
          }))
      };
      
      await saveDefectSet(title, data);
      toast.success(`Defect set '${title}' saved!`);
      
      // Refresh the saved sets list
      await handleShowLoadTray();
    } catch (error) {
      console.error('Error saving defect set:', error);
      toast.error('Failed to save defect set. Please try again.');
    }
  };

  // Load defect sets from Supabase
  const handleShowLoadTray = async () => {
    try {
      const sets = await loadDefectSets();
      setSavedSets(sets || []);
      setShowLoadTray(true);
    } catch (error) {
      console.error('Error loading defect sets:', error);
      toast.error('Failed to load defect sets. Please try again.');
    }
  };

  // Apply a saved defect set
  const handleLoadDefectSet = (set: {title: string, data: any, created_at: string}) => {
    setBulkDefects(set.data.defects);
    setFormData(set.data.formData);
    
    // Restore selected images
    setTimeout(() => {
      setSelectedImages(new Set(set.data.selectedImages));
    }, 0);
    
    // Restore selected images metadata (photo numbers, descriptions)
    if (set.data.selectedImagesMetadata) {
      set.data.selectedImagesMetadata.forEach((imgMeta: any) => {
        const image = images.find(img => img.id === imgMeta.id);
        if (image) {
          updateImageMetadata(imgMeta.id, {
            photoNumber: imgMeta.photoNumber,
            description: imgMeta.description
          });
        }
      });
    }
    
    setShowLoadTray(false);
  };

  // Delete a saved defect set
  const handleDeleteDefectSet = async (id: string) => {
    try {
      await deleteDefectSet(id);
      // Refresh the saved sets list
      await handleShowLoadTray();
    } catch (error) {
      console.error('Error deleting defect set:', error);
      toast.error('Failed to delete defect set. Please try again.');
    }
  };
  
  const selectedImagesList = React.useMemo(() => {
    if (viewMode === 'bulk') {
      return images.filter(img => bulkSelectedImages.has(img.id));
    } else {
      const filtered = images.filter(img => selectedImages.has(img.id));
      console.log('🔍 SelectedImagesPanel debug:', {
        totalImages: images.length,
        selectedImageIds: Array.from(selectedImages),
        filteredImages: filtered.length,
        imageIds: images.map(img => img.id)
      });
      return filtered;
    }
  }, [images, selectedImages, bulkSelectedImages, viewMode]);

  const { sketches, defects } = React.useMemo(() => ({
    sketches: selectedImagesList.filter(img => img.isSketch).length,
    defects: selectedImagesList.filter(img => !img.isSketch).length
  }), [selectedImagesList]);

  const getImageNumber = (img: ImageMetadata) => {
    if (viewMode === 'bulk') {
      // For bulk mode, get number from bulkDefects
      const defect = bulkDefects.find(d => d.selectedFile === (img.fileName || img.file?.name || ''));
      return defect?.photoNumber || '';
    }
    // For images mode, use the image's own photoNumber
    return img.photoNumber;
  };

  const getImageDescription = (img: ImageMetadata) => {
    if (viewMode === 'bulk') {
      // For bulk mode, get description from bulkDefects
      const defect = bulkDefects.find(d => d.selectedFile === (img.fileName || img.file?.name || ''));
      return defect?.description || '';
    }
    // For images mode, use the image's own description
    return img.description;
  };

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
                          alt={img.fileName || img.file?.name || 'Image'}
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
                        <div className="text-xs text-slate-500 dark:text-gray-400 truncate mb-1 min-h-[1rem]">
                          {img.fileName || img.file?.name || 'Unknown file'}
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
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="p-1.5 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete all images"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                  {defectImages.map((img) => (
                    <div key={img.id} className="flex flex-col bg-slate-50 dark:bg-gray-700 rounded-lg overflow-hidden">
                      <div className="relative aspect-square">
                        <img
                          src={img.preview}
                          alt={img.fileName || img.file?.name || 'Image'}
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
                        <div className="text-xs text-slate-500 dark:text-gray-400 truncate min-h-[1rem]">
                          {img.fileName || img.file?.name || 'Unknown file'}
                        </div>
                        <input
                          type="number"
                          value={getImageNumber(img)}
                          onChange={(e) => updateImageMetadata(img.id, { photoNumber: e.target.value })}
                          className="w-full p-1 text-sm border border-slate-200 dark:border-gray-600 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-slate-900 dark:text-white"
                          placeholder="#"
                        />
                        {!img.isSketch && (
                          <textarea
                            value={getImageDescription(img)}
                            onChange={(e) => updateImageMetadata(img.id, { description: e.target.value })}
                            className="w-full p-1.5 text-sm border rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-slate-900 dark:text-white resize-y min-h-[60px]"
                            placeholder="Description"
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        ) : viewMode === 'bulk' ? (
          <BulkTextInput isExpanded={isExpanded} />
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm h-[calc(100vh-96px)] flex items-center justify-center p-8 text-slate-400 dark:text-gray-500">
            Coming Soon!
          </div>
        )}

        {/* ImageZoom positioned within the panel */}
      {enlargedImage && (
          <ImageZoom
            src={enlargedImage}
            alt="Enlarged view"
            title="Enlarged view"
            onClose={() => setEnlargedImage(null)}
          />
        )}
      </div>

      <div className="flex items-center gap-2 p-2 border-t border-slate-200 dark:border-gray-700">
        <button
          onClick={handleSaveDefectSet}
          className="px-3 py-1 rounded bg-indigo-500 text-white hover:bg-indigo-600 text-sm"
        >
          Save Defect Set
        </button>
        <button
          onClick={handleShowLoadTray}
          className="px-3 py-1 rounded bg-slate-200 dark:bg-gray-700 text-slate-700 dark:text-gray-200 hover:bg-slate-300 dark:hover:bg-gray-600 text-sm"
        >
          Load Defect Set
        </button>
      </div>
      {/* Load tray/modal */}
      {showLoadTray && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-t-2xl shadow-xl w-full max-w-md p-6 max-h-[60vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Load Defect Set</h3>
            {savedSets.length === 0 ? (
              <div className="text-slate-500 dark:text-gray-400">No saved sets found.</div>
            ) : (
              <ul className="space-y-2">
                {savedSets.map((set) => (
                  <li key={set.id} className="flex items-center justify-between p-2 rounded hover:bg-slate-100 dark:hover:bg-gray-700">
                    <div className="flex flex-col">
                      <span className="font-mono text-sm">{set.title}</span>
                      <span className="text-xs text-slate-500 dark:text-gray-400">
                        {new Date(set.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleLoadDefectSet(set)}
                        className="px-2 py-1 rounded bg-indigo-500 text-white hover:bg-indigo-600 text-xs"
                      >
                        Load
                      </button>
                      <button
                        onClick={() => handleDeleteDefectSet(set.id)}
                        className="px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600 text-xs"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <button
              onClick={() => setShowLoadTray(false)}
              className="mt-4 w-full px-3 py-2 rounded bg-slate-200 dark:bg-gray-700 text-slate-700 dark:text-gray-200 hover:bg-slate-300 dark:hover:bg-gray-600 text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Modern Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200/50 dark:border-gray-700/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                <X size={24} className="text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Delete All Images
                </h3>
                <p className="text-sm text-slate-600 dark:text-gray-400">
                  This will permanently delete all images
                </p>
              </div>
            </div>
            <p className="text-slate-700 dark:text-gray-300 mb-6">
              Are you sure you want to delete ALL images? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 text-slate-700 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  useProjectStore.getState().clearProject();
                  setShowDeleteConfirm(false);
                }}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};