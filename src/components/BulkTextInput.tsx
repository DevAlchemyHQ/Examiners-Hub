import React, { useState, useRef, useEffect } from 'react';
import { AlertCircle, FileText, Upload, Plus, ArrowUpDown, Loader2, Download, Trash2 } from 'lucide-react';
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

interface ParsedEntry {
  photoNumber: string;
  description: string;
  selectedFile: string;
}

export const BulkTextInput: React.FC = () => {
  const { 
    bulkDefects, 
    setBulkDefects, 
    loadBulkData,
    images,
    toggleBulkImageSelection,
    savePdf,
    loadSavedPdfs
  } = useMetadataStore();
  const { user } = useAuthStore();
  
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [showBulkPaste, setShowBulkPaste] = useState(false);
  const [isSortingEnabled, setIsSortingEnabled] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load bulk data on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        await loadBulkData();
      } catch (err) {
        console.error('Error loading bulk data:', err);
        setError('Failed to load saved defects. Please refresh the page.');
      } finally {
        setIsLoading(false);
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
  useEffect(() => {
    if (bulkDefects.length === 0) {
      setShowBulkPaste(true);
    }
  }, []);

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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setBulkDefects((items) => {
        const oldIndex = items.findIndex((item) => item.photoNumber === active.id);
        const newIndex = items.findIndex((item) => item.photoNumber === over.id);
        
        // Just reorder based on drag position
        const reorderedItems = arrayMove(items, oldIndex, newIndex);
        
        // Only sort if sorting is enabled
        return reorderedItems;
      });
    }
  };

  const addNewDefect = () => {
    setBulkDefects(currentDefects => {
      if (currentDefects.length === 0) {
        return [{
          id: nanoid(),
          photoNumber: '1',
          description: '',
          selectedFile: ''
        }];
      }

      // Get the last defect
      const lastDefect = currentDefects[currentDefects.length - 1];
      const match = lastDefect.photoNumber.match(/^(\d+)([a-zA-Z]*)$/);
      
      if (!match) {
        // If no match, just increment the number
        const nextNum = currentDefects.length + 1;
        return [...currentDefects, {
          id: nanoid(),
          photoNumber: String(nextNum),
          description: '',
          selectedFile: ''
        }];
      }

      const [, num, letter = ''] = match;
      let newPhotoNumber;
      
      if (letter === '') {
        // If no letter, add 'a'
        newPhotoNumber = `${num}a`;
      } else {
        // Increment the letter
        const nextLetter = String.fromCharCode(letter.charCodeAt(0) + 1);
        newPhotoNumber = `${num}${nextLetter}`;
      }

      return [...currentDefects, {
        id: nanoid(),
        photoNumber: newPhotoNumber,
        description: '',
        selectedFile: ''
      }];
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
    const lines = bulkText.split('\n').filter(line => line.trim());
    
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
      return items.map((item) =>
        item.photoNumber === photoNumber ? { ...item, selectedFile: fileName } : item
      );
    });
  };

  const handlePhotoNumberChange = (oldNumber: string, newNumber: string) => {
    try {
      if (newNumber.trim() === '') return;
      
      // Allow numbers followed by optional letters
      if (!/^\d+[a-zA-Z]*$/.test(newNumber)) {
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

  return (
    <div className="h-full flex flex-col p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-white">
            Defect List
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowBulkPaste(!showBulkPaste)}
            className="flex items-center gap-2 px-4 py-2 bg-white/50 dark:bg-gray-800/50 
              text-slate-700 dark:text-gray-300 rounded-full border border-slate-200/50 
              dark:border-gray-700/50 hover:bg-white dark:hover:bg-gray-800 
              transition-all shadow-sm hover:shadow backdrop-blur-sm"
          >
            <FileText size={16} />
            <span className="text-sm font-medium">Bulk Paste</span>
          </button>
          <button
            onClick={toggleSorting}
            className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all shadow-sm hover:shadow-md
              ${isSortingEnabled 
                ? 'bg-indigo-500/90 text-white hover:bg-indigo-500' 
                : 'bg-white/50 dark:bg-gray-800/50 text-slate-700 dark:text-gray-300 border border-slate-200/50 dark:border-gray-700/50 hover:bg-white dark:hover:bg-gray-800'
              }`}
          >
            <ArrowUpDown size={16} />
            <span className="text-sm font-medium">
              {isSortingEnabled ? 'Auto Sorting' : 'Manual Order'}
            </span>
          </button>
        </div>
      </div>

      {showBulkPaste && (
        <div className="animate-slideDown">
          <div className="bg-white/50 dark:bg-gray-800/50 rounded-2xl p-4 border 
            border-slate-200/50 dark:border-gray-700/50 backdrop-blur-sm shadow-sm">
            <textarea
              ref={textareaRef}
              value={bulkText}
              placeholder="Paste multiple defect descriptions here, one per line..."
              onChange={(e) => setBulkText(e.target.value)}
              className="w-full min-h-[96px] p-3 text-sm border border-slate-200/50 dark:border-gray-700/50 
                rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 
                bg-white/80 dark:bg-gray-800/80 text-slate-900 dark:text-white resize-y"
              style={{ height: Math.max(96, Math.min(300, 24 * (bulkText.split('\n').length + 2))) + 'px' }}
            />
            <button
              onClick={handleBulkPaste}
              disabled={!bulkText.trim()}
              className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 
                bg-indigo-500/90 text-white rounded-full hover:bg-indigo-500 
                transition-all shadow-sm hover:shadow-md disabled:opacity-50 
                disabled:hover:bg-indigo-500/90 disabled:cursor-not-allowed"
            >
              <FileText size={16} />
              <span className="text-sm font-medium">Process Text</span>
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200/50 
            dark:border-gray-700/50 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm shadow-sm p-2">
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
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>

          {/* Separate Add Button */}
          <button
            onClick={addNewDefect}
            className="w-full p-3 rounded-full border-2 border-dashed border-slate-200/50 
              dark:border-gray-700/50 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 
              transition-colors group bg-white/30 dark:bg-gray-800/30 backdrop-blur-sm"
          >
            <div className="flex items-center justify-center gap-2 text-slate-400 
              dark:text-gray-500 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 
              transition-colors"
            >
              <Plus size={20} />
              <span className="text-sm font-medium">
                {bulkDefects.length === 0 ? 'Add First Defect' : 'Add Defect'}
              </span>
            </div>
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-500 bg-red-100/10 p-3 rounded-lg">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default BulkTextInput;