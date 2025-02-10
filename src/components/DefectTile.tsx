import React, { useState, useEffect } from 'react';
import { X, GripVertical, ChevronDown } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { validateDescription } from '../utils/fileValidation';

interface DefectTileProps {
  id: string;
  photoNumber: string;
  description: string;
  selectedFile: string;
  availableFiles: string[];
  onDelete: () => void;
  onDescriptionChange: (value: string) => void;
  onFileChange: (value: string) => void;
}

export const DefectTile: React.FC<DefectTileProps> = ({
  id,
  photoNumber,
  description,
  selectedFile,
  availableFiles,
  onDelete,
  onDescriptionChange,
  onFileChange,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localDescription, setLocalDescription] = useState(description);

  useEffect(() => {
    setLocalDescription(description);
  }, [description]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 2 : 1,
  };

  const handleDescriptionChange = (value: string) => {
    setLocalDescription(value);
    const { isValid, invalidChars } = validateDescription(value);
    if (!isValid) {
      setError(`Invalid characters found: ${invalidChars.join(' ')}`);
      return;
    }
    setError(null);
    onDescriptionChange(value);
  };

  const handleDescriptionBlur = () => {
    setIsEditing(false);
    if (!error) {
      onDescriptionChange(localDescription);
    }
  };
  
  const handleFileSelect = (fileName: string) => {
    onFileChange(fileName);
    setIsDropdownOpen(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700 shadow-sm ${
        isDragging ? 'shadow-lg' : ''
      }`}
    >
      <div className="p-3 flex items-center gap-3">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300"
        >
          <GripVertical size={20} />
        </div>

        <div className="w-12 text-center font-medium text-slate-700 dark:text-gray-300">
          {photoNumber}
        </div>

        <div className="flex-1">
          {isEditing ? (
            <input
              type="text"
              value={localDescription}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              onBlur={handleDescriptionBlur}
              autoFocus
              className="w-full px-2 py-1 text-sm border border-slate-200 dark:border-gray-600 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-slate-900 dark:text-white"
            />
          ) : (
            <div
              onClick={() => setIsEditing(true)}
              className="px-2 py-1 text-sm text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-700 rounded cursor-text"
            >
              {localDescription || 'Click to edit'}
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg ${
              selectedFile
                ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                : 'text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-700'
            }`}
          >
            <div className="max-w-[150px] truncate">
              {selectedFile || 'Select image'}
            </div>
            <ChevronDown size={16} className={isDropdownOpen ? 'rotate-180' : ''} />
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-1 w-64 max-h-48 overflow-y-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-slate-200 dark:border-gray-700 py-1 z-10">
              {availableFiles.map((file) => (
                <button
                  key={file}
                  onClick={() => handleFileSelect(file)}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-gray-700 ${
                    file === selectedFile
                      ? 'text-indigo-600 dark:text-indigo-400 font-medium'
                      : 'text-slate-600 dark:text-gray-300'
                  }`}
                >
                  <div className="truncate">{file}</div>
                </button>
              ))}
            </div>
          )}
          {error && (
            <div className="absolute right-0 mt-1 w-64 p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg">
              {error}
            </div>
          )}
        </div>

        <button
          onClick={onDelete}
          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
        >
          <X size={16} />
        </button>
      </div>
      {error && (
        <div className="px-3 pb-3">
          <div className="flex items-center gap-2 text-red-500 text-sm">
            <AlertCircle size={14} />
            {error}
          </div>
        </div>
      )}
    </div>
  );
};