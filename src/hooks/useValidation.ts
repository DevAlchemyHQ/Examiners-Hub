import { useMetadataStore } from '../store/metadataStore';
import { validateDescription } from '../utils/fileValidation';

export const useValidation = () => {
  const { images, selectedImages, formData, instanceMetadata } = useMetadataStore();

  const isValid = () => {
    // Basic form validation
    if (!formData.elr?.trim() || !formData.structureNo?.trim() || !formData.date?.trim()) return false;
    
    // Must have selected images
    if (selectedImages.length === 0) return false;
    
    // Get all instance metadata for selected images
    const instancePhotoNumbers: string[] = [];
    const instanceDescriptions: string[] = [];
    let hasInvalidDescriptions = false;
    
    selectedImages.forEach((selectedId, index) => {
      const instanceId = `${selectedId}-${index}`;
      const instanceData = instanceMetadata[instanceId];
      
      if (instanceData?.photoNumber?.trim()) {
        instancePhotoNumbers.push(instanceData.photoNumber.trim());
      }
      
      if (instanceData?.description?.trim()) {
        const description = instanceData.description.trim();
        instanceDescriptions.push(description);
        
        // Check for invalid characters in descriptions
        const { isValid } = validateDescription(description);
        if (!isValid) {
          hasInvalidDescriptions = true;
        }
      }
    });
    
    // Check if all instances have photo numbers and descriptions
    const hasMissingPhotoNumbers = instancePhotoNumbers.length < selectedImages.length;
    const hasMissingDescriptions = instanceDescriptions.length < selectedImages.length;
    
    // Check for duplicate photo numbers (allow flexible numbering like 1, 1.1, 1a)
    const hasDuplicatePhotoNumbers = false; // We allow flexible duplicates now
    
    return !hasMissingPhotoNumbers && !hasMissingDescriptions && !hasInvalidDescriptions;
  };

  const getValidationErrors = () => {
    const errors: string[] = [];
    
    if (!formData.elr?.trim()) errors.push('Enter ELR');
    if (!formData.structureNo?.trim()) errors.push('Enter Structure No');
    if (!formData.date?.trim()) errors.push('Select Date');
    
    if (selectedImages.length === 0) {
      errors.push('Select at least one image');
    } else {
      // Check for missing photo numbers and descriptions in instances
      const missingPhotoNumbers = [];
      const missingDescriptions = [];
      const invalidDescriptions = [];
      
      selectedImages.forEach((selectedId, index) => {
        const instanceId = `${selectedId}-${index}`;
        const instanceData = instanceMetadata[instanceId];
        
        if (!instanceData?.photoNumber?.trim()) {
          missingPhotoNumbers.push(index + 1);
        }
        
        if (!instanceData?.description?.trim()) {
          missingDescriptions.push(index + 1);
        } else {
          // Check for invalid characters in descriptions
          const { isValid, invalidChars } = validateDescription(instanceData.description.trim());
          if (!isValid) {
            invalidDescriptions.push({
              instance: index + 1,
              invalidChars: invalidChars
            });
          }
        }
      });
      
      if (missingPhotoNumbers.length > 0) {
        errors.push(`Add photo numbers for instances: ${missingPhotoNumbers.join(', ')}`);
      }
      
      if (missingDescriptions.length > 0) {
        errors.push(`Add descriptions for instances: ${missingDescriptions.join(', ')}`);
      }
      
      if (invalidDescriptions.length > 0) {
        invalidDescriptions.forEach(({ instance, invalidChars }) => {
          errors.push(`Instance ${instance}: Remove invalid characters (${invalidChars.join(', ')}) from description`);
        });
      }
    }
    
    return errors;
  };

  return {
    isValid,
    getValidationErrors,
  };
};