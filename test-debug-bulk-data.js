// Debug test to check actual data structure
import { transformBulkDefectsForLambda } from './src/utils/downloadTransformers.js';

// Mock data that matches the actual application
const mockBulkDefects = [
  {
    id: '1',
    photoNumber: '01',
    description: 'Crack in concrete',
    selectedFile: 'IMG_001.jpg'
  },
  {
    id: '2', 
    photoNumber: '02',
    description: 'Spalling',
    selectedFile: 'IMG_002.jpg'
  }
];

const mockImages = [
  {
    id: 'local-1234567890-IMG_001.jpg',
    fileName: 'IMG_001.jpg',
    userId: 'test@example.com',
    publicUrl: 'https://mvp-labeler-storage.s3.eu-west-2.amazonaws.com/users/test@example.com/images/1234567890-IMG_001.jpg',
    s3Key: '1234567890-IMG_001.jpg'
  },
  {
    id: 'local-1234567891-IMG_002.jpg', 
    fileName: 'IMG_002.jpg',
    userId: 'test@example.com',
    publicUrl: 'https://mvp-labeler-storage.s3.eu-west-2.amazonaws.com/users/test@example.com/images/1234567891-IMG_002.jpg',
    s3Key: '1234567891-IMG_002.jpg'
  }
];

const mockFormData = {
  elr: 'TEST123',
  structureNo: 'BRIDGE01',
  date: '2024-01-15'
};

console.log('🔍 DEBUGGING BULK DATA STRUCTURE');
console.log('================================\n');

console.log('📥 INPUT DATA:');
console.log('Bulk Defects:', JSON.stringify(mockBulkDefects, null, 2));
console.log('Images:', JSON.stringify(mockImages.map(img => ({
  id: img.id,
  fileName: img.fileName,
  userId: img.userId,
  s3Key: img.s3Key
})), null, 2));
console.log('Form Data:', JSON.stringify(mockFormData, null, 2));

console.log('\n🔄 TRANSFORMING DATA...');
const transformedData = transformBulkDefectsForLambda(mockBulkDefects, mockImages, mockFormData);

console.log('\n📤 OUTPUT DATA:');
console.log('Transformed Data:', JSON.stringify(transformedData, null, 2));

console.log('\n🔍 CHECKING LAMBDA COMPATIBILITY:');
transformedData.selectedImages.forEach((defect, index) => {
  console.log(`\nDefect ${index + 1}:`);
  console.log(`- photoNumber: ${defect.photoNumber}`);
  console.log(`- description: ${defect.description}`);
  console.log(`- selectedFile: ${defect.selectedFile}`);
  console.log(`- s3Key: ${defect.s3Key}`);
  console.log(`- filename: ${defect.filename}`);
});

console.log('\n✅ DEBUG COMPLETE'); 