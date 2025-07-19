import { useMetadataStore } from '../store/metadataStore';
import { validateDescription } from '../utils/fileValidation';

export const useValidation = () => {
  const { images, selectedImages, formData } = useMetadataStore();

  const isValid = () => {
    // Basic form validation
    if (!formData.elr?.trim() || !formData.structureNo?.trim() || !formData.date?.trim()) return false;
    
    // Must have selected images
    if (selectedImages.size === 0) return false;
    
    // Check if all selected images have valid descriptions
    const selectedImagesList = images.filter(img => selectedImages.has(img.id));
    const hasInvalidDescriptions = selectedImagesList.some(img => {
      if (img.isSketch) return false; // Sketches don't need descriptions
      return !validateDescription(img.description || '').isValid;
    });
    
    // Check for duplicate photo numbers
    const photoNumbers = selectedImagesList
      .map(img => img.photoNumber?.trim())
      .filter(num => num && num !== '');
    
    const hasDuplicatePhotoNumbers = photoNumbers.length !== new Set(photoNumbers).size;
    
    return !hasInvalidDescriptions && !hasDuplicatePhotoNumbers;
  };

  const getValidationErrors = () => {
    const errors: string[] = [];
    
    if (!formData.elr?.trim()) errors.push('Enter ELR');
    if (!formData.structureNo?.trim()) errors.push('Enter Structure No');
    if (!formData.date?.trim()) errors.push('Select Date');
    
    if (selectedImages.size === 0) {
      errors.push('Select at least one image');
    } else {
      // Check for invalid descriptions
      const selectedImagesList = images.filter(img => selectedImages.has(img.id));
      const imagesWithoutDescriptions = selectedImagesList.filter(img => {
        if (img.isSketch) return false;
        return !validateDescription(img.description || '').isValid;
      });
      
      if (imagesWithoutDescriptions.length > 0) {
        errors.push(`Add descriptions for ${imagesWithoutDescriptions.length} image${imagesWithoutDescriptions.length !== 1 ? 's' : ''}`);
      }
      
      // Check for duplicate photo numbers
      const photoNumbers = selectedImagesList
        .map(img => img.photoNumber?.trim())
        .filter(num => num && num !== '');
      
      const uniquePhotoNumbers = new Set(photoNumbers);
      if (photoNumbers.length !== uniquePhotoNumbers.size) {
        const duplicates = photoNumbers.filter((num, index) => photoNumbers.indexOf(num) !== index);
        errors.push(`Duplicate photo numbers found: ${[...new Set(duplicates)].join(', ')}`);
      }
    }
    
    return errors;
  };

  return {
    isValid,
    getValidationErrors,
  };
};