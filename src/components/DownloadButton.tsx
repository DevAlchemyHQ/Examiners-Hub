import React, { useState } from 'react';
import { Download, AlertCircle, Loader2 } from 'lucide-react';
import { useMetadataStore } from '../store/metadataStore';
import { createDownloadPackage } from '../utils/fileUtils';
import { useValidation } from '../hooks/useValidation';
import { useAnalytics } from '../hooks/useAnalytics';
import { validateDescription } from '../utils/fileValidation';
import { useProjectStore } from '../store/projectStore';

export const DownloadButton: React.FC = () => {
  const { images, selectedImages, formData } = useMetadataStore();
  const { isValid, getValidationErrors } = useValidation();
  const { trackEvent } = useAnalytics();
  const { clearProject, isLoading } = useProjectStore();
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasSpecialCharacters = React.useMemo(() => {
    const selectedImagesList = images.filter(img => selectedImages.has(img.id));
    return selectedImagesList.some(img => !img.isSketch && !validateDescription(img.description || '').isValid);
  }, [images, selectedImages]);

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      setError(null);
      
      const selectedImagesList = images.filter(img => selectedImages.has(img.id));
      
      if (selectedImagesList.length === 0) {
        throw new Error('No images selected');
      }

      if (hasSpecialCharacters) {
        throw new Error('Remove special characters from defect descriptions before downloading');
      }
      
      const zipBlob = await createDownloadPackage(selectedImagesList, formData);
      
      const url = URL.createObjectURL(zipBlob);
      
      // Track download event
      trackEvent({
        action: 'download_package',
        category: 'user_action',
        label: `${formData.elr.trim()}_${formData.structureNo.trim()}`,
        value: selectedImagesList.length
      });
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `${formData.elr.trim().toUpperCase()}_${formData.structureNo.trim()}_${formData.date.split('-').reverse().join('-')}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Error creating download package:', error);
      setError(error instanceof Error ? error.message : 'Failed to create download package');
    } finally {
      setIsDownloading(false);
    }
  };

  const errors = getValidationErrors();
  const isDownloadDisabled = !isValid() || isDownloading || hasSpecialCharacters;

  return (
    <div className="space-y-2">
      <button
        onClick={handleDownload}
        disabled={isDownloadDisabled}
        className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg transition-all ${
          isDownloadDisabled
            ? 'bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'
            : 'bg-green-500 text-white hover:bg-green-600 shadow-sm hover:shadow-md'
        }`}
      >
        {isDownloading ? (
          <Loader2 size={20} className="animate-spin" />
        ) : (
          <Download size={20} />
        )}
        {isDownloading ? 'Creating Package...' : 'Download Package'}
      </button>

      {(error || (!isValid() && errors.length > 0) || hasSpecialCharacters) && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
          <div className="flex items-start gap-2 text-amber-700 dark:text-amber-400">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              {error ? (
                <p>{error}</p>
              ) : hasSpecialCharacters ? (
                <p>Remove special characters from defect descriptions before downloading</p>
              ) : (
                <>
                  <p className="font-medium mb-1">Please complete the following:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};