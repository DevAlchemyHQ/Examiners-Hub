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
import { validateDescription } from '../utils/fileValidation';
import { toast } from 'react-hot-toast';

export const DownloadButton: React.FC = () => {
  const navigate = useNavigate();
  const { 
    selectedImages, 
    images, 
    formData, 
    bulkDefects,
    viewMode
  } = useMetadataStore();
  const { user } = useAuthStore();
  const { trackImageDownload, trackBulkDownload, trackError, trackUserAction } = useAnalytics();
  const { isValid, getValidationErrors } = useValidation();
  const { isBulkValid, getBulkValidationErrors, getValidationSummary } = useBulkValidation();
  
  // State variables
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [isSubscriptionExpired, setIsSubscriptionExpired] = useState(false);
  
  // Remove the problematic validationKey state and useEffect that causes infinite loop

  // Debug validation state
  useEffect(() => {
    if (viewMode === 'bulk') {
      const errors = getBulkValidationErrors();
      const isValid = isBulkValid();
      console.log('🔍 DownloadButton validation debug:', {
        bulkDefects: bulkDefects.length,
        isBulkValid: isValid,
        validationErrors: errors,
        bulkDefectsWithNumbers: bulkDefects.map(d => ({ 
          id: d.id, 
          photoNumber: d.photoNumber, 
          hasNumber: !!d.photoNumber?.trim(),
          isEmpty: !d.photoNumber?.trim(),
          isHash: d.photoNumber === '#'
        }))
      });
      
      // Check specifically for missing numbers
      const defectsWithoutNumbers = bulkDefects.filter(d => !d.photoNumber?.trim() || d.photoNumber === '#');
      console.log('🔍 Missing numbers check:', {
        totalDefects: bulkDefects.length,
        defectsWithoutNumbers: defectsWithoutNumbers.length,
        defectsWithHash: bulkDefects.filter(d => d.photoNumber === '#').length,
        defectsWithEmpty: bulkDefects.filter(d => !d.photoNumber?.trim()).length
      });
    }
  }, [viewMode, bulkDefects, getBulkValidationErrors, isBulkValid]);

  useEffect(() => {
    if (!user?.user_metadata) return;
    // Only keep subscription logic for images mode if needed
  }, [user]);

  const handleUpgradeClick = () => {
    navigate('/subscriptions');
  };

  const handleDownload = async () => {
    if (!user) {
      toast.error('Please sign in to download packages');
      trackError('download_failed', 'not_authenticated');
      return;
    }

    if (isSubscriptionExpired) {
      toast.error('Your subscription has expired. Please upgrade to continue.');
      trackError('download_failed', 'subscription_expired');
      return;
    }

    setIsDownloading(true);
    try {
      // Track download attempt
      trackUserAction('download_attempt', 'download_button_click');

      if (viewMode === 'bulk') {
        // Handle bulk mode download - Call Lambda function
        console.log('Bulk mode download - calling Lambda');
        
        if (isSubscriptionExpired) {
          throw new Error('Your subscription has expired. Please upgrade to continue.');
        }

        // Check if there are any defects with selected images
        const defectsWithImages = bulkDefects.filter(defect => defect.selectedFile);
        
        if (defectsWithImages.length === 0) {
          throw new Error('Please select images for at least one defect');
        }

        // Transform bulk defects to unified format (same as BulkTextInput.tsx)
        const originalBulkData = { bulkDefects, images, formData };
        const transformedData = transformBulkDefectsForLambda(bulkDefects, images, formData);
        
        // Validate that transformation preserves core functionality
        if (!validateTransformedData(originalBulkData, transformedData, 'bulk')) {
          throw new Error('Data transformation validation failed');
        }

        console.log('🚀 Calling Lambda for bulk download with unified format...');
        console.log('Transformed data sample:', transformedData.selectedImages[0]);
        
        // Call Lambda function for bulk mode (same as BulkTextInput.tsx)
        const apiUrl = getFullApiUrl();
        console.log('🌐 Using API endpoint:', apiUrl);
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(transformedData)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Bulk download failed');
        }

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Bulk download failed');
        }

        console.log('✅ Lambda bulk response received, download URL:', result.downloadUrl);
        
        // Download the file using the presigned URL
        window.open(result.downloadUrl, '_blank');

        // Track bulk download success
        trackBulkDownload(transformedData.selectedImages.length, bulkDefects.length);
        console.log('✅ Bulk download completed successfully');

      } else {
        // Handle images mode download - Call Lambda function
        console.log('Images mode download - calling Lambda');
        const selectedImagesList = images.filter(img => selectedImages.some(item => item.id === img.id));
        console.log('Selected images:', selectedImagesList.length);

        if (selectedImagesList.length === 0) {
          throw new Error('No images selected');
        }

        // Validate form fields first
        if (!formData.elr?.trim()) {
          throw new Error('Enter ELR');
        }
        if (!formData.structureNo?.trim()) {
          throw new Error('Enter Structure No');
        }
        if (!formData.date?.trim()) {
          throw new Error('Select Date');
        }

        // Validate that all selected instances have required metadata
        const { instanceMetadata } = useMetadataStore.getState();
        const missingPhotoNumbers = [];
        const missingDescriptions = [];
        const invalidDescriptions = [];
        
        selectedImages.forEach((item, index) => {
          const instanceId = item.instanceId;
          const instanceData = instanceMetadata[instanceId];
          
          if (!instanceData?.photoNumber?.trim()) {
            missingPhotoNumbers.push(index + 1);
          }
          
          if (!instanceData?.description?.trim()) {
            missingDescriptions.push(index + 1);
          } else {
            // Check for invalid characters in descriptions
            const { isValid, invalidChars } = validateDescription(instanceData.description.trim());
            if (!isValid) {
              invalidDescriptions.push({
                instance: index + 1,
                invalidChars: invalidChars
              });
            }
          }
        });
        
        if (missingPhotoNumbers.length > 0) {
          throw new Error(`Please add photo numbers for ${missingPhotoNumbers.length} image${missingPhotoNumbers.length !== 1 ? 's' : ''}`);
        }
        
        if (missingDescriptions.length > 0) {
          throw new Error(`Please add descriptions for ${missingDescriptions.length} image${missingDescriptions.length !== 1 ? 's' : ''}`);
        }
        
        if (invalidDescriptions.length > 0) {
          const errorMessages = invalidDescriptions.map(({ instance, invalidChars }) => 
            `Instance ${instance}: Remove invalid characters (${invalidChars.join(', ')}) from description`
          );
          throw new Error(errorMessages.join('; '));
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

        // Track image download success
        trackImageDownload(selectedImagesList.length, 'individual_package');
        console.log('✅ Download completed successfully');

      }

      toast.success('Package downloaded successfully');

    } catch (error) {
      console.error('Download error:', error);
      trackError('download_failed', error instanceof Error ? error.message : 'unknown_error');
      
      // Show specific validation error message in toast
      if (error instanceof Error && (
        error.message.includes('Please add photo numbers') || 
        error.message.includes('Please add descriptions') || 
        error.message.includes('Remove invalid characters') ||
        error.message.includes('Enter ELR') ||
        error.message.includes('Enter Structure No') ||
        error.message.includes('Select Date')
      )) {
        toast.error(error.message);
      } else {
        toast.error(error instanceof Error ? error.message : 'Failed to download package');
      }
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
          // key={validationKey} // This line is removed
          onClick={handleDownload}
          disabled={isDownloading}
          className={`flex items-center gap-2 px-3 py-1.5 rounded ${
            isDownloading
              ? 'bg-gray-400 text-gray-500 cursor-not-allowed'
              : 'bg-gray-700 dark:bg-gray-600 text-white border border-gray-600 dark:border-gray-500 hover:bg-gray-600 dark:hover:bg-gray-500'
          } transition-colors`}
          onMouseEnter={() => {
            console.log('Download button validation state:', {
              isDownloading,
              viewMode,
              isBulkValid: isBulkValid(),
              isValid: isValid(),
              selectedImages: selectedImages.length,
              formData,
              // validationKey, // This line is removed
              bulkDefectsWithHash: bulkDefects.filter(d => d.photoNumber === '#').length,
              bulkDefectsEmpty: bulkDefects.filter(d => !d.photoNumber?.trim()).length
            });
          }}
        >
          {/* Only show Loader2 spinner if not in bulk mode */}
          {isDownloading && viewMode !== 'bulk' ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          {isDownloading && viewMode !== 'bulk'
            ? 'Preparing download...'
            : viewMode === 'bulk'
            ? 'Download Bulk Package'
            : 'Download Package'}
        </button>
      )}

      {/* Removed all status boxes - now using line-based messages in SelectedImagesPanel */}

    </div>
  );
};

export default DownloadButton;
