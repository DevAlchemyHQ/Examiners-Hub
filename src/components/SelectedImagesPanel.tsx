import React, { useState, useEffect } from 'react';
import { 
  Images, 
  FileText, 
  Download, 
  X, 
  Maximize2, 
  Minimize2, 
  AlertTriangle, 
  CheckCircle, 
  ArrowUpDown, 
  Trash2,
  Undo
} from 'lucide-react';
import { useMetadataStore } from '../store/metadataStore';
import { useAnalytics } from '../hooks/useAnalytics';
import { ImageMetadata } from '../types';
import { DefectTile } from './DefectTile';
import { ImageZoom } from './ImageZoom';
import { BulkTextInput } from './BulkTextInput';
import { DownloadButton } from './DownloadButton';
import { toast } from 'react-hot-toast';
import { validateDescription } from '../utils/fileValidation';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';

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
async function autoSaveDefectSet(formData: any, bulkDefects: any[], selectedImages: Array<{ id: string; instanceId: string }>, images: any[]) {
  try {
    // Only save if we have project details
    if (!formData?.elr?.trim() || !formData?.structureNo?.trim()) {
      return;
    }

    const title = `${formData.elr}_${formData.structureNo}_${formData.date || new Date().toISOString().slice(0,10)}`;
    
    // Get instance metadata from the store
    const { useMetadataStore } = await import('../store/metadataStore');
    const instanceMetadata = useMetadataStore.getState().instanceMetadata;
    
    const data = {
      defects: bulkDefects,
      selectedImages: Array.from(selectedImages),
      formData,
      selectedImagesMetadata: images
        .filter(img => selectedImages.some(item => item.id === img.id))
        .map(img => ({
          id: img.id,
          fileName: img.fileName || img.file?.name || '',
          photoNumber: img.photoNumber,
          description: img.description,
          isSketch: img.isSketch
        })),
      // Add instance metadata for proper restoration
      instanceMetadata: instanceMetadata
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
    
    // Save to AWS DynamoDB for cross-device persistence with rate limiting
    const storedUser = localStorage.getItem('user');
    const user = storedUser ? JSON.parse(storedUser) : null;
    
    if (user?.email) {
      // Rate limiting: Only save every 15 seconds to prevent DynamoDB throughput issues
      const lastDefectSetSaveTime = localStorage.getItem('last-defect-set-aws-save');
      const now = Date.now();
      const minInterval = 15000; // 15 seconds
      
      if (lastDefectSetSaveTime && (now - parseInt(lastDefectSetSaveTime)) < minInterval) {
        return;
      }
      
      const { DatabaseService } = await import('../lib/services');
      await DatabaseService.saveDefectSet(user.email, defectSet);
      // Update the last save time only on success
      localStorage.setItem('last-defect-set-aws-save', now.toString());
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


type ViewMode = 'images' | 'bulk';

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
  // Simple deletion function - just remove the specific instance
  const handleInstanceDeletion = (instanceIdToDelete: string) => {
    console.log('🗑️ Deleting instance:', instanceIdToDelete);
    
    // Simply remove the specific instance from selectedImages
    const newSelected = selectedImages.filter(item => item.instanceId !== instanceIdToDelete);
    
    console.log('🗑️ New selectedImages after deletion:', newSelected);
    
    // Update the selectedImages array
    setSelectedImages(newSelected);
    
    // Clear the deleted instance's metadata
    if (instanceIdToDelete) {
      updateInstanceMetadata(instanceIdToDelete, { photoNumber: '', description: '' });
    }
  };
  const {
    images,
    selectedImages,
    bulkSelectedImages,
    formData,
    toggleImageSelection,
    updateImageMetadata,
    updateInstanceMetadata,
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
    setSelectedImages,
    deletedDefects,
    setDeletedDefects,
    isSortingEnabled,
    setIsSortingEnabled,
    instanceMetadata
  } = useMetadataStore();
  
  const { trackImageSelection, trackDefectSetLoad, trackUserAction, trackError } = useAnalytics();
  
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [showLoadTray, setShowLoadTray] = useState(false);
  const [savedSets, setSavedSets] = useState<{id: string, title: string, data: any, created_at: string, updated_at?: string}[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [showBulkPaste, setShowBulkPaste] = useState(false);

  // Auto-save on every modification
  useEffect(() => {
    if (formData?.elr?.trim() && formData?.structureNo?.trim()) {
      const timeoutId = setTimeout(() => {
        autoSaveDefectSet(formData, bulkDefects, selectedImages, images);
      }, 15000); // Debounce for 15 seconds
      
      return () => clearTimeout(timeoutId);
    }
  }, [formData, bulkDefects, selectedImages, images]);

  // Track image selection changes
  useEffect(() => {
    if (selectedImages.length > 0) {
      trackImageSelection(selectedImages.length, images.length);
    }
  }, [selectedImages.length, images.length, trackImageSelection]);

  // Helper to format project details as title
  const getDefectSetTitle = () => {
    const elr = formData?.elr || 'ELR';
    const struct = formData?.structureNo || 'STRUCT';
    const date = formData?.date || new Date().toISOString().slice(0,10);
    return `${elr}_${struct}_${date}`;
  };

  // Check for duplicate photo numbers


  // Sort images function
  const handleSortImages = () => {
    const newDirection = defectSortDirection === 'asc' ? 'desc' : defectSortDirection === 'desc' ? null : 'asc';
    setDefectSortDirection(newDirection);
  };

  // Undo for images (placeholder - implement based on your needs)
  const handleUndoImages = () => {
    // Implement undo logic for images mode
    toast.success('Undo functionality for images mode');
  };

  // Check if undo is available for images
  const canUndoImages = false; // Implement based on your needs

  // Delete all images
  const handleDeleteAllImages = () => {
    trackUserAction('delete_all_images', 'bulk_delete');
    setShowDeleteConfirm(true);
  };

  // Delete all bulk defects
  const handleDeleteAllBulk = () => {
    trackUserAction('delete_all_bulk', 'bulk_delete');
    setShowBulkDeleteConfirm(true);
  };

  // Execute delete all images
  const executeDeleteAllImages = () => {
    clearSelectedImages();
    setShowDeleteConfirm(false);
    toast.success('All selected images cleared');
  };

  // Execute delete all bulk defects
  const executeDeleteAllBulk = () => {
    setBulkDefects([]);
    setDeletedDefects([]);
    setShowBulkDeleteConfirm(false);
    toast.success('All bulk defects deleted');
  };

  // Sort bulk defects
  const toggleSorting = () => {
    const newSorting = !isSortingEnabled;
    setIsSortingEnabled(newSorting);
    trackUserAction('toggle_sorting', 'sort_enabled', newSorting ? 1 : 0);
    if (!newSorting) {
      // Reorder defects when sorting is enabled
      const reorderedDefects = [...bulkDefects].sort((a, b) => {
        const aNum = parseInt(a.photoNumber) || 0;
        const bNum = parseInt(b.photoNumber) || 0;
        return aNum - bNum;
      });
      setBulkDefects(reorderedDefects);
    }
  };

  // Auto-sort function that can be called when new defects are added
  const autoSortDefects = (defects: any[]) => {
    if (!isSortingEnabled) return defects;
    
    return [...defects].sort((a, b) => {
      const aNum = parseInt(a.photoNumber) || 0;
      const bNum = parseInt(b.photoNumber) || 0;
      return aNum - bNum;
    });
  };

  // Undo delete for bulk defects
  const undoDelete = () => {
    if (deletedDefects.length > 0) {
      const lastDeleted = deletedDefects[deletedDefects.length - 1];
      setDeletedDefects(prev => prev.slice(0, -1));
      
      // Temporarily disable auto-sorting during undo
      const wasAutoSorting = isSortingEnabled;
      setIsSortingEnabled(false);
      
      setBulkDefects(prev => {
        // Add the deleted defect back with original photo number
        const restoredDefect = {
          ...lastDeleted.defect,
          photoNumber: lastDeleted.originalPhotoNumber || lastDeleted.defect.photoNumber
        };
        const newDefects = [...prev, restoredDefect];
        
        // If auto-sorting was enabled, re-enable it after a delay
        if (wasAutoSorting) {
          setTimeout(() => {
            setIsSortingEnabled(true);
            // Only re-sort and renumber if the restored defect doesn't have a valid photo number
            setBulkDefects(currentDefects => {
              const hasInvalidPhotoNumbers = currentDefects.some(defect => 
                !defect.photoNumber || defect.photoNumber === '' || defect.photoNumber === '#'
              );
              
              if (hasInvalidPhotoNumbers) {
                const sortedDefects = [...currentDefects].sort((a, b) => {
                  const aNum = parseInt(a.photoNumber) || 0;
                  const bNum = parseInt(b.photoNumber) || 0;
                  return aNum - bNum;
                });
                return sortedDefects.map((defect, idx) => ({
                  ...defect,
                  photoNumber: String(idx + 1)
                }));
              }
              
              // Just sort without renumbering to preserve existing photo numbers
              return [...currentDefects].sort((a, b) => {
                const aNum = parseInt(a.photoNumber) || 0;
                const bNum = parseInt(b.photoNumber) || 0;
                return aNum - bNum;
              });
            });
          }, 100);
        }
        
        return newDefects;
      });
      
      toast.success('Defect restored');
    }
  };

  // Save defect set to localStorage and AWS
  const handleSaveDefectSet = async () => {
    try {
      trackUserAction('defect_set_save', 'manual_save');
      console.log('💾 Manual save defect set triggered');
      
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
      console.log('📋 Saving defect set:', title);
      console.log('📊 Data to save:', {
        defects: bulkDefects.length,
        selectedImages: selectedImages.length,
        formData
      });
      
      // Get instance metadata from the store
      const { useMetadataStore } = await import('../store/metadataStore');
      const instanceMetadata = useMetadataStore.getState().instanceMetadata;
      
      const data = {
        defects: bulkDefects,
        selectedImages: Array.from(selectedImages),
        formData,
        selectedImagesMetadata: images
          .filter(img => selectedImages.some(item => item.id === img.id))
          .map(img => ({
            id: img.id,
            fileName: img.fileName || img.file?.name || '',
            photoNumber: img.photoNumber,
            description: img.description,
            isSketch: img.isSketch
          })),
        // Add instance metadata for proper restoration
        instanceMetadata: instanceMetadata
      };
      
      // Use the auto-save function
      await autoSaveDefectSet(formData, bulkDefects, selectedImages, images);
      console.log('✅ Auto-save completed');
      
      // Show success message with details
      const imageCount = selectedImages.length;
      const defectCount = bulkDefects.length;
      let message = `Saved '${title}'`;
      if (imageCount > 0 || defectCount > 0) {
        message += ` (${imageCount} images, ${defectCount} bulk defects)`;
      }
      toast.success(message);
      
      // Refresh the saved sets list
      await handleShowLoadTray();
      console.log('✅ Load tray refreshed');
    } catch (error) {
      trackError('defect_set_save_failed', 'manual_save');
      console.error('❌ Error saving defect set:', error);
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
    trackDefectSetLoad(set.data.defects?.length || 0, 'loaded_defect_set');
    trackUserAction('defect_set_load', 'manual_load');
    
    console.log('🔄 Loading defect set:', set.title);
    console.log('📊 Data to restore:', {
      defects: set.data.defects?.length || 0,
      selectedImages: set.data.selectedImages?.length || 0,
      hasInstanceMetadata: !!set.data.instanceMetadata
    });
    
    // Restore form data
    setFormData(set.data.formData);
    
    // Restore bulk defects
    setBulkDefects(set.data.defects || []);
    
    // Restore selected images with proper timing
    if (set.data.selectedImages && set.data.selectedImages.length > 0) {
      console.log('🖼️ Restoring selected images:', set.data.selectedImages.length);
      console.log('🖼️ Selected images data:', set.data.selectedImages);
      setSelectedImages(set.data.selectedImages);
      
      // Force view mode to images if we have selected images
      if (set.data.selectedImages.length > 0) {
        console.log('🔄 Switching to images view mode');
        setViewMode('images');
      }
    } else {
      console.log('⚠️ No selected images to restore');
      setSelectedImages([]);
    }
    
    // Restore instance metadata for proper photo numbers and descriptions
    if (set.data.instanceMetadata) {
      console.log('📝 Restoring instance metadata for', Object.keys(set.data.instanceMetadata).length, 'instances');
      (async () => {
        const { useMetadataStore } = await import('../store/metadataStore');
        const { updateInstanceMetadata } = useMetadataStore.getState();
        
        // Restore each instance's metadata
        Object.entries(set.data.instanceMetadata).forEach(([instanceId, metadata]: [string, any]) => {
          updateInstanceMetadata(instanceId, {
            photoNumber: metadata.photoNumber,
            description: metadata.description
          });
        });
      })();
    }
    
    // Show success message with details
    const imageCount = set.data.selectedImages?.length || 0;
    const defectCount = set.data.defects?.length || 0;
    let message = `Loaded '${set.title}'`;
    if (imageCount > 0 || defectCount > 0) {
      message += ` (${imageCount} images, ${defectCount} bulk defects)`;
    }
    toast.success(message);
    
    setShowLoadTray(false);
  };

  // Delete a saved defect set
  const handleDeleteDefectSet = async (id: string) => {
    try {
      trackUserAction('defect_set_delete', 'manual_delete');
      await deleteDefectSet(id);
      // Refresh the saved sets list
      await handleShowLoadTray();
    } catch (error) {
      trackError('defect_set_delete_failed', 'manual_delete');
      console.error('Error deleting defect set:', error);
      toast.error('Failed to delete defect set. Please try again.');
    }
  };
  
  const selectedImagesList = React.useMemo(() => {
    if (viewMode === 'bulk') {
      const bulkImages = images.filter(img => bulkSelectedImages.includes(img.id));
      return bulkImages;
    } else {
      // Create instances from the selectedImages array that now contains instance information
      const selectedInstances: ImageMetadata[] = [];
      
      // Handle the new selectedImages structure: Array<{ id: string; instanceId: string }>
      selectedImages.forEach((item) => {
        // Use exact ID matching only (like stable branch)
        const img = images.find(img => img.id === item.id);
        
        if (img) {
          selectedInstances.push({
            ...img,
            instanceId: item.instanceId
          });
        }
      });
      
      return selectedInstances;
    }
  }, [images, selectedImages, bulkSelectedImages, viewMode]);



  const getImageNumber = (img: ImageMetadata) => {
    if (viewMode === 'bulk') {
      // For bulk mode, get number from bulkDefects
      const fileName = img.fileName || (img.file ? img.file.name : '');
      const defect = bulkDefects.find(d => d.selectedFile === fileName);
      return defect?.photoNumber || '';
    }
    // For images mode, check if this is an instance with its own metadata
    if (img.instanceId && instanceMetadata[img.instanceId]) {
      return instanceMetadata[img.instanceId].photoNumber || '';
    }
    // Fallback to image's own photoNumber
    return img.photoNumber || '';
  };

  const getImageDescription = (img: ImageMetadata) => {
    if (viewMode === 'bulk') {
      // For bulk mode, get description from bulkDefects
      const fileName = img.fileName || (img.file ? img.file.name : '');
      const defect = bulkDefects.find(d => d.selectedFile === fileName);
      return defect?.description || '';
    }
    // For images mode, check if this is an instance with its own metadata
    if (img.instanceId && instanceMetadata[img.instanceId]) {
      return instanceMetadata[img.instanceId].description || '';
    }
    // Fallback to image's own description
    return img.description || '';
  };

  const sortImages = (images: ImageMetadata[], direction: 'asc' | 'desc' | null) => {
    if (!direction) return images;

    return [...images].sort((a, b) => {
      // Get photo numbers from instance metadata, defaulting to 0 for empty or invalid numbers
      const aPhotoNumber = a.instanceId ? instanceMetadata[a.instanceId]?.photoNumber : a.photoNumber;
      const bPhotoNumber = b.instanceId ? instanceMetadata[b.instanceId]?.photoNumber : b.photoNumber;
      
      const aNum = aPhotoNumber ? parseInt(aPhotoNumber) : 0;
      const bNum = bPhotoNumber ? parseInt(bPhotoNumber) : 0;
      
      // If both have no numbers, maintain original order
      if (aNum === 0 && bNum === 0) {
        return 0;
      }
      
      // Put images without numbers at the end
      if (aNum === 0) return 1;
      if (bNum === 0) return -1;

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

    const { isValid, hasForwardSlashes } = validateDescription(img.description || '');

    return (
      <div>
        <textarea
          value={img.description}
          onChange={(e) => updateImageMetadata(img.id, { description: e.target.value })}
          maxLength={100}
          className={`w-full p-1.5 text-sm border rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-slate-900 dark:text-white resize-y min-h-[60px] ${
            !isValid ? 'border-white' : 'border-slate-200 dark:border-gray-600'
          }`}
          placeholder="Description"
        />
        <div className="flex items-center justify-between mt-1 text-xs">
          <div className="text-slate-400 dark:text-gray-500">
            {img.description?.length || 0}/100
          </div>
          {!isValid && (
            <div className="flex items-center gap-1 text-amber-600">
              <AlertTriangle size={12} />
              <span>
                {hasForwardSlashes ? 'Forward slashes (/) are not allowed' : 'Invalid characters in description'}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Check for validation errors
  const hasValidationErrors = () => {
    // Check if ELR is empty (basic validation)
    if (!formData.elr || formData.elr.trim() === '') {
      return true;
    }
    
    // Check if selected images have required metadata (if in images mode)
    if (viewMode === 'images' && selectedImages.length > 0) {
      // Check for missing photo numbers and descriptions in instances
      for (let i = 0; i < selectedImages.length; i++) {
        const selectedId = selectedImages[i];
        const instanceId = `${selectedId}-${i}`;
        const instanceData = instanceMetadata[instanceId];
        
        if (!instanceData?.photoNumber?.trim()) {
          return true; // Missing photo number
        }
        
        if (!instanceData?.description?.trim()) {
          return true; // Missing description
        }
        
        // Check for invalid characters in descriptions
        if (instanceData?.description?.trim()) {
          const { isValid } = validateDescription(instanceData.description.trim());
          if (!isValid) {
            return true; // Invalid characters
          }
        }
      }
    }
    
    // Check bulk defects validation (if in bulk mode)
    if (viewMode === 'bulk' && bulkDefects.length > 0) {
      const hasIncompleteBulkDefects = bulkDefects.some(defect => 
        !defect.description || defect.description.trim() === ''
      );
      if (hasIncompleteBulkDefects) {
        return true;
      }
    }
    
    return false;
  };

  // Get border color based on validation status
  const getBorderColor = () => {
    if (hasValidationErrors()) {
      return 'border-red-500'; // Red for errors
    }
    if (selectedImagesList.length > 0) {
      return 'border-green-500'; // Green for success
    }
    return 'border-slate-200 dark:border-gray-700'; // Default border
  };

  // Check if bulk defects are valid
  const isBulkValid = () => {
    if (viewMode === 'bulk') {
      return bulkDefects.length > 0 && bulkDefects.every(defect => 
        defect.description && defect.description.trim() !== ''
      );
    }
    return true; // Images mode is always valid for descriptions
  };

  // Get validation summary for bulk mode
  const getValidationSummary = () => {
    if (viewMode === 'bulk') {
      const totalDefects = bulkDefects.length;
      const validDefects = bulkDefects.filter(defect => 
        defect.description && defect.description.trim() !== ''
      ).length;
      return { totalDefects, validDefects };
    }
    return { totalDefects: 0, validDefects: 0 };
  };

  // Check if a specific tile is incomplete
  const isTileIncomplete = (img: ImageMetadata) => {
    if (!img.instanceId) return false;
    
    const instanceData = instanceMetadata[img.instanceId];
    if (!instanceData) return true; // Missing instance data
    
    const hasPhotoNumber = instanceData.photoNumber?.trim();
    const hasDescription = instanceData.description?.trim();
    
    if (!hasPhotoNumber || !hasDescription) return true;
    
    // Check for invalid characters in description
    if (hasDescription) {
      const { isValid } = validateDescription(hasDescription);
      if (!isValid) return true;
    }
    
    return false;
  };

  // Check if form fields are incomplete
  const isFormIncomplete = () => {
    return !formData.elr?.trim() || !formData.structureNo?.trim() || !formData.date?.trim();
  };

  // Check if all validations pass (form + tiles)
  const isAllComplete = () => {
    if (isFormIncomplete()) return false;
    if (viewMode === 'images' && selectedImages.length > 0) {
      return selectedImagesList.every(img => !isTileIncomplete(img));
    }
    return true;
  };

  // Get specific validation error message for images mode (for toast notifications)
  const getValidationErrorMessage = () => {
    const errors = [];
    
    // Check form fields
    if (!formData.elr?.trim()) {
      errors.push('Enter ELR');
    }
    if (!formData.structureNo?.trim()) {
      errors.push('Enter Structure No');
    }
    if (!formData.date?.trim()) {
      errors.push('Select Date');
    }
    
    // Check image instances
    if (viewMode === 'images' && selectedImages.length > 0) {
      const missingPhotoNumbers = [];
      const missingDescriptions = [];
      const invalidDescriptions = [];
      
      selectedImages.forEach((item, index) => {
        const instanceId = item.instanceId;
        const instanceData = instanceMetadata[instanceId];
        
        if (!instanceData?.photoNumber?.trim()) {
          missingPhotoNumbers.push(index + 1);
        }
        
        if (!instanceData?.description?.trim()) {
          missingDescriptions.push(index + 1);
        } else {
          // Check for invalid characters in descriptions
          const { isValid, invalidChars } = validateDescription(instanceData.description.trim());
          if (!isValid) {
            invalidDescriptions.push({
              instance: index + 1,
              invalidChars: invalidChars
            });
          }
        }
      });
      
      if (missingPhotoNumbers.length > 0) {
        errors.push(`Missing photo numbers for instances: ${missingPhotoNumbers.join(', ')}`);
      }
      
      if (missingDescriptions.length > 0) {
        errors.push(`Missing descriptions for instances: ${missingDescriptions.join(', ')}`);
      }
      
      if (invalidDescriptions.length > 0) {
        invalidDescriptions.forEach(({ instance, invalidChars }) => {
          errors.push(`Instance ${instance}: Remove invalid characters (${invalidChars.join(', ')})`);
        });
      }
    }
    
    return errors.length > 0 ? errors.join('; ') : 'All validations complete';
  };

  if (images.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm h-[calc(100vh-120px)] flex items-center justify-center p-8 text-slate-400 dark:text-gray-500">
        No images uploaded
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-slate-200 dark:border-gray-700 h-full flex flex-col ${getBorderColor()}`}>
      <div className="p-2 border-b border-slate-200 dark:border-gray-700">
        {/* Mobile: Stack vertically */}
        <div className="md:hidden space-y-2">
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                console.log('🔵 IMAGES TAB CLICKED (Mobile) - switching from', viewMode, 'to images');
                setViewMode('images');
                // Force save session state immediately for critical tab switches
                console.log('💾 Force saving session state after images tab click (Mobile)');
                const { forceSessionStateSave } = useMetadataStore.getState();
                await forceSessionStateSave('images');
              }}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                viewMode === 'images'
                  ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Images size={14} /> Images
            </button>
            <button
              onClick={async () => {
                console.log('🔵 BULK TAB CLICKED (Mobile) - switching from', viewMode, 'to bulk');
                setViewMode('bulk');
                // Force save session state immediately for critical tab switches
                console.log('💾 Force saving session state after bulk tab click (Mobile)');
                const { forceSessionStateSave } = useMetadataStore.getState();
                await forceSessionStateSave('bulk');
              }}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                viewMode === 'bulk'
                  ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileText size={14} /> Bulk
            </button>
            {viewMode === 'bulk' && (
              <button
                onClick={() => setShowBulkPaste(!showBulkPaste)}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors bg-white dark:bg-gray-600 text-slate-700 dark:text-gray-300 border border-slate-200 dark:border-gray-700 hover:bg-slate-100 dark:hover:bg-gray-700"
              >
                <FileText size={12} />
              </button>
            )}
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button
                title="Sort"
                className={`p-1 rounded transition-colors ${
                  viewMode === 'bulk' && isSortingEnabled
                    ? 'bg-slate-200 dark:bg-gray-600 text-slate-700 dark:text-gray-300'
                    : 'text-slate-500 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700'
                }`}
                onClick={viewMode === 'bulk' ? toggleSorting : handleSortImages}
              >
                <ArrowUpDown size={16} />
              </button>
              <button
                title="Undo"
                className={`p-1 rounded transition-colors ${
                  viewMode === 'bulk' 
                    ? (deletedDefects && deletedDefects.length > 0 
                        ? 'text-slate-500 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700' 
                        : 'text-slate-300 dark:text-gray-600 cursor-not-allowed')
                    : (canUndoImages 
                        ? 'text-slate-500 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700' 
                        : 'text-slate-300 dark:text-gray-600 cursor-not-allowed')
                }`}
                onClick={viewMode === 'bulk' ? undoDelete : handleUndoImages}
                disabled={viewMode === 'bulk' ? (!deletedDefects || deletedDefects.length === 0) : !canUndoImages}
              >
                <Undo size={16} />
              </button>
              <button
                title="Delete All"
                className="p-1 text-slate-500 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700 rounded transition-colors"
                onClick={viewMode === 'bulk' ? handleDeleteAllBulk : handleDeleteAllImages}
              >
                <Trash2 size={16} />
              </button>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs font-medium text-slate-500 dark:text-gray-400">
                {viewMode === 'bulk'
                  ? `(${bulkDefects.length})`
                  : `(${defectImages.length})`}
              </span>
              <DownloadButton />
              <button
                onClick={onExpand}
                className="p-1 hover:bg-slate-100 dark:hover:bg-gray-700 rounded transition-colors"
                title={isExpanded ? "Collapse view" : "Expand view"}
              >
                {isExpanded ? (
                  <Minimize2 size={16} className="text-slate-600 dark:text-gray-300" />
                ) : (
                  <Maximize2 size={16} className="text-slate-600 dark:text-gray-300" />
                )}
              </button>
            </div>
          </div>
        </div>
        
        {/* Desktop: Horizontal layout */}
        <div className="hidden md:flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1">
            <button
              onClick={async () => {
                console.log('🔵 IMAGES TAB CLICKED (Desktop) - switching from', viewMode, 'to images');
                setViewMode('images');
                // Force save session state immediately for critical tab switches
                console.log('💾 Force saving session state after images tab click (Desktop)');
                const { forceSessionStateSave } = useMetadataStore.getState();
                await forceSessionStateSave('images');
              }}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'images'
                  ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Images size={18} /> Images
            </button>
            <button
              onClick={async () => {
                console.log('🔵 BULK TAB CLICKED (Desktop) - switching from', viewMode, 'to bulk');
                setViewMode('bulk');
                // Force save session state immediately for critical tab switches
                console.log('💾 Force saving session state after bulk tab click (Desktop)');
                const { forceSessionStateSave } = useMetadataStore.getState();
                await forceSessionStateSave('bulk');
              }}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'bulk'
                  ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileText size={18} /> Bulk
            </button>
            {viewMode === 'bulk' && (
              <button
                onClick={() => setShowBulkPaste(!showBulkPaste)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors bg-white dark:bg-gray-600 text-slate-700 dark:text-gray-300 border border-slate-200 dark:border-gray-700 hover:bg-slate-100 dark:hover:bg-gray-700"
              >
                <FileText size={16} />
              </button>
            )}
            <div className="flex items-center gap-2 ml-2">
              <button
                title="Sort"
                className={`p-2 rounded transition-colors ${
                  viewMode === 'bulk' && isSortingEnabled
                    ? 'bg-slate-200 dark:bg-gray-600 text-slate-700 dark:text-gray-300'
                    : 'text-slate-500 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700'
                }`}
                onClick={viewMode === 'bulk' ? toggleSorting : handleSortImages}
              >
                <ArrowUpDown size={20} />
              </button>
              <button
                title="Undo"
                className={`p-2 rounded transition-colors ${
                  viewMode === 'bulk' 
                    ? (deletedDefects && deletedDefects.length > 0 
                        ? 'text-slate-500 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700' 
                        : 'text-slate-300 dark:text-gray-600 cursor-not-allowed')
                    : (canUndoImages 
                        ? 'text-slate-500 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700' 
                        : 'text-slate-300 dark:text-gray-600 cursor-not-allowed')
                }`}
                onClick={viewMode === 'bulk' ? undoDelete : handleUndoImages}
                disabled={viewMode === 'bulk' ? (!deletedDefects || deletedDefects.length === 0) : !canUndoImages}
              >
                <Undo size={20} />
              </button>
              <button
                title="Delete All"
                className="p-2 text-slate-500 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700 rounded transition-colors"
                onClick={viewMode === 'bulk' ? handleDeleteAllBulk : handleDeleteAllImages}
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm font-medium text-slate-500 dark:text-gray-400">
              {viewMode === 'bulk'
                ? `(${bulkDefects.length})`
                : `(${defectImages.length})`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <DownloadButton />
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
      </div>
      {/* Removed amber banner - now using visual tile indicators and toast notifications */}
      {/* Removed success message for Bulk mode - silent success when valid */}
      {/* Add vertical space below header */}
      <div className="h-4" />
      
              <div className="flex-1 min-h-0">
        {viewMode === 'images' && (
          <div 
            className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600"
            style={{ 
              overscrollBehavior: 'contain',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            <div className={`grid gap-1 p-1 ${
              isExpanded 
                ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' 
                : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
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
                    <div key={img.instanceId || img.id} className={`relative flex flex-col bg-slate-50 dark:bg-gray-700 rounded-lg overflow-hidden group ${
                      isTileIncomplete(img) ? 'bg-amber-50/30 dark:bg-amber-900/20' : ''
                    }`}>
                      <div className="aspect-square w-full">
                        <img
                          src={img.preview}
                          alt={img.fileName || img.file?.name || 'Image'}
                          className="w-full h-full object-cover cursor-pointer hover:opacity-95 transition-opacity select-none"
                          onClick={() => setEnlargedImage(img.preview)}
                          draggable="false"
                          style={{ width: '100%', height: '100%' }}
                        />
                      </div>
                      <button
                        onClick={() => handleInstanceDeletion(img.instanceId)}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all duration-200 shadow-sm z-10 border border-white opacity-0 group-hover:opacity-100"
                        style={{ transform: 'translate(0, 0)' }}
                      >
                        <X size={10} />
                      </button>
                      
                      <div className="p-1.5">
                        <div className="text-xs text-slate-500 dark:text-gray-400 truncate mb-1 min-h-[1rem]">
                          {img.fileName || img.file?.name || 'Unknown file'}
                        </div>
                        <input
                          type="number"
                          value={getImageNumber(img)}
                          onChange={(e) => {
                            if (img.instanceId) {
                              updateInstanceMetadata(img.instanceId, { photoNumber: e.target.value });
                            } else {
                              updateImageMetadata(img.id, { photoNumber: e.target.value });
                            }
                          }}
                          className="w-full p-1 text-sm border rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-slate-900 dark:text-white border-slate-200 dark:border-gray-600"
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
                  {defectImages.map((img) => (
                    <div key={img.instanceId || img.id} className={`relative bg-white dark:bg-gray-800 rounded-lg border overflow-hidden shadow-sm group ${
                      isTileIncomplete(img) ? 'bg-amber-50/30 dark:bg-amber-900/20' : 'border-gray-200 dark:border-gray-700'
                    }`}>
                      <div style={{ aspectRatio: '1/1', height: '120px', minHeight: '120px', maxHeight: '120px', width: '100%' }}>
                        <img
                          src={img.preview}
                          alt={img.fileName || img.file?.name || 'Image'}
                          className="w-full h-full object-cover cursor-pointer hover:opacity-95 transition-opacity select-none"
                          onClick={() => setEnlargedImage(img.preview)}
                          draggable="false"
                          style={{ width: '100%', height: '100%' }}
                        />
                      </div>
                      <button
                        onClick={() => handleInstanceDeletion(img.instanceId)}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all duration-200 shadow-sm z-10 border border-white opacity-0 group-hover:opacity-100"
                        style={{ transform: 'translate(0, 0)' }}
                      >
                        <X size={10} />
                      </button>
                      <div className="p-2 space-y-2">
                        <div className="text-xs text-gray-600 dark:text-gray-300 font-medium truncate">
                          {img.fileName || img.file?.name || 'Unknown file'}
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-end">
                            <input
                              type="text"
                              value={getImageNumber(img)}
                              onChange={(e) => {
                                if (img.instanceId) {
                                  updateInstanceMetadata(img.instanceId, { photoNumber: e.target.value });
                                } else {
                                  updateImageMetadata(img.id, { photoNumber: e.target.value });
                                }
                              }}
                              className="w-16 p-1 text-xs border rounded-l focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600 text-center"
                              placeholder="#"
                            />
                          </div>

                          {!img.isSketch && (
                            <div className="space-y-1">
                              <textarea
                                value={getImageDescription(img)}
                                onChange={(e) => {
                                  if (img.instanceId) {
                                    updateInstanceMetadata(img.instanceId, { description: e.target.value });
                                  } else {
                                    updateImageMetadata(img.id, { description: e.target.value });
                                  }
                                  // Auto-resize the textarea
                                  e.target.style.height = 'auto';
                                  e.target.style.height = e.target.scrollHeight + 'px';
                                }}
                                className={`w-full p-1 text-xs rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none border min-h-[24px] ${
                                  (() => {
                                    const { isValid, hasForwardSlashes } = validateDescription(getImageDescription(img) || '');
                                    return !isValid ? 'border-white' : 'border-gray-200 dark:border-gray-600';
                                  })()
                                }`}
                                placeholder="Description"
                                style={{ height: 'auto', minHeight: '24px' }}
                                onInput={(e) => {
                                  const target = e.target as HTMLTextAreaElement;
                                  target.style.height = 'auto';
                                  target.style.height = target.scrollHeight + 'px';
                                }}
                              />
                              {(() => {
                                const { isValid, hasForwardSlashes } = validateDescription(getImageDescription(img) || '');
                                return !isValid ? (
                                  <div className="flex items-center gap-1 text-xs text-amber-600">
                                    <AlertTriangle size={12} />
                                    <span>
                                      {hasForwardSlashes ? 'Forward slashes (/) are not allowed' : 'Invalid characters in description'}
                                    </span>
                                  </div>
                                ) : null;
                              })()}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        )}
        
        {viewMode === 'bulk' && (
          <div className="h-full overflow-hidden">
            <BulkTextInput isExpanded={isExpanded} setShowBulkPaste={setShowBulkPaste} showBulkPaste={showBulkPaste} />
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

      <div className="flex items-center justify-between p-2 border-t border-slate-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveDefectSet}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 dark:bg-gray-600 text-white text-sm rounded border border-gray-600 dark:border-gray-500 hover:bg-gray-600 dark:hover:bg-gray-500 transition-colors"
          >
            <FileText size={14} />
            Save Defect Set
          </button>
          <button
            onClick={handleShowLoadTray}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 dark:bg-gray-600 text-white text-sm rounded border border-gray-600 dark:border-gray-500 hover:bg-gray-600 dark:hover:bg-gray-500 transition-colors"
          >
            <FileText size={14} />
            Load Defect Set
          </button>
        </div>
        
        {/* Status indicator for images mode */}
        {viewMode === 'images' && (
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-gray-400">
            {(() => {
              if (selectedImages.length === 0) {
                return <span>No images selected</span>;
              }
              
              const formComplete = !isFormIncomplete();
              const completeTiles = selectedImagesList.filter(img => !isTileIncomplete(img)).length;
              const totalTiles = selectedImagesList.length;
              const allComplete = isAllComplete();
              
              return (
                <>
                  <span>
                    {formComplete ? 'Form ✓' : 'Form ✗'} • {completeTiles} of {totalTiles} tiles
                  </span>
                  {allComplete && (
                    <CheckCircle size={14} className="text-green-500" />
                  )}
                </>
              );
            })()}
          </div>
        )}
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
                        {set.data?.defects?.length || 0} bulk defects • {set.data?.selectedImages?.length || 0} selected images
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
                onClick={executeDeleteAllImages}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modern Delete Confirmation Modal for Bulk Defects */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200/50 dark:border-gray-700/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                <X size={24} className="text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Delete All Bulk Defects
                </h3>
                <p className="text-sm text-slate-600 dark:text-gray-400">
                  This will permanently delete all bulk defect entries.
                </p>
              </div>
            </div>
            <p className="text-slate-700 dark:text-gray-300 mb-6">
              Are you sure you want to delete ALL bulk defect entries? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowBulkDeleteConfirm(false)}
                className="flex-1 px-4 py-2 text-slate-700 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={executeDeleteAllBulk}
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