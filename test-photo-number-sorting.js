// Test to verify photo number sorting logic
const testImages = [
  {
    id: 's3-test-3',
    fileName: 'P1080010.jpg',
    s3Key: '1753041306460-P1080010.jpg',
    photoNumber: '',
    description: '',
    preview: 'https://example.com/P1080010.jpg',
    publicUrl: 'https://example.com/P1080010.jpg',
    userId: 'test@example.com'
  },
  {
    id: 's3-test-1',
    fileName: 'P1080001.jpg',
    s3Key: '1753041306448-P1080001.jpg',
    photoNumber: '',
    description: '',
    preview: 'https://example.com/P1080001.jpg',
    publicUrl: 'https://example.com/P1080001.jpg',
    userId: 'test@example.com'
  },
  {
    id: 's3-test-2',
    fileName: 'P1080005.jpg',
    s3Key: '1753041306450-P1080005.jpg',
    photoNumber: '',
    description: '',
    preview: 'https://example.com/P1080005.jpg',
    publicUrl: 'https://example.com/P1080005.jpg',
    userId: 'test@example.com'
  },
  {
    id: 's3-test-4',
    fileName: 'random-image.jpg',
    s3Key: '1753041306470-random-image.jpg',
    photoNumber: '',
    description: '',
    preview: 'https://example.com/random-image.jpg',
    publicUrl: 'https://example.com/random-image.jpg',
    userId: 'test@example.com'
  }
];

console.log('🧪 TESTING PHOTO NUMBER SORTING LOGIC');
console.log('=====================================\n');

console.log('📊 Original Images (unsorted):');
testImages.forEach((img, index) => {
  console.log(`${index + 1}. ${img.fileName}`);
});

// Apply the same sorting logic as in metadataStore.ts
const sortedImages = [...testImages].sort((a, b) => {
  const aFileName = a.fileName || '';
  const bFileName = b.fileName || '';
  
  // Extract photo number from filenames like P1080001, P1080005, etc.
  const extractPhotoNumber = (filename) => {
    // Look for pattern like P1080001, P1080005, etc.
    const match = filename.match(/P\d{3}00(\d+)/);
    if (match) {
      return parseInt(match[1]);
    }
    return null;
  };
  
  const aPhotoNum = extractPhotoNumber(aFileName);
  const bPhotoNum = extractPhotoNumber(bFileName);
  
  // If both have photo numbers, sort by them
  if (aPhotoNum !== null && bPhotoNum !== null) {
    return aPhotoNum - bPhotoNum; // Lowest number first
  }
  
  // If only one has a photo number, put the one without photo number last
  if (aPhotoNum !== null && bPhotoNum === null) {
    return -1; // a comes first
  }
  if (aPhotoNum === null && bPhotoNum !== null) {
    return 1; // b comes first
  }
  
  // If neither has photo numbers, fall back to timestamp sorting
  const aTimestamp = parseInt(a.s3Key?.split('-')[0] || '0');
  const bTimestamp = parseInt(b.s3Key?.split('-')[0] || '0');
  
  if (!isNaN(aTimestamp) && !isNaN(bTimestamp)) {
    return aTimestamp - bTimestamp; // Oldest first
  }
  
  // Final fallback to filename comparison
  return aFileName.localeCompare(bFileName);
});

console.log('\n📊 Sorted Images (by photo number):');
sortedImages.forEach((img, index) => {
  const photoNum = img.fileName.match(/P\d{3}00(\d+)/)?.[1] || 'N/A';
  console.log(`${index + 1}. ${img.fileName} (photo number: ${photoNum})`);
});

console.log('\n✅ VERIFICATION:');
console.log('- Original order: P1080010, P1080001, P1080005, random-image.jpg');
console.log('- Expected order: P1080001, P1080005, P1080010, random-image.jpg (by photo number)');
console.log('- Actual order:', sortedImages.map(img => img.fileName).join(', '));
console.log('- Correct:', sortedImages[0].fileName === 'P1080001.jpg' && 
            sortedImages[1].fileName === 'P1080005.jpg' && 
            sortedImages[2].fileName === 'P1080010.jpg' &&
            sortedImages[3].fileName === 'random-image.jpg');

console.log('\n📋 PHOTO NUMBER EXTRACTION TEST:');
testImages.forEach(img => {
  const match = img.fileName.match(/P\d{3}00(\d+)/);
  const photoNum = match ? match[1] : 'N/A';
  console.log(`${img.fileName} → Photo number: ${photoNum}`);
}); 