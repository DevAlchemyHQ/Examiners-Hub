// Test script to verify validation logic for missing photo numbers
console.log('🧪 Testing validation logic for missing photo numbers...');

// Mock bulk defects with missing numbers
const mockBulkDefects = [
  {
    id: '1',
    photoNumber: '1',
    description: 'test1',
    selectedFile: 'P5020001.JPG'
  },
  {
    id: '2', 
    photoNumber: '#', // This should be detected as invalid
    description: 'test2',
    selectedFile: 'P5020002.JPG'
  },
  {
    id: '3',
    photoNumber: '3',
    description: 'test3', 
    selectedFile: 'P5020003.JPG'
  }
];

// Mock validation function (same logic as useBulkValidation)
const getBulkValidationErrors = (bulkDefects) => {
  const errors = [];

  // Check if there are any defects at all
  if (bulkDefects.length === 0) {
    errors.push('Add at least one defect');
    return errors;
  }

  // Check for missing photo numbers
  const defectsWithoutPhotoNumbers = bulkDefects.filter(defect => 
    !defect.photoNumber?.trim() || defect.photoNumber === '#'
  );
  
  if (defectsWithoutPhotoNumbers.length > 0) {
    errors.push(`Add photo numbers for ${defectsWithoutPhotoNumbers.length} defect${defectsWithoutPhotoNumbers.length !== 1 ? 's' : ''}`);
  }

  return errors;
};

const isBulkValid = (bulkDefects) => {
  const errors = getBulkValidationErrors(bulkDefects);
  return errors.length === 0;
};

// Test the validation
console.log('📋 Test data:', mockBulkDefects);
console.log('🔍 Validation errors:', getBulkValidationErrors(mockBulkDefects));
console.log('✅ Is valid:', isBulkValid(mockBulkDefects));

// Test specific cases
const defectsWithHash = mockBulkDefects.filter(d => d.photoNumber === '#');
const defectsWithEmpty = mockBulkDefects.filter(d => !d.photoNumber?.trim());
const defectsWithoutNumbers = mockBulkDefects.filter(d => !d.photoNumber?.trim() || d.photoNumber === '#');

console.log('🔍 Specific checks:');
console.log('- Defects with "#":', defectsWithHash.length);
console.log('- Defects with empty numbers:', defectsWithEmpty.length);
console.log('- Defects without valid numbers:', defectsWithoutNumbers.length);

// Expected result: Should be invalid because defect 2 has "#"
console.log('🎯 Expected: Should be INVALID (button should be disabled)');
console.log('🎯 Actual:', isBulkValid(mockBulkDefects) ? 'VALID' : 'INVALID');

if (!isBulkValid(mockBulkDefects)) {
  console.log('✅ Test PASSED: Validation correctly detects missing numbers');
} else {
  console.log('❌ Test FAILED: Validation should detect missing numbers');
} 