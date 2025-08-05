import { ImageMetadata, BulkDefect, FormData } from '../types';
import { useMetadataStore } from '../store/metadataStore';

/**
 * Unified data structure for Lambda communication
 * This ensures both modes send the same format to Lambda
 */
export interface UnifiedImageData {
  id: string;
  photoNumber: string;
  description: string;
  s3Key: string;
  filename?: string;
  publicUrl?: string;
}

/**
 * Transform selected images data for Lambda
 * Preserves all existing functionality while standardizing format
 */
export function transformSelectedImagesForLambda(
  selectedImages: ImageMetadata[],
  formData: FormData
): {
  selectedImages: UnifiedImageData[];
  formData: FormData;
  mode: 'images';
} {
  // Get instance metadata for proper photo numbers and descriptions
  const { instanceMetadata } = useMetadataStore.getState();
  
  const unifiedImages = selectedImages.map((image, index) => {
    // Extract S3 key using the most reliable method first
    let s3Key;
    
    // ALWAYS prefer publicUrl over s3Key for accuracy
    if (image.publicUrl && image.publicUrl.trim() !== '') {
      // Extract S3 key from publicUrl (most reliable method)
      // publicUrl format: https://bucket.s3.region.amazonaws.com/users/email/images/timestamp-filename
      try {
        const url = new URL(image.publicUrl);
        // The pathname should be the S3 key directly
        s3Key = decodeURIComponent(url.pathname.substring(1)); // Remove leading slash and decode URL
        
        // Validate the extracted S3 key format
        if (!s3Key.includes('users/') || !s3Key.includes('/images/')) {
          // Try alternative extraction method
          const pathParts = url.pathname.split('/');
          if (pathParts.length >= 4) {
            // Try to reconstruct: users/email/images/filename
            const emailIndex = pathParts.findIndex(part => part.includes('@'));
            if (emailIndex !== -1 && emailIndex + 2 < pathParts.length) {
              s3Key = `${pathParts[emailIndex]}/${pathParts[emailIndex + 1]}/${pathParts[emailIndex + 2]}/${pathParts.slice(emailIndex + 3).join('/')}`;
            }
          }
        }
      } catch (error) {
        // Fallback to stored s3Key
        if ((image as any)?.s3Key && (image as any).s3Key.trim() !== '') {
          const userId = image.userId || 'anonymous';
          s3Key = `users/${userId}/images/${(image as any).s3Key}`;
        }
      }
    } else if ((image as any)?.s3Key && (image as any).s3Key.trim() !== '') {
      // Fallback to stored s3Key
      const userId = image.userId || 'anonymous';
      s3Key = `users/${userId}/images/${(image as any).s3Key}`;
    } else {
      // Final fallback to constructed S3 key
      const userId = image.userId || 'anonymous';
      s3Key = `users/${userId}/images/${image.s3Key || image.file?.name || 'unknown'}`;
    }
    
    // Get instance-specific metadata if this image has an instanceId
    let photoNumber = image.photoNumber || (index + 1).toString();
    let description = image.description || 'LM';
    
    console.log(`🔍 Processing image ${index + 1}:`, {
      id: image.id,
      instanceId: image.instanceId,
      hasInstanceMetadata: image.instanceId ? !!instanceMetadata[image.instanceId] : false,
      availableMetadataKeys: Object.keys(instanceMetadata)
    });
    
    if (image.instanceId && instanceMetadata[image.instanceId]) {
      const instanceData = instanceMetadata[image.instanceId];
      photoNumber = instanceData.photoNumber || photoNumber;
      description = instanceData.description || description;
      console.log(`✅ Using instance metadata for ${image.instanceId}:`, { photoNumber, description });
    } else if (image.instanceId) {
      console.log(`⚠️ No instance metadata found for ${image.instanceId}, using fallback:`, { photoNumber, description });
    }
    
    return {
      id: image.id,
      photoNumber: photoNumber,
      description: description,
      s3Key: s3Key,
      filename: image.file?.name || (image as any).fileName,
      publicUrl: image.publicUrl
    };
  });
  
  return {
    selectedImages: unifiedImages,
    formData: formData,
    mode: 'images' as const
  };
}

/**
 * Transform bulk defects data for Lambda
 * Preserves all existing functionality while standardizing format
 */
