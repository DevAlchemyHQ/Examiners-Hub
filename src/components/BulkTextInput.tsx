import React, { useState, useRef, useEffect, useMemo, Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, FileText, Upload, Plus, ArrowUpDown, Loader2, Download, Trash2, CheckCircle, X, Maximize2, Upload as UploadIcon } from 'lucide-react';
import { useMetadataStore } from '../store/metadataStore';
import { useAuthStore } from '../store/authStore';
import { useAnalytics } from '../hooks/useAnalytics';
import { 
  transformBulkDefectsForLambda, 
  validateTransformedData 
} from '../utils/downloadTransformers';
import { getFullApiUrl } from '../utils/apiConfig';
import { validateDescription } from '../utils/fileValidation';
import { parseDefectText, findMatchingImages } from '../utils/defectParser';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { DefectTile } from './DefectTile';
import { BulkDefect } from '../types';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { nanoid } from 'nanoid';
import { toast } from 'react-hot-toast';
import { ImageZoom } from './ImageZoom';
import { useProjectStore } from '../store/projectStore';

interface ParsedEntry {
  photoNumber: string;
  description: string;
  selectedFile: string;
}

// Error Boundary Component
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('BulkTextInput Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <h3 className="text-red-800 dark:text-red-200 font-medium mb-2">Something went wrong</h3>
          <p className="text-red-600 dark:text-red-300 text-sm">
            The bulk defects component encountered an error. Please refresh the page to try again.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export const BulkTextInput: React.FC<{ isExpanded?: boolean; setShowBulkPaste?: (show: boolean) => void; showBulkPaste?: boolean }> = ({ isExpanded = false, setShowBulkPaste, showBulkPaste: parentShowBulkPaste }) => {
  const { 
    bulkDefects, 
    setBulkDefects, 
    loadBulkData,
    images,
    toggleBulkImageSelection,
    savePdf,
    loadSavedPdfs,
    bulkSelectedImages,
    generateBulkZip,
    setFormData,
    formData,
    deletedDefects,
    setDeletedDefects,
    isSortingEnabled,
    setIsSortingEnabled,
    viewMode,
    setViewMode
  } = useMetadataStore();
  const { user } = useAuthStore();
  const { trackBulkUpload, trackBulkDownload, trackDefectSetLoad, trackUserAction, trackError } = useAnalytics();
  
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [showImages, setShowImages] = useState(false);
  const [showDefectImport, setShowDefectImport] = useState(false);
  const [defectImportText, setDefectImportText] = useState('');
  const [missingImages, setMissingImages] = useState<string[]>([]);
  const [showBulkPaste, setShowBulkPasteLocal] = useState(false);

  // Use prop if provided, otherwise use local state
  const showBulkPasteState = setShowBulkPaste ? false : showBulkPaste;
  const setShowBulkPasteState = setShowBulkPaste || setShowBulkPasteLocal;

  // Get the actual show state from parent or local
  const actualShowBulkPaste = setShowBulkPaste ? false : showBulkPaste;

  // Load bulk data on component mount
  useEffect(() => {
    // Prevent multiple calls
    let isMounted = true;
    
    const loadData = async () => {
      // Don't load if already loading
      if (isLoading) {
        console.log('⏸️ Skipping load - already loading');
        return;
      }
      
      const start = performance.now();
      setIsLoading(true);
      setError(null);
      
      // Add timeout to prevent long loading states
      const timeoutId = setTimeout(() => {
        if (isMounted && isLoading) {
          console.log('⏰ Loading timeout - forcing completion');
          setIsLoading(false);
        }
      }, 5000); // 5 second timeout
      
      try {
        console.log('🔄 Starting bulk data load...');
        await loadBulkData();
        
        // Only track if component is still mounted
        if (isMounted) {
          // Track defect set load only if defects were actually loaded
          const currentBulkDefects = useMetadataStore.getState().bulkDefects;
          if (currentBulkDefects.length > 0) {
            trackDefectSetLoad(currentBulkDefects.length, 'saved_defects');
          }
        }
      } catch (err) {
        console.error('Error loading bulk data:', err);
        if (isMounted) {
          trackError('load_failed', 'bulk_data');
          setError('Failed to load saved defects. Please refresh the page.');
        }
      } finally {
        clearTimeout(timeoutId);
        if (isMounted) {
          setIsLoading(false);
          console.log('Bulk data loaded in', (performance.now() - start).toFixed(0), 'ms');
        }
      }
    };
    
    loadData();
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency array - only run once on mount

  // Function to check for duplicate photo numbers - MOVED BEFORE useMemo hooks
  const getDuplicatePhotoNumbers = () => {
    const photoNumbers = bulkDefects.map(d => d.photoNumber);
    const duplicates = new Set<string>();
    const seen = new Set<string>();
    
    photoNumbers.forEach(num => {
      if (seen.has(num)) {
        duplicates.add(num);
      } else {
        seen.add(num);
      }
    });
    
    return duplicates;
  };

  // Performance optimization: Memoize expensive calculations with error handling
  const memoizedDuplicatePhotoNumbers = useMemo(() => {
    try {
      return getDuplicatePhotoNumbers();
    } catch (error) {
      console.error('Error in memoizedDuplicatePhotoNumbers:', error);
      return new Set<string>();
    }
  }, [bulkDefects]);
  
  const memoizedDefectsWithImagesCount = useMemo(() => {
    try {
      return bulkDefects.filter(d => d.selectedFile).length;
    } catch (error) {
      console.error('Error in memoizedDefectsWithImagesCount:', error);
      return 0;
    }
  }, [bulkDefects]);

  // Performance optimization: Debounce error clearing
  const debouncedErrorClear = useRef<number | null>(null);
  
  useEffect(() => {
    if (error) {
      if (debouncedErrorClear.current) {
        clearTimeout(debouncedErrorClear.current);
      }
      debouncedErrorClear.current = setTimeout(() => setError(null), 5000);
    }
    
    return () => {
      if (debouncedErrorClear.current) {
        clearTimeout(debouncedErrorClear.current);
      }
    };
  }, [error]);

  // Show bulk paste on first load if no defects exist
  // useEffect(() => {
  //   if (bulkDefects.length === 0) {
  //     setShowBulkPaste(true);
  //   }
  // }, []);

  useEffect(() => {
    if (user?.id) {
      loadSavedPdfs(user.id).catch(console.error);
    }
  }, [user?.id]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
      // Add better Edge compatibility
      pointerActivationConstraint: {
        delay: 100, // 100ms delay for touch devices
        tolerance: 5, // 5px tolerance for movement
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const reorderDefects = (defects: BulkDefect[]) => {
    // First sort by base number and letters
    return [...defects].sort((a, b) => {
      const aMatch = a.photoNumber.match(/^(\d+)([a-zA-Z]*)$/);
      const bMatch = b.photoNumber.match(/^(\d+)([a-zA-Z]*)$/);
      
      if (!aMatch || !bMatch) {
        return a.photoNumber.localeCompare(b.photoNumber);
      }

      const [, aNum, aLetter = ''] = aMatch;
      const [, bNum, bLetter = ''] = bMatch;

      // Compare numbers first
      const numDiff = parseInt(aNum) - parseInt(bNum);
      if (numDiff !== 0) return numDiff;

      // If numbers are same, compare letters
      return aLetter.localeCompare(bLetter);
    });
  };

  const reorderAndRenumberDefects = (defects: BulkDefect[]) => {
    return defects.map((defect, idx) => ({
      ...defect,
      photoNumber: String(idx + 1)
    }));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      // Temporarily disable auto-sorting during drag
      const wasAutoSorting = isSortingEnabled;
      setIsSortingEnabled(false);
      
      setBulkDefects((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        
        if (oldIndex === -1 || newIndex === -1) {
          console.warn('⚠️ Drag operation failed - could not find items');
          return items;
        }
        
        const reorderedItems = arrayMove(items, oldIndex, newIndex);
        
        // Re-enable auto-sorting after a delay if it was enabled
        if (wasAutoSorting) {
          setTimeout(() => setIsSortingEnabled(true), 500);
        }
        
        return reorderedItems;
      });
    }
  };

  const addNewDefect = (afterIndex?: number) => {
    // Temporarily disable auto-sorting during addition
    const wasAutoSorting = isSortingEnabled;
    setIsSortingEnabled(false);
    
    setBulkDefects(currentDefects => {
      const newDefect = {
        id: nanoid(),
        photoNumber: '', // Will be assigned based on sorting
        description: '',
        selectedFile: ''
      };

      let newDefects;
      if (afterIndex !== undefined) {
        // Insert after the specified index
        newDefects = [...currentDefects];
        newDefects.splice(afterIndex + 1, 0, newDefect);
      } else {
        // Add to the end
        newDefects = [...currentDefects, newDefect];
      }

      // Re-enable auto-sorting after a delay if it was enabled
      if (wasAutoSorting) {
        setTimeout(() => setIsSortingEnabled(true), 100);
      }

      return newDefects;
    });
    
    // Track the addition
    trackUserAction('add_defect', 'bulk');
  };

  const deleteDefect = (defectId: string) => {
    // Find the defect by its unique ID (not photoNumber)
    const defect = bulkDefects.find(d => d.id === defectId);
    
    if (defect) {
      // Store the deleted defect with complete state for undo
      const deletedDefect = {
        defect: { ...defect },
        originalIndex: bulkDefects.findIndex(d => d.id === defectId),
        deletedAt: new Date(),
        wasAutoSorted: isSortingEnabled,
        originalPhotoNumber: defect.photoNumber
      };
      
      setDeletedDefects(prev => [...prev, deletedDefect]);
      
      // If the defect had a selected file, deselect it
      if (defect.selectedFile) {
        const selectedImage = images.find(img => (img.fileName || img.file?.name || '') === defect.selectedFile);
        if (selectedImage) {
          toggleBulkImageSelection(selectedImage.id);
        }
      }

      // Remove the defect by ID (not photoNumber)
      setBulkDefects((items) => {
        const filteredItems = items.filter((item) => item.id !== defectId);
        return isSortingEnabled ? reorderAndRenumberDefects(filteredItems) : filteredItems;
      });
    }
  };

  const undoDelete = () => {
    if (deletedDefects.length > 0) {
      const lastDeleted = deletedDefects[deletedDefects.length - 1];
      setDeletedDefects(prev => prev.slice(0, -1));
      
      // Temporarily disable auto-sorting during undo
      const wasAutoSorting = isSortingEnabled;
      setIsSortingEnabled(false);
      
      setBulkDefects(prev => {
        // Add the deleted defect back at its original position
        const newDefects = [...prev];
        newDefects.splice(lastDeleted.originalIndex, 0, lastDeleted.defect);
        
        // Re-enable auto-sorting after a delay if it was enabled
        if (wasAutoSorting) {
          setTimeout(() => setIsSortingEnabled(true), 100);
        }
        
        return newDefects;
      });
      
      // Re-select the image if it was selected
      if (lastDeleted.defect.selectedFile) {
        const image = images.find(img => (img.fileName || img.file?.name || '') === lastDeleted.defect.selectedFile);
        if (image) {
          toggleBulkImageSelection(image.id);
        }
      }
    }
  };

  // Prevent race conditions with state updates
  const isUpdating = useRef(false);
  
  const safeStateUpdate = (updateFn: () => void) => {
    if (isUpdating.current) {
      console.log('⏸️ Skipping state update - already updating');
      return;
    }
    
    isUpdating.current = true;
    try {
      updateFn();
    } finally {
      // Reset flag after a short delay to prevent rapid successive updates
      setTimeout(() => {
        isUpdating.current = false;
      }, 50);
    }
  };

  // Enhanced delete function with race condition prevention
  const enhancedDeleteDefect = (defectId: string) => {
    safeStateUpdate(() => safeDeleteDefect(defectId));
  };

  // Enhanced undo function with race condition prevention
  const enhancedUndoDelete = () => {
    safeStateUpdate(() => safeUndoDelete());
  };

  // Enhanced error handling for defect operations
  const safeDeleteDefect = (defectId: string) => {
    try {
      deleteDefect(defectId);
    } catch (error) {
      console.error('Error deleting defect:', error);
      setError('Failed to delete defect. Please try again.');
    }
  };

  const safeUndoDelete = () => {
    try {
      undoDelete();
    } catch (error) {
      console.error('Error undoing deletion:', error);
      setError('Failed to undo deletion. Please try again.');
    }
  };

  // Enhanced validation for defect operations
  const validateDefectOperation = (defect: BulkDefect) => {
    const errors: string[] = [];
    
    if (!defect.id) {
      errors.push('Defect missing unique ID');
    }
    
    if (!defect.photoNumber && defect.photoNumber !== '') {
      errors.push('Defect missing photo number');
    }
    
    return errors;
  };

  const handleBulkPaste = () => {
    console.log('Processing text:', bulkText);
    
    // Remove forward slashes from the text before processing
    const cleanedText = bulkText.replace(/\//g, '');
    if (cleanedText !== bulkText) {
      console.log('Removed forward slashes from pasted text');
      setBulkText(cleanedText);
    }
    
    // Check if the text looks like defect format (contains ^ and file extensions)
    const hasDefectFormat = cleanedText.includes('^') && (cleanedText.includes('.JPG') || cleanedText.includes('.jpg'));
    console.log('Has defect format:', hasDefectFormat);
    
    if (hasDefectFormat) {
      // Parse as defect format
      try {
        console.log('Attempting to parse as defect format...');
        const parseResult = parseDefectText(cleanedText);
        console.log('Parse result:', parseResult);
        
        if (parseResult.defects.length === 0) {
          setError('No valid defects found in the text. Please check the format. Expected format: "Photo 01 ^ description ^ date filename.JPG"');
          return;
        }

        // Check for missing images
        const availableImageNames = images.map(img => (img.fileName || img.file?.name || ''));
        console.log('Available images:', availableImageNames);
        const missing = findMatchingImages(parseResult.defects, availableImageNames);
        console.log('Missing images:', missing);
        
        if (missing.length > 0) {
          setError(`Missing images: ${missing.join(', ')}. Please upload these images first.`);
          return;
        }

        // Convert parsed defects to bulk defects format
        const newDefects = parseResult.defects.map(defect => ({
          id: nanoid(),
          photoNumber: defect.photoNumber,
          description: defect.description,
          selectedFile: defect.fileName
        }));

        console.log('New defects to add:', newDefects);

        // Update project date if available - ensure it's properly set
        if (parseResult.projectDate) {
          setFormData({ date: parseResult.projectDate });
        }

        // Add defects and select corresponding images
        setBulkDefects(prev => [...prev, ...newDefects]);
        
        // Select corresponding images
        newDefects.forEach(defect => {
          const image = images.find(img => (img.fileName || img.file?.name || '') === defect.selectedFile);
          if (image && !bulkSelectedImages.has(image.id)) {
            toggleBulkImageSelection(image.id);
          }
        });
        
        setBulkText('');
        setShowBulkPasteState(false);
        toast.success(`Imported ${newDefects.length} defects successfully!`);
      } catch (error) {
        console.error('Error parsing defect format:', error);
        setError('Failed to parse defect format. Please check the format and try again.');
      }
    } else {
      // Parse as simple format (one description per line)
      const lines = cleanedText.trim().split('\n').filter(line => line.trim());
      
      if (lines.length === 0) {
        setError('No valid text found. Please enter some defect descriptions.');
        return;
      }

      // Create new defects from lines
      const newDefects = lines.map((line, index) => {
        const existingNumbers = bulkDefects.map(d => parseInt(d.photoNumber) || 0);
        const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + index + 1 : index + 1;
        
        return {
          id: nanoid(),
          photoNumber: String(nextNumber),
          description: line.trim(),
          selectedFile: ''
        };
      });

      setBulkDefects(prev => [...prev, ...newDefects]);
      setBulkText('');
      setShowBulkPasteState(false);
      toast.success(`Added ${newDefects.length} defects from text!`);
    }
  };

  const handleDefectImport = () => {
    try {
      const parseResult = parseDefectText(defectImportText);
      
      if (parseResult.defects.length === 0) {
        setError('No valid defects found in the text. Please check the format.');
        return;
      }

      // Check for missing images
      const availableImageNames = images.map(img => (img.fileName || img.file?.name || ''));
      const missing = findMatchingImages(parseResult.defects, availableImageNames);
      setMissingImages(missing);

      if (missing.length > 0) {
        setMissingImages(missing);
        setError(`Missing images: ${missing.join(', ')}. Please upload these images first.`);
        return;
      }

      // Convert parsed defects to bulk defects format
      const newDefects = parseResult.defects.map(defect => ({
        id: nanoid(),
        photoNumber: defect.photoNumber,
        description: defect.description,
        selectedFile: defect.fileName
      }));

      // Update project date if available - ensure it's properly set
      if (parseResult.projectDate) {
        setFormData({ date: parseResult.projectDate });
      }

      // Add defects and select corresponding images
      setBulkDefects(prev => [...prev, ...newDefects]);
      
      // Select the images for the imported defects
      newDefects.forEach(defect => {
        const image = images.find(img => (img.fileName || img.file?.name || '') === defect.selectedFile);
        if (image) {
          toggleBulkImageSelection(image.id);
        }
      });

      setDefectImportText('');
      setShowDefectImport(false);
      setMissingImages([]);
      toast.success(`Imported ${newDefects.length} defects successfully!`);
    } catch (error) {
      console.error('Error importing defects:', error);
      setError('Failed to parse defect text. Please check the format.');
    }
  };

  const updateDefectDescription = (photoNumber: string, description: string) => {
    const { isValid, invalidChars, hasForwardSlashes } = validateDescription(description);
    if (!isValid) {
      setError(hasForwardSlashes ? 'Forward slashes (/) are not allowed in descriptions' : `Invalid characters found: ${invalidChars.join(' ')}`);
      return;
    }
    setError(null);
    
    setBulkDefects((items) =>
      items.map((item) =>
        item.photoNumber === photoNumber ? { ...item, description } : item
      )
    );
  };

  const handleFileSelect = (photoNumber: string, fileName: string) => {
    // Temporarily disable auto-sorting during file selection
    const wasAutoSorting = isSortingEnabled;
    setIsSortingEnabled(false);

    setBulkDefects((items) => {
      // Get the current defect and its previously selected file
      const currentDefect = items.find(item => item.photoNumber === photoNumber);
      const previousFile = currentDefect?.selectedFile;

      // If there was a previously selected file, deselect it
      if (previousFile) {
        const previousImage = images.find(img => (img.fileName || img.file?.name || '') === previousFile);
        if (previousImage) {
          toggleBulkImageSelection(previousImage.id);
        }
      }

      // Select the new file
      const newImage = images.find(img => (img.fileName || img.file?.name || '') === fileName);
      if (newImage) {
        toggleBulkImageSelection(newImage.id);
      }

      // Update the defect's selected file
      const updated = items.map((item) =>
        item.photoNumber === photoNumber ? { ...item, selectedFile: fileName } : item
      );

      // Re-enable auto-sorting after a delay if it was enabled
      if (wasAutoSorting) {
        setTimeout(() => setIsSortingEnabled(true), 100);
      }

      return updated;
    });
  };

  const handlePhotoNumberChange = (defectId: string, oldNumber: string, newNumber: string) => {
    try {
      // DO NOT return early if newNumber is empty!
      // Allow numbers followed by optional letters
      if (!/^\d+[a-zA-Z]*$/.test(newNumber) && newNumber.trim() !== '') {
        setError('Photo number must start with numbers and can end with letters');
        return;
      }

      // Find the defect by its unique ID
      const currentDefect = bulkDefects.find(d => d.id === defectId);
      if (!currentDefect) return;

      // Check for duplicates, excluding the current defect by ID
      const isDuplicate = bulkDefects.some(d => 
        d.photoNumber === newNumber && d.id !== defectId
      );

      if (isDuplicate) {
        setError('This photo number already exists');
        return;
      }

      // Temporarily disable auto-sorting during photo number change
      const wasAutoSorting = isSortingEnabled;
      setIsSortingEnabled(false);

      setBulkDefects(prevDefects => {
        // Update the photo number
        const updatedDefects = prevDefects.map(defect => 
          defect.id === defectId 
            ? { ...defect, photoNumber: newNumber }
            : defect
        );

        // Re-enable auto-sorting after a delay if it was enabled
        if (wasAutoSorting) {
          setTimeout(() => setIsSortingEnabled(true), 100);
        }

        return updatedDefects;
      });
    } catch (err) {
      console.error('Error updating photo number:', err);
      setError('Failed to update photo number');
    }
  };

  const toggleSorting = () => {
    setIsSortingEnabled(!isSortingEnabled);
    if (!isSortingEnabled) {
      // When enabling auto-sort, reorder and renumber all defects
      setBulkDefects(defects => reorderAndRenumberDefects(defects));
    }
  };

  const handleFileUpload = async (file: File) => {
    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      trackError('upload_validation', 'invalid_file_type');
      return;
    }

    try {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      await savePdf(user.id, file);
      trackBulkUpload(1, file.size); // Track PDF upload
      toast.success('PDF uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      trackError('upload_failed', 'pdf_upload');
      toast.error('Failed to upload PDF');
    }
  };

  const handleDownload = async () => {
    // Check if there are any defects with selected images
    const defectsWithImages = bulkDefects.filter(defect => defect.selectedFile);
    
    if (defectsWithImages.length === 0) {
      toast.error('Please select images for at least one defect');
      trackError('download_validation', 'no_images_selected');
      return;
    }

    setIsDownloading(true);
    try {
      // Track download start
      trackBulkDownload(defectsWithImages.length, bulkDefects.length);
      
      // Use the same transformation logic as DownloadButton.tsx
      const { transformBulkDefectsForLambda, validateTransformedData } = await import('../utils/downloadTransformers');
      
      // Transform bulk defects to unified format (same as DownloadButton.tsx)
      const originalBulkData = { bulkDefects, images, formData };
      const transformedData = transformBulkDefectsForLambda(bulkDefects, images, formData);
      
      // Validate that transformation preserves core functionality
      if (!validateTransformedData(originalBulkData, transformedData, 'bulk')) {
        throw new Error('Data transformation validation failed');
      }

      console.log('🚀 Calling Lambda for bulk download with unified format...');
      console.log('Transformed data sample:', transformedData.selectedImages[0]);
      
      // Call Lambda function for bulk mode (same as DownloadButton.tsx)
      const apiUrl = getFullApiUrl();
      console.log('🌐 Using API endpoint:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transformedData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Bulk download failed');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Bulk download failed');
      }

      console.log('✅ Lambda bulk response received:', result);
      
      // Download the file using the presigned URL
      window.open(result.downloadUrl, '_blank');

      toast.success('Package downloaded successfully');
    } catch (error) {
      console.error('Download error:', error);
      trackError('download_failed', 'bulk_download');
      toast.error(error instanceof Error ? error.message : 'Failed to download package');
    } finally {
      setIsDownloading(false);
    }
  };

  // Add this effect to sync selected images on component mount
  useEffect(() => {
    // Sync all selected files in bulk defects with bulkSelectedImages
    bulkDefects.forEach(defect => {
      if (defect.selectedFile) {
        const image = images.find(img => (img.fileName || img.file?.name || '') === defect.selectedFile);
        if (image && !bulkSelectedImages.has(image.id)) {
          toggleBulkImageSelection(image.id);
        }
      }
    });
  }, [bulkDefects, images]);

  // Handle auto-sorting with debouncing to prevent conflicts
  useEffect(() => {
    if (isSortingEnabled && bulkDefects.length > 0) {
      const timeoutId = setTimeout(() => {
        setBulkDefects(prev => {
          // Only apply auto-sorting if it's still enabled
          if (isSortingEnabled) {
            return reorderAndRenumberDefects(prev);
          }
          return prev;
        });
      }, 300); // Debounce auto-sorting

      return () => clearTimeout(timeoutId);
    }
  }, [isSortingEnabled, bulkDefects.length]);

  // Clear bulk data for new project
  const handleNewProject = () => {
    console.log('🆕 Starting new project - clearing bulk data...');
    
    // Clear bulk defects
    setBulkDefects([]);
    setDeletedDefects([]);
    
    // Clear form data
    setFormData({
      elr: '',
      structureNo: '',
      date: ''
    });
    
    // Clear localStorage
    localStorage.removeItem('clean-app-bulk-data');
    
    // Clear user-specific localStorage keys
    const storedUser = localStorage.getItem('user');
    const user = storedUser ? JSON.parse(storedUser) : null;
    const userId = user?.email || localStorage.getItem('userEmail') || 'anonymous';
    
    const keysToRemove = [
      `clean-app-bulk-data-${userId}`,
      'clean-app-bulk-data',
      'bulk-data',
      'defectSets',
      'clean-app-form-data',
      'clean-app-images',
      'clean-app-selections'
    ];
    
    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
        console.log(`🗑️ Removed key: ${key}`);
      } catch (error) {
        console.error(`Error removing key ${key}:`, error);
      }
    });
    
    console.log('✅ New project started - all data cleared');
    toast.success('New project started - all data cleared');
  };

  // Debug function to test new project
  const debugNewProject = () => {
    console.log('🐛 Debug: Current bulk defects count:', bulkDefects.length);
    console.log('🐛 Debug: Current form data:', formData);
    console.log('🐛 Debug: localStorage bulk data:', localStorage.getItem('clean-app-bulk-data'));
    
    // Test the new project function
    handleNewProject();
    
    // Check after clearing
    setTimeout(() => {
      console.log('🐛 Debug: After clear - bulk defects count:', useMetadataStore.getState().bulkDefects.length);
      console.log('🐛 Debug: After clear - form data:', useMetadataStore.getState().formData);
      console.log('🐛 Debug: After clear - localStorage bulk data:', localStorage.getItem('clean-app-bulk-data'));
    }, 100);
  };

  // Debug function to test user switching
  const debugUserSwitch = () => {
    console.log('🐛 Debug: Testing user switch...');
    console.log('🐛 Debug: Current user email:', localStorage.getItem('userEmail'));
    console.log('🐛 Debug: Current bulk defects count:', bulkDefects.length);
    console.log('🐛 Debug: Current form data:', formData);
    console.log('🐛 Debug: localStorage bulk data:', localStorage.getItem('clean-app-bulk-data'));
    
    // Simulate user switch by changing userEmail
    const testEmail = 'test@example.com';
    localStorage.setItem('userEmail', testEmail);
    console.log('🐛 Debug: Switched to test user:', testEmail);
    
    // Check if data is cleared
    setTimeout(() => {
      console.log('🐛 Debug: After switch - bulk defects count:', useMetadataStore.getState().bulkDefects.length);
      console.log('🐛 Debug: After switch - form data:', useMetadataStore.getState().formData);
      console.log('🐛 Debug: After switch - localStorage bulk data:', localStorage.getItem('clean-app-bulk-data'));
    }, 100);
  };

  // Debug function to test viewMode and bulk defects persistence
  const debugStatePersistence = () => {
    console.log('🐛 Debug: Testing state persistence...');
    console.log('🐛 Debug: Current viewMode:', useMetadataStore.getState().viewMode);
    console.log('🐛 Debug: Current bulk defects count:', bulkDefects.length);
    console.log('🐛 Debug: Bulk defects order:', bulkDefects.map(d => d.photoNumber));
    console.log('🐛 Debug: Saved viewMode:', localStorage.getItem('clean-app-form-data-viewMode'));
    console.log('🐛 Debug: Saved bulk data:', localStorage.getItem('clean-app-bulk-data'));
    
    // Test switching to bulk view
    setViewMode('bulk');
    console.log('🐛 Debug: Switched to bulk view');
    
    // Test adding a defect
    const newDefect = {
      id: `test-${Date.now()}`,
      photoNumber: '999',
      description: 'Test defect',
      selectedFile: 'test.jpg'
    };
    setBulkDefects(prev => [...prev, newDefect]);
    console.log('🐛 Debug: Added test defect');
    
    setTimeout(() => {
      console.log('🐛 Debug: After changes - viewMode:', useMetadataStore.getState().viewMode);
      console.log('🐛 Debug: After changes - bulk defects:', useMetadataStore.getState().bulkDefects.length);
      console.log('🐛 Debug: After changes - saved viewMode:', localStorage.getItem('clean-app-form-data-viewMode'));
    }, 100);
  };

  // --- 1. Utility for selected images count ---
  // const defectsWithImagesCount = bulkDefects.filter(d => d.selectedFile).length;

  // Add keyboard shortcut for undo
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Check for both Ctrl and Cmd (Mac) keys for better cross-platform support
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      
      if (isCtrlOrCmd && e.key === 'z') {
        e.preventDefault();
        enhancedUndoDelete();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [deletedDefects]);

  // Debounced auto-save to prevent performance issues
  const debouncedAutoSave = useRef<number | null>(null);
  
  useEffect(() => {
    if (bulkDefects.length > 0) {
      // Clear existing timeout
      if (debouncedAutoSave.current) {
        clearTimeout(debouncedAutoSave.current);
      }
      
      // Set new timeout for auto-save
      debouncedAutoSave.current = setTimeout(() => {
        // Only save if we're not in the middle of clearing
        const projectStore = useProjectStore.getState();
        if (!projectStore.isClearing) {
          saveBulkData().catch(console.error);
        }
      }, 1000); // 1 second debounce
    }
    
    return () => {
      if (debouncedAutoSave.current) {
        clearTimeout(debouncedAutoSave.current);
      }
    };
  }, [bulkDefects]);

  // Cleanup function to prevent memory leaks
  useEffect(() => {
    return () => {
      // Clear any pending timeouts
      if (debouncedAutoSave.current) {
        clearTimeout(debouncedAutoSave.current);
      }
      
      // Clear any pending auto-sort timeouts
      const autoSortTimeouts = document.querySelectorAll('[data-auto-sort-timeout]');
      autoSortTimeouts.forEach(timeout => {
        if (timeout instanceof HTMLElement) {
          const timeoutId = timeout.dataset.autoSortTimeout;
          if (timeoutId) {
            clearTimeout(parseInt(timeoutId));
          }
        }
      });
    };
  }, []);

  return (
    <ErrorBoundary>
      <div className="h-full flex flex-col p-4 space-y-4">
        {/* Remove all duplicate controls - they're now in the header */}
        
        {/* --- Bulk Paste Modal --- */}
        {(parentShowBulkPaste !== undefined ? parentShowBulkPaste : showBulkPaste) && (
          <div className="animate-slideDown">
            <div className="bg-white/50 dark:bg-gray-800/50 rounded-2xl p-4 border border-slate-200/50 dark:border-gray-700/50 backdrop-blur-sm shadow-sm">
              {/* --- Single instructional helper text location --- */}
              <div className="mb-2 text-xs text-slate-500 dark:text-slate-400">
                <div className="mb-2">
                  <b>Simple format:</b> Paste each defect on a separate line. Each line becomes a separate defect.
                </div>
                <div>
                  <b>Defect format:</b> Paste in format: <code className="bg-slate-100 dark:bg-gray-700 px-1 rounded">Photo 01 ^ description ^ date filename.JPG</code>
                </div>
                <div className="mt-2 text-amber-600 dark:text-amber-400">
                  <b>Note:</b> Forward slashes (/) will be automatically removed from descriptions.
                </div>
              </div>
              <textarea
                ref={textareaRef}
                value={bulkText}
                placeholder="Paste multiple defect descriptions here, one per line..."
                onChange={(e) => setBulkText(e.target.value)}
                className={`w-full min-h-[96px] p-3 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 bg-white/80 dark:bg-gray-800/80 text-slate-900 dark:text-white resize-y ${
                  bulkText.includes('/') ? 'border-amber-300 dark:border-amber-600' : 'border-slate-200/50 dark:border-gray-700/50'
                }`}
                style={{ height: Math.max(96, Math.min(300, 24 * (bulkText.split('\n').length + 2))) + 'px' }}
              />
              {bulkText.includes('/') && (
                <div className="mt-2 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <AlertCircle size={12} />
                  <span>Forward slashes (/) will be automatically removed when processing</span>
                </div>
              )}
              <button
                onClick={handleBulkPaste}
                disabled={!bulkText.trim()}
                className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-500/90 text-white rounded-full hover:bg-indigo-500 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:hover:bg-indigo-500/90 disabled:cursor-not-allowed"
              >
                <FileText size={16} />
                <span className="text-sm font-medium">Process Text</span>
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600"
          style={{ 
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {isLoading ? (
            // Simple loading state - only show briefly
            <div className="flex items-center justify-center p-4">
              <div className="text-slate-500 dark:text-slate-400 text-sm">Loading defects...</div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200/50 dark:border-gray-700/50 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm shadow-sm p-2">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                  modifiers={[restrictToVerticalAxis]}
                >
                  <SortableContext
                    items={bulkDefects.map(d => d.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {bulkDefects.map((defect, index) => (
                        <DefectTile
                          key={defect.id}
                          id={defect.id}
                          photoNumber={defect.photoNumber}
                          description={defect.description}
                          selectedFile={defect.selectedFile || ''}
                          availableFiles={images.filter(img => !img.isSketch).map((img) => (img.fileName || img.file?.name || ''))}
                          onDelete={() => enhancedDeleteDefect(defect.id || defect.photoNumber)}
                          onDescriptionChange={(value) => updateDefectDescription(defect.photoNumber, value)}
                          onFileChange={(fileName) => handleFileSelect(defect.photoNumber, fileName)}
                          onPhotoNumberChange={(oldNumber, newNumber) => handlePhotoNumberChange(defect.id || defect.photoNumber, oldNumber, newNumber)}
                          onQuickAdd={() => addNewDefect(index)}
                          isExpanded={isExpanded}
                          showImages={showImages}
                          images={images}
                          setEnlargedImage={setEnlargedImage}
                          isDuplicate={memoizedDuplicatePhotoNumbers.has(defect.photoNumber)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
              {/* Add First Defect button - only show when no defects exist */}
              {bulkDefects.length === 0 && (
                <button
                  onClick={() => addNewDefect()}
                  className="w-full p-4 rounded-lg border-2 border-dashed border-slate-300 dark:border-gray-600 hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors group bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                >
                  <div className="flex items-center justify-center gap-3 text-slate-500 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    <Plus size={24} className="group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-medium">Add First Defect</span>
                  </div>
                </button>
              )}
              {/* --- Selected Images Display --- */}
              {memoizedDefectsWithImagesCount > 0 && (
                <div className="rounded-2xl border border-slate-200/50 dark:border-gray-700/50 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm shadow-sm p-4 relative">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
                      Selected Images ({memoizedDefectsWithImagesCount})
                    </h3>
                    <button
                      onClick={() => setEnlargedImage(null)}
                      className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-gray-700"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(event) => {
                      const { active, over } = event;
                      if (over && active.id !== over.id) {
                        // Temporarily disable auto-sorting during drag
                        const wasAutoSorting = isSortingEnabled;
                        setIsSortingEnabled(false);
                        
                        // Find the defects being reordered by ID
                        const activeId = active.id.toString().split('-')[0];
                        const overId = over.id.toString().split('-')[0];
                        
                        const activeDefect = bulkDefects.find(d => d.id === activeId);
                        const overDefect = bulkDefects.find(d => d.id === overId);
                        
                        if (activeDefect && overDefect) {
                          setBulkDefects(prev => {
                            const oldIndex = prev.findIndex(d => d.id === activeId);
                            const newIndex = prev.findIndex(d => d.id === overId);
                            
                            if (oldIndex === -1 || newIndex === -1) return prev;
                            
                            const reorderedItems = arrayMove(prev, oldIndex, newIndex);
                            
                            // Re-enable auto-sorting after a delay if it was enabled
                            if (wasAutoSorting) {
                              setTimeout(() => setIsSortingEnabled(true), 500);
                            }
                            
                            return reorderedItems;
                          });
                        }
                      }
                    }}
                    modifiers={[restrictToVerticalAxis]}
                  >
                    <SortableContext
                      items={bulkDefects.filter(d => d.selectedFile).map((d, index) => `${d.id}-${index}`)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {bulkDefects
                          .filter(defect => defect.selectedFile)
                          .map((defect, index) => {
                            const img = images.find(img => (img.fileName || img.file?.name || '') === defect.selectedFile);
                            if (!img) return null;
                            return (
                              <div key={`selected-${defect.id}-${img.id}`} className="relative group bg-white/80 dark:bg-gray-800/80 rounded-lg border border-slate-200/50 dark:border-gray-700/50 p-3">
                                {/* Removed blue badge - user wants only editable fields */}
                                {/* Image at top */}
                                <div 
                                  className="aspect-square rounded-lg overflow-hidden bg-slate-100 dark:bg-gray-700 mb-3 relative"
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    try {
                                      const data = JSON.parse(e.dataTransfer.getData('application/json'));
                                      if (data.type === 'image') {
                                        handleFileSelect(defect.photoNumber, data.fileName);
                                      }
                                    } catch (error) {
                                      console.error('Error handling drop:', error);
                                    }
                                  }}
                                  onDragOver={(e) => {
                                    e.preventDefault();
                                    e.dataTransfer.dropEffect = 'copy';
                                  }}
                                  onDragLeave={(e) => {
                                    e.preventDefault();
                                  }}
                                >
                                  <img
                                    src={img.preview}
                                    alt={img.fileName || img.file?.name || 'Image'}
                                    className="w-full h-full object-cover cursor-pointer hover:opacity-95 transition-opacity select-none"
                                    onClick={() => setEnlargedImage(img.preview)}
                                    draggable="false"
                                  />
                                  <button
                                    onClick={() => toggleBulkImageSelection(img.id)}
                                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-sm opacity-0 group-hover:opacity-100"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                                
                                {/* Filename below image */}
                                <div className="text-xs text-slate-500 dark:text-gray-400 truncate mb-2">
                                  {img.fileName || img.file?.name || 'Unknown file'}
                                </div>
                                
                                {/* Defect number input - editable */}
                                {defect && (
                                  <div className="mb-2">
                                    <input
                                      type="text"
                                      value={defect.photoNumber}
                                      onChange={(e) => handlePhotoNumberChange(defect.id || defect.photoNumber, defect.photoNumber, e.target.value)}
                                      className={`w-full p-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 
                                        bg-white/50 dark:bg-gray-800/50 text-slate-900 dark:text-white text-center
                                        ${!/^\d+[a-zA-Z]*$/.test(defect.photoNumber) && defect.photoNumber ? 'border-red-300 dark:border-red-600' : 
                                          memoizedDuplicatePhotoNumbers.has(defect.photoNumber) ? 'border-orange-400 dark:border-orange-500 bg-orange-50 dark:bg-orange-900/20' : 
                                          'border-slate-200/50 dark:border-gray-600/50'}`}
                                      placeholder="#"
                                    />
                                  </div>
                                )}
                                
                                {/* Description textarea at bottom */}
                                {defect && (
                                  <div>
                                    <textarea
                                      value={defect.description}
                                      onChange={(e) => updateDefectDescription(defect.photoNumber, e.target.value)}
                                      className={`w-full p-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 
                                        bg-white/50 dark:bg-gray-800/50 text-slate-900 dark:text-white resize-none
                                        ${defect.description && !validateDescription(defect.description).isValid ? 'border-red-300 dark:border-red-600' : 'border-slate-200/50 dark:border-gray-600/50'}`}
                                      placeholder="Description"
                                      rows={2}
                                      style={{ minHeight: '48px' }}
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    </SortableContext>
                  </DndContext>

                  {/* ImageZoom positioned within the selected images section */}
                  {enlargedImage && (
                    <ImageZoom
                      src={enlargedImage}
                      alt="Selected image"
                      title="Selected image"
                      onClose={() => setEnlargedImage(null)}
                    />
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-500 bg-red-100/10 p-3 rounded-lg">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Show validation errors for bulk mode */}
        {/* (Removed: error panel for bulk mode, now only shown below download button) */}
        
        {/* Undo indicator */}
        {deletedDefects.length > 0 && (
          <div className="fixed bottom-4 right-4 bg-indigo-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">
            <div className="flex items-center gap-2">
              <span className="text-sm">Press Ctrl+Z to undo deletion</span>
              <button
                onClick={enhancedUndoDelete}
                className="bg-white/20 hover:bg-white/30 px-2 py-1 rounded text-xs transition-colors"
              >
                Undo
              </button>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default BulkTextInput;