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
        
        // Call Lambda function for bulk mode (same as BulkTextInput.tsx)
        const apiUrl = getFullApiUrl();
        console.log('🌐 Using API endpoint:', apiUrl);
        
        const response = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', apiUrl, true);
          xhr.setRequestHeader('Content-Type', 'application/json');
          
          xhr.onload = function() {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve({
                ok: true,
                status: xhr.status,
                statusText: xhr.statusText,
                headers: new Headers(),
                json: () => Promise.resolve(JSON.parse(xhr.responseText))
              });
            } else {
              reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
            }
          };
          
          xhr.onerror = function() {
            reject(new Error('Network request failed'));
          };
          
          xhr.send(JSON.stringify(transformedData));
        });

        if (!response.ok) {
          let errorMessage = 'Bulk download failed';
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch (parseError) {
            console.error('Failed to parse error response:', parseError);
            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          }
          throw new Error(errorMessage);
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
        
        // Universal: Save user data to AWS after successful download
        try {
          await useMetadataStore.getState().saveUserData();
          console.log('✅ User data saved to AWS after bulk download');
        } catch (saveError) {
          console.warn('⚠️ Failed to save user data after bulk download:', saveError);
        }

      } else {
        // Handle images mode download - Call Lambda function
        console.log('Images mode download - calling Lambda');
        
        // Create the actual selected images list with instance IDs
        const selectedImagesList = selectedImages.map(item => {
          console.log('🔍 Looking for image with id:', item.id);
          console.log('🔍 Available images:', images.map(img => ({ id: img.id, fileName: img.fileName })));
          
          // Try multiple strategies to find the image
          let img = images.find(img => img.id === item.id);
          
          if (!img) {
            console.warn(`⚠️ Image not found for id: ${item.id}`);
            
            // Strategy 1: Try to find by instanceId
            img = images.find(img => img.id === item.instanceId);
            if (img) {
              console.log('✅ Found image by instanceId:', item.instanceId);
            }
          }
          
          if (!img) {
            // Strategy 2: Try to find by filename (extract from item.id)
            const filenameFromId = item.id.split('-').slice(-1)[0]; // Get last part after last dash
            img = images.find(img => img.fileName && img.fileName.includes(filenameFromId));
            if (img) {
              console.log('✅ Found image by filename match:', filenameFromId);
            }
          }
          
          if (!img) {
            // Strategy 3: Try to find by partial filename match
            const partialName = item.id.replace(/^local-\d+-/, '').replace(/\.(jpg|jpeg|png|gif)$/i, '');
            img = images.find(img => img.fileName && img.fileName.toLowerCase().includes(partialName.toLowerCase()));
            if (img) {
              console.log('✅ Found image by partial filename match:', partialName);
            }
          }
          
          if (!img) {
            console.error(`❌ Could not find image for id: ${item.id} - skipping`);
            return null;
          }
          
          // Get instance-specific metadata
          const { instanceMetadata } = useMetadataStore.getState();
          const instanceData = instanceMetadata[item.instanceId];
          
          return {
            ...img,
            instanceId: item.instanceId,
            // Override with instance-specific metadata if available
            photoNumber: instanceData?.photoNumber || img.photoNumber,
            description: instanceData?.description || img.description
          };
        }).filter(Boolean);
        
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
          // Use the actual instanceId from the selectedImages array
          const instanceId = item.instanceId;
          const instanceData = instanceMetadata[instanceId];
          
          // Check photo number
          if (!instanceData?.photoNumber?.trim()) {
            missingPhotoNumbers.push(index + 1);
          }
          
          // Check description
          if (!instanceData?.description?.trim()) {
            missingDescriptions.push(index + 1);
          } else {
            const { isValid } = validateDescription(instanceData.description);
            if (!isValid) {
              invalidDescriptions.push(index + 1);
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

        // Transform selected images to unified format
        const originalData = { selectedImages: selectedImagesList, formData };
        
        // Validate that we have images to transform
        if (!selectedImagesList || selectedImagesList.length === 0) {
          throw new Error('No valid images found for download');
        }
        
        console.log('📦 Original data for transformation:', {
          selectedImagesCount: selectedImagesList.length,
          formData: formData,
          selectedImages: selectedImagesList.map(img => ({ id: img.id, fileName: img.fileName }))
        });
        
        const transformedData = transformSelectedImagesForLambda(selectedImagesList, formData);
        
        // Validate that transformation preserves core functionality
        if (!validateTransformedData(originalData, transformedData, 'images')) {
          throw new Error('Data transformation validation failed');
        }
        
        // Additional validation for transformed data
        if (!transformedData.selectedImages || transformedData.selectedImages.length === 0) {
          throw new Error('Transformation resulted in no images');
        }
        
        console.log('✅ Transformation successful:', {
          originalCount: selectedImagesList.length,
          transformedCount: transformedData.selectedImages.length,
          mode: transformedData.mode
        });

        console.log('🚀 Calling Lambda for images download with unified format...');
        console.log('📦 Transformed data being sent:', JSON.stringify(transformedData, null, 2));
        console.log('🔍 Data structure check:');
        console.log('  - selectedImages length:', transformedData.selectedImages?.length);
        console.log('  - selectedImages type:', typeof transformedData.selectedImages);
        console.log('  - mode:', transformedData.mode);
        console.log('  - formData:', transformedData.formData);
        
        // Call Lambda function for images mode
        const apiUrl = getFullApiUrl();
        console.log('🌐 Using API endpoint:', apiUrl);
        console.log('🕒 Cache bust timestamp:', Date.now());
        
        // Universal browser-compatible request configuration
        let response;
        
        // Universal approach: Use XMLHttpRequest as fallback for better browser compatibility
        const makeRequest = async (): Promise<Response> => {
          try {
            // Primary: Standard fetch with minimal headers
            return await fetch(apiUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(transformedData)
            });
          } catch (fetchError) {
            console.warn('Fetch failed, trying XMLHttpRequest fallback:', fetchError);
            
            // Fallback: XMLHttpRequest for better browser compatibility
            return new Promise((resolve, reject) => {
              const xhr = new XMLHttpRequest();
              xhr.open('POST', apiUrl, true);
              xhr.setRequestHeader('Content-Type', 'application/json');
              
              xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                  // Create a Response-like object
                  const response = new Response(xhr.responseText, {
                    status: xhr.status,
                    statusText: xhr.statusText,
                    headers: new Headers({
                      'content-type': xhr.getResponseHeader('content-type') || 'application/json'
                    })
                  });
                  resolve(response);
                } else {
                  reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
                }
              };
              
              xhr.onerror = () => {
                reject(new Error('Network request failed'));
              };
              
              xhr.ontimeout = () => {
                reject(new Error('Request timeout'));
              };
              
              xhr.timeout = 30000; // 30 second timeout
              xhr.send(JSON.stringify(transformedData));
            });
          }
        };
        
        try {
          response = await makeRequest();
        } catch (requestError) {
          console.error('All request methods failed:', requestError);
          throw new Error('Network request failed. Please check your connection and try again.');
        }

        console.log('📡 Response status:', response.status);
        console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
          let errorData;
          try {
            errorData = await response.json();
          } catch (parseError) {
            console.error('Failed to parse error response:', parseError);
            errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
          }
          console.error('❌ Server error response:', errorData);
          throw new Error(errorData.error || `HTTP ${response.status}: Download failed`);
        }

        const result = await response.json();
        console.log('📦 Lambda response:', result);
        
        if (!result.success) {
          throw new Error(result.error || 'Download failed');
        }

        console.log('✅ Lambda response received, download URL:', result.downloadUrl);
        
        // Download the file using the presigned URL
        window.open(result.downloadUrl, '_blank');

        // Track image download success
        trackImageDownload(selectedImagesList.length, 'individual_package');
        console.log('✅ Download completed successfully');
        
        // Universal: Save user data to AWS after successful download
        try {
          await useMetadataStore.getState().saveUserData();
          console.log('✅ User data saved to AWS after download');
        } catch (saveError) {
          console.warn('⚠️ Failed to save user data after download:', saveError);
        }

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
        let errorMsg = error instanceof Error ? error.message : 'Failed to download package';
        
        // Check for CORS-related errors
        if (errorMsg.includes('Failed to fetch') || errorMsg.includes('Network request failed')) {
          errorMsg = 'Connection issue detected. Please try again or contact support if the problem persists.';
        }
        
        toast.error(errorMsg);
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
