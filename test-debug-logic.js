// Test to debug the transformation logic
const testImage = {
  id: 's3-PB080003-copy-JPG',
  fileName: 'PB080003 copy.JPG',
  userId: 'timsdng@gmail.com',
  publicUrl: 'https://mvp-labeler-storage.s3.eu-west-2.amazonaws.com/users/timsdng@gmail.com/images/1753041306448-PB080003 copy.JPG',
  s3Key: '1753041306448-PB080003 copy.JPG',
  photoNumber: '',
  description: ''
};

console.log('🔍 DEBUGGING TRANSFORMATION LOGIC');
console.log('==================================\n');

console.log('📊 Test Image:');
console.log('- publicUrl:', testImage.publicUrl);
console.log('- s3Key:', testImage.s3Key);

// Test the transformation logic
let s3Key;

// First, check if the image has a publicUrl (most reliable)
if (testImage.publicUrl) {
  // Extract S3 key from publicUrl (most reliable method)
  // publicUrl format: https://bucket.s3.region.amazonaws.com/users/email/images/timestamp-filename
  const url = new URL(testImage.publicUrl);
  s3Key = decodeURIComponent(url.pathname.substring(1)); // Remove leading slash and decode URL
  console.log('✅ Extracted S3 key from publicUrl:', s3Key);
} else if (testImage.s3Key) {
  // Fallback to stored s3Key
  const userId = testImage.userId || 'anonymous';
  s3Key = `users/${userId}/images/${testImage.s3Key}`;
  console.log('⚠️ Using stored s3Key:', s3Key);
} else {
  // Final fallback to constructed S3 key
  const userId = testImage.userId || 'anonymous';
  s3Key = `users/${userId}/images/${testImage.s3Key || testImage.fileName || 'unknown'}`;
  console.log('❌ Constructed S3 key fallback:', s3Key);
}

console.log('\n🎯 RESULT:');
console.log('- Final s3Key:', s3Key);
console.log('- Should be: users/timsdng@gmail.com/images/1753041306448-PB080003 copy.JPG');
console.log('- Matches:', s3Key === 'users/timsdng@gmail.com/images/1753041306448-PB080003 copy.JPG');

console.log('\n🔍 LOGIC ANALYSIS:');
console.log('- Has publicUrl:', !!testImage.publicUrl);
console.log('- Has s3Key:', !!testImage.s3Key);
console.log('- publicUrl should be used first:', !!testImage.publicUrl);
console.log('- But s3Key is also present, so it might be used instead'); 