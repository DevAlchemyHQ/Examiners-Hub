import JSZip from 'jszip';
import { ImageMetadata } from '../types';
import { generateImageFileName } from './fileNaming';

// Helper function to convert image to proper format and size
const processImageForDownload = async (imageFile: File | string): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    console.log('Processing image for download:', typeof imageFile === 'string' ? 'S3 URL' : imageFile.name);
    
    // Validate input
    if (!imageFile) {
      reject(new Error('Invalid image data'));
      return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      try {
        console.log('Image loaded successfully:', img.width, 'x', img.height);
        
        // Set canvas size (maintain aspect ratio, max 1920x1080)
        const maxWidth = 1920;
        const maxHeight = 1080;
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw image with proper quality
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Convert to blob with high quality JPEG
        canvas.toBlob((blob) => {
          if (blob) {
            console.log('Image processed successfully, blob size:', blob.size);
            resolve(blob);
          } else {
            reject(new Error('Failed to convert image to blob'));
          }
        }, 'image/jpeg', 0.9);
      } catch (error) {
        console.error('Error in image processing:', error);
        reject(error);
      }
    };
    
    img.onerror = (error) => {
      console.error('Image load error:', error);
      reject(new Error(`Failed to load image: ${typeof imageFile === 'string' ? 'S3 URL' : imageFile.name}`));
    };
    
    // Set image source
    if (typeof imageFile === 'string') {
      // S3 URL - use direct loading with CORS
      img.crossOrigin = 'anonymous';
      img.src = imageFile;
    } else {
      // File object - create object URL
      const objectUrl = URL.createObjectURL(imageFile);
      console.log('Created object URL:', objectUrl);
      img.src = objectUrl;
      
      // Clean up object URL after processing
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
      };
    }
  });
};

export const createZipFile = async (
  images: ImageMetadata[],
  metadataFileName: string,
  metadataContent: string,
  date: string,
  zipFileName: string
): Promise<Blob> => {
  try {
    console.log('Creating ZIP file with', images.length, 'images');
    
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    
    // Add metadata file
    zip.file(metadataFileName, metadataContent);
    
    // Process each image
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      console.log(`Processing image ${i + 1}/${images.length}: ${image.fileName || image.file?.name || 'unknown'}`);
      
      try {
        let imageBlob: Blob;
        
        if (image.file) {
          // Local file - process directly
          imageBlob = await processImageForDownload(image.file);
        } else if (image.preview || image.publicUrl) {
          // S3 image - fetch the image data directly
          const imageUrl = image.preview || image.publicUrl;
          console.log('Fetching S3 image:', imageUrl);
          
          try {
            // Fetch the image data
            const response = await fetch(imageUrl);
            if (!response.ok) {
              throw new Error(`Failed to fetch image: ${response.status}`);
            }
            
            const imageData = await response.blob();
            console.log('Fetched image data, size:', imageData.size);
            
            // Process the fetched image through canvas to ensure JPG format
            imageBlob = await processImageForDownload(imageData);
            
          } catch (fetchError) {
            console.error('Error fetching S3 image:', fetchError);
            
            // Fallback: try to create a canvas-based approach
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            const imageBlobPromise = new Promise<Blob>((resolve, reject) => {
              img.onload = () => {
                try {
                  // Set canvas size (maintain aspect ratio, max 1920x1080)
                  const maxWidth = 1920;
                  const maxHeight = 1080;
                  let { width, height } = img;
                  
                  if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    width *= ratio;
                    height *= ratio;
                  }
                  
                  canvas.width = width;
                  canvas.height = height;
                  
                  // Draw image with proper quality
                  ctx?.drawImage(img, 0, 0, width, height);
                  
                  // Convert to blob with high quality JPEG
                  canvas.toBlob((blob) => {
                    if (blob) {
                      console.log('Successfully processed S3 image via canvas, size:', blob.size);
                      resolve(blob);
                    } else {
                      reject(new Error('Failed to convert canvas to blob'));
                    }
                  }, 'image/jpeg', 0.9);
                } catch (error) {
                  reject(error);
                }
              };
              
              img.onerror = () => {
                reject(new Error('Failed to load image from URL'));
              };
              
              // Load image from URL
              img.crossOrigin = 'anonymous';
              img.src = imageUrl;
            });
            
            imageBlob = await imageBlobPromise;
          }
        } else {
          throw new Error('No file or preview URL available for image');
        }
        
        // Generate filename for the image
        const photoNumber = image.photoNumber?.padStart(2, '0') || '00';
        const description = image.description || 'unknown';
        const originalName = image.fileName || image.file?.name || 'image';
        
        // Always use JPG extension for consistency
        const imageFileName = `Photo ${photoNumber}^${description}^ ${date}.jpg`;
        console.log('Generated filename:', imageFileName);
        
        // Add image to ZIP
        zip.file(imageFileName, imageBlob);
        
      } catch (error) {
        console.error(`Error processing image ${i + 1}:`, error);
        
        // Add a placeholder file with error information
        const errorFileName = `Photo ${image.photoNumber?.padStart(2, '0') || '00'}^${image.description || 'error'}^ ${date}.txt`;
        const errorContent = `Error processing image: ${image.fileName || image.file?.name || 'unknown'}\nOriginal URL: ${image.preview || image.publicUrl || 'N/A'}\nError: ${error}`;
        zip.file(errorFileName, errorContent);
      }
    }
    
    // Generate ZIP file
    const blob = await zip.generateAsync({ type: 'blob' });
    console.log('ZIP file created successfully, size:', blob.size);
    
    return blob;
  } catch (error) {
    console.error('Error creating zip file:', error);
    throw error;
  }
};