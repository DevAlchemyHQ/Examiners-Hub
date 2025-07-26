// Test Debug Issues
console.log('🧪 Testing Debug Issues...\n');

// Mock the bulk defects data with missing photo numbers
const mockBulkDefects = [
  {
    id: 'defect1',
    photoNumber: '',  // Missing photo number!
    description: 'First defect',
    selectedFile: 'P5020001.JPG'
  },
  {
    id: 'defect2', 
    photoNumber: '2',
    description: 'Second defect',
    selectedFile: 'P5020002.JPG'
  },
  {
    id: 'defect3',
    photoNumber: '3',
    description: 'Third defect',
    selectedFile: 'P5020003.JPG'
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
  console.log('📋 Defects without photo numbers:', defectsWithoutPhotoNumbers.map(d => d.id));
  
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
  console.log(`Defect ${index + 1}: Photo Number "${defect.photoNumber || 'EMPTY'}", Description "${defect.description}"`);
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

console.log('\n📋 Issues to Fix:');
console.log('==================');
console.log('1. ❌ Plus button not showing - Check if onQuickAdd prop is passed');
console.log('2. ❌ Download button not disabling for missing numbers - Check validation state');
console.log('3. ❌ Selected images showing duplicate numbering - Check display logic');

console.log('\n💡 Debug Steps:');
console.log('===============');
console.log('- Check if onQuickAdd prop is being passed to DefectTile');
console.log('- Check if validation state is being updated properly');
console.log('- Check if selected images are using correct numbering logic');
console.log('- Check browser console for any errors'); 