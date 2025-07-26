import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, AlertCircle, Loader2, WalletCards, CheckCircle } from 'lucide-react';
import { useMetadataStore } from '../store/metadataStore';
import { useAuthStore } from '../store/authStore';
import { useValidation } from '../hooks/useValidation';
import { useBulkValidation } from '../hooks/useBulkValidation';
import { useAnalytics } from '../hooks/useAnalytics';
import { 
  transformSelectedImagesForLambda, 
  transformBulkDefectsForLambda, 
  validateTransformedData 
} from '../utils/downloadTransformers';
import { getFullApiUrl } from '../utils/apiConfig';

export const DownloadButton: React.FC = () => {
  const navigate = useNavigate();
  const { images, selectedImages, formData, viewMode, bulkDefects } = useMetadataStore();
  const { isValid, getValidationErrors } = useValidation();
  const { isBulkValid, getBulkValidationErrors, getValidationSummary } = useBulkValidation();
  const { trackEvent } = useAnalytics();
  const { user } = useAuthStore();
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [isSubscriptionExpired, setIsSubscriptionExpired] = useState(false);
  
  // Force re-render when validation changes
  const [validationKey, setValidationKey] = useState(0);
  
  useEffect(() => {
    // Update validation key when relevant data changes
    setValidationKey(prev => prev + 1);
  }, [selectedImages, formData, images, viewMode, bulkDefects]);

  // Debug validation state
  useEffect(() => {
    if (viewMode === 'bulk') {
      console.log('🔍 DownloadButton validation debug:', {
        bulkDefects: bulkDefects.length,
        isBulkValid: isBulkValid(),
        validationErrors: getBulkValidationErrors(),
        validationKey,
        bulkDefectsWithNumbers: bulkDefects.map(d => ({ id: d.id, photoNumber: d.photoNumber, hasNumber: !!d.photoNumber?.trim() }))
      });
    }
  }, [viewMode, bulkDefects, validationKey]);

  useEffect(() => {
    if (!user?.user_metadata) return;
    // Only keep subscription logic for images mode if needed
  }, [user]);

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
        // Handle bulk mode download - Call Lambda function
        console.log('Bulk mode download - calling Lambda');
        
        if (isSubscriptionExpired) {
          throw new Error('Your subscription has expired. Please upgrade to continue.');
        }

        // Transform bulk defects to unified format (preserves all existing functionality)
        const originalBulkData = { bulkDefects, images, formData };
        const transformedData = transformBulkDefectsForLambda(bulkDefects, images, formData);
        
        // Validate that transformation preserves core functionality
        if (!validateTransformedData(originalBulkData, transformedData, 'bulk')) {
          throw new Error('Data transformation validation failed');
        }

        console.log('🚀 Calling Lambda for bulk download with unified format...');
        console.log('Transformed data sample:', transformedData.selectedImages[0]);
        console.log('Total defects to download:', transformedData.selectedImages.length);
        
        // Call Lambda function for bulk mode (now using unified format)
        const apiUrl = getFullApiUrl();
        console.log('🌐 Using API endpoint:', apiUrl);
        
        const requestBody = JSON.stringify(transformedData);
        console.log('📤 Request body size:', requestBody.length, 'bytes');
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: requestBody
        });

        console.log('📥 Response status:', response.status);
        console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
          let errorMessage = 'Bulk download failed';
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.message || 'Bulk download failed';
          } catch (parseError) {
            console.error('Failed to parse error response:', parseError);
            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          }
          throw new Error(errorMessage);
        }

        const result = await response.json();
        console.log('📥 Full Lambda bulk response:', result);
        
        if (!result.success) {
          throw new Error(result.error || result.message || 'Bulk download failed');
        }

        if (!result.downloadUrl) {
          throw new Error('No download URL received from Lambda');
        }

        console.log('✅ Lambda bulk response received, download URL:', result.downloadUrl);
        
        // Download the file using the presigned URL
        window.open(result.downloadUrl, '_blank');

        trackEvent({ action: 'download_bulk_package', category: 'user_action', value: transformedData.selectedImages.length });
        console.log('✅ Bulk download completed successfully');

      } else {
        // Handle images mode download - Call Lambda function
        console.log('Images mode download - calling Lambda');
        const selectedImagesList = images.filter(img => selectedImages.has(img.id));
        console.log('Selected images:', selectedImagesList.length);

        if (selectedImagesList.length === 0) {
          throw new Error('No images selected');
        }

        // Validate that all selected images have required metadata (preserves existing validation)
        const imagesWithoutPhotoNumbers = selectedImagesList.filter(img => !img.photoNumber?.trim());
        if (imagesWithoutPhotoNumbers.length > 0) {
          throw new Error(`Please add photo numbers for ${imagesWithoutPhotoNumbers.length} image${imagesWithoutPhotoNumbers.length !== 1 ? 's' : ''}`);
        }

        const imagesWithoutDescriptions = selectedImagesList.filter(img => {
          if (img.isSketch) return false;
          return !img.description?.trim();
        });
        if (imagesWithoutDescriptions.length > 0) {
          throw new Error(`Please add descriptions for ${imagesWithoutDescriptions.length} image${imagesWithoutDescriptions.length !== 1 ? 's' : ''}`);
        }

        if (isSubscriptionExpired) {
          throw new Error('Your subscription has expired. Please upgrade to continue.');
        }

        // Transform selected images to unified format (preserves all existing functionality)
        const originalImagesData = { selectedImages: selectedImagesList, formData };
        const transformedData = transformSelectedImagesForLambda(selectedImagesList, formData);
        
        // Validate that transformation preserves core functionality
        if (!validateTransformedData(originalImagesData, transformedData, 'images')) {
          throw new Error('Data transformation validation failed');
        }

        console.log('🚀 Calling Lambda download generator with unified format...');
        console.log('Transformed data sample:', transformedData.selectedImages[0]);
        console.log('Total images to download:', transformedData.selectedImages.length);
        
        // Call Lambda function for images mode (now using unified format)
        const apiUrl = getFullApiUrl();
        console.log('🌐 Using API endpoint:', apiUrl);
        
        const requestBody = JSON.stringify(transformedData);
        console.log('📤 Request body size:', requestBody.length, 'bytes');
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: requestBody
        });

        console.log('📥 Response status:', response.status);
        console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
          let errorMessage = 'Download failed';
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.message || 'Download failed';
          } catch (parseError) {
            console.error('Failed to parse error response:', parseError);
            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          }
          throw new Error(errorMessage);
        }

        const result = await response.json();
        console.log('📥 Full Lambda response:', result);
        
        if (!result.success) {
          throw new Error(result.error || result.message || 'Download failed');
        }

        if (!result.downloadUrl) {
          throw new Error('No download URL received from Lambda');
        }

        console.log('✅ Lambda response received, download URL:', result.downloadUrl);
        
        // Download the file using the presigned URL
        window.open(result.downloadUrl, '_blank');

        trackEvent({ action: 'download_package', category: 'user_action', value: selectedImagesList.length });
        console.log('✅ Download completed successfully');

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
          key={validationKey}
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
          onMouseEnter={() => {
            console.log('Download button validation state:', {
              isDownloading,
              viewMode,
              isBulkValid: isBulkValid(),
              isValid: isValid(),
              selectedImages: selectedImages.size,
              formData,
              validationKey
            });
          }}
        >
          {isDownloading ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
          {isDownloading
            ? 'Preparing download...'
            : viewMode === 'bulk'
            ? 'Download Bulk Package'
            : 'Download Package'}
        </button>
      )}

      {/* Error messages - consolidated to prevent duplicates */}
      {viewMode === 'bulk' && !isBulkValid() && !isDownloading && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mt-2">
          <div className="flex items-start gap-2 text-amber-700 dark:text-amber-400">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium mb-1">Please complete the following:</p>
              <ul className="list-disc list-inside space-y-1">
                {getBulkValidationErrors().slice(0, 3).map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
                {getBulkValidationErrors().length > 3 && (
                  <li>... and {getBulkValidationErrors().length - 3} more issues</li>
                )}
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
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
          <div className="flex items-start gap-2 text-green-700 dark:text-green-400">
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
