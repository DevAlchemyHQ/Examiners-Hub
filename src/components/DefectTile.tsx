import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, GripVertical, ChevronDown, Plus, ChevronUp } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface DefectTileProps {
  id: string;
  photoNumber: string;
  description: string;
  selectedFile: string;
  availableFiles: string[];
  onDelete: () => void;
  onDescriptionChange: (value: string) => void;
  onFileChange: (value: string) => void;
  onPhotoNumberChange: (value: string) => void;
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
  onPhotoNumberChange,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const [localPhotoNumber, setLocalPhotoNumber] = React.useState(photoNumber);
  const [isEditing, setIsEditing] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Add auto-resize for textarea
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (!isEditing) {
      setLocalPhotoNumber(photoNumber);
    }
  }, [photoNumber, isEditing]);

  // Add click outside handler
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-adjust height whenever description changes
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${scrollHeight}px`;
    }
  }, [description]);

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalPhotoNumber(value);
  };

  const handleNumberBlur = () => {
    setIsEditing(false);
    onPhotoNumberChange(localPhotoNumber);
  };

  const handleNumberFocus = () => {
    setIsEditing(true);
  };

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id,
    transition: {
      duration: 300,
      easing: 'cubic-bezier(0.2, 0, 0, 1)',
    },
    animateLayoutChanges: () => true
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition,
    zIndex: isDragging ? 1000 : (isDropdownOpen ? 50 : 1),
    position: 'relative' as const,
    touchAction: 'none',
  };

  // Add function to check if content overflows
  const checkOverflow = useCallback(() => {
    return textareaRef.current && textareaRef.current.scrollHeight > 36;
  }, []);

  return (
    <div className="relative">
      <div
        ref={setNodeRef}
        style={style}
        className={`group bg-white/80 dark:bg-gray-800/80 rounded-2xl border border-slate-200/50 
          dark:border-gray-700/50 backdrop-blur-sm mb-4
          ${isDragging ? 'shadow-lg ring-2 ring-indigo-500/50 opacity-95 scale-[1.02]' : 'shadow-sm hover:shadow'}
          transition-all duration-300 ease-out will-change-transform`}
      >
        <div className="p-3 flex items-start gap-3">
          <div
            {...attributes}
            {...listeners}
            className="flex items-center justify-center cursor-grab active:cursor-grabbing 
              text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300 
              p-1.5 rounded-full hover:bg-slate-50 dark:hover:bg-gray-700 
              transition-colors touch-none select-none mt-1"
          >
            <GripVertical size={18} className="transform transition-transform active:scale-95" />
          </div>

          <div className="w-16">
            <input
              type="text"
              value={localPhotoNumber}
              onChange={handleNumberChange}
              onBlur={handleNumberBlur}
              onFocus={handleNumberFocus}
              className="w-full p-1.5 text-sm border border-slate-200/50 dark:border-gray-600/50 
                rounded-full focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 
                bg-white/50 dark:bg-gray-800/50 text-slate-900 dark:text-white text-center"
              placeholder="#"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          <div className="flex-1">
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={description}
                onChange={(e) => onDescriptionChange(e.target.value)}
                className="w-full p-2 text-sm border border-slate-200/50 dark:border-gray-600/50 
                  rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 
                  bg-white/50 dark:bg-gray-800/50 text-slate-900 dark:text-white
                  transition-all duration-200 resize-none"
                placeholder="Description"
                rows={1}
                style={{
                  minHeight: '36px',
                }}
              />
            </div>
          </div>

          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
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
              <ChevronDown size={16} className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isDropdownOpen && (
              <div 
                className="absolute right-0 top-full mt-1 w-64 max-h-48 bg-white dark:bg-gray-800 
                  rounded-lg shadow-xl border border-slate-200 dark:border-gray-700 overflow-hidden z-[100]"
              >
                <div className="overflow-y-auto max-h-48 py-1">
                  <button
                    type="button"
                    onClick={() => {
                      onFileChange('');
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-gray-700 
                      ${!selectedFile ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-medium' 
                      : 'text-slate-600 dark:text-gray-300'}`}
                  >
                    <div className="truncate">None</div>
                  </button>
                  <div className="h-px bg-slate-200 dark:bg-gray-700 my-1" />
                  {availableFiles.map((file) => (
                    <button
                      key={file}
                      type="button"
                      onClick={() => {
                        onFileChange(file);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-gray-700 ${
                        file === selectedFile
                          ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-medium'
                          : 'text-slate-600 dark:text-gray-300'
                      }`}
                    >
                      <div className="truncate">{file}</div>
                    </button>
                  ))}
                </div>
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
      </div>

      <div className={`absolute -inset-px rounded-lg border-2 border-indigo-500 pointer-events-none
        transition-opacity duration-200 ${isDragging ? 'opacity-100' : 'opacity-0'}`} 
      />
    </div>
  );
};
