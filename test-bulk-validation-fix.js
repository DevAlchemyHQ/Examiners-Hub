// Test to verify the new bulk validation logic

// Mock the useMetadataStore
const mockBulkDefects = [
  {
    photoNumber: '01',
    description: 'Crack in concrete',
    selectedFile: 'P1080001.jpg'
  },
  {
    photoNumber: '02',
    description: 'Spalling on column',
    selectedFile: null // Missing image
  },
  {
    photoNumber: '01', // Duplicate photo number
    description: 'Water damage',
    selectedFile: 'P1080003.jpg'
  },
  {
    photoNumber: '04',
    description: '', // Missing description
    selectedFile: 'P1080004.jpg'
  }
];

const mockImages = [
  {
    id: 's3-test-1',
    fileName: 'P1080001.jpg',
    s3Key: '1753041306448-P1080001.jpg',
    photoNumber: '01',
    description: 'Crack in concrete',
    preview: 'https://example.com/P1080001.jpg',
    publicUrl: 'https://mvp-labeler-storage.s3.eu-west-2.amazonaws.com/users/test@example.com/images/1753041306448-P1080001.jpg',
    userId: 'test@example.com'
  },
  {
    id: 's3-test-3',
    fileName: 'P1080003.jpg',
    s3Key: '1753041306455-P1080003.jpg',
    photoNumber: '03',
    description: 'Water damage',
    preview: 'https://example.com/P1080003.jpg',
    publicUrl: 'https://mvp-labeler-storage.s3.eu-west-2.amazonaws.com/users/test@example.com/images/1753041306455-P1080003.jpg',
    userId: 'test@example.com'
  },
  {
    id: 's3-test-4',
    fileName: 'P1080004.jpg',
    s3Key: '1753041306460-P1080004.jpg',
    photoNumber: '04',
    description: '',
    preview: 'https://example.com/P1080004.jpg',
    publicUrl: 'https://mvp-labeler-storage.s3.eu-west-2.amazonaws.com/users/test@example.com/images/1753041306460-P1080004.jpg',
    userId: 'test@example.com'
  }
];

const mockFormData = {
  elr: 'TEST123',
  structureNo: '456',
  date: '2025-01-20'
};

// Mock the useMetadataStore hook
const mockUseMetadataStore = {
  bulkDefects: mockBulkDefects,
  images: mockImages,
  formData: mockFormData
};

// Simulate the validation logic
function getBulkValidationErrors() {
  const errors = [];
  const { bulkDefects, images, formData } = mockUseMetadataStore;

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
}

function isBulkValid() {
  const errors = getBulkValidationErrors();
  return errors.length === 0;
}

console.log('🧪 TESTING BULK VALIDATION FIX');
console.log('==============================\n');

console.log('📝 Test data:');
console.log('- Bulk defects:', mockBulkDefects.length);
console.log('- Images:', mockImages.length);
console.log('- Form data:', mockFormData);

console.log('\n🔍 Validation results:');
const errors = getBulkValidationErrors();
const isValid = isBulkValid();

console.log('- Is valid:', isValid);
console.log('- Error count:', errors.length);
console.log('- Errors:');
errors.forEach((error, index) => {
  console.log(`  ${index + 1}. ${error}`);
});

console.log('\n📊 Defect analysis:');
const defectsWithImages = mockBulkDefects.filter(defect => defect.selectedFile);
const defectsWithoutImages = mockBulkDefects.filter(defect => !defect.selectedFile);
const photoNumbers = mockBulkDefects.map(defect => defect.photoNumber?.trim()).filter(Boolean);
const duplicatePhotoNumbers = photoNumbers.filter((number, index) => photoNumbers.indexOf(number) !== index);

console.log('- Defects with images:', defectsWithImages.length);
console.log('- Defects without images:', defectsWithoutImages.length);
console.log('- Duplicate photo numbers:', [...new Set(duplicatePhotoNumbers)]);

console.log('\n✅ Expected behavior:');
console.log('- Button should be RED (disabled) when there are validation errors');
console.log('- Should show specific error messages for missing images and duplicates');
console.log('- Should only turn GREEN when ALL issues are resolved'); 