// Test to verify validation fixes
const { validateDescription } = require('./src/utils/fileValidation.ts');

console.log('🧪 TESTING VALIDATION FIXES');
console.log('============================\n');

// Test 1: Description validation
console.log('📝 Test 1: Description validation');
const testDescriptions = [
  { desc: '', expected: false, name: 'Empty description' },
  { desc: '   ', expected: false, name: 'Whitespace only' },
  { desc: 'Valid description', expected: true, name: 'Valid description' },
  { desc: 'Description with/slash', expected: false, name: 'Description with slash' },
  { desc: 'Description with\\backslash', expected: false, name: 'Description with backslash' },
  { desc: 'Normal description', expected: true, name: 'Normal description' }
];

testDescriptions.forEach(test => {
  const isEmpty = !test.desc.trim();
  const { isValid } = validateDescription(test.desc);
  const isActuallyValid = !isEmpty && isValid;
  
  console.log(`✅ ${test.name}: ${isActuallyValid ? 'VALID' : 'INVALID'}`);
  if (isActuallyValid !== test.expected) {
    console.log(`   ❌ Expected ${test.expected ? 'VALID' : 'INVALID'}, got ${isActuallyValid ? 'VALID' : 'INVALID'}`);
  }
});

// Test 2: Validation logic simulation
console.log('\n📝 Test 2: Validation logic simulation');
const mockImages = [
  { id: '1', photoNumber: '1', description: '', isSketch: false },
  { id: '2', photoNumber: '2', description: 'Valid description', isSketch: false },
  { id: '3', photoNumber: '3', description: 'Description with/slash', isSketch: false },
  { id: '4', photoNumber: '4', description: '   ', isSketch: false },
  { id: '5', photoNumber: '', description: 'Valid description', isSketch: false }
];

const selectedImages = new Set(['1', '2', '3', '4', '5']);
const selectedImagesList = mockImages.filter(img => selectedImages.has(img.id));

// Simulate the fixed validation logic
const hasInvalidDescriptions = selectedImagesList.some(img => {
  if (img.isSketch) return false;
  return !img.description?.trim() || !validateDescription(img.description || '').isValid;
});

const hasMissingPhotoNumbers = selectedImagesList.some(img => !img.photoNumber?.trim());

const isValid = !hasInvalidDescriptions && !hasMissingPhotoNumbers;

console.log('✅ Validation result:', isValid ? 'VALID' : 'INVALID');
console.log('📊 Issues found:');
if (hasInvalidDescriptions) console.log('   - Invalid descriptions');
if (hasMissingPhotoNumbers) console.log('   - Missing photo numbers');

// Test 3: Bulk validation simulation
console.log('\n📝 Test 3: Bulk validation simulation');
const mockBulkDefects = [
  { photoNumber: '1', description: '', selectedFile: 'image1.jpg' },
  { photoNumber: '2', description: 'Valid description', selectedFile: 'image2.jpg' },
  { photoNumber: '3', description: 'Description with/slash', selectedFile: 'image3.jpg' },
  { photoNumber: '4', description: '   ', selectedFile: 'image4.jpg' }
];

const defectsWithImages = mockBulkDefects.filter(defect => defect.selectedFile);
const defectsWithoutDescriptions = defectsWithImages.filter(defect => !defect.description?.trim());
const defectsWithInvalidDescriptions = defectsWithImages.filter(defect => {
  if (!defect.description?.trim()) return false;
  return !validateDescription(defect.description).isValid;
});

console.log('✅ Bulk validation issues:');
if (defectsWithoutDescriptions.length > 0) {
  console.log(`   - ${defectsWithoutDescriptions.length} defect(s) without descriptions`);
}
if (defectsWithInvalidDescriptions.length > 0) {
  console.log(`   - ${defectsWithInvalidDescriptions.length} defect(s) with invalid characters`);
}

console.log('\n✅ VALIDATION FIXES TEST COMPLETED');
console.log('📋 Summary: Download button should now properly validate descriptions'); 