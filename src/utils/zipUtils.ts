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
    
    // Set image source with CORS handling
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

// Helper function to fetch image with CORS fallback
const fetchImageWithFallback = async (imageUrl: string): Promise<Blob> => {
  try {
    console.log('Fetching image with CORS handling:', imageUrl);
    
    // Try direct fetch first
    const response = await fetch(imageUrl, {
      mode: 'cors',
      credentials: 'omit'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    console.log('Successfully fetched image, size:', blob.size);
    return blob;
    
  } catch (error) {
    console.error('Direct fetch failed, trying canvas approach:', error);
    
    // Fallback: use canvas to load image
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
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
              console.log('Successfully processed image via canvas, size:', blob.size);
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
      
      // Load image from URL with CORS
      img.crossOrigin = 'anonymous';
      img.src = imageUrl;
    });
  }
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
        
        if (image.file || (image as any).localFile) {
          // Local file - process directly (prioritize localFile if available)
          const localFile = (image as any).localFile || image.file;
          imageBlob = await processImageForDownload(localFile);
        } else if (image.base64) {
          // Use base64 data from localStorage (most reliable)
          console.log('Using base64 data for image:', image.fileName || 'unknown');
          
          try {
            // Convert base64 to blob
            const base64Data = image.base64;
            const byteCharacters = atob(base64Data.split(',')[1]);
            const byteNumbers = new Array(byteCharacters.length);
            
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'image/jpeg' });
            
            console.log('Successfully converted base64 to blob, size:', blob.size);
            imageBlob = blob;
            
          } catch (error) {
            console.error('Error converting base64 to blob:', error);
            throw new Error('Failed to convert base64 image data');
          }
        } else if (image.preview || image.publicUrl) {
          // Fallback: S3 image - use improved CORS handling
          const imageUrl = image.preview || image.publicUrl;
          console.log('Fallback: Processing S3 image with CORS handling:', imageUrl);
          
          try {
            // Use the improved fetch function with CORS fallback
            const imageData = await fetchImageWithFallback(imageUrl);
            console.log('Successfully fetched S3 image, size:', imageData.size);
        
            // Process the fetched image through canvas to ensure JPG format
            imageBlob = await processImageForDownload(imageData);
            
          } catch (error) {
            console.error('Error processing S3 image:', error);
            
            // Create a placeholder image with error information
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 400;
            canvas.height = 300;
            
            // Draw error message on canvas
            ctx!.fillStyle = '#f0f0f0';
            ctx!.fillRect(0, 0, 400, 300);
            ctx!.fillStyle = '#666';
            ctx!.font = '16px Arial';
            ctx!.textAlign = 'center';
            ctx!.fillText('Image not available', 200, 140);
            ctx!.fillText('CORS or network error', 200, 170);
            ctx!.fillText(imageUrl, 200, 200);
            
            // Convert to blob
            imageBlob = await new Promise<Blob>((resolve, reject) => {
              canvas.toBlob((blob) => {
                if (blob) {
                  resolve(blob);
                } else {
                  reject(new Error('Failed to create error placeholder'));
                }
              }, 'image/jpeg', 0.9);
            });
          }
        } else {
          throw new Error('No file, base64, or preview URL available for image');
        }
        
        // Generate filename for the image in the correct format: Photo 1 ^ LM ^ 15-04-25
        const photoNumber = image.photoNumber || '1';
        const description = image.description || 'LM';
        
        // Format date as DD-MM-YY
        const formatDate = (dateString: string) => {
          try {
            const date = new Date(dateString);
            const day = date.getDate().toString().padStart(2, '0');
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const year = date.getFullYear().toString().slice(-2); // Get last 2 digits
            return `${day}-${month}-${year}`;
          } catch (error) {
            // Fallback to current date if parsing fails
            const now = new Date();
            const day = now.getDate().toString().padStart(2, '0');
            const month = (now.getMonth() + 1).toString().padStart(2, '0');
            const year = now.getFullYear().toString().slice(-2);
            return `${day}-${month}-${year}`;
          }
        };
        
        const formattedDate = formatDate(date);
        
        // Generate filename in the correct format: Photo 1 ^ LM ^ 15-04-25
        const imageFileName = `Photo ${photoNumber} ^ ${description} ^ ${formattedDate}.jpg`;
        console.log('Generated filename:', imageFileName);
        
        // Add image to ZIP
        zip.file(imageFileName, imageBlob);
        
      } catch (error) {
        console.error(`Error processing image ${i + 1}:`, error);
        
        // Add a placeholder file with error information
        const errorPhotoNumber = image.photoNumber || '1';
        const errorDescription = image.description || 'error';
        const errorFileName = `Photo ${errorPhotoNumber} ^ ${errorDescription} ^ ${formattedDate}.txt`;
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