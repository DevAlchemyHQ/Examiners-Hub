import { ImageMetadata, FormData } from '../types';

export const validateFormData = (formData: FormData): string | null => {
  if (!formData.elr?.trim()) return 'ELR is required';
  if (!formData.structureNo?.trim()) return 'Structure number is required';
  if (!formData.date?.trim()) return 'Date is required';
  return null;
};

export const validateDescription = (description: string): { 
  isValid: boolean;
  invalidChars: string[];
} => {
  const slashChars = description.match(/[/\\]/g) || [];
  return {
    isValid: slashChars.length === 0,
    invalidChars: [...new Set(slashChars)]
  };
};

export const validateImages = (images: ImageMetadata[]): string | null => {
  if (images.length === 0) return 'No images selected';
  
  // Check if any image is missing required metadata
  for (const img of images) {
    if (!img.photoNumber?.trim()) {
      return `Photo number is required for ${img.isSketch ? 'sketch' : 'defect'}: ${img.file.name}`;
    }
    
    // Only check description for defect images
    if (!img.isSketch && !img.description?.trim()) {
      return `Description is required for defect: ${img.file.name}`;
    }
    
    // Check for slashes in defect descriptions only
    if (!img.isSketch) {
      const { isValid } = validateDescription(img.description);
      if (!isValid) {
        return 'Remove slashes (/ or \\) from descriptions before downloading';
      }
    }
  }
  
  // Check for duplicate photo numbers within each type (sketches and defects separately)
  const sketchNumbers = new Set();
  const defectNumbers = new Set();

  for (const img of images) {
    const number = img.photoNumber.trim();
    const set = img.isSketch ? sketchNumbers : defectNumbers;

    if (set.has(number)) {
      const type = img.isSketch ? 'sketch' : 'photo';
      return `Duplicate ${type} number found: ${number}`;
    }
    set.add(number);
  }
  
  return null;
};