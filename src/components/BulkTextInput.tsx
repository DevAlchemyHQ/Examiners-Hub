import React, { useState, useRef } from 'react';
import { AlertCircle, FileText, Upload, Plus } from 'lucide-react';
import { useMetadataStore } from '../store/metadataStore';
import { validateDescription } from '../utils/fileValidation';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { DefectTile } from './DefectTile';

interface ParsedEntry {
  photoNumber: string;
  description: string;
  isSketch: boolean;
}

export const BulkTextInput: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const { updateImageMetadata, images, bulkDefects, setBulkDefects } = useMetadataStore();
  const [bulkText, setBulkText] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setBulkDefects((items) => {
        const oldIndex = items.findIndex((item) => item.photoNumber === active.id);
        const newIndex = items.findIndex((item) => item.photoNumber === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);
        // Update photo numbers based on new order
        return newItems.map((item, index) => ({
          ...item,
          photoNumber: String(index + 1),
        }));
      });
    }
  };

  const addNewDefect = () => {
    const newPhotoNumber = String(bulkDefects.length + 1);
    setBulkDefects([
      ...bulkDefects,
      {
        photoNumber: newPhotoNumber,
        description: '',
        isSketch: false,
      },
    ]);
  };

  const deleteDefect = (photoNumber: string) => {
    setBulkDefects((items) => {
      const newItems = items.filter((item) => item.photoNumber !== photoNumber);
      // Renumber remaining items
      return newItems.map((item, index) => ({
        ...item,
        photoNumber: String(index + 1),
      }));
    });
  };

  const handleBulkPaste = () => {
    const lines = bulkText.split('\n').filter(line => line.trim());
    
    // Validate each line for special characters
    const invalidLines = lines.filter(line => !validateDescription(line.trim()).isValid);
    if (invalidLines.length > 0) {
      setError('Some descriptions contain invalid characters (/ or \\). Please remove them before proceeding.');
      return;
    }
    
    const newDefects = lines.map((line, index) => ({
      photoNumber: String(bulkDefects.length + index + 1),
      description: line.trim(),
      selectedFile: ''
    }));
    
    setBulkDefects(prev => [...prev, ...newDefects]);
    setBulkText('');
    if (textareaRef.current) {
      textareaRef.current.value = '';
    }
  };

  const updateDefectDescription = (photoNumber: string, description: string) => {
    // Validate description for special characters
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

  const handleApplyChanges = () => {
    setShowConfirmation(true);
  };

  const confirmApplyChanges = () => {
    const defectsToApply = bulkDefects.filter(defect => defect.selectedFile);

    defectsToApply.forEach(defect => {
      const selectedImage = images.find(img => img.file.name === defect.selectedFile);
      if (selectedImage) {
        updateImageMetadata(selectedImage.id, {
          photoNumber: defect.photoNumber,
          description: defect.description
        });
      }
    });

    setShowConfirmation(false);
    setBulkDefects(bulkDefects.filter(defect => !defect.selectedFile));
  };

  return (
    <div className="h-full flex flex-col p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
              Defect List
            </h3>
            <button
              onClick={addNewDefect}
              className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
            >
              <Plus size={16} />
              <span className="text-sm font-medium">Add Defect</span>
            </button>
          </div>
          
          <div className="space-y-2">
            <textarea
              ref={textareaRef}
              value={bulkText}
              placeholder="Paste multiple defect descriptions here, one per line..."
              onChange={(e) => setBulkText(e.target.value)}
              className="w-full min-h-[96px] p-2 text-sm border border-slate-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-slate-900 dark:text-white resize-y"
              style={{ height: Math.max(96, Math.min(300, 24 * (bulkText.split('\n').length + 2))) + 'px' }}
            />
            <button
              onClick={handleBulkPaste}
              disabled={!bulkText.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-gray-300 rounded-lg hover:bg-slate-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              <FileText size={16} />
              <span className="text-sm">Process Bulk Text</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={bulkDefects.map((d) => d.photoNumber)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {bulkDefects.map((defect) => (
                <DefectTile
                  key={defect.photoNumber}
                  id={defect.photoNumber}
                  photoNumber={defect.photoNumber}
                  description={defect.description}
                  selectedFile={defect.selectedFile}
                  availableFiles={images.map((img) => img.file.name)}
                  onDelete={() => deleteDefect(defect.photoNumber)}
                  onDescriptionChange={(value) =>
                    updateDefectDescription(defect.photoNumber, value)
                  }
                  onFileChange={() => {}}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
          <AlertCircle size={18} />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <button
        onClick={() => {
          handleApplyChanges();
        }}
        className="mt-4 flex items-center justify-center gap-2 w-full bg-indigo-500 text-white py-2 rounded-lg hover:bg-indigo-600 transition-colors"
      >
        <Upload size={18} />
        Apply Changes
      </button>

      {showConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Confirm Changes
            </h3>
            <p className="text-slate-600 dark:text-gray-300 mb-6">
              This will apply the defect numbers and descriptions to your uploaded images.
              Are you sure you want to continue?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmation(false)}
                className="px-4 py-2 text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={confirmApplyChanges}
                className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};