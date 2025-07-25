import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { transformBulkDefectsForLambda, transformSelectedImagesForLambda } from './src/utils/downloadTransformers.js';

const lambda = new LambdaClient({
  region: 'eu-west-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'AKIA5JMSUOLD2BUTQRRF',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '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'
  }
});

// REAL AWS DATA - Using actual uploaded images from S3
const realFormData = {
  elr: 'REAL_TEST',
  structureNo: 'REAL_BRIDGE',
  date: '2024-01-15'
};

// Real bulk defects using actual image filenames from S3
const realBulkDefects = [
  {
    id: 'bulk-1',
    photoNumber: '01',
    description: 'Crack in concrete beam',
    selectedFile: 'PB080003.JPG'  // REAL filename from S3
  },
  {
    id: 'bulk-2',
    photoNumber: '02', 
    description: 'Spalling on column',
    selectedFile: 'PB080004.JPG'  // REAL filename from S3
  },
  {
    id: 'bulk-3',
    photoNumber: '03',
    description: 'Corrosion on rebar',
    selectedFile: 'PB080007.JPG'  // REAL filename from S3
  }
];

// Real images data using actual S3 structure
const realImages = [
  {
    id: 'local-1753041306450-PB080003.JPG',
    fileName: 'PB080003.JPG',
    userId: 'timsdng@gmail.com',
    publicUrl: 'https://mvp-labeler-storage.s3.eu-west-2.amazonaws.com/users/timsdng@gmail.com/images/1753041306450-PB080003.JPG',
    s3Key: '1753041306450-PB080003.JPG',
    photoNumber: '01',
    description: 'Crack in concrete beam'
  },
  {
    id: 'local-1753041306453-PB080004.JPG',
    fileName: 'PB080004.JPG', 
    userId: 'timsdng@gmail.com',
    publicUrl: 'https://mvp-labeler-storage.s3.eu-west-2.amazonaws.com/users/timsdng@gmail.com/images/1753041306453-PB080004.JPG',
    s3Key: '1753041306453-PB080004.JPG',
    photoNumber: '02',
    description: 'Spalling on column'
  },
  {
    id: 'local-1753041306455-PB080007.JPG',
    fileName: 'PB080007.JPG',
    userId: 'timsdng@gmail.com', 
    publicUrl: 'https://mvp-labeler-storage.s3.eu-west-2.amazonaws.com/users/timsdng@gmail.com/images/1753041306455-PB080007.JPG',
    s3Key: '1753041306455-PB080007.JPG',
    photoNumber: '03',
    description: 'Corrosion on rebar'
  }
];

// Selected images for images mode (using real data)
const selectedImageIds = ['local-1753041306450-PB080003.JPG', 'local-1753041306453-PB080004.JPG'];
const realSelectedImages = realImages.filter(img => selectedImageIds.includes(img.id));

console.log('🧪 TESTING WITH REAL AWS DATA');
console.log('=============================\n');

console.log('📊 REAL DATA:');
console.log('- Form Data:', realFormData);
console.log('- Bulk Defects:', realBulkDefects.length);
console.log('- All Images:', realImages.length);
console.log('- Selected Images:', realSelectedImages.length);
console.log('- Real S3 Keys:', realImages.map(img => img.s3Key));

// TEST 1: BULK DEFECTS MODE WITH REAL DATA
console.log('\n🔍 TEST 1: BULK DEFECTS MODE (REAL DATA)');
console.log('==========================================');

console.log('🔄 Transforming bulk defects with real data...');
const bulkTransformedData = transformBulkDefectsForLambda(realBulkDefects, realImages, realFormData);

console.log('✅ Bulk transformation result:');
console.log('- Selected Images:', bulkTransformedData.selectedImages.length);
console.log('- Mode:', bulkTransformedData.mode);
console.log('- Sample defect:', {
  photoNumber: bulkTransformedData.selectedImages[0].photoNumber,
  description: bulkTransformedData.selectedImages[0].description,
  selectedFile: bulkTransformedData.selectedImages[0].selectedFile,
  s3Key: bulkTransformedData.selectedImages[0].s3Key
});

// Test Lambda for bulk mode with real data
console.log('\n🚀 Calling Lambda for bulk mode with REAL data...');
try {
  const bulkCommand = new InvokeCommand({
    FunctionName: 'download-generator',
    Payload: JSON.stringify(bulkTransformedData)
  });

  const bulkResponse = await lambda.send(bulkCommand);
  const bulkResponseText = new TextDecoder().decode(bulkResponse.Payload);
  const bulkResponseJson = JSON.parse(bulkResponseText);
  const bulkResult = JSON.parse(bulkResponseJson.body);
  
  console.log('✅ Bulk mode result (REAL DATA):');
  console.log('- Status Code:', bulkResponse.StatusCode);
  console.log('- Success:', bulkResult.success);
  console.log('- Message:', bulkResult.message);
  console.log('- Filename:', bulkResult.filename);
  console.log('- Has Download URL:', !!bulkResult.downloadUrl);
  
  if (bulkResult.success) {
    console.log('✅ BULK MODE: SUCCESS - ZIP created with REAL images and metadata');
  } else {
    console.log('❌ BULK MODE: FAILED');
  }
  
} catch (error) {
  console.error('❌ Bulk mode Lambda error:', error.message);
}

// TEST 2: SELECTED IMAGES MODE WITH REAL DATA
console.log('\n🔍 TEST 2: SELECTED IMAGES MODE (REAL DATA)');
console.log('============================================');

console.log('🔄 Transforming selected images with real data...');
const imagesTransformedData = transformSelectedImagesForLambda(realSelectedImages, realFormData);

console.log('✅ Images transformation result:');
console.log('- Selected Images:', imagesTransformedData.selectedImages.length);
console.log('- Mode:', imagesTransformedData.mode);
console.log('- Sample image:', {
  photoNumber: imagesTransformedData.selectedImages[0].photoNumber,
  description: imagesTransformedData.selectedImages[0].description,
  s3Key: imagesTransformedData.selectedImages[0].s3Key
});

// Test Lambda for images mode with real data
console.log('\n🚀 Calling Lambda for images mode with REAL data...');
try {
  const imagesCommand = new InvokeCommand({
    FunctionName: 'download-generator',
    Payload: JSON.stringify(imagesTransformedData)
  });

  const imagesResponse = await lambda.send(imagesCommand);
  const imagesResponseText = new TextDecoder().decode(imagesResponse.Payload);
  const imagesResponseJson = JSON.parse(imagesResponseText);
  const imagesResult = JSON.parse(imagesResponseJson.body);
  
  console.log('✅ Images mode result (REAL DATA):');
  console.log('- Status Code:', imagesResponse.StatusCode);
  console.log('- Success:', imagesResult.success);
  console.log('- Message:', imagesResult.message);
  console.log('- Filename:', imagesResult.filename);
  console.log('- Has Download URL:', !!imagesResult.downloadUrl);
  
  if (imagesResult.success) {
    console.log('✅ IMAGES MODE: SUCCESS - ZIP created with REAL images and metadata');
  } else {
    console.log('❌ IMAGES MODE: FAILED');
  }
  
} catch (error) {
  console.error('❌ Images mode Lambda error:', error.message);
}

console.log('\n🏁 REAL DATA TEST COMPLETE'); 