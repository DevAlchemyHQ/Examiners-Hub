import React, { useState, useEffect } from 'react';
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
  try {
    return JSON.parse(localStorage.getItem('defectSets') || '[]');
  } catch (error) {
    console.error('Error reading defect sets from localStorage:', error);
    return [];
  }
}

// Helper to save all defect sets to localStorage
function setLocalDefectSets(sets: any[]) {
  try {
    localStorage.setItem('defectSets', JSON.stringify(sets));
  } catch (error) {
    console.error('Error saving defect sets to localStorage:', error);
  }
}

// Auto-save defect set on every modification
async function autoSaveDefectSet(formData: any, bulkDefects: any[], selectedImages: Set<string>, images: any[]) {
  try {
    // Only save if we have project details
    if (!formData?.elr?.trim() || !formData?.structureNo?.trim()) {
      return;
    }

    const title = `${formData.elr}_${formData.structureNo}_${formData.date || new Date().toISOString().slice(0,10)}`;
    const data = {
      defects: bulkDefects,
      selectedImages: Array.from(selectedImages),
      formData,
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

    // Save to localStorage immediately
    const sets = getLocalDefectSets();
    const existingIndex = sets.findIndex((s: any) => s.title === title);
    const id = existingIndex >= 0 ? sets[existingIndex].id : Math.random().toString(36).slice(2) + Date.now();
    const created_at = existingIndex >= 0 ? sets[existingIndex].created_at : new Date().toISOString();
    const updated_at = new Date().toISOString();
    
    const defectSet = { id, title, data, created_at, updated_at };
    
    if (existingIndex >= 0) {
      sets[existingIndex] = defectSet;
    } else {
      sets.push(defectSet);
    }
    
    setLocalDefectSets(sets);
    
    // Save to AWS DynamoDB for cross-device persistence
    const storedUser = localStorage.getItem('user');
    const user = storedUser ? JSON.parse(storedUser) : null;
    
    if (user?.email) {
      const { DatabaseService } = await import('../lib/services');
      await DatabaseService.saveDefectSet(user.email, defectSet);
      console.log('✅ Auto-saved defect set to AWS for user:', user.email);
    }
  } catch (error) {
    console.error('Error auto-saving defect set:', error);
  }
}

// Load defect sets filtered by current ELR and structure number
async function loadDefectSets(currentFormData?: any) {
  try {
    console.log('Loading defect sets...');
    
    let allDefectSets: any[] = [];
    
    // Try to load from AWS first
    const storedUser = localStorage.getItem('user');
    const user = storedUser ? JSON.parse(storedUser) : null;
    
    if (user?.email) {
      try {
        const { DatabaseService } = await import('../lib/services');
        const { defectSets } = await DatabaseService.getDefectSets(user.email);
        if (defectSets && defectSets.length > 0) {
          console.log('✅ Defect sets loaded from AWS for user:', user.email);
          allDefectSets = defectSets;
        } else {
          console.log('No defect sets found in AWS for user:', user.email);
        }
      } catch (error) {
        console.error('❌ Error loading from AWS:', error);
      }
    }
    
    // Fallback to localStorage if AWS failed or no user
    if (allDefectSets.length === 0) {
      const localSets = getLocalDefectSets();
      console.log('📱 Defect sets loaded from localStorage (fallback)');
      allDefectSets = localSets;
    }
    
    // Filter by current ELR and structure number if provided
    if (currentFormData?.elr?.trim() && currentFormData?.structureNo?.trim()) {
      const filteredSets = allDefectSets.filter((set: any) => {
        const setElr = set.data?.formData?.elr;
        const setStruct = set.data?.formData?.structureNo;
        return setElr === currentFormData.elr && setStruct === currentFormData.structureNo;
      });
      
      // Sort by latest updated first
      filteredSets.sort((a: any, b: any) => {
        const dateA = new Date(a.updated_at || a.created_at);
        const dateB = new Date(b.updated_at || b.created_at);
        return dateB.getTime() - dateA.getTime();
      });
      
      console.log(`📋 Filtered ${filteredSets.length} defect sets for ${currentFormData.elr}_${currentFormData.structureNo}`);
      return filteredSets;
    }
    
    // If no current form data, return all sets sorted by latest
    allDefectSets.sort((a: any, b: any) => {
      const dateA = new Date(a.updated_at || a.created_at);
      const dateB = new Date(b.updated_at || b.created_at);
      return dateB.getTime() - dateA.getTime();
    });
    
    return allDefectSets;
  } catch (error) {
    console.error('❌ Error loading defect sets:', error);
    return getLocalDefectSets();
  }
}

// Delete a defect set by id from both localStorage and DynamoDB
async function deleteDefectSet(id: string) {
  try {
    // Delete from localStorage
    const sets = getLocalDefectSets();
    const updatedSets = sets.filter((s: any) => s.id !== id);
    setLocalDefectSets(updatedSets);
    
    // Delete from AWS DynamoDB
    const storedUser = localStorage.getItem('user');
    const user = storedUser ? JSON.parse(storedUser) : null;
    
    if (user?.email) {
      const { DatabaseService } = await import('../lib/services');
      await DatabaseService.deleteDefectSet(user.email, id);
      console.log('✅ Defect set deleted from AWS for user:', user.email);
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
  const [savedSets, setSavedSets] = useState<{id: string, title: string, data: any, created_at: string, updated_at?: string}[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Auto-save on every modification
  useEffect(() => {
    if (formData?.elr?.trim() && formData?.structureNo?.trim()) {
      const timeoutId = setTimeout(() => {
        autoSaveDefectSet(formData, bulkDefects, selectedImages, images);
      }, 1000); // Debounce for 1 second
      
      return () => clearTimeout(timeoutId);
    }
  }, [formData, bulkDefects, selectedImages, images]);

  // Helper to format project details as title
  const getDefectSetTitle = () => {
    const elr = formData?.elr || 'ELR';
    const struct = formData?.structureNo || 'STRUCT';
    const date = formData?.date || new Date().toISOString().slice(0,10);
    return `${elr}_${struct}_${date}`;
  };

  // Save defect set to localStorage and AWS
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
      
      // Use the auto-save function
      await autoSaveDefectSet(formData, bulkDefects, selectedImages, images);
      toast.success(`Defect set '${title}' auto-saved!`);
      
      // Refresh the saved sets list
      await handleShowLoadTray();
    } catch (error) {
      console.error('Error saving defect set:', error);
      toast.error('Failed to save defect set. Please try again.');
    }
  };

  // Load defect sets from AWS/localStorage
  const handleShowLoadTray = async () => {
    try {
      const sets = await loadDefectSets(formData);
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
      // Try to match by ID first, then by filename for cross-session persistence
      const filtered = images.filter(img => {
        // Direct ID match
        if (selectedImages.has(img.id)) {
          return true;
        }
        
                      // Try to match by filename for cross-session persistence
        const fileName = img.fileName || img.file?.name || '';
        if (fileName) {
          // Check if any selected image ID contains this filename
          const hasMatchingFilename = Array.from(selectedImages).some(selectedId => {
            // Handle both old format (just ID) and new format (object with id and fileName)
            let selectedFileName = '';
            if (typeof selectedId === 'string') {
              // Try multiple methods to extract filename from ID
              // Method 1: Look for common filename patterns
              const commonPatterns = ['PB080003', 'PB080004', 'PB080007', 'PB080003 copy', 'PB080004 copy', 'PB080007 copy'];
              for (const pattern of commonPatterns) {
                if (selectedId.includes(pattern)) {
                  // Extract the full filename from the ID
                  const filenameMatch = selectedId.match(new RegExp(`(${pattern.replace(' ', '\\s*')}.*?\\.JPG)`, 'i'));
                  if (filenameMatch) {
                    selectedFileName = filenameMatch[1];
                    break;
                  }
                }
              }
              
              // Method 2: Try to extract filename from UUID format
              if (!selectedFileName && selectedId.includes('-')) {
                const parts = selectedId.split('-');
                // Look for parts that contain .JPG
                const jpgPart = parts.find(part => part.includes('.JPG'));
                if (jpgPart) {
                  selectedFileName = jpgPart;
                }
              }
              
              // Method 3: Try the old split method as fallback
              if (!selectedFileName) {
                selectedFileName = selectedId.includes('-') ? selectedId.split('-').slice(1).join('-') : '';
              }
            } else {
              // New format: object with fileName
              selectedFileName = selectedId.fileName || '';
            }
            
            // Debug logging for matching
            if (selectedFileName && selectedFileName !== fileName) {
              console.log('🔍 Filename matching attempt:', {
                currentFileName: fileName,
                selectedFileName: selectedFileName,
                selectedId: selectedId,
                match: selectedFileName === fileName
              });
            }
            
            return selectedFileName === fileName;
          });
          return hasMatchingFilename;
        }
        
        return false;
      });
      
      console.log('🔍 SelectedImagesPanel debug:', {
        totalImages: images.length,
        selectedImageIds: Array.from(selectedImages),
        filteredImages: filtered.length,
        imageIds: images.map(img => img.id),
        imageFilenames: images.map(img => img.fileName || img.file?.name || 'unknown'),
        // Add detailed matching info
        matchingDetails: filtered.map(img => ({
          id: img.id,
          fileName: img.fileName || img.file?.name || 'unknown',
          matchedBy: selectedImages.has(img.id) ? 'ID' : 'filename'
        }))
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
      const defect = bulkDefects.find(d => d.selectedFile === (img.file?.name || ''));
      return defect?.photoNumber || '';
    }
    // For images mode, use the image's own photoNumber
    return img.photoNumber || '';
  };

  const getImageDescription = (img: ImageMetadata) => {
    if (viewMode === 'bulk') {
      // For bulk mode, get description from bulkDefects
      const defect = bulkDefects.find(d => d.selectedFile === (img.file?.name || ''));
      return defect?.description || '';
    }
    // For images mode, use the image's own description
    return img.description || '';
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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm h-full flex flex-col">
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
            className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600"
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
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Load Defect Set</h3>
              {formData?.elr?.trim() && formData?.structureNo?.trim() && (
                <span className="text-xs text-slate-500 dark:text-gray-400">
                  Filtered for {formData.elr}_{formData.structureNo}
                </span>
              )}
            </div>
            {savedSets.length === 0 ? (
              <div className="text-slate-500 dark:text-gray-400 text-center py-8">
                {formData?.elr?.trim() && formData?.structureNo?.trim() ? (
                  <div>
                    <p className="mb-2">No saved sets found for</p>
                    <p className="font-mono text-sm">{formData.elr}_{formData.structureNo}</p>
                    <p className="text-xs mt-2">Try entering different ELR/Structure details</p>
                  </div>
                ) : (
                  <div>
                    <p className="mb-2">No saved sets found</p>
                    <p className="text-xs">Enter ELR and Structure Number to see relevant sets</p>
                  </div>
                )}
              </div>
            ) : (
              <ul className="space-y-2">
                {savedSets.map((set) => (
                  <li key={set.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors">
                    <div className="flex flex-col flex-1">
                      <span className="font-mono text-sm font-medium">{set.title}</span>
                      <span className="text-xs text-slate-500 dark:text-gray-400 mt-1">
                        {set.data?.defects?.length || 0} defects • {set.data?.selectedImages?.length || 0} images
                      </span>
                      <span className="text-xs text-slate-400 dark:text-gray-500 mt-1">
                        {new Date(set.updated_at || set.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleLoadDefectSet(set)}
                        className="px-3 py-1.5 rounded bg-indigo-500 text-white hover:bg-indigo-600 text-xs font-medium transition-colors"
                      >
                        Load
                      </button>
                      <button
                        onClick={() => handleDeleteDefectSet(set.id)}
                        className="px-3 py-1.5 rounded bg-red-500 text-white hover:bg-red-600 text-xs font-medium transition-colors"
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