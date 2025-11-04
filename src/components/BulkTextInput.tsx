import React, { useState, useRef, useEffect, useMemo, Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, FileText, Upload, Plus, ArrowUpDown, Loader2, Download, Trash2, CheckCircle, X, Maximize2 } from 'lucide-react';
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

// Shared flag to prevent auto-sort during undo operations (accessible from both BulkTextInput and SelectedImagesPanel)
let isUndoingGlobal = false;

export const BulkTextInput: React.FC<{ isExpanded?: boolean; setShowBulkPaste?: (show: boolean) => void; showBulkPaste?: boolean }> = ({ isExpanded = false, setShowBulkPaste, showBulkPaste: parentShowBulkPaste }) => {
  const { 
    bulkDefects, 
    setBulkDefects, 
    loadBulkData,
    saveBulkData,
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
    defectSortDirection,
    setDefectSortDirection,
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

  // Session state management for UI persistence
  useEffect(() => {
    const { sessionState, updateSessionState } = useMetadataStore.getState();
    
    // Restore UI state from session
    if (sessionState.uiState) {
      if (sessionState.uiState.showBulkPaste !== undefined) {
        setShowBulkPasteLocal(sessionState.uiState.showBulkPaste);
      }
      if (sessionState.uiState.showImages !== undefined) {
        setShowImages(sessionState.uiState.showImages);
      }
      if (sessionState.uiState.showDefectImport !== undefined) {
        setShowDefectImport(sessionState.uiState.showDefectImport);
      }
      if (sessionState.uiState.enlargedImage !== undefined) {
        setEnlargedImage(sessionState.uiState.enlargedImage);
      }
    }
  }, []);

  // Save UI state to session when it changes
  useEffect(() => {
    const { updateSessionState } = useMetadataStore.getState();
    updateSessionState({
      uiState: {
        showBulkPaste: showBulkPasteState,
        showImages,
        showDefectImport,
        enlargedImage,
      }
    });
  }, [showBulkPasteState, showImages, showDefectImport, enlargedImage]);

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
    const duplicates = new Set();
    const seen = new Set();
    
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
      return new Set();
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
  const debouncedErrorClear = useRef<ReturnType<typeof setTimeout> | null>(null);
  
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

  const reorderAndRenumberDefects = (defects: BulkDefect[], sortDirection: 'asc' | 'desc' | null = defectSortDirection, shouldRenumber: boolean = true) => {
    // Only sort if sorting is enabled and there are actual defects
    if (!sortDirection || defects.length === 0) {
      return defects;
    }
    
    // Filter out any defects without valid IDs to prevent phantom defects
    const validDefects = defects.filter(defect => defect.id && defect.id.trim());
    
    // Sort defects by photo number (extract numeric part for sorting)
    // This changes the array order, so tiles will move visually in the DOM
    const sortedDefects = [...validDefects].sort((a, b) => {
      // Extract numeric part from photo number (e.g., "4" from "4" or "4a")
      const aNum = parseInt(a.photoNumber) || 0;
      const bNum = parseInt(b.photoNumber) || 0;
      // Apply sort direction
      return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
    });
    
    // Only renumber if requested (e.g., when adding new defects, not when just toggling sort)
    if (shouldRenumber) {
      // Renumber them starting from 1 (preserves sorted order visually)
      return sortedDefects.map((defect, idx) => ({
        ...defect,
        photoNumber: String(idx + 1)
      }));
    }
    
    // Return sorted defects with original photo numbers preserved
    // This ensures tiles physically move in the DOM when sorting
    return sortedDefects;
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      // Temporarily disable sorting during drag (but keep it as 'asc' to avoid null state)
      const wasSorting = defectSortDirection;
      // Use 'asc' instead of null to prevent three-state toggle issue
      setDefectSortDirection('asc');
      
      setBulkDefects((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        
        if (oldIndex === -1 || newIndex === -1) {
          console.warn('⚠️ Drag operation failed - could not find items');
          return items;
        }
        
        // Get the target photo number (the number of the tile we're inserting into)
        const targetPhotoNumber = parseInt(items[newIndex]?.photoNumber) || (newIndex + 1);
        
        const reorderedItems = arrayMove(items, oldIndex, newIndex);
        
        // Renumber: dragged tile takes the target position number, all tiles renumbered sequentially
        // This ensures the dragged tile gets the number of the position it was inserted into
        const renumberedItems = reorderedItems.map((defect, idx) => ({
          ...defect,
          photoNumber: String(idx + 1)
        }));
        
        console.log('🔄 [DRAG] Moved tile from position', oldIndex + 1, 'to position', newIndex + 1, 'with new number', targetPhotoNumber);
        
        // Update session state to preserve bulk defect order
        setTimeout(() => {
          updateSessionState({ 
            bulkDefectOrder: renumberedItems.map(defect => defect.id).filter(Boolean)
          });
        }, 100);
        
        // Re-enable sorting after a delay if it was enabled
        if (wasSorting && wasSorting !== 'asc') {
          setTimeout(() => {
            setDefectSortDirection(wasSorting);
            // Re-apply sorting after re-enabling
            setBulkDefects(current => reorderAndRenumberDefects(current, wasSorting));
          }, 500);
        } else if (wasSorting === 'asc') {
          // If it was already 'asc', just restore it
          setTimeout(() => {
            setDefectSortDirection('asc');
          }, 100);
        }
        
        return renumberedItems;
      });
    }
  };

  const addNewDefect = (afterIndex?: number) => {
    setBulkDefects(currentDefects => {
      let newDefects;
      
      if (afterIndex !== undefined) {
        // Insert after the specified index - NEW BEHAVIOR: insert in place and renumber
        const insertIndex = afterIndex + 1;
        const currentPhotoNumber = parseInt(currentDefects[afterIndex]?.photoNumber) || 0;
        const nextPhotoNumber = String(currentPhotoNumber + 1);
        
        const newDefect = {
          id: nanoid(),
          photoNumber: nextPhotoNumber, // Assign next number after the one we're inserting after
          description: '',
          selectedFile: ''
        };
        
        newDefects = [...currentDefects];
        newDefects.splice(insertIndex, 0, newDefect);
        
        // Renumber all defects after the inserted one (increment their numbers by 1)
        for (let i = insertIndex + 1; i < newDefects.length; i++) {
          const currentNum = parseInt(newDefects[i].photoNumber) || 0;
          newDefects[i] = {
            ...newDefects[i],
            photoNumber: String(currentNum + 1)
          };
        }
        
        console.log('➕ [ADD] Inserted defect at index', insertIndex, 'with number', nextPhotoNumber);
        
        // DO NOT apply sorting when inserting in the middle - keep the tile where it was inserted
        return newDefects;
      } else {
        // Always add to the bottom (end of array)
        const maxPhotoNumber = currentDefects.reduce((max, defect) => {
          const num = parseInt(defect.photoNumber) || 0;
          return num > max ? num : max;
        }, 0);
        
        const nextPhotoNumber = String(maxPhotoNumber + 1);
        
        const newDefect = {
          id: nanoid(),
          photoNumber: nextPhotoNumber,
          description: '',
          selectedFile: ''
        };
        
        newDefects = [...currentDefects, newDefect];
        
        // When adding to bottom, don't apply sorting - keep it at the bottom
        // Sorting should only be applied when explicitly toggling the sort button
        // This prevents flickering and ensures new tiles appear at the bottom
        return newDefects;
      }
    });
    
    // Track the addition
    trackUserAction('add_defect', 'bulk');
  };

  const deleteDefect = (defectId: string) => {
    // Validate the defect ID
    if (!defectId || typeof defectId !== 'string') {
      console.error('❌ Invalid defect ID for deletion:', defectId);
      return;
    }
    
    // Find the defect by its unique ID (not photoNumber)
    const defect = bulkDefects.find(d => d.id === defectId);
    
    if (!defect) {
      console.error('❌ Defect not found for deletion:', defectId);
      console.log('🔍 Available defects:', bulkDefects.map(d => ({ id: d.id, photoNumber: d.photoNumber })));
      return;
    }
    
    console.log('🗑️ Deleting defect:', { id: defect.id, photoNumber: defect.photoNumber });
    
    // Store the deleted defect with complete state for undo
    const deletedDefect = {
      defect: { ...defect },
      originalIndex: bulkDefects.findIndex(d => d.id === defectId),
      deletedAt: new Date(),
      wasAutoSorted: defectSortDirection !== null,
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
      console.log('✅ Defect deleted, remaining items:', filteredItems.length);
      // Renumber based on position if sorting is disabled, or re-sort if enabled
      if (defectSortDirection) {
        return reorderAndRenumberDefects(filteredItems, defectSortDirection);
      } else {
        // Just renumber based on position (1, 2, 3...)
        return filteredItems.map((item, idx) => ({
          ...item,
          photoNumber: String(idx + 1)
        }));
      }
    });
  };

  const undoDelete = () => {
    if (deletedDefects.length > 0) {
      const lastDeleted = deletedDefects[deletedDefects.length - 1];
      
      // Set flag FIRST before any state updates to prevent auto-sort from interfering
      isUndoing.current = true;
      isUndoingGlobal = true;
      
      console.log('🔄 [UNDO] Starting undo - originalPhotoNumber:', lastDeleted.originalPhotoNumber, 'defect:', lastDeleted.defect.description);
      
      setDeletedDefects(prev => prev.slice(0, -1));
      
      setBulkDefects(prev => {
        console.log('🔄 [UNDO] Current defects before restore:', prev.map(d => ({ num: d.photoNumber, desc: d.description })));
        
        // Get the original photo number
        const originalPhotoNumber = parseInt(lastDeleted.originalPhotoNumber || lastDeleted.defect.photoNumber) || 0;
        console.log('🔄 [UNDO] Original photo number:', originalPhotoNumber);
        
        // Create the restored defect with empty photo number
        const restoredDefect = {
          ...lastDeleted.defect,
          photoNumber: '' // Will be assigned during renumbering
        };
        
        // Calculate insertion index based on original photo number
        const insertIndex = Math.max(0, Math.min(originalPhotoNumber - 1, prev.length));
        console.log('🔄 [UNDO] Inserting at index:', insertIndex);
        
        // Insert the restored defect at the correct position
        const insertedDefects = [...prev];
        insertedDefects.splice(insertIndex, 0, restoredDefect);
        console.log('🔄 [UNDO] After insertion:', insertedDefects.map(d => ({ num: d.photoNumber || 'empty', desc: d.description })));
        
        // Now renumber ALL defects sequentially from 1 to ensure uniqueness
        // This is based on array position, not photo number
        const renumberedDefects = insertedDefects.map((defect, idx) => ({
          ...defect,
          photoNumber: String(idx + 1)
        }));
        
        console.log('🔄 [UNDO] After renumbering:', renumberedDefects.map(d => ({ num: d.photoNumber, desc: d.description })));
        
        // Verify no duplicates after renumbering
        const photoNumbers = renumberedDefects.map(d => d.photoNumber);
        const duplicates = photoNumbers.filter((num, idx) => photoNumbers.indexOf(num) !== idx);
        if (duplicates.length > 0) {
          console.error('❌ [UNDO] DUPLICATES DETECTED AFTER RENUMBERING:', duplicates, 'defects:', renumberedDefects.map(d => ({ num: d.photoNumber, desc: d.description })));
        } else {
          console.log('✅ [UNDO] No duplicates detected after renumbering');
        }
        
        // Clear the undo flag after a longer delay to ensure auto-sort doesn't interfere
        // The auto-sort has a 300ms debounce, so we wait 500ms to be extra safe
        setTimeout(() => {
          console.log('🔄 [UNDO] Clearing undo flag');
          isUndoing.current = false;
          isUndoingGlobal = false;
        }, 500);
        
        return renumberedDefects;
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
  // Use shared global flag for undo (accessible from SelectedImagesPanel too)
  const isUndoing = useRef(false);
  
  // Sync local ref with global flag
  useEffect(() => {
    isUndoing.current = isUndoingGlobal;
  }, []);
  
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

        console.log('📋 New defects to add from bulk paste:', newDefects.map(d => ({ photoNumber: d.photoNumber, description: d.description })));

        // Update project date if available - ensure it's properly set
        if (parseResult.projectDate) {
          setFormData({ date: parseResult.projectDate });
        }

        // Add defects and select corresponding images
        setBulkDefects(prev => {
          const updated = [...prev, ...newDefects];
          
          // If sorting is enabled, apply it after adding
          if (defectSortDirection) {
            setTimeout(() => {
              setBulkDefects(current => reorderAndRenumberDefects(current, defectSortDirection));
            }, 100);
          }
          
          return updated;
        });
        
        // Select corresponding images
        newDefects.forEach(defect => {
          const image = images.find(img => (img.fileName || img.file?.name || '') === defect.selectedFile);
          if (image && !bulkSelectedImages.includes(image.id)) {
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

      console.log('📋 New defects to add from simple format:', newDefects.map(d => ({ photoNumber: d.photoNumber, description: d.description })));
      setBulkDefects(prev => {
        const updated = [...prev, ...newDefects];
        
        // If sorting is enabled, apply it after adding
        if (defectSortDirection) {
          // Use setTimeout to ensure state update completes first
          setTimeout(() => {
            setBulkDefects(current => reorderAndRenumberDefects(current, defectSortDirection));
          }, 100);
        }
        
        return updated;
      });
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
      setBulkDefects(prev => {
        const updated = [...prev, ...newDefects];
        
        // If sorting is enabled, apply it after adding
        if (defectSortDirection) {
          setTimeout(() => {
            setBulkDefects(current => reorderAndRenumberDefects(current, defectSortDirection));
          }, 100);
        }
        
        return updated;
      });
      
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
    console.log('📝 Updating description for photo number:', photoNumber, 'description:', description);
    
    const { isValid, invalidChars, hasForwardSlashes } = validateDescription(description);
    if (!isValid) {
      setError(hasForwardSlashes ? 'Forward slashes (/) are not allowed in descriptions' : `Invalid characters found: ${invalidChars.join(' ')}`);
      return;
    }
    setError(null);
    
    setBulkDefects((items) => {
      const updated = items.map((item) =>
        item.photoNumber === photoNumber ? { ...item, description } : item
      );
      console.log('📝 Updated bulk defects:', updated.map(d => ({ photoNumber: d.photoNumber, description: d.description })));
      return updated;
    });
  };

  const handleFileSelect = (photoNumber: string, fileName: string) => {
    // Temporarily disable sorting during file selection
    const wasSorting = defectSortDirection;
    // Use 'asc' instead of null to prevent three-state toggle issue
    setDefectSortDirection('asc');

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

      // Re-enable sorting after a delay if it was enabled
      if (wasSorting) {
        setTimeout(() => {
          setDefectSortDirection(wasSorting);
          // Re-apply sorting
          setBulkDefects(current => reorderAndRenumberDefects(current, wasSorting));
        }, 100);
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

      // Temporarily disable sorting during photo number change
      const wasSorting = defectSortDirection;
      // Use 'asc' instead of null to prevent three-state toggle issue
      setDefectSortDirection('asc');
      
      setBulkDefects(prevDefects => {
        // Update the photo number
        const updatedDefects = prevDefects.map(defect => 
          defect.id === defectId 
            ? { ...defect, photoNumber: newNumber }
            : defect
        );

        // Re-enable sorting after a delay if it was enabled
        if (wasSorting) {
          setTimeout(() => {
            setDefectSortDirection(wasSorting);
            // Re-apply sorting after re-enabling
            setBulkDefects(current => reorderAndRenumberDefects(current, wasSorting));
          }, 100);
        }

        return updatedDefects;
      });
    } catch (err) {
      console.error('Error updating photo number:', err);
      setError('Failed to update photo number');
    }
  };

  const toggleSorting = () => {
    // Toggle between 'asc' and 'desc' only (no null state)
    // If null or invalid, default to 'asc'
    const currentDirection = defectSortDirection || 'asc';
    const newDirection = currentDirection === 'asc' ? 'desc' : 'asc';
    
    console.log('🔄 [SORT] Toggling from', currentDirection, 'to', newDirection);
    
    // Update direction first
    setDefectSortDirection(newDirection);
    
    // Immediately apply sorting when toggling (tiles will move)
    // Use functional update to ensure we have latest state
    // Sort AND renumber - tiles will move because array order changes, then renumber to match new positions
    setBulkDefects(defects => {
      const sorted = reorderAndRenumberDefects(defects, newDirection, true); // true = renumber after sorting
      console.log('🔄 [SORT] Applied sorting:', newDirection, '- defects before:', defects.length, '- after:', sorted.length);
      console.log('🔄 [SORT] First 3 defects before:', defects.slice(0, 3).map(d => ({ id: d.id, num: d.photoNumber, desc: d.description })));
      console.log('🔄 [SORT] First 3 defects after:', sorted.slice(0, 3).map(d => ({ id: d.id, num: d.photoNumber, desc: d.description })));
      return sorted;
    });
  };

  const formatFileSize = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    const maxSize = 250 * 1024 * 1024; // 250MB per file
    
    if (file.size > maxSize) {
      return { 
        valid: false, 
        error: `${file.name} (${formatFileSize(file.size)} - too large). Max size is 250MB.` 
      };
    }
    
    return { valid: true };
  };

  const handleFileUpload = async (file: File) => {
    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      trackError('upload_validation', 'invalid_file_type');
      return;
    }

    // Validate file size
    const validation = validateFile(file);
    if (!validation.valid) {
      toast.error(validation.error || 'File validation failed');
      trackError('upload_validation', 'file_too_large');
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
      console.log('Full transformed data:', JSON.stringify(transformedData, null, 2));
      console.log('🌐 Browser:', navigator.userAgent);
      console.log('🌐 Chrome version:', navigator.userAgent.includes('Chrome') ? 'Chrome detected' : 'Not Chrome');
      
      // Call Lambda function for bulk mode (same as DownloadButton.tsx)
      const apiUrl = getFullApiUrl();
      console.log('🌐 Using API endpoint:', apiUrl);
      
      // Chrome-specific workaround: try different request configurations
      const isChrome = navigator.userAgent.includes('Chrome');
      let response;
      let errorMessage = 'Bulk download failed';
      
      try {
        // First attempt with standard configuration
        response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Cache-Control': 'no-cache',
          },
          mode: 'cors',
          credentials: 'omit',
          body: JSON.stringify(transformedData)
        });
      } catch (fetchError) {
        console.error('First fetch attempt failed:', fetchError);
        
        if (isChrome) {
          // Chrome fallback: try without CORS mode
          console.log('🔄 Chrome detected, trying fallback request configuration...');
          try {
            response = await fetch(apiUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(transformedData)
            });
          } catch (fallbackError) {
            console.error('Chrome fallback also failed:', fallbackError);
            throw new Error('Network request failed in Chrome. Please try again or use a different browser.');
          }
        } else {
          throw fetchError;
        }
      }

      if (!response.ok) {
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Bulk download failed');
      }

      console.log('✅ Lambda bulk response received:', result);
      
      // Download the file using the presigned URL (same method as stable version)
      window.open(result.downloadUrl, '_blank');

      if (navigator.userAgent.includes('Chrome')) {
        toast.success('Package downloaded successfully! 💡 Chrome users: If you experience issues, try Edge or Firefox.');
      } else {
        toast.success('Package downloaded successfully');
      }
    } catch (error) {
      console.error('Download error:', error);
      trackError('download_failed', 'bulk_download');
      let errorMsg = error instanceof Error ? error.message : 'Failed to download package';
      
      if (navigator.userAgent.includes('Chrome') && errorMsg.includes('Network request failed')) {
        errorMsg = 'Chrome detected an issue. Please try Edge or Firefox, or contact support if the problem persists.';
      }
      
      toast.error(errorMsg);
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
        if (image && !bulkSelectedImages.includes(image.id)) {
          toggleBulkImageSelection(image.id);
        }
      }
    });
  }, [bulkDefects, images]);

  // Handle auto-sorting with debouncing to prevent conflicts
  // Only apply when defects are added/removed, not when sort direction changes (toggleSorting handles that)
  // This prevents conflicts where toggleSorting and useEffect both try to sort
  useEffect(() => {
    // Skip auto-sort if we're currently undoing (prevents interference)
    // Check both local ref and global flag (for cross-component undo operations)
    if (isUndoing.current || isUndoingGlobal) {
      console.log('⏸️ [AUTO-SORT] Skipping - undo in progress');
      return;
    }
    
    // Get current direction from store to avoid stale closure
    const currentDirection = useMetadataStore.getState().defectSortDirection;
    
    if (currentDirection && bulkDefects.length > 0) {
      const timeoutId = setTimeout(() => {
        // Double-check we're not undoing (both local and global)
        if (isUndoing.current || isUndoingGlobal) {
          console.log('⏸️ [AUTO-SORT] Skipping timeout - undo in progress');
          return;
        }
        
        setBulkDefects(prev => {
          // Only apply auto-sorting if it's still enabled
          const latestDirection = useMetadataStore.getState().defectSortDirection;
          if (latestDirection) {
            // Check if defects are already sorted to avoid unnecessary re-sorting
            const isAlreadySorted = prev.every((defect, idx) => {
              if (idx === 0) return true;
              const num = parseInt(defect.photoNumber) || 0;
              const prevNum = parseInt(prev[idx - 1].photoNumber) || 0;
              if (latestDirection === 'asc') {
                return num >= prevNum;
              } else {
                return num <= prevNum;
              }
            });
            
            if (!isAlreadySorted) {
              console.log('🔄 [AUTO-SORT] Applying', latestDirection, 'sort - defects:', prev.length);
              return reorderAndRenumberDefects(prev, latestDirection);
            }
          }
          return prev;
        });
      }, 300); // Debounce auto-sorting

      return () => clearTimeout(timeoutId);
    }
  }, [bulkDefects.length]); // Only trigger on length change, not direction change

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

  // Cleanup function to remove phantom or invalid defects
  const cleanupInvalidDefects = () => {
    setBulkDefects(currentDefects => {
      // Remove defects without valid IDs
      const validDefects = currentDefects.filter(defect => 
        defect.id && 
        defect.id.trim() && 
        defect.id !== 'undefined' && 
        defect.id !== 'null'
      );
      
      // Remove duplicate IDs (keep the first occurrence)
      const uniqueDefects = validDefects.filter((defect, index) => 
        validDefects.findIndex(d => d.id === defect.id) === index
      );
      
      if (uniqueDefects.length !== currentDefects.length) {
        console.log('🧹 Cleaned up invalid defects:', {
          before: currentDefects.length,
          after: uniqueDefects.length,
          removed: currentDefects.length - uniqueDefects.length
        });
      }
      
      return uniqueDefects;
    });
  };

  // Enhanced data validation and logging
  useEffect(() => {
    if (bulkDefects.length > 0) {
      // Log data state for debugging
      console.log('📊 Bulk defects state:', {
        totalDefects: bulkDefects.length,
        defectsWithImages: bulkDefects.filter(d => d.selectedFile).length,
        defectsWithNumbers: bulkDefects.filter(d => d.photoNumber && d.photoNumber.trim()).length,
        defectsWithDescriptions: bulkDefects.filter(d => d.description && d.description.trim()).length
      });
      
      // Validate data integrity - ensure all defects have IDs
      const defectsWithoutIds = bulkDefects.filter(d => !d.id);
      if (defectsWithoutIds.length > 0) {
        console.warn('⚠️ Found defects without IDs:', defectsWithoutIds.length);
        // Assign IDs to defects that don't have them
        setBulkDefects(prev => prev.map(defect => {
          if (!defect.id) {
            return { ...defect, id: nanoid() };
          }
          return defect;
        }));
      }
      
      const duplicateIds = bulkDefects.filter((d, index) => 
        bulkDefects.findIndex(d2 => d2.id === d.id) !== index
      );
      if (duplicateIds.length > 0) {
        console.warn('⚠️ Found duplicate defect IDs:', duplicateIds.length);
        // Clean up duplicate defects
        cleanupInvalidDefects();
      }
    }
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
  const debouncedAutoSave = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  useEffect(() => {
    if (bulkDefects.length > 0) {
      // Clear existing timeout
      if (debouncedAutoSave.current) {
        clearTimeout(debouncedAutoSave.current);
      }
      
      // Set new timeout for auto-save
      debouncedAutoSave.current = setTimeout(async () => {
        console.log('🔄 Auto-save triggered for bulk defects:', bulkDefects.map(d => ({ photoNumber: d.photoNumber, description: d.description })));
        
        // Only save if we're not in the middle of clearing
        const projectStore = useProjectStore.getState();
        if (!projectStore.isClearing) {
          try {
            await saveBulkData();
          } catch (error) {
            console.error('❌ Auto-save failed:', error);
            // Don't show error to user for auto-save failures
          }
        }
      }, 2000); // 2 second debounce
    }
    
    return () => {
      if (debouncedAutoSave.current) {
        clearTimeout(debouncedAutoSave.current);
      }
    };
  }, [bulkDefects]); // Removed saveBulkData from dependencies temporarily

  // Enhanced data validation and logging
  useEffect(() => {
    if (bulkDefects.length > 0) {
      // Log data state for debugging
      console.log('📊 Bulk defects state:', {
        totalDefects: bulkDefects.length,
        defectsWithImages: bulkDefects.filter(d => d.selectedFile).length,
        defectsWithNumbers: bulkDefects.filter(d => d.photoNumber && d.photoNumber.trim()).length,
        defectsWithDescriptions: bulkDefects.filter(d => d.description && d.description.trim()).length
      });
      
      // Validate data integrity
      const invalidDefects = bulkDefects.filter(d => !d.id);
      if (invalidDefects.length > 0) {
        console.warn('⚠️ Found defects without IDs:', invalidDefects.length);
      }
      
      const duplicateIds = bulkDefects.filter((d, index) => 
        bulkDefects.findIndex(d2 => d2.id === d.id) !== index
      );
      if (duplicateIds.length > 0) {
        console.warn('⚠️ Found duplicate defect IDs:', duplicateIds.length);
      }
    }
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

  // Auto-save bulk data with throttling
  useEffect(() => {
    if (bulkDefects.length > 0) {
      const saveTimeout: NodeJS.Timeout = setTimeout(() => {
        saveBulkData();
      }, 5000);

      return () => clearTimeout(saveTimeout);
    }
  }, [bulkDefects, saveBulkData]);

  // Auto-save session state when bulk defects change
  useEffect(() => {
    if (bulkDefects.length > 0) {
      const { updateSessionState } = useMetadataStore.getState();
      updateSessionState({
        bulkDefectOrder: bulkDefects.map(defect => defect.id).filter(Boolean)
      });
    }
  }, [bulkDefects]);

  // Auto-save session state when bulk selected images change
  useEffect(() => {
    if (bulkSelectedImages.length > 0) {
      const { updateSessionState } = useMetadataStore.getState();
      updateSessionState({
        bulkSelectedImages: bulkSelectedImages
      });
    }
  }, [bulkSelectedImages]);

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
                    items={bulkDefects.map(d => d.id).filter(Boolean) as string[]}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {bulkDefects.map((defect, index) => (
                        <DefectTile
                          key={defect.id || `defect-${index}`}
                          id={defect.id || `defect-${index}`}
                          photoNumber={defect.photoNumber}
                          description={defect.description}
                          selectedFile={defect.selectedFile || ''}
                          availableFiles={images.filter(img => !img.isSketch).map((img) => (img.fileName || img.file?.name || ''))}
                          onDelete={() => {
                            // Use defect.id directly - should always exist due to useEffect fix above
                            if (defect.id) {
                              enhancedDeleteDefect(defect.id);
                            } else {
                              console.error('❌ Cannot delete defect without ID - this should not happen:', defect);
                            }
                          }}
                          onDescriptionChange={(value) => updateDefectDescription(defect.photoNumber, value)}
                          onFileChange={(fileName) => handleFileSelect(defect.photoNumber, fileName)}
                          onPhotoNumberChange={(oldNumber, newNumber) => {
                            // Use defect.id directly - should always exist due to useEffect fix above
                            if (defect.id) {
                              handlePhotoNumberChange(defect.id, oldNumber, newNumber);
                            } else {
                              console.error('❌ Cannot update defect without ID - this should not happen:', defect);
                            }
                          }}
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
                  <div>
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={(event) => {
                        const { active, over } = event;
                        if (over && active.id !== over.id) {
                          // Temporarily disable sorting during drag
                          const wasSorting = defectSortDirection;
                          // Use 'asc' instead of null to prevent three-state toggle issue
                          setDefectSortDirection('asc');
                          
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
                              
                              // Renumber defects based on new position (1, 2, 3...)
                              const renumberedItems = reorderedItems.map((defect, idx) => ({
                                ...defect,
                                photoNumber: String(idx + 1)
                              }));
                              
                              // Update session state to preserve bulk defect order
                              setTimeout(() => {
                                updateSessionState({ 
                                  bulkDefectOrder: renumberedItems.map(defect => defect.id).filter(Boolean)
                                });
                              }, 100);
                              
                              // Re-enable sorting after a delay if it was enabled
                              if (wasSorting) {
                                setTimeout(() => {
                                  setDefectSortDirection(wasSorting);
                                  // Re-apply sorting after re-enabling
                                  setBulkDefects(current => reorderAndRenumberDefects(current, wasSorting));
                                }, 500);
                              }
                              
                              return renumberedItems;
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
                                                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" style={{ gridAutoRows: 'minmax(300px, auto)' }}>
                        {bulkDefects
                          .filter(defect => defect.selectedFile)
                          .map((defect, index) => {
                            const img = images.find(img => (img.fileName || img.file?.name || '') === defect.selectedFile);
                            if (!img) return null;
                            return (
                              <div key={`selected-${defect.id}-${img.id}`} className="relative group bg-white/80 dark:bg-gray-800/80 rounded-lg border border-slate-200/50 dark:border-gray-700/50 p-3" style={{ minHeight: '300px' }}>
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
                                      onChange={(e) => {
                                        if (defect.id) {
                                          handlePhotoNumberChange(defect.id, defect.photoNumber, e.target.value);
                                        } else {
                                          console.error('❌ Cannot update defect without ID - this should not happen:', defect);
                                        }
                                      }}
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
                  </div>

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