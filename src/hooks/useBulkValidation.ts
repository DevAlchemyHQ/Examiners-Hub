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

    // Check for missing or invalid defect numbers
    const defectsWithInvalidNumbers = bulkDefects.filter(
      defect => !defect.photoNumber?.trim() || !/^\d+[a-zA-Z]*$/.test(defect.photoNumber)
    );
    if (defectsWithInvalidNumbers.length > 0) {
      const defectNumbers = defectsWithInvalidNumbers.map(d => d.photoNumber || '(blank)').join(', ');
      errors.push(`Add valid numbers to defects: ${defectNumbers}`);
    }

    // Check if ALL defects have selected images
    const defectsWithoutImages = bulkDefects.filter(defect => !defect.selectedFile);
    if (defectsWithoutImages.length > 0) {
      const defectNumbers = defectsWithoutImages.map(d => d.photoNumber || '(blank)').join(', ');
      errors.push(`Select images for defects: ${defectNumbers}`);
    }

    // Check if ALL defects have descriptions
    const defectsWithoutDescriptions = bulkDefects.filter(defect => !defect.description?.trim());
    if (defectsWithoutDescriptions.length > 0) {
      const defectNumbers = defectsWithoutDescriptions.map(d => d.photoNumber || '(blank)').join(', ');
      errors.push(`Add descriptions to defects: ${defectNumbers}`);
    }

    // Check for invalid characters in descriptions
    const defectsWithInvalidChars = bulkDefects.filter(defect => {
      if (!defect.description?.trim()) return false;
      const { isValid } = validateDescription(defect.description);
      return !isValid;
    });

    if (defectsWithInvalidChars.length > 0) {
      const defectNumbers = defectsWithInvalidChars.map(d => d.photoNumber || '(blank)').join(', ');
      errors.push(`Remove special characters (/ or \\) from defects: ${defectNumbers}`);
    }

    // Check for duplicate photo numbers
    const photoNumbers = bulkDefects.map(d => d.photoNumber);
    const duplicates = photoNumbers.filter((number, index) => 
      photoNumbers.indexOf(number) !== index
    );
    
    if (duplicates.length > 0) {
      const uniqueDuplicates = [...new Set(duplicates)];
      errors.push(`Fix duplicate defect numbers: ${uniqueDuplicates.join(', ')}`);
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
    const defectsWithDescriptions = bulkDefects.filter(d => d.description?.trim()).length;
    const defectsWithValidDescriptions = bulkDefects.filter(d => {
      if (!d.description?.trim()) return false;
      const { isValid } = validateDescription(d.description);
      return isValid;
    }).length;
    const defectsWithValidNumbers = bulkDefects.filter(d => d.photoNumber?.trim() && /^\d+[a-zA-Z]*$/.test(d.photoNumber)).length;

    return {
      totalDefects,
      defectsWithImagesCount: defectsWithImages.length,
      defectsWithDescriptions,
      defectsWithValidDescriptions,
      defectsWithValidNumbers,
      isComplete: isBulkValid()
    };
  };

  return {
    isBulkValid,
    getBulkValidationErrors,
    getValidationSummary
  };
}; 