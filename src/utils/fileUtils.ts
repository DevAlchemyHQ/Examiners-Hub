import { ImageMetadata, FormData } from '../types';
import { validateFormData, validateImages } from './fileValidation';
import { formatDate, generateMetadataFileName, generateImageFileName, generateZipFileName } from './fileNaming';
import { createZipFile } from './zipUtils';

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

    // Generate file names
    const metadataFileName = generateMetadataFileName(
      formData.elr.trim(),
      formData.structureNo.trim(),
      formData.date
    );

    const zipFileName = generateZipFileName(
      formData.elr.trim(),
      formData.structureNo.trim(),
      formData.date
    );

    // Create and return zip file
    const zipBlob = await createZipFile(
      images,
      metadataFileName,
      metadataContent,
      formData.date,
      zipFileName
    );

    if (!zipBlob) {
      throw new Error('Failed to create zip file');
    }

    return zipBlob;
  } catch (error) {
    console.error('Error in createDownloadPackage:', error);
    throw error instanceof Error 
      ? error 
      : new Error('Failed to create download package');
  }
};