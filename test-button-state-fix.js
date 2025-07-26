// Test script to verify download button state logic
console.log('🧪 Testing download button state logic...');

// Mock the validation functions
const isBulkValid = (bulkDefects) => {
  const defectsWithoutPhotoNumbers = bulkDefects.filter(defect => 
    !defect.photoNumber?.trim() || defect.photoNumber === '#'
  );
  return defectsWithoutPhotoNumbers.length === 0;
};

const isValid = () => true; // Mock for images mode

// Mock component state
const viewMode = 'bulk';
const isDownloading = false;
const bulkDefects = [
  { id: '1', photoNumber: '1', description: 'test1', selectedFile: 'P5020001.JPG' },
  { id: '2', photoNumber: '#', description: 'test2', selectedFile: 'P5020002.JPG' }, // Invalid
  { id: '3', photoNumber: '3', description: 'test3', selectedFile: 'P5020003.JPG' }
];

// Calculate button state (same logic as DownloadButton component)
const isDisabled = isDownloading || 
  (viewMode === 'bulk' && !isBulkValid(bulkDefects)) || 
  (viewMode === 'images' && !isValid());

const buttonClass = isDisabled 
  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
  : 'bg-green-500 text-white hover:bg-green-600';

console.log('📋 Test data:');
console.log('- View mode:', viewMode);
console.log('- Is downloading:', isDownloading);
console.log('- Bulk defects:', bulkDefects.length);
console.log('- Defects with "#":', bulkDefects.filter(d => d.photoNumber === '#').length);

console.log('🔍 Validation results:');
console.log('- isBulkValid():', isBulkValid(bulkDefects));
console.log('- isValid():', isValid());

console.log('🎯 Button state:');
console.log('- Is disabled:', isDisabled);
console.log('- Button class:', buttonClass);
console.log('- Button color:', isDisabled ? 'GRAY (disabled)' : 'GREEN (enabled)');

// Expected: Should be disabled because defect 2 has "#"
console.log('🎯 Expected: Should be DISABLED (gray button)');
console.log('🎯 Actual:', isDisabled ? 'DISABLED' : 'ENABLED');

if (isDisabled) {
  console.log('✅ Test PASSED: Button correctly disabled for missing numbers');
} else {
  console.log('❌ Test FAILED: Button should be disabled for missing numbers');
}

// Test with valid data
console.log('\n🧪 Testing with valid data...');
const validBulkDefects = [
  { id: '1', photoNumber: '1', description: 'test1', selectedFile: 'P5020001.JPG' },
  { id: '2', photoNumber: '2', description: 'test2', selectedFile: 'P5020002.JPG' },
  { id: '3', photoNumber: '3', description: 'test3', selectedFile: 'P5020003.JPG' }
];

const isValidDisabled = isDownloading || 
  (viewMode === 'bulk' && !isBulkValid(validBulkDefects)) || 
  (viewMode === 'images' && !isValid());

console.log('✅ Valid data test:', isValidDisabled ? 'DISABLED' : 'ENABLED');
console.log('🎯 Expected: Should be ENABLED (green button)');
console.log('🎯 Actual:', isValidDisabled ? 'DISABLED' : 'ENABLED'); 