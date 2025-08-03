import React, { useRef, useState } from "react";
import { Upload, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { useMetadataStore } from "../store/metadataStore";
import { useAnalytics } from "../hooks/useAnalytics";
import { toast } from "react-hot-toast";

interface UploadProgress {
  current: number;
  total: number;
  fileName: string;
  status: 'uploading' | 'success' | 'error';
}

interface ImageUploadProps {
  compact?: boolean;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ compact = false }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addImages = useMetadataStore((state) => state.addImages);
  const { trackImageUpload, trackError } = useAnalytics();
  const [isLoadingExam, setIsLoadingExam] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFiles = (files: FileList): { valid: File[]; invalid: string[] } => {
    const valid: File[] = [];
    const invalid: string[] = [];
    const maxSize = 1 * 1024 * 1024; // 1MB per file
    const maxTotalSize = 500 * 1024 * 1024; // 500MB total

    let totalSize = 0;
    let oversizedFiles = 0;
    
    Array.from(files).forEach(file => {
      if (file.size > maxSize) {
        invalid.push(`${file.name} (${formatFileSize(file.size)} - too large)`);
        oversizedFiles++;
      } else {
        totalSize += file.size;
        valid.push(file);
      }
    });

    if (totalSize > maxTotalSize) {
      // Clear the valid array since total size exceeds limit
      valid.length = 0;
      invalid.push(`Total upload size ${formatFileSize(totalSize)} exceeds 500MB limit (${files.length} files selected)`);
      return { valid: [], invalid };
    }

    return { valid, invalid };
  };

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (e.target.files?.length) {
      const files = Array.from(e.target.files);
      const { valid, invalid } = validateFiles(e.target.files);

      if (invalid.length > 0) {
        const resizeMessage = invalid.some(msg => msg.includes('too large') || msg.includes('exceeds')) 
          ? '\n\n💡 Tip: Try resizing your photos or uploading fewer files to stay within the 500MB total limit!'
          : '';
        toast.error(`Upload failed:\n${invalid.join('\n')}${resizeMessage}`);
        trackError('upload_validation', 'invalid_files');
        e.target.value = "";
        return;
      }

      if (valid.length === 0) {
        toast.error('No valid files to upload');
        trackError('upload_validation', 'no_valid_files');
        e.target.value = "";
        return;
      }

      try {
        setIsLoadingExam(true);
        console.log('Starting upload of', valid.length, 'files');
        
        // Track upload start
        const totalSize = valid.reduce((sum, file) => sum + file.size, 0);
        trackImageUpload(valid.length, totalSize);
        
        // For large uploads, show progress
        if (valid.length > 10 || totalSize > 50 * 1024 * 1024) { // Reduced to 50MB for progress
          toast.success(`Starting lightning-fast upload of ${valid.length} files (${formatFileSize(totalSize)})`);
        }

        console.log('Calling addImages...');
        await addImages(valid, false);
        console.log('Upload completed successfully');
        toast.success(`Successfully uploaded ${valid.length} files!`);
      } catch (error) {
        console.error('Upload error:', error);
        trackError('upload_failed', 'add_images_error');
        toast.error('Upload failed. Please try again with fewer files or smaller images.');
      } finally {
        setIsLoadingExam(false);
        setUploadProgress(null);
        e.target.value = "";
      }
    }
  };

  if (compact) {
    return (
      <div>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          multiple
          accept="image/*"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoadingExam}
          className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 dark:bg-gray-600 text-white text-sm rounded border border-gray-600 dark:border-gray-500 hover:bg-gray-600 dark:hover:bg-gray-500 transition-colors disabled:opacity-50"
        >
          {isLoadingExam ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Upload size={14} />
          )}
          <span>{isLoadingExam ? "Uploading..." : "Upload"}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="grid grid-cols-1 gap-4">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          multiple
          accept="image/*"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoadingExam}
          className={`w-full flex items-center justify-center gap-3 bg-indigo-600 text-white px-5 py-3 rounded-xl transition-all group shadow-lg font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 active:scale-95`}
        >
          {isLoadingExam ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <Upload size={20} className="group-hover:scale-110 transition-transform" />
          )}
          <span>{isLoadingExam ? "Uploading..." : "Upload Exam Photos"}</span>
        </button>
        
        {/* Upload progress for large files */}
        {uploadProgress && (
          <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-2">
              {uploadProgress.status === 'uploading' && <Loader2 size={16} className="animate-spin text-blue-600" />}
              {uploadProgress.status === 'success' && <CheckCircle size={16} className="text-green-600" />}
              {uploadProgress.status === 'error' && <AlertCircle size={16} className="text-red-600" />}
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                {uploadProgress.fileName}
              </span>
            </div>
            <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
              />
            </div>
            <div className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              {uploadProgress.current} of {uploadProgress.total} files
            </div>
          </div>
        )}
        
        {/* File size limits info */}
        <div className="text-xs text-slate-500 dark:text-slate-400 text-center">
          Max 1MB per file, 500MB total • Lightning-fast parallel uploads
        </div>
      </div>
    </div>
  );
};
