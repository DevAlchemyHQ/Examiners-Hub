import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, AlertCircle, Loader2, WalletCards, CheckCircle } from 'lucide-react';
import { useMetadataStore } from '../store/metadataStore';
import { useAuthStore } from '../store/authStore';
import { createDownloadPackage } from '../utils/fileUtils';
import { useValidation } from '../hooks/useValidation';
import { useBulkValidation } from '../hooks/useBulkValidation';
import { useAnalytics } from '../hooks/useAnalytics';
import { validateDescription } from '../utils/fileValidation';

export const DownloadButton: React.FC = () => {
  const navigate = useNavigate();
  const { images, selectedImages, formData, viewMode, bulkDefects, bulkSelectedImages, generateBulkZip } = useMetadataStore();
  const { isValid, getValidationErrors } = useValidation();
  const { isBulkValid, getBulkValidationErrors, getValidationSummary } = useBulkValidation();
  const { trackEvent } = useAnalytics();
  const { user } = useAuthStore();
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [isSubscriptionExpired, setIsSubscriptionExpired] = useState(false);

  useEffect(() => {
    if (!user?.user_metadata) return;
    // Only keep subscription logic for images mode if needed
  }, [user]);
  

  const hasSpecialCharacters = React.useMemo(() => {
    if (viewMode === 'bulk') {
      // For bulk mode, use the bulk validation
      return !isBulkValid();
    } else {
      // For images mode, check selected images
    const selectedImagesList = images.filter(img => selectedImages.has(img.id));
    return selectedImagesList.some(img => !img.isSketch && !validateDescription(img.description || '').isValid);
    }
  }, [images, selectedImages, viewMode, bulkDefects, isBulkValid]);

  const handleUpgradeClick = () => {
    navigate('/subscriptions');
  };

  const handleDownload = async () => {
    try {
      console.log('Download button clicked');
      console.log('Current state:', { 
        viewMode, 
        selectedImages: selectedImages.size, 
        bulkDefects: bulkDefects.length,
        formData,
        isBulkValid: isBulkValid(),
        isValid: isValid()
      });
      
      setIsDownloading(true);
      setError(null);

      if (viewMode === 'bulk') {
        // Handle bulk mode download
        console.log('Bulk mode download');
        const defectsWithImages = bulkDefects.filter(defect => defect.selectedFile);
        console.log('Defects with images:', defectsWithImages.length);
        
        if (defectsWithImages.length === 0) {
          throw new Error('No defects with images selected');
        }

        if (isSubscriptionExpired) {
          throw new Error('Your subscription has expired. Please upgrade to continue.');
        }

        // Convert images to base64 first for reliable downloads
        console.log('Converting images to base64 for reliable download...');
        await useMetadataStore.getState().convertImagesToBase64();

        console.log('Calling generateBulkZip...');
        await generateBulkZip();
        console.log('Bulk zip generated successfully');
        
        trackEvent({ action: 'download_bulk_package', category: 'user_action', value: defectsWithImages.length });

      } else {
        // Handle images mode download
        console.log('Images mode download');
        const selectedImagesList = images.filter(img => selectedImages.has(img.id));
        console.log('Selected images:', selectedImagesList.length);

        if (selectedImagesList.length === 0) {
          throw new Error('No images selected');
        }

        if (isSubscriptionExpired) {
          throw new Error('Your subscription has expired. Please upgrade to continue.');
        }

        // Convert selected images to base64 first
        console.log('Converting selected images to base64 for reliable download...');
        await useMetadataStore.getState().convertImagesToBase64();

        console.log('Calling createDownloadPackage...');
        const blob = await createDownloadPackage(selectedImagesList, formData);
        console.log('Download package created, size:', blob.size);
        const url = URL.createObjectURL(blob);

        trackEvent({ action: 'download_package', category: 'user_action', value: selectedImagesList.length });

        const a = document.createElement('a');
        a.href = url;
        a.download = `${formData.elr.trim().toUpperCase()}_${formData.structureNo.trim()}_${formData.date ? new Date(formData.date).toISOString().slice(0,10).split('-').reverse().join('-') : 'date'}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log('Download completed');

      }
    } catch (error) {
      console.error('Error creating download package:', error);
      setError(error instanceof Error ? error.message : 'Failed to create download package');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-2">
      {isSubscriptionExpired ? (
        <button
          onClick={handleUpgradeClick}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600"
        >
          <WalletCards size={20} />
          Upgrade Package
        </button>
      ) : (
        <button
          onClick={handleDownload}
          disabled={
            isDownloading ||
            (viewMode === 'bulk' && !isBulkValid()) ||
            (viewMode === 'images' && !isValid())
          }
          className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg ${
            isDownloading ||
            (viewMode === 'bulk' && !isBulkValid()) ||
            (viewMode === 'images' && !isValid())
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-green-500 text-white hover:bg-green-600'
          }`}
        >
          {isDownloading ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
          {isDownloading
            ? 'Creating Package...'
            : viewMode === 'bulk'
            ? 'Download Bulk Package'
            : 'Download Package'}
        </button>
      )}

      {/* Only one error message below the button, show only the first error */}
      {viewMode === 'bulk' && !isBulkValid() && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mt-2">
          <div className="flex items-start gap-2 text-amber-700 dark:text-amber-400">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium mb-1">Please complete the following:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>{getBulkValidationErrors()[0]}</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Error message for images mode */}
      {viewMode === 'images' && !isValid() && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mt-2">
          <div className="flex items-start gap-2 text-amber-700 dark:text-amber-400">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <div className="text-sm">
                  <p className="font-medium mb-1">Please complete the following:</p>
                  <ul className="list-disc list-inside space-y-1">
                <li>{getValidationErrors()[0]}</li>
                  </ul>
            </div>
          </div>
        </div>
              )}

      {/* Success message for bulk mode */}
      {viewMode === 'bulk' && isBulkValid() && !isDownloading && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
          <div className="flex items-start gap-2 text-amber-700 dark:text-amber-400">
            <CheckCircle size={16} className="mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium">Ready to download!</p>
              <p className="text-xs mt-1 opacity-75">
                {getValidationSummary().totalDefects} defects ready for download
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Success message for images mode */}
      {viewMode === 'images' && isValid() && !isDownloading && selectedImages.size > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
          <div className="flex items-start gap-2 text-amber-700 dark:text-amber-400">
            <CheckCircle size={16} className="mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium">Ready to download!</p>
              <p className="text-xs mt-1 opacity-75">
                {selectedImages.size} image{selectedImages.size !== 1 ? 's' : ''} ready for download
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DownloadButton;
