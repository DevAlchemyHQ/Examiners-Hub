import React, { useState, useRef, useEffect } from 'react';
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

interface ParsedEntry {
  photoNumber: string;
  description: string;
  selectedFile: string;
}

export const BulkTextInput: React.FC<{ isExpanded?: boolean }> = ({ isExpanded = false }) => {
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
    formData
  } = useMetadataStore();
  const { user } = useAuthStore();
  
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [showBulkPaste, setShowBulkPaste] = useState(false);
  const [isSortingEnabled, setIsSortingEnabled] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [showImages, setShowImages] = useState(isExpanded);
  const [showDefectImport, setShowDefectImport] = useState(false);
  const [defectImportText, setDefectImportText] = useState('');
  const [missingImages, setMissingImages] = useState<string[]>([]);
  const [deletedDefects, setDeletedDefects] = useState<BulkDefect[]>([]);

  // Load bulk data on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const start = performance.now();
      try {
        await loadBulkData();
      } catch (err) {
        console.error('Error loading bulk data:', err);
        setError('Failed to load saved defects. Please refresh the page.');
      } finally {
        setIsLoading(false);
        console.log('Bulk data loaded in', (performance.now() - start).toFixed(0), 'ms');
      }
    };
    loadData();
  }, [loadBulkData]);

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
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
      setBulkDefects((items) => {
        const oldIndex = items.findIndex((item) => item.photoNumber === active.id);
        const newIndex = items.findIndex((item) => item.photoNumber === over.id);
        const reorderedItems = arrayMove(items, oldIndex, newIndex);
        return isSortingEnabled ? reorderAndRenumberDefects(reorderedItems) : reorderedItems;
      });
    }
  };

  const addNewDefect = (afterIndex?: number) => {
    setBulkDefects(currentDefects => {
      // Find the highest numeric photo number
      const numbers = currentDefects
        .map(d => parseInt(d.photoNumber, 10))
        .filter(n => !isNaN(n));
      const nextNum = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
      
      const newDefect = {
        id: nanoid(),
        photoNumber: String(nextNum),
        description: '',
        selectedFile: ''
      };

      if (afterIndex !== undefined) {
        // Insert after the specified index
        const newDefects = [...currentDefects];
        newDefects.splice(afterIndex + 1, 0, newDefect);
        return newDefects;
      } else {
        // Add to the end
        return [...currentDefects, newDefect];
      }
    });
  };

  const deleteDefect = (photoNumber: string) => {
    // Get the defect being deleted
    const defect = bulkDefects.find(d => d.photoNumber === photoNumber);
    
    if (defect) {
      // Store the deleted defect for undo with original photo number
      setDeletedDefects(prev => [...prev, { ...defect, originalPhotoNumber: defect.photoNumber }]);
      
      // If the defect had a selected file, deselect it
      if (defect.selectedFile) {
        const selectedImage = images.find(img => (img.fileName || img.file?.name || '') === defect.selectedFile);
        if (selectedImage) {
          toggleBulkImageSelection(selectedImage.id);
        }
      }

      setBulkDefects((items) => {
        const filteredItems = items.filter((item) => item.photoNumber !== photoNumber);
        return isSortingEnabled ? reorderAndRenumberDefects(filteredItems) : filteredItems;
      });
    }
  };

  const undoDelete = () => {
    if (deletedDefects.length > 0) {
      const lastDeleted = deletedDefects[deletedDefects.length - 1];
      setDeletedDefects(prev => prev.slice(0, -1));
      
      setBulkDefects(prev => {
        // Add the deleted defect back
        const newDefects = [...prev, lastDeleted];
        
        // If auto sorting is enabled, reorder and renumber properly
        if (isSortingEnabled) {
          // First, sort by the original photo numbers to maintain order
          const sorted = reorderDefects(newDefects);
          // Then renumber sequentially
          return sorted.map((defect, index) => ({
            ...defect,
            photoNumber: String(index + 1)
          }));
        } else {
          // If not auto-sorting, restore the original photo number
          return newDefects.map(defect => 
            defect.id === lastDeleted.id 
              ? { ...defect, photoNumber: lastDeleted.photoNumber }
              : defect
          );
        }
      });
      
      // Re-select the image if it was selected
      if (lastDeleted.selectedFile) {
        const image = images.find(img => (img.fileName || img.file?.name || '') === lastDeleted.selectedFile);
        if (image) {
          toggleBulkImageSelection(image.id);
        }
      }
    }
  };

  // Function to check for duplicate photo numbers
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

  const handleBulkPaste = () => {
    console.log('Processing text:', bulkText);
    
    // Check if the text looks like defect format (contains ^ and file extensions)
    const hasDefectFormat = bulkText.includes('^') && (bulkText.includes('.JPG') || bulkText.includes('.jpg'));
    console.log('Has defect format:', hasDefectFormat);
    
    if (hasDefectFormat) {
      // Parse as defect format
      try {
        console.log('Attempting to parse as defect format...');
        const parseResult = parseDefectText(bulkText);
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
        
        // Select the images for the imported defects
        newDefects.forEach(defect => {
          const image = images.find(img => (img.fileName || img.file?.name || '') === defect.selectedFile);
          if (image) {
            toggleBulkImageSelection(image.id);
          }
        });

        setBulkText('');
        setShowBulkPaste(false);
        toast.success(`Imported ${newDefects.length} defects successfully!`);
      } catch (error) {
        console.error('Error parsing defect text:', error);
        setError(`Failed to parse defect text: ${error instanceof Error ? error.message : 'Unknown error'}. Please check the format.`);
      }
    } else {
      console.log('Processing as simple text format...');
      // Original bulk paste behavior for simple text
      const lines = bulkText.split(/(?:\r\n|\r|\n|\u2028|\u2029)/).filter(line => line.trim());
      console.log('Lines to process:', lines);
      
      const invalidLines = lines.filter(line => !validateDescription(line.trim()).isValid);
      if (invalidLines.length > 0) {
        setError('Some descriptions contain invalid characters (/ or \\). Please remove them before proceeding.');
        return;
      }
      
      const newDefects = lines.map((line, index) => ({
        id: nanoid(),
        photoNumber: String(bulkDefects.length + index + 1),
        description: line.trim(),
        selectedFile: ''
      }));
      
      console.log('New defects from simple text:', newDefects);
      setBulkDefects(prev => [...prev, ...newDefects]);
      setBulkText('');
      setShowBulkPaste(false);
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
    const { isValid, invalidChars } = validateDescription(description);
    if (!isValid) {
      setError(`Invalid characters found: ${invalidChars.join(' ')}`);
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
      return isSortingEnabled ? reorderAndRenumberDefects(updated) : updated;
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

      setBulkDefects(prevDefects => 
        prevDefects.map(defect => 
          defect.id === defectId 
            ? { ...defect, photoNumber: newNumber }
            : defect
        )
      );
    } catch (err) {
      console.error('Error updating photo number:', err);
      setError('Failed to update photo number');
    }
  };

  const toggleSorting = () => {
    setIsSortingEnabled(!isSortingEnabled);
    if (!isSortingEnabled) {
      setBulkDefects(defects => [...reorderDefects(defects)]);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      return;
    }

    try {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      await savePdf(user.id, file);
      toast.success('PDF uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload PDF');
    }
  };

  const handleDownload = async () => {
    // Check if there are any defects with selected images
    const defectsWithImages = bulkDefects.filter(defect => defect.selectedFile);
    
    if (defectsWithImages.length === 0) {
      toast.error('Please select images for at least one defect');
      return;
    }

    setIsDownloading(true);
    try {
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

  // --- 1. Utility for selected images count ---
  const defectsWithImagesCount = bulkDefects.filter(d => d.selectedFile).length;

  return (
    <div className="h-full flex flex-col p-4 space-y-4">
      {/* Remove the old top-level Show Images toggle */}
      {/* --- Tab bar and controls row --- */}
              <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
          <div className="flex items-center gap-2">
          </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Show Images toggle moved here */}
          {isExpanded && (
            <button
              onClick={() => setShowImages((v) => !v)}
              className={`px-4 py-2 rounded-full border text-sm font-medium transition-colors shadow-sm hover:shadow backdrop-blur-sm ${showImages ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-white/80 dark:bg-gray-800/80 text-slate-700 dark:text-gray-300 border-slate-200/50 dark:border-gray-700/50'}`}
              style={{ minWidth: 120 }}
            >
              {showImages ? 'List Only' : 'Show Images'}
            </button>
          )}
          <button
            onClick={() => setShowBulkPaste(!showBulkPaste)}
            className="flex items-center gap-2 px-4 py-2 bg-white/50 dark:bg-gray-800/50 text-slate-700 dark:text-gray-300 rounded-full border border-slate-200/50 dark:border-gray-700/50 hover:bg-white dark:hover:bg-gray-800 transition-all shadow-sm hover:shadow backdrop-blur-sm"
          >
            <FileText size={16} />
            <span className="text-sm font-medium">Bulk Paste</span>
          </button>

          <button
            onClick={toggleSorting}
            className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all shadow-sm hover:shadow-md ${isSortingEnabled ? 'bg-indigo-500/90 text-white hover:bg-indigo-500' : 'bg-white/50 dark:bg-gray-800/50 text-slate-700 dark:text-gray-300 border border-slate-200/50 dark:border-gray-700/50 hover:bg-white dark:hover:bg-gray-800'}`}
          >
            <ArrowUpDown size={16} />
            <span className="text-sm font-medium">{isSortingEnabled ? 'Auto Sorting' : 'Manual Order'}</span>
          </button>
          {deletedDefects.length > 0 && (
            <button
              onClick={undoDelete}
              className="flex items-center gap-2 px-4 py-2 bg-green-500/90 text-white rounded-full border border-green-500/50 hover:bg-green-500 transition-all shadow-sm hover:shadow backdrop-blur-sm"
              title="Undo last deletion"
            >
              <CheckCircle size={16} />
              <span className="text-sm font-medium">Undo</span>
            </button>
          )}
          {bulkDefects.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to delete ALL bulk defects? This action cannot be undone.')) {
                  setBulkDefects([]);
                  setDeletedDefects([]);
                  toast.success('All bulk defects deleted');
                }
              }}
              className="p-2 bg-red-500/90 text-white rounded-full border border-red-500/50 hover:bg-red-500 transition-all shadow-sm hover:shadow backdrop-blur-sm"
              title="Delete all bulk defects"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
      {/* --- Bulk Paste Modal --- */}
      {showBulkPaste && (
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
            </div>
            <textarea
              ref={textareaRef}
              value={bulkText}
              placeholder="Paste multiple defect descriptions here, one per line..."
              onChange={(e) => setBulkText(e.target.value)}
              className="w-full min-h-[96px] p-3 text-sm border border-slate-200/50 dark:border-gray-700/50 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 bg-white/80 dark:bg-gray-800/80 text-slate-900 dark:text-white resize-y"
              style={{ height: Math.max(96, Math.min(300, 24 * (bulkText.split('\n').length + 2))) + 'px' }}
            />
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
          // Skeleton loader for defects list
          <div className="space-y-2 animate-pulse">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-10 bg-slate-200/60 dark:bg-gray-700/40 rounded-xl" />
            ))}
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
                  items={bulkDefects.map(d => d.photoNumber)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {bulkDefects.map((defect, index) => (
                      <DefectTile
                        key={`defect-${defect.photoNumber}`}
                        id={defect.photoNumber}
                        photoNumber={defect.photoNumber}
                        description={defect.description}
                        selectedFile={defect.selectedFile || ''}
                        availableFiles={images.filter(img => !img.isSketch).map((img) => (img.fileName || img.file?.name || ''))}
                        onDelete={() => deleteDefect(defect.photoNumber)}
                        onDescriptionChange={(value) => updateDefectDescription(defect.photoNumber, value)}
                        onFileChange={(fileName) => handleFileSelect(defect.photoNumber, fileName)}
                        onPhotoNumberChange={(oldNumber, newNumber) => handlePhotoNumberChange(defect.id || defect.photoNumber, oldNumber, newNumber)}
                        onQuickAdd={() => {
                          console.log('🔍 Quick add called for index:', index);
                          addNewDefect(index);
                        }}
                        isExpanded={isExpanded}
                        showImages={showImages}
                        images={images}
                        setEnlargedImage={setEnlargedImage}
                        isDuplicate={getDuplicatePhotoNumbers().has(defect.photoNumber)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
            {/* Separate Add Button */}
            <button
              onClick={() => addNewDefect()}
              className="w-full p-3 rounded-full border-2 border-dashed border-slate-200/50 dark:border-gray-700/50 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 transition-colors group bg-white/30 dark:bg-gray-800/30 backdrop-blur-sm"
            >
              <div className="flex items-center justify-center gap-2 text-slate-400 dark:text-gray-500 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">
                <Plus size={20} />
                <span className="text-sm font-medium">{bulkDefects.length === 0 ? 'Add First Defect' : 'Add Defect'}</span>
              </div>
            </button>
            {/* --- Selected Images Display --- */}
            {defectsWithImagesCount > 0 && (
              <div className="rounded-2xl border border-slate-200/50 dark:border-gray-700/50 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm shadow-sm p-4 relative">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
                    Selected Images ({defectsWithImagesCount})
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
                      // Find the defects being reordered by ID
                      const activeDefect = bulkDefects.find(d => (d.id || d.photoNumber) === active.id);
                      const overDefect = bulkDefects.find(d => (d.id || d.photoNumber) === over.id);
                      
                      if (activeDefect && overDefect) {
                        setBulkDefects(prev => {
                          const oldIndex = prev.findIndex(d => (d.id || d.photoNumber) === active.id);
                          const newIndex = prev.findIndex(d => (d.id || d.photoNumber) === over.id);
                          const reorderedItems = arrayMove(prev, oldIndex, newIndex);
                          
                          // If auto-sorting is enabled, renumber all defects
                          if (isSortingEnabled) {
                            return reorderAndRenumberDefects(reorderedItems);
                          }
                          return reorderedItems;
                        });
                      }
                    }
                  }}
                  modifiers={[restrictToVerticalAxis]}
                >
                  <SortableContext
                    items={bulkDefects.filter(d => d.selectedFile).map((d, index) => `${d.id || d.photoNumber}-${index}`)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {bulkDefects
                        .filter(defect => defect.selectedFile)
                        .map((defect, index) => {
                          const img = images.find(img => (img.fileName || img.file?.name || '') === defect.selectedFile);
                          if (!img) return null;
                          return (
                            <div key={`selected-${defect.id}-${img.id}-${index}`} className="relative group bg-white/80 dark:bg-gray-800/80 rounded-lg border border-slate-200/50 dark:border-gray-700/50 p-3">
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
                                        getDuplicatePhotoNumbers().has(defect.photoNumber) ? 'border-orange-400 dark:border-orange-500 bg-orange-50 dark:bg-orange-900/20' : 
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
    </div>
  );
};

export default BulkTextInput;