import React, { useState, useRef, useEffect } from 'react';
import { AlertCircle, FileText, Upload, Plus, ArrowUpDown, Loader2, Download, Trash2, CheckCircle, X, Maximize2 } from 'lucide-react';
import { useMetadataStore } from '../store/metadataStore';
import { validateDescription } from '../utils/fileValidation';
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
import { useAuthStore } from '../store/authStore';
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
    generateBulkZip
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

  const addNewDefect = () => {
    setBulkDefects(currentDefects => {
      // Find the highest numeric photo number
      const numbers = currentDefects
        .map(d => parseInt(d.photoNumber, 10))
        .filter(n => !isNaN(n));
      const nextNum = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
      return [
        ...currentDefects,
        {
          id: nanoid(),
          photoNumber: String(nextNum),
          description: '',
          selectedFile: ''
        }
      ];
    });
  };

  const deleteDefect = (photoNumber: string) => {
    // Get the defect being deleted
    const defect = bulkDefects.find(d => d.photoNumber === photoNumber);
    
    // If the defect had a selected file, deselect it
    if (defect?.selectedFile) {
      const selectedImage = images.find(img => img.file.name === defect.selectedFile);
      if (selectedImage) {
        toggleBulkImageSelection(selectedImage.id);
      }
    }

    setBulkDefects((items) => {
      const filteredItems = items.filter((item) => item.photoNumber !== photoNumber);
      return isSortingEnabled ? reorderDefects(filteredItems) : filteredItems;
    });
  };

  const handleBulkPaste = () => {
    // Split pasted text into separate defects by any kind of line break (robust)
    const lines = bulkText.split(/(?:\r\n|\r|\n|\u2028|\u2029)/).filter(line => line.trim());
    
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
    
    setBulkDefects(prev => [...prev, ...newDefects]);
    setBulkText('');
    setShowBulkPaste(false);
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
        const previousImage = images.find(img => img.file.name === previousFile);
        if (previousImage) {
          toggleBulkImageSelection(previousImage.id);
        }
      }

      // Select the new file
      const newImage = images.find(img => img.file.name === fileName);
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

  const handlePhotoNumberChange = (oldNumber: string, newNumber: string) => {
    try {
      // DO NOT return early if newNumber is empty!
      // Allow numbers followed by optional letters
      if (!/^\d+[a-zA-Z]*$/.test(newNumber) && newNumber.trim() !== '') {
        setError('Photo number must start with numbers and can end with letters');
        return;
      }

      // Check for duplicates using ID to ensure we don't match the current defect
      const currentDefect = bulkDefects.find(d => d.photoNumber === oldNumber);
      if (!currentDefect) return;

      const isDuplicate = bulkDefects.some(d => 
        d.photoNumber === newNumber && d.id !== currentDefect.id
      );

      if (isDuplicate) {
        setError('This photo number already exists');
        return;
      }

      setBulkDefects(prevDefects => 
        prevDefects.map(defect => 
          defect.id === currentDefect.id 
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
      // Create the defects data for the text file
      const defectsData = bulkDefects
        .filter(defect => defect.selectedFile) // Only include defects with images
        .map(defect => ({
          photoNumber: defect.photoNumber,
          description: defect.description,
          imageName: defect.selectedFile
        }));

      // Get the image IDs that need to be included
      const imageIds = defectsWithImages
        .map(defect => {
          const image = images.find(img => img.file.name === defect.selectedFile);
          return image?.id;
        })
        .filter((id): id is string => id !== undefined);

      // Call generateBulkZip with the defects data
      await generateBulkZip();
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
        const image = images.find(img => img.file.name === defect.selectedFile);
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
          <h2 className="text-xl font-semibold text-slate-800 dark:text-white">
            Defect List
          </h2>
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
        </div>
      </div>
      {/* --- Bulk Paste Modal --- */}
      {showBulkPaste && (
        <div className="animate-slideDown">
          <div className="bg-white/50 dark:bg-gray-800/50 rounded-2xl p-4 border border-slate-200/50 dark:border-gray-700/50 backdrop-blur-sm shadow-sm">
            {/* --- Single instructional helper text location --- */}
            <div className="mb-2 text-xs text-slate-500 dark:text-slate-400">
              Paste or type each defect on a separate line. <b>Each line will become a separate defect.</b>
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

      <div className="flex-1 overflow-y-auto scrollbar-thin"
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
                    {bulkDefects.map((defect) => (
                      <DefectTile
                        key={defect.id}
                        id={defect.photoNumber}
                        photoNumber={defect.photoNumber}
                        description={defect.description}
                        selectedFile={defect.selectedFile || ''}
                        availableFiles={images.filter(img => !img.isSketch).map((img) => img.file.name)}
                        onDelete={() => deleteDefect(defect.photoNumber)}
                        onDescriptionChange={(value) => updateDefectDescription(defect.photoNumber, value)}
                        onFileChange={(fileName) => handleFileSelect(defect.photoNumber, fileName)}
                        onPhotoNumberChange={(oldNumber, newNumber) => handlePhotoNumberChange(oldNumber, newNumber)}
                        isExpanded={isExpanded}
                        showImages={showImages}
                        images={images}
                        setEnlargedImage={setEnlargedImage}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
            {/* Separate Add Button */}
            <button
              onClick={addNewDefect}
              className="w-full p-3 rounded-full border-2 border-dashed border-slate-200/50 dark:border-gray-700/50 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 transition-colors group bg-white/30 dark:bg-gray-800/30 backdrop-blur-sm"
            >
              <div className="flex items-center justify-center gap-2 text-slate-400 dark:text-gray-500 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">
                <Plus size={20} />
                <span className="text-sm font-medium">{bulkDefects.length === 0 ? 'Add First Defect' : 'Add Defect'}</span>
              </div>
            </button>
            {/* --- Selected Images Display --- */}
            {defectsWithImagesCount > 0 && (
              <div className="rounded-2xl border border-slate-200/50 dark:border-gray-700/50 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm shadow-sm p-4">
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
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {images
                    .filter(img => bulkDefects.some(d => d.selectedFile === img.file.name))
                    .map((img) => {
                      const defect = bulkDefects.find(d => d.selectedFile === img.file.name);
                      return (
                        <div key={img.id} className="relative group">
                          <div className="aspect-square rounded-lg overflow-hidden bg-slate-100 dark:bg-gray-700">
                            <img
                              src={img.preview}
                              alt={img.file.name}
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
                          <div className="mt-2 text-center">
                            <div className="text-xs text-slate-500 dark:text-gray-400 truncate mb-1">{img.file.name}</div>
                            {defect && (
                              <div className="inline-flex items-center px-2 py-1 text-xs font-medium bg-indigo-500 text-white rounded-full">Defect {defect.photoNumber}</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Image Zoom Modal */}
      {enlargedImage && (
        <ImageZoom
          src={enlargedImage}
          alt="Selected image"
          onClose={() => setEnlargedImage(null)}
        />
      )}

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