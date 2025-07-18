import { useMetadataStore } from '../store/metadataStore';
import { validateDescription } from '../utils/fileValidation';

export const useBulkValidation = () => {
  const { bulkDefects, images, formData } = useMetadataStore();

  const getBulkValidationErrors = () => {
    const errors: string[] = [];

    // Check if there are any defects at all
    if (bulkDefects.length === 0) {
      errors.push('Add at least one defect');
      return errors;
    }

    // Check if at least one defect has a selected image
    const defectsWithImages = bulkDefects.filter(defect => defect.selectedFile);
    if (defectsWithImages.length === 0) {
      errors.push('Select images for at least one defect');
    }

    // Check form data requirements
    if (!formData.elr?.trim()) {
      errors.push('Enter ELR');
    }
    if (!formData.structureNo?.trim()) {
      errors.push('Enter Structure No');
    }
    if (!formData.date?.trim()) {
      errors.push('Select Date');
    }

    return errors;
  };

  const isBulkValid = () => {
    const errors = getBulkValidationErrors();
    return errors.length === 0;
  };

  const getValidationSummary = () => {
    const totalDefects = bulkDefects.length;
    const defectsWithImages = bulkDefects.filter(defect => defect.selectedFile);

    return {
      totalDefects,
      defectsWithImagesCount: defectsWithImages.length,
      isComplete: isBulkValid()
    };
  };

  return {
    isBulkValid,
    getBulkValidationErrors,
    getValidationSummary
  };
}; 