export function transformBulkDefectsForLambda(
  bulkDefects: BulkDefect[],
  images: ImageMetadata[],
  formData: FormData
): {
  selectedImages: UnifiedImageData[];
  formData: FormData;
  mode: 'bulk';
} {
  console.log('🔄 Transforming bulk defects for Lambda...');
  
  // Filter defects that have selected files (same as original logic)
  const defectsWithImages = bulkDefects.filter(defect => defect.selectedFile);
  
  if (defectsWithImages.length === 0) {
    throw new Error('No defects with images selected');
  }
  
  const unifiedImages = defectsWithImages.map(defect => {
    // Find corresponding image using the same logic as BulkTextInput
    const correspondingImage = images.find(img => {
      const imgFileName = img.fileName || img.file?.name || '';
      return imgFileName === defect.selectedFile;
    });
    
    if (!correspondingImage) {
      console.error('Available images:', images.map(img => ({
        id: img.id,
        fileName: img.fileName,
        file_name: img.file?.name,
        selectedFile: defect.selectedFile
      })));
      throw new Error(`Image not found for defect ${defect.photoNumber}: ${defect.selectedFile}`);
    }
    
    // Extract S3 key using the same logic as the original DownloadButton
    let s3Key;
    
    // ALWAYS prefer publicUrl over s3Key for accuracy
    if (correspondingImage.publicUrl && correspondingImage.publicUrl.trim() !== '') {
      // Extract S3 key from publicUrl (most reliable method)
      // publicUrl format: https://bucket.s3.region.amazonaws.com/users/email/images/timestamp-filename
      try {
        const url = new URL(correspondingImage.publicUrl);
        // The pathname should be the S3 key directly
        s3Key = decodeURIComponent(url.pathname.substring(1)); // Remove leading slash and decode URL
        console.log('Extracted S3 key from publicUrl:', s3Key);
        
        // Validate the extracted S3 key format
        if (!s3Key.includes('users/') || !s3Key.includes('/images/')) {
          console.warn('Extracted S3 key format looks incorrect:', s3Key);
          // Try alternative extraction method
          const pathParts = url.pathname.split('/');
          if (pathParts.length >= 4) {
            // Try to reconstruct: users/email/images/filename
            const emailIndex = pathParts.findIndex(part => part.includes('@'));
            if (emailIndex !== -1 && emailIndex + 2 < pathParts.length) {
              s3Key = `${pathParts[emailIndex]}/${pathParts[emailIndex + 1]}/${pathParts[emailIndex + 2]}/${pathParts.slice(emailIndex + 3).join('/')}`;
              console.log('Reconstructed S3 key:', s3Key);
            }
          }
        }
      } catch (error) {
        console.error('Error parsing publicUrl:', error);
        // Fallback to stored s3Key
        if ((correspondingImage as any)?.s3Key && (correspondingImage as any).s3Key.trim() !== '') {
          s3Key = `users/${correspondingImage.userId || 'anonymous'}/images/${(correspondingImage as any).s3Key}`;
          console.log('Using stored s3Key after URL parse error:', s3Key);
        }
      }
    } else if ((correspondingImage as any)?.s3Key && (correspondingImage as any).s3Key.trim() !== '') {
      s3Key = `users/${correspondingImage.userId || 'anonymous'}/images/${(correspondingImage as any).s3Key}`;
      console.log('Using stored s3Key:', s3Key);
    } else {
      // For images without publicUrl, construct the S3 key
      const userId = correspondingImage.userId || 'anonymous';
      
      // The S3 key format is: users/email/images/timestamp-filename
      // We need to find the timestamp from the image ID or construct it
      if (correspondingImage?.id) {
        if (correspondingImage.id.startsWith('local-')) {
          // For local images, extract timestamp from ID
          const idParts = correspondingImage.id.split('-');
          const timestamp = idParts[1];
          s3Key = `users/${userId}/images/${timestamp}-${defect.selectedFile}`;
          console.log('Constructed S3 key from local image ID:', s3Key);
        } else if (correspondingImage.id.startsWith('s3-')) {
          // For S3-loaded images, we need to find the actual S3 key
          // The filename in S3 is the actual filename, so we need to construct the full path
          s3Key = `users/${userId}/images/${defect.selectedFile}`;
          console.log('Constructed S3 key for S3-loaded image:', s3Key);
        } else {
          // Fallback: use the ID as part of the key
          s3Key = `users/${userId}/images/${correspondingImage.id}-${defect.selectedFile}`;
          console.log('Constructed S3 key from ID fallback:', s3Key);
        }
      } else {
        // Final fallback
        s3Key = `users/${userId}/images/${defect.selectedFile}`;
        console.log('Final fallback S3 key:', s3Key);
      }
    }
    
    return {
      id: correspondingImage.id,
      photoNumber: defect.photoNumber || '1',
      description: defect.description || 'LM',
      s3Key: s3Key,
      selectedFile: defect.selectedFile, // Lambda expects selectedFile, not filename
      filename: defect.selectedFile,
      publicUrl: correspondingImage.publicUrl
    };
  });
  
  console.log('✅ Bulk defects transformed:', unifiedImages.length);
  console.log('Sample transformed defect:', unifiedImages[0]);
  
  return {
    selectedImages: unifiedImages,
    formData: formData,
    mode: 'bulk' as const
  };
}

/**
 * Validate that transformed data maintains core functionality
 */
export function validateTransformedData(
  originalData: any,
  transformedData: any,
  mode: 'images' | 'bulk'
): boolean {
  console.log('🔍 Validating transformed data...');
  
  // Check that we have the same number of items
  const originalCount = mode === 'images' 
    ? originalData.selectedImages?.length || 0
    : originalData.bulkDefects?.filter((d: any) => d.selectedFile)?.length || 0;
  
  const transformedCount = transformedData.selectedImages?.length || 0;
  
  if (originalCount !== transformedCount) {
    console.error('❌ Item count mismatch:', { originalCount, transformedCount });
    return false;
  }
  
  // Check that all required fields are present
  const hasRequiredFields = transformedData.selectedImages.every((item: any) => {
    return item.id && item.photoNumber && item.description && item.s3Key;
  });
  
  if (!hasRequiredFields) {
    console.error('❌ Missing required fields in transformed data');
    return false;
  }
  
  console.log('✅ Transformed data validation passed');
  return true;
} 