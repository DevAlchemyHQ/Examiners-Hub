// Test Duplicate Photo Number Validation
console.log('🧪 Testing Duplicate Photo Number Validation...\n');

// Mock the bulk defects data (matching the screenshot scenario)
const mockBulkDefects = [
  {
    id: 'defect1',
    photoNumber: '4',
    description: 'bhhh',
    selectedFile: 'P5020002.JPG'
  },
  {
    id: 'defect2', 
    photoNumber: '4',  // Duplicate!
    description: 'kmkmk',
    selectedFile: 'P5020002.JPG'
  },
  {
    id: 'defect3',
    photoNumber: '5',
    description: 'nmm',
    selectedFile: 'P5020013.JPG'
  }
];

// Mock the validation function
function getBulkValidationErrors(bulkDefects) {
  const errors = [];

  // Check if there are any defects at all
  if (bulkDefects.length === 0) {
    errors.push('Add at least one defect');
    return errors;
  }

  // Check if ALL defects have selected images
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
  console.log('📋 Photo numbers found:', photoNumbers);
  
  const duplicatePhotoNumbers = photoNumbers.filter((number, index) => photoNumbers.indexOf(number) !== index);
  console.log('📋 Duplicate photo numbers detected:', duplicatePhotoNumbers);
  
  if (duplicatePhotoNumbers.length > 0) {
    const uniqueDuplicates = [...new Set(duplicatePhotoNumbers)];
    errors.push(`Fix duplicate photo numbers: ${uniqueDuplicates.join(', ')}`);
  }

  return errors;
}

function isBulkValid(bulkDefects) {
  const errors = getBulkValidationErrors(bulkDefects);
  return errors.length === 0;
}

// Test the validation
console.log('📋 Test Data:');
console.log('==============');
mockBulkDefects.forEach((defect, index) => {
  console.log(`Defect ${index + 1}: Photo Number "${defect.photoNumber}", Description "${defect.description}"`);
});

console.log('\n📋 Validation Results:');
console.log('======================');
const errors = getBulkValidationErrors(mockBulkDefects);
const isValid = isBulkValid(mockBulkDefects);

console.log('✅ Errors found:', errors.length);
errors.forEach((error, index) => {
  console.log(`  ${index + 1}. ${error}`);
});

console.log(`\n🎯 Is Valid: ${isValid ? '✅ YES' : '❌ NO'}`);

console.log('\n📋 Expected Behavior:');
console.log('=====================');
console.log('❌ Should detect duplicate photo number "4"');
console.log('❌ Should return validation error');
console.log('❌ Should make download button disabled');

console.log('\n💡 If validation is not working:');
console.log('================================');
console.log('- Check if the validation hook is being called correctly');
console.log('- Check if the download button is using the correct validation state');
console.log('- Check if there are any caching issues with the validation state'); 