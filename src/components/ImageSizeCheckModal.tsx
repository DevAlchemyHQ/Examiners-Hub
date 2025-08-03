import React from 'react';
import { AlertCircle, X } from 'lucide-react';

interface ImageSizeCheckModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export const ImageSizeCheckModal: React.FC<ImageSizeCheckModalProps> = ({ onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        <div className="p-4 border-b border-slate-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-500">
            <AlertCircle size={20} />
            <h3 className="font-medium text-slate-900 dark:text-white">Have you resized the images?</h3>
          </div>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-500 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4">
          <p className="text-slate-600 dark:text-gray-300 mb-4">
            Large files may impact performance.
          </p>
          
          <div className="text-sm text-slate-500 dark:text-gray-400 mb-4">
            <p className="font-medium mb-2">Recommended specifications:</p>
            <ul className="list-disc list-inside">
              <li>Max file size: 250MB per image</li>
              <li>Max total upload: 800MB</li>
              <li>For best performance: resize to 1.2MB or smaller</li>
            </ul>
          </div>
        </div>
        
        <div className="p-4 bg-slate-50 dark:bg-gray-700/50 flex justify-end gap-3 rounded-b-lg">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            No, I'll resize them first
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
          >
            Yes, proceed with upload
          </button>
        </div>
      </div>
    </div>
  );
};