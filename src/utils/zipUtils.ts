import JSZip from 'jszip';
import { ImageMetadata } from '../types';
import { generateImageFileName } from './fileNaming';

// Helper function to convert image to proper format and size
const processImageForDownload = async (imageFile: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    console.log('Processing image for download:', imageFile.name, 'Size:', imageFile.size, 'Type:', imageFile.type);
    
    // Validate file
    if (!imageFile || imageFile.size === 0) {
      reject(new Error(`Invalid file: ${imageFile?.name || 'unknown'}`));
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
      reject(new Error(`Failed to load image: ${imageFile.name}`));
    };
    
    // Create object URL and set source
    const objectUrl = URL.createObjectURL(imageFile);
    console.log('Created object URL:', objectUrl);
    img.src = objectUrl;
    
    // Clean up object URL after processing
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
    };
  });
};

export const createZipFile = async (
  images: ImageMetadata[],
  metadataFileName: string,
  metadataContent: string,
  date: string,
  zipFileName: string
): Promise<Blob> => {
  console.log('Creating ZIP file with:', {
    imageCount: images.length,
    metadataFileName,
    date,
    zipFileName
  });

  // Input validation
  if (!images?.length) {
    throw new Error('No images provided for zip creation');
  }

  if (!metadataFileName || !metadataContent) {
    throw new Error('Invalid metadata for zip file');
  }

  if (!date) {
    throw new Error('Date is required for zip file creation');
  }

  try {
    const zip = new JSZip();
    
    // Add metadata file
    console.log('Adding metadata file:', metadataFileName);
    zip.file(metadataFileName, metadataContent);
    
    // Add images with appropriate naming and processing
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      console.log(`Processing image ${i + 1}/${images.length}:`, img.file?.name);
      
      if (!img.file) {
        throw new Error(`Invalid image entry: missing file data`);
      }

      try {
        const fileName = generateImageFileName(img, date);
        if (!fileName) {
          throw new Error(`Failed to generate filename for image: ${img.file.name}`);
        }
        
        console.log('Generated filename:', fileName);
        
        // Process image for download (convert format, resize if needed)
        const processedImageBlob = await processImageForDownload(img.file);
        
        zip.file(fileName, processedImageBlob);
        console.log('Added image to ZIP:', fileName);
      } catch (error) {
        console.error('Error processing image:', error);
        throw new Error(`Failed to process image: ${img.file.name}`);
      }
    }
    
    console.log('Generating ZIP file...');
    // Generate zip with compression
    const blob = await zip.generateAsync({ 
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 6
      }
    });

    if (!blob) {
      throw new Error('Failed to generate zip file');
    }

    console.log('ZIP file created successfully, size:', blob.size);
    return blob;
  } catch (error) {
    console.error('Error creating zip file:', error);
    throw error instanceof Error 
      ? error 
      : new Error('Failed to create zip file');
  }
};