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

    // Check if ALL defects have selected images (not just at least one)
    const defectsWithImages = bulkDefects.filter(defect => defect.selectedFile);
    const defectsWithoutImages = bulkDefects.filter(defect => !defect.selectedFile);
    
    if (defectsWithoutImages.length > 0) {
      errors.push(`Select images for ${defectsWithoutImages.length} defect${defectsWithoutImages.length !== 1 ? 's' : ''}`);
    }

    // Check for missing photo numbers
    const defectsWithoutPhotoNumbers = bulkDefects.filter(defect => !defect.photoNumber?.trim());
    if (defectsWithoutPhotoNumbers.length > 0) {
      errors.push(`Add photo numbers for ${defectsWithoutPhotoNumbers.length} defect${defectsWithoutPhotoNumbers.length !== 1 ? 's' : ''}`);
    }

    // Check for duplicate photo numbers
    const photoNumbers = bulkDefects.map(defect => defect.photoNumber?.trim()).filter(Boolean);
    const duplicatePhotoNumbers = photoNumbers.filter((number, index) => photoNumbers.indexOf(number) !== index);
    
    if (duplicatePhotoNumbers.length > 0) {
      const uniqueDuplicates = [...new Set(duplicatePhotoNumbers)];
      errors.push(`Fix duplicate photo numbers: ${uniqueDuplicates.join(', ')}`);
    }

    // Check if defects with images have descriptions
    const defectsWithoutDescriptions = defectsWithImages.filter(defect => 
      !defect.description?.trim()
    );
    if (defectsWithoutDescriptions.length > 0) {
      errors.push(`Add descriptions for ${defectsWithoutDescriptions.length} defect${defectsWithoutDescriptions.length !== 1 ? 's' : ''}`);
    }

    // Check for invalid characters in descriptions
    const defectsWithInvalidDescriptions = defectsWithImages.filter(defect => {
      if (!defect.description?.trim()) return false; // Already caught above
      return !validateDescription(defect.description).isValid;
    });
    if (defectsWithInvalidDescriptions.length > 0) {
      errors.push(`Remove slashes from ${defectsWithInvalidDescriptions.length} description${defectsWithInvalidDescriptions.length !== 1 ? 's' : ''}`);
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
    const defectsWithoutImages = bulkDefects.filter(defect => !defect.selectedFile);

    return {
      totalDefects,
      defectsWithImagesCount: defectsWithImages.length,
      defectsWithoutImagesCount: defectsWithoutImages.length,
      isComplete: isBulkValid()
    };
  };

  return {
    isBulkValid,
    getBulkValidationErrors,
    getValidationSummary
  };
}; 