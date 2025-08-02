import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, GripVertical, ChevronDown, Plus, ChevronUp, AlertCircle, CheckCircle } from 'lucide-react';
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
  onFileChange: (fileName: string) => void;
  onPhotoNumberChange: (defectId: string, oldNumber: string, newNumber: string) => void;
  onQuickAdd?: () => void;
  isExpanded?: boolean;
  showImages?: boolean;
  images?: any[];
  setEnlargedImage?: (url: string) => void;
  isDuplicate?: boolean;
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
  onQuickAdd,
  isExpanded = false,
  showImages = true,
  images = [],
  setEnlargedImage,
  isDuplicate = false,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const [localPhotoNumber, setLocalPhotoNumber] = useState(photoNumber);
  const [isEditing, setIsEditing] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const [isExpandedState, setIsExpanded] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  
  // Add auto-resize for textarea
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Add auto-resize for textarea (collapsed mode)
  const collapsedTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Update local state when prop changes
  useEffect(() => {
    setLocalPhotoNumber(photoNumber);
  }, [photoNumber]);

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

  // Add effect to auto-resize collapsed textarea
  useEffect(() => {
    if (!isExpanded && collapsedTextareaRef.current) {
      collapsedTextareaRef.current.style.height = 'auto';
      collapsedTextareaRef.current.style.height = collapsedTextareaRef.current.scrollHeight + 'px';
    }
  }, [description, isExpanded]);

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalPhotoNumber(e.target.value);
  };

  const handleNumberBlur = () => {
    setIsEditing(false);
    // Always propagate the change, even if the number is empty
    onPhotoNumberChange(id, photoNumber, localPhotoNumber);
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

  // Handle drop from image
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data.type === 'image') {
        onFileChange(data.fileName);
      }
    } catch (error) {
      console.error('Error handling drop:', error);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  // Validation logic for individual defect
  const isDefectValid = () => {
    // Must have a selected file
    if (!selectedFile) return false;
    
    // Must have a description
    if (!description?.trim()) return false;
    
    // Description must not have invalid characters
    const { isValid } = validateDescription(description);
    if (!isValid) return false;
    
    // Photo number must be valid format (numbers followed by optional letters)
    if (!/^\d+[a-zA-Z]*$/.test(photoNumber)) return false;
    
    return true;
  };

  const getDefectValidationErrors = () => {
    const errors: string[] = [];
    
    if (!selectedFile) {
      errors.push('No image selected');
    }
    
    if (!description?.trim()) {
      errors.push('No description');
    } else {
      const { isValid, hasForwardSlashes } = validateDescription(description);
      if (!isValid) {
        errors.push(hasForwardSlashes ? 'Forward slashes (/) are not allowed' : 'Invalid characters in description');
      }
    }
    
    if (!/^\d+[a-zA-Z]*$/.test(photoNumber)) {
      errors.push('Invalid defect number format');
    }
    
    return errors;
  };

  // Find the image for this defect if expanded
  const defectImage = isExpanded && showImages && selectedFile ? images.find(img => (img.fileName || img.file?.name || '') === selectedFile) : null;

  return (
    <div className="relative">
    <div
      ref={setNodeRef}
      style={style}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`group bg-white/80 dark:bg-gray-800/80 rounded-2xl border border-slate-200/50 
          dark:border-gray-700/50 backdrop-blur-sm mb-4
          ${isDragging ? 'shadow-lg ring-2 ring-indigo-500/50 opacity-95 scale-[1.02]' : 'shadow-sm hover:shadow'}
          ${isDragOver ? 'ring-2 ring-green-500 bg-green-50 dark:bg-green-900/20' : ''}
          ${!isDefectValid() ? 'ring-2 ring-white/50 bg-white/10 dark:bg-white/5' : ''}
          transition-all duration-300 ease-out will-change-transform`}
      >
        {/* Use compact, single-line row when collapsed or expanded+list only; multi-line only for expanded+show images */}
        {(!isExpanded || (isExpanded && !showImages)) ? (
          // Compact, single-line row with editable fields
          <div className="flex flex-row items-center gap-2 px-2 py-1 text-sm min-h-[36px]"> {/* font size increased from text-xs to text-sm, min-h from 32px to 36px */}
            <div {...attributes} {...listeners} className="cursor-grab text-slate-400 hover:text-slate-600 p-1.5 rounded-full">
              <GripVertical size={16} /> {/* slightly larger icon */}
            </div>
            {/* Editable photo number */}
            <div className="w-14">
              <input
                type="text"
                value={localPhotoNumber}
                onChange={handleNumberChange}
                onBlur={handleNumberBlur}
                onFocus={handleNumberFocus}
                className={`w-full px-1 py-1 text-sm border rounded-full focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 
                  bg-white/50 dark:bg-gray-800/50 text-slate-900 dark:text-white text-center
                  ${!/^\d+[a-zA-Z]*$/.test(photoNumber) && photoNumber ? 'border-red-300 dark:border-red-600' : 
                    isDuplicate ? 'border-orange-400 dark:border-orange-500 bg-orange-50 dark:bg-orange-900/20' : 
                    'border-slate-200/50 dark:border-gray-600/50'}`}
                placeholder="#"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            {/* Editable description */}
            <div className="flex-1">
              {isExpanded ? (
                // In expanded+list view, keep single-line input
                <input
                  type="text"
                  value={description}
                  onChange={e => onDescriptionChange(e.target.value)}
                  className={`w-full px-2 py-1 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 
                    bg-white/50 dark:bg-gray-800/50 text-slate-900 dark:text-white truncate
                    ${description && !validateDescription(description).isValid ? 'border-red-300 dark:border-red-600' : 'border-slate-200/50 dark:border-gray-600/50'}`}
                  placeholder="Description"
                  title={description}
                />
              ) : (
                // When collapsed, use a textarea that auto-expands
                <textarea
                  ref={collapsedTextareaRef}
                  value={description}
                  onChange={e => onDescriptionChange(e.target.value)}
                  className={`w-full px-2 py-1 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 
                    bg-white/50 dark:bg-gray-800/50 text-slate-900 dark:text-white resize-none
                    ${description && !validateDescription(description).isValid ? 'border-red-300 dark:border-red-600' : 'border-slate-200/50 dark:border-gray-600/50'}`}
                  placeholder="Description"
                  rows={1}
                  style={{ minHeight: '36px', maxHeight: '240px', overflow: 'hidden' }}
                />
              )}
            </div>
            {/* Editable image selection dropdown */}
            <div className="max-w-[140px] relative">
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className={`w-full flex items-center gap-1 px-2 py-1 text-sm rounded-lg border transition-colors
                  ${selectedFile
                    ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-700'
                    : 'text-slate-600 dark:text-gray-300 border-slate-200/50 dark:border-gray-700/50 hover:bg-slate-50 dark:hover:bg-gray-700'}
                `}
                style={{ minWidth: 0 }}
              >
                <span className="truncate max-w-[90px]">{selectedFile || 'Select image'}</span>
                <ChevronDown size={14} className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {isDropdownOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 max-h-48 bg-white dark:bg-gray-800 
                  rounded-lg shadow-xl border border-slate-200 dark:border-gray-700 overflow-hidden z-[999999]">
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
            {/* Action buttons */}
            <div className="flex items-center gap-1">
              <button 
                onClick={onDelete} 
                className={`p-1 rounded transition-colors ${
                  'text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                }`}
              >
                <X size={16} />
              </button>
              {onQuickAdd && (
                <button
                  onClick={onQuickAdd}
                  className={`p-1 rounded transition-colors ${
                    'text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
                  }`}
                  title="Add defect below"
                >
                  <Plus size={16} />
                </button>
              )}
            </div>
          </div>
        ) : (
          // Only use the original layout in expanded+show images mode
          <div className={`p-3 flex items-start gap-3`}> 
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
            {/* Only show image preview if expanded and showImages */}
            {isExpanded && showImages && defectImage && (
              <div className="aspect-square max-w-[120px] w-full h-full flex-shrink-0 rounded-lg overflow-hidden bg-slate-100 dark:bg-gray-700 mr-3 cursor-pointer" onClick={() => setEnlargedImage && setEnlargedImage(defectImage.preview)}>
                <img
                  src={defectImage.preview}
                  alt={defectImage.fileName || defectImage.file?.name || 'Image'}
                  className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                  draggable="false"
                />
              </div>
            )}
            {/* The rest of the defect fields (number, description, file select, delete) */}
            <div className="flex-1 flex flex-col gap-2">
              <div className="w-16 relative">
                <input
                  type="text"
                  value={localPhotoNumber}
                  onChange={handleNumberChange}
                  onBlur={handleNumberBlur}
                  onFocus={handleNumberFocus}
                  className={`w-full p-1.5 text-sm border rounded-full focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 
                    bg-white/50 dark:bg-gray-800/50 text-slate-900 dark:text-white text-center
                    ${!/^\d+[a-zA-Z]*$/.test(photoNumber) && photoNumber ? 'border-red-300 dark:border-red-600' : 
                      isDuplicate ? 'border-orange-400 dark:border-orange-500 bg-orange-50 dark:bg-orange-900/20' : 
                      'border-slate-200/50 dark:border-gray-600/50'}`}
                  placeholder="#"
                  onClick={(e) => e.stopPropagation()}
                />
                {!/^\d+[a-zA-Z]*$/.test(photoNumber) && photoNumber && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
                    <AlertCircle size={8} className="text-white" />
        </div>
                )}
                {isDuplicate && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full flex items-center justify-center">
                    <AlertCircle size={8} className="text-white" />
                  </div>
                )}
        </div>
        <div className="flex-1">
                <div className="relative">
          <textarea
                    ref={textareaRef}
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
                    className={`w-full p-2 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 
                      bg-white/50 dark:bg-gray-800/50 text-slate-900 dark:text-white
                      transition-all duration-200 resize-none
                      ${description && !validateDescription(description).isValid ? 'border-red-300 dark:border-red-600' : 'border-slate-200/50 dark:border-gray-600/50'}`}
            placeholder="Description"
                    rows={1}
                    style={{
                      minHeight: '36px',
                    }}
                  />
                  {description && !validateDescription(description).isValid && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
                      <AlertCircle size={8} className="text-white" />
                    </div>
                  )}
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
                {!selectedFile && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
                    <AlertCircle size={8} className="text-white" />
                  </div>
                )}
                {isDropdownOpen && (
                  <div 
                    className="fixed w-64 max-h-48 bg-white dark:bg-gray-800 
                      rounded-lg shadow-xl border border-slate-200 dark:border-gray-700 overflow-hidden"
                    style={{ 
                      zIndex: 99999999,
                      top: (dropdownRef.current?.getBoundingClientRect().bottom || 0) + 4,
                      left: (dropdownRef.current?.getBoundingClientRect().right || 0) - 256
                    }}
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
        <div className="flex items-center gap-1">
          <button
            onClick={onDelete}
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
          {onQuickAdd && (
            <button
              onClick={onQuickAdd}
              className="p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
              title="Add defect below"
            >
              <Plus size={16} />
            </button>
          )}
        </div>
      </div>
          </div>
        )}
      </div>

      <div className={`absolute -inset-px rounded-lg border-2 border-indigo-500 pointer-events-none
        transition-opacity duration-200 ${isDragging ? 'opacity-100' : 'opacity-0'}`} 
      />
      
      {/* Drop indicator */}
      {isDragOver && (
        <div className="absolute inset-0 bg-green-500/20 border-2 border-green-500 rounded-2xl flex items-center justify-center pointer-events-none">
          <div className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
            Drop to assign
          </div>
        </div>
      )}
    </div>
  );
};
