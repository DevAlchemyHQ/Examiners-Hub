import { ImageMetadata, FormData } from '../types';
import { validateFormData, validateImages } from './fileValidation';
import { formatDate, generateMetadataFileName, generateImageFileName, generateZipFileName } from './fileNaming';
import { createZipFile } from './zipUtils';

// Helper function to convert image to JPG base64
export const convertImageToJpgBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      try {
        console.log('Converting image to JPG base64:', file.name);
        
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
        
        // Convert to base64 with high quality JPEG
        const base64 = canvas.toDataURL('image/jpeg', 0.9);
        console.log('Successfully converted to JPG base64, size:', base64.length);
        resolve(base64);
      } catch (error) {
        console.error('Error converting image to JPG base64:', error);
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error(`Failed to load image: ${file.name}`));
    };
    
    // Load image from file
    const objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;
    
    // Clean up object URL after loading
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
    };
  });
};

// Helper function to convert blob to base64
export const convertBlobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      resolve(base64);
    };
    reader.onerror = () => {
      reject(new Error('Failed to convert blob to base64'));
    };
    reader.readAsDataURL(blob);
  });
};

export const generateMetadataContent = (
  images: ImageMetadata[],
  date: string
): string => {
  if (!images?.length) {
    throw new Error('No images provided for metadata generation');
  }

  if (!date) {
    throw new Error('Date is required for metadata generation');
  }

  try {
    const formattedDate = formatDate(date);
    
    // Separate sketches and defects
    const sketches = images.filter(img => img.isSketch)
      .sort((a, b) => parseInt(a.photoNumber || '0') - parseInt(b.photoNumber || '0'));
    
    const defects = images.filter(img => !img.isSketch)
      .sort((a, b) => parseInt(a.photoNumber || '0') - parseInt(b.photoNumber || '0'));

    // Build content sections
    const content = [];

    // Add Sketches section with aligned format
    if (sketches.length > 0) {
      content.push('Sketches:');
      sketches.forEach(img => {
        if (!img.photoNumber?.trim()) {
          throw new Error(`Missing photo number for sketch: ${img.file.name}`);
        }
        content.push(`Sketch ${img.photoNumber.trim().padStart(2, '0')}.JPG    ${img.file.name}`);
      });
      content.push(''); // Add blank line between sections
    }

    // Add Defects section with aligned format
    if (defects.length > 0) {
      content.push('Defects:');
      defects.forEach(img => {
        if (!img.photoNumber?.trim()) {
          throw new Error(`Missing photo number for defect: ${img.file.name}`);
        }
        if (!img.description?.trim()) {
          throw new Error(`Missing description for defect: ${img.file.name}`);
        }
        content.push(`Photo ${img.photoNumber.trim().padStart(2, '0')} ^ ${img.description.trim()} ^ ${formattedDate}    ${img.file.name}`);
      });
    }

    const result = content.join('\n');
    if (!result) {
      throw new Error('Failed to generate metadata content');
    }

    return result;
  } catch (error) {
    console.error('Error generating metadata content:', error);
    throw error instanceof Error ? error : new Error('Failed to generate metadata content');
  }
};

export const createDownloadPackage = async (
  images: ImageMetadata[],
  formData: FormData
): Promise<Blob> => {
  try {
    // Input validation
    if (!images?.length) {
      throw new Error('No images selected for download');
    }

    if (!formData) {
      throw new Error('Form data is required');
    }

    // Validate form data
    const formError = validateFormData(formData);
    if (formError) {
      throw new Error(formError);
    }

    // Validate images
    const imagesError = validateImages(images);
    if (imagesError) {
      throw new Error(imagesError);
    }

    // Generate metadata content
    const metadataContent = await generateMetadataContent(images, formData.date);
    if (!metadataContent) {
      throw new Error('Failed to generate metadata content');
    }

    // Generate filenames
    const metadataFileName = generateMetadataFileName(formData.elr, formData.structureNo, formData.date);
    const zipFileName = generateZipFileName(formData.elr, formData.structureNo, formData.date);

    // Create ZIP file with metadata and processed images
    const zipBlob = await createZipFile(
      images,
      metadataFileName,
      metadataContent,
      formData.date,
      zipFileName
    );

    return zipBlob;
  } catch (error) {
    console.error('Error in createDownloadPackage:', error);
    throw error instanceof Error 
      ? error 
      : new Error('Failed to create download package');
  }
};