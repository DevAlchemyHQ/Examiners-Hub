// JavaScript version of transformation functions for testing

function transformBulkDefectsForLambda(bulkDefects, images, formData) {
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
      const url = new URL(correspondingImage.publicUrl);
      s3Key = decodeURIComponent(url.pathname.substring(1)); // Remove leading slash and decode URL
      console.log('Extracted S3 key from publicUrl:', s3Key);
    } else if (correspondingImage.s3Key && correspondingImage.s3Key.trim() !== '') {
      s3Key = `users/${correspondingImage.userId || 'anonymous'}/images/${correspondingImage.s3Key}`;
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
    mode: 'bulk'
  };
}

function transformSelectedImagesForLambda(selectedImages, formData) {
  console.log('🔄 Transforming selected images for Lambda...');
  
  if (selectedImages.length === 0) {
    throw new Error('No images selected');
  }
  
  const unifiedImages = selectedImages.map(image => {
    // Extract S3 key using the same logic as the original DownloadButton
    let s3Key;
    
    // ALWAYS prefer publicUrl over s3Key for accuracy
    if (image.publicUrl && image.publicUrl.trim() !== '') {
      // Extract S3 key from publicUrl (most reliable method)
      // publicUrl format: https://bucket.s3.region.amazonaws.com/users/email/images/timestamp-filename
      const url = new URL(image.publicUrl);
      s3Key = decodeURIComponent(url.pathname.substring(1)); // Remove leading slash and decode URL
      console.log('Extracted S3 key from publicUrl:', s3Key);
    } else if (image.s3Key && image.s3Key.trim() !== '') {
      s3Key = `users/${image.userId || 'anonymous'}/images/${image.s3Key}`;
      console.log('Using stored s3Key:', s3Key);
    } else {
      // For images without publicUrl, construct the S3 key
      const userId = image.userId || 'anonymous';
      
      if (image?.id) {
        if (image.id.startsWith('local-')) {
          // For local images, extract timestamp from ID
          const idParts = image.id.split('-');
          const timestamp = idParts[1];
          s3Key = `users/${userId}/images/${timestamp}-${image.fileName}`;
          console.log('Constructed S3 key from local image ID:', s3Key);
        } else if (image.id.startsWith('s3-')) {
          s3Key = `users/${userId}/images/${image.fileName}`;
          console.log('Constructed S3 key for S3-loaded image:', s3Key);
        } else {
          s3Key = `users/${userId}/images/${image.id}-${image.fileName}`;
          console.log('Constructed S3 key from ID fallback:', s3Key);
        }
      } else {
        s3Key = `users/${userId}/images/${image.fileName}`;
        console.log('Final fallback S3 key:', s3Key);
      }
    }
    
    return {
      id: image.id,
      photoNumber: image.photoNumber || '1',
      description: image.description || 'LM',
      s3Key: s3Key,
      filename: image.fileName,
      publicUrl: image.publicUrl
    };
  });
  
  console.log('✅ Selected images transformed:', unifiedImages.length);
  console.log('Sample transformed image:', unifiedImages[0]);
  
  return {
    selectedImages: unifiedImages,
    formData: formData,
    mode: 'images'
  };
}

function validateTransformedData(originalData, transformedData, mode) {
  console.log('🔍 Validating transformed data...');
  
  // Basic validation - check that we have the required fields
  if (!transformedData.selectedImages || !Array.isArray(transformedData.selectedImages)) {
    console.error('❌ Validation failed: missing selectedImages array');
    return false;
  }
  
  if (!transformedData.formData) {
    console.error('❌ Validation failed: missing formData');
    return false;
  }
  
  if (!transformedData.mode || !['bulk', 'images'].includes(transformedData.mode)) {
    console.error('❌ Validation failed: invalid mode');
    return false;
  }
  
  // Check that we have at least one image/defect
  if (transformedData.selectedImages.length === 0) {
    console.error('❌ Validation failed: no images/defects in transformed data');
    return false;
  }
  
  // Check that each image/defect has required fields
  for (const item of transformedData.selectedImages) {
    if (!item.id || !item.photoNumber || !item.description || !item.s3Key) {
      console.error('❌ Validation failed: missing required fields in transformed item', item);
      return false;
    }
  }
  
  console.log('✅ Validation passed');
  return true;
}

export { transformBulkDefectsForLambda, transformSelectedImagesForLambda, validateTransformedData }; 