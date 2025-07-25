// Test to verify image sorting logic
const testImages = [
  {
    id: 's3-test-3',
    fileName: 'test3.jpg',
    s3Key: '1753041306460-test3.jpg',
    photoNumber: '',
    description: '',
    preview: 'https://example.com/test3.jpg',
    publicUrl: 'https://example.com/test3.jpg',
    userId: 'test@example.com'
  },
  {
    id: 's3-test-1',
    fileName: 'test1.jpg',
    s3Key: '1753041306448-test1.jpg',
    photoNumber: '',
    description: '',
    preview: 'https://example.com/test1.jpg',
    publicUrl: 'https://example.com/test1.jpg',
    userId: 'test@example.com'
  },
  {
    id: 's3-test-2',
    fileName: 'test2.jpg',
    s3Key: '1753041306450-test2.jpg',
    photoNumber: '',
    description: '',
    preview: 'https://example.com/test2.jpg',
    publicUrl: 'https://example.com/test2.jpg',
    userId: 'test@example.com'
  }
];

console.log('🧪 TESTING IMAGE SORTING LOGIC');
console.log('================================\n');

console.log('📊 Original Images (unsorted):');
testImages.forEach((img, index) => {
  console.log(`${index + 1}. ${img.fileName} (timestamp: ${img.s3Key.split('-')[0]})`);
});

// Apply the same sorting logic as in metadataStore.ts
const sortedImages = [...testImages].sort((a, b) => {
  // Extract timestamp from s3Key (format: timestamp-filename)
  const aTimestamp = parseInt(a.s3Key.split('-')[0]);
  const bTimestamp = parseInt(b.s3Key.split('-')[0]);
  
  if (!isNaN(aTimestamp) && !isNaN(bTimestamp)) {
    return aTimestamp - bTimestamp; // Oldest first (ascending order)
  }
  
  // Fallback to filename comparison if timestamp extraction fails
  return (a.fileName || '').localeCompare(b.fileName || '');
});

console.log('\n📊 Sorted Images (oldest first):');
sortedImages.forEach((img, index) => {
  console.log(`${index + 1}. ${img.fileName} (timestamp: ${img.s3Key.split('-')[0]})`);
});

console.log('\n✅ VERIFICATION:');
console.log('- Original order: test3, test1, test2');
console.log('- Expected order: test1, test2, test3 (by timestamp)');
console.log('- Actual order:', sortedImages.map(img => img.fileName).join(', '));
console.log('- Correct:', sortedImages[0].fileName === 'test1.jpg' && 
            sortedImages[1].fileName === 'test2.jpg' && 
            sortedImages[2].fileName === 'test3.jpg'); 