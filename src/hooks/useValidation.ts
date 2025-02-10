import { useMetadataStore } from '../store/metadataStore';

export const useValidation = () => {
  const { images, selectedImages, formData } = useMetadataStore();

  const isValid = () => {
    // Basic form validation
    if (!formData.elr || !formData.structureNo || !formData.date) return false;
    
    // Must have selected images
    if (selectedImages.size === 0) return false;
    
    // Get selected images
    const selectedImagesList = images.filter(img => selectedImages.has(img.id));
    
    // Validate sketches and defects separately
    const sketches = selectedImagesList.filter(img => img.isSketch);
    const defects = selectedImagesList.filter(img => !img.isSketch);
    
    // All sketches must have numbers
    const sketchesValid = sketches.every(img => img.photoNumber?.trim() !== '');
    
    // All defects must have numbers and descriptions
    const defectsValid = defects.every(img => 
      img.photoNumber?.trim() !== '' && 
      img.description?.trim() !== ''
    );
    
    return sketchesValid && defectsValid;
  };

  const getValidationErrors = () => {
    const errors: string[] = [];

    if (!formData.elr) errors.push('Enter ELR');
    if (!formData.structureNo) errors.push('Enter Structure No');
    if (!formData.date) errors.push('Select Date');
    
    if (selectedImages.size === 0) {
      errors.push('Select at least one image');
    } else {
      const selectedImagesList = images.filter(img => selectedImages.has(img.id));
      const sketches = selectedImagesList.filter(img => img.isSketch);
      const defects = selectedImagesList.filter(img => !img.isSketch);
      
      // Check sketches for missing numbers
      if (sketches.some(img => !img.photoNumber?.trim())) {
        errors.push('Add numbers to selected sketch images');
      }
      
      // Check defects for missing numbers and descriptions
      if (defects.some(img => !img.photoNumber?.trim())) {
        errors.push('Add numbers to selected defect images');
      }
      if (defects.some(img => !img.description?.trim())) {
        errors.push('Add descriptions to selected defect images');
      }
    }

    return errors;
  };

  return {
    isValid,
    getValidationErrors,
  };
};