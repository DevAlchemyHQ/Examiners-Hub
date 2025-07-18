import { useMetadataStore } from '../store/metadataStore';
import { validateImages } from '../utils/fileValidation';

export const useValidation = () => {
  const { images, selectedImages, formData } = useMetadataStore();

  const isValid = () => {
    // Basic form validation
    if (!formData.elr || !formData.structureNo || !formData.date) return false;
    // Must have selected images
    if (selectedImages.size === 0) return false;
    return true;
  };

  const getValidationErrors = () => {
    const errors: string[] = [];
    if (!formData.elr) errors.push('Enter ELR');
    if (!formData.structureNo) errors.push('Enter Structure No');
    if (!formData.date) errors.push('Select Date');
    if (selectedImages.size === 0) {
      errors.push('Select at least one image');
    }
    return errors;
  };

  return {
    isValid,
    getValidationErrors,
  };
};