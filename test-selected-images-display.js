// Test Selected Images Display Logic
console.log('🧪 Testing Selected Images Display Logic...\n');

// Mock the bulk defects data (matching the screenshot scenario)
const mockBulkDefects = [
  {
    id: 'defect1',
    photoNumber: '2',
    description: 'hgbhjgh',
    selectedFile: 'P5020002.JPG'
  },
  {
    id: 'defect2', 
    photoNumber: '1',
    description: 'nm,n,m',
    selectedFile: 'P5020002.JPG'  // Same file as defect1!
  }
];

// Mock the images data
const mockImages = [
  {
    id: 'img1',
    fileName: 'P5020002.JPG',
    preview: 'data:image/...',
    file: { name: 'P5020002.JPG' }
  }
];

// Current logic (what's happening now)
console.log('📋 Current Logic Analysis:');
console.log('==========================');

// Count defects with images
const defectsWithImagesCount = mockBulkDefects.filter(d => d.selectedFile).length;
console.log(`✅ Defects with images: ${defectsWithImagesCount}`);

// Count unique images selected
const uniqueSelectedFiles = [...new Set(mockBulkDefects.map(d => d.selectedFile).filter(Boolean))];
console.log(`✅ Unique selected files: ${uniqueSelectedFiles.length} (${uniqueSelectedFiles.join(', ')})`);

// Current filtering logic
const selectedImages = mockImages.filter(img => 
  mockBulkDefects.some(d => d.selectedFile === (img.fileName || img.file?.name || ''))
);
console.log(`✅ Images displayed: ${selectedImages.length}`);

console.log('\n📋 Defect Details:');
console.log('==================');
mockBulkDefects.forEach((defect, index) => {
  console.log(`Defect ${index + 1}:`);
  console.log(`  - ID: ${defect.id}`);
  console.log(`  - Photo Number: ${defect.photoNumber}`);
  console.log(`  - Description: ${defect.description}`);
  console.log(`  - Selected File: ${defect.selectedFile}`);
});

console.log('\n🎯 Issue Identified:');
console.log('====================');
console.log('❌ Both defects are selecting the same image file (P5020002.JPG)');
console.log('❌ Selected images section only shows unique images, not unique defect-image pairs');
console.log('❌ This creates a mismatch between defect count and displayed images');

console.log('\n💡 Solutions:');
console.log('==============');
console.log('1. Show all defect-image associations, even if same image');
console.log('2. Add visual indicators to distinguish between different defects using same image');
console.log('3. Update the display logic to show defect-specific information');

console.log('\n🔧 Recommended Fix:');
console.log('===================');
console.log('- Modify the selected images display to show each defect-image pair');
console.log('- Add defect photo number and description to each image card');
console.log('- Ensure the count matches the actual number of defect-image associations'); 