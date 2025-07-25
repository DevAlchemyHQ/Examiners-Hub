import { transformBulkDefectsForLambda, transformSelectedImagesForLambda } from './src/utils/downloadTransformers.js';

// Test data that matches the actual application
const testFormData = {
  elr: 'TEST',
  structureNo: 'test',
  date: '2025-07-11'
};

const testBulkDefects = [
  {
    id: 'TqSNZs4gfeAMW4RRygRJs',
    photoNumber: '2',
    description: 'gghjgjj',
    selectedFile: 'PB080003 copy.JPG',
    severity: 'medium'
  }
];

const testImages = [
  {
    id: 's3-PB080003-copy-JPG',
    fileName: 'PB080003 copy.JPG',
    userId: 'timsdng@gmail.com',
    publicUrl: 'https://mvp-labeler-storage.s3.eu-west-2.amazonaws.com/users/timsdng@gmail.com/images/1753041306448-PB080003 copy.JPG',
    s3Key: '1753041306448-PB080003 copy.JPG',
    photoNumber: '',
    description: ''
  }
];

console.log('🔍 DEBUGGING PUBLICURL EXTRACTION IN TRANSFORMATION');
console.log('===================================================\n');

console.log('📊 Test Data:');
console.log('- publicUrl:', testImages[0].publicUrl);
console.log('- s3Key:', testImages[0].s3Key);
console.log('- Has publicUrl:', !!testImages[0].publicUrl);
console.log('- publicUrl.trim() !== "":', testImages[0].publicUrl.trim() !== '');

// Test the transformation function
console.log('\n🔄 Testing transformation function...');
try {
  const result = transformBulkDefectsForLambda(testBulkDefects, testImages, testFormData);
  console.log('✅ Transformation successful');
  console.log('- Selected Images:', result.selectedImages.length);
  console.log('- Sample s3Key:', result.selectedImages[0].s3Key);
} catch (error) {
  console.error('❌ Transformation failed:', error);
} 