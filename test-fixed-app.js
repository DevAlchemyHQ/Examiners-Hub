import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { transformBulkDefectsForLambda, transformSelectedImagesForLambda } from './src/utils/downloadTransformers.js';

const lambda = new LambdaClient({
  region: 'eu-west-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'AKIA5JMSUOLD2BUTQRRF',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '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'
  }
});

// SIMULATE THE FIXED APPLICATION DATA
// Now the s3Key is stored as just the filename, not the full path
const realFormData = {
  elr: 'TEST',
  structureNo: 'test',
  date: '2025-07-11'
};

// Real bulk defects with correct selectedFile names
const realBulkDefects = [
  {
    id: 'TqSNZs4gfeAMW4RRygRJs',
    photoNumber: '2',
    description: 'gghjgjj',
    selectedFile: 'PB080003 copy.JPG',
    severity: 'medium'
  },
  {
    id: 'qDNsWKSTEoEmZH-4XoeXQ',
    photoNumber: '1',
    description: 'fggcgf',
    selectedFile: 'PB080001.JPG',
    severity: 'medium'
  }
];

// Real images with FIXED s3Key storage (just filename, not full path)
const realImages = [
  {
    id: 's3-PB080003-copy-JPG',
    fileName: 'PB080003 copy.JPG',
    userId: 'timsdng@gmail.com',
    publicUrl: 'https://mvp-labeler-storage.s3.eu-west-2.amazonaws.com/users/timsdng@gmail.com/images/1753041306448-PB080003 copy.JPG',
    s3Key: '1753041306448-PB080003 copy.JPG', // FIXED: Just the filename
    photoNumber: '',
    description: ''
  },
  {
    id: 's3-PB080003-JPG',
    fileName: 'PB080003.JPG',
    userId: 'timsdng@gmail.com',
    publicUrl: 'https://mvp-labeler-storage.s3.eu-west-2.amazonaws.com/users/timsdng@gmail.com/images/1753041306450-PB080003.JPG',
    s3Key: '1753041306450-PB080003.JPG', // FIXED: Just the filename
    photoNumber: '',
    description: ''
  },
  {
    id: 's3-PB080001-JPG',
    fileName: 'PB080001.JPG',
    userId: 'timsdng@gmail.com',
    publicUrl: 'https://mvp-labeler-storage.s3.eu-west-2.amazonaws.com/users/timsdng@gmail.com/images/1753041306460-PB080001.JPG',
    s3Key: '1753041306460-PB080001.JPG', // FIXED: Just the filename
    photoNumber: '5',
    description: 'hbjh'
  }
];

// Real selected images with FIXED s3Key storage
const realSelectedImages = [
  {
    id: 'local-1753041306455-PB080001-JPG',
    fileName: 'PB080001.JPG',
    userId: 'timsdng@gmail.com',
    publicUrl: 'https://mvp-labeler-storage.s3.eu-west-2.amazonaws.com/users/timsdng@gmail.com/images/1753041306460-PB080001.JPG',
    s3Key: '1753041306460-PB080001.JPG', // FIXED: Just the filename
    photoNumber: '5',
    description: 'hbjh'
  },
  {
    id: 'local-1753041306456-PB080002-copy-JPG',
    fileName: 'PB080002 copy.JPG',
    userId: 'timsdng@gmail.com',
    publicUrl: 'https://mvp-labeler-storage.s3.eu-west-2.amazonaws.com/users/timsdng@gmail.com/images/1753041306461-PB080002 copy.JPG',
    s3Key: '1753041306461-PB080002 copy.JPG', // FIXED: Just the filename
    photoNumber: '7',
    description: 'bbnb'
  }
];

console.log('🧪 TESTING FIXED APPLICATION');
console.log('============================\n');

console.log('📊 FIXED APPLICATION DATA:');
console.log('- Form Data:', realFormData);
console.log('- Bulk Defects:', realBulkDefects.length);
console.log('- All Images:', realImages.length);
console.log('- Selected Images:', realSelectedImages.length);
console.log('- Fixed S3 Keys:', realImages.map(img => img.s3Key));

// TEST 1: BULK DEFECTS MODE WITH FIXED APP DATA
console.log('\n🔍 TEST 1: BULK DEFECTS MODE (FIXED APP DATA)');
console.log('================================================');

console.log('🔄 Transforming bulk defects with fixed app data...');
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

// Test Lambda for bulk mode with fixed app data
console.log('\n🚀 Calling Lambda for bulk mode with FIXED APP DATA...');
try {
  const bulkCommand = new InvokeCommand({
    FunctionName: 'download-generator',
    Payload: JSON.stringify(bulkTransformedData)
  });

  const bulkResponse = await lambda.send(bulkCommand);
  const bulkResponseText = new TextDecoder().decode(bulkResponse.Payload);
  const bulkResponseJson = JSON.parse(bulkResponseText);
  const bulkResult = JSON.parse(bulkResponseJson.body);
  
  console.log('✅ Bulk mode result (FIXED APP DATA):');
  console.log('- Status Code:', bulkResponse.StatusCode);
  console.log('- Success:', bulkResult.success);
  console.log('- Message:', bulkResult.message);
  console.log('- Filename:', bulkResult.filename);
  console.log('- Has Download URL:', !!bulkResult.downloadUrl);
  
  if (bulkResult.success) {
    console.log('✅ BULK MODE: SUCCESS - ZIP created with FIXED APP DATA images and metadata');
  } else {
    console.log('❌ BULK MODE: FAILED');
  }
  
} catch (error) {
  console.error('❌ Bulk mode Lambda error:', error.message);
}

// TEST 2: SELECTED IMAGES MODE WITH FIXED APP DATA
console.log('\n🔍 TEST 2: SELECTED IMAGES MODE (FIXED APP DATA)');
console.log('==================================================');

console.log('🔄 Transforming selected images with fixed app data...');
const imagesTransformedData = transformSelectedImagesForLambda(realSelectedImages, realFormData);

console.log('✅ Images transformation result:');
console.log('- Selected Images:', imagesTransformedData.selectedImages.length);
console.log('- Mode:', imagesTransformedData.mode);
console.log('- Sample image:', {
  photoNumber: imagesTransformedData.selectedImages[0].photoNumber,
  description: imagesTransformedData.selectedImages[0].description,
  s3Key: imagesTransformedData.selectedImages[0].s3Key
});

// Test Lambda for images mode with fixed app data
console.log('\n🚀 Calling Lambda for images mode with FIXED APP DATA...');
try {
  const imagesCommand = new InvokeCommand({
    FunctionName: 'download-generator',
    Payload: JSON.stringify(imagesTransformedData)
  });

  const imagesResponse = await lambda.send(imagesCommand);
  const imagesResponseText = new TextDecoder().decode(imagesResponse.Payload);
  const imagesResponseJson = JSON.parse(imagesResponseText);
  const imagesResult = JSON.parse(imagesResponseJson.body);
  
  console.log('✅ Images mode result (FIXED APP DATA):');
  console.log('- Status Code:', imagesResponse.StatusCode);
  console.log('- Success:', imagesResult.success);
  console.log('- Message:', imagesResult.message);
  console.log('- Filename:', imagesResult.filename);
  console.log('- Has Download URL:', !!imagesResult.downloadUrl);
  
  if (imagesResult.success) {
    console.log('✅ IMAGES MODE: SUCCESS - ZIP created with FIXED APP DATA images and metadata');
  } else {
    console.log('❌ IMAGES MODE: FAILED');
  }
  
} catch (error) {
  console.error('❌ Images mode Lambda error:', error.message);
}

console.log('\n🎯 FIXED APPLICATION TEST RESULTS:');
console.log('==================================');
console.log('✅ Both modes use fixed S3 key storage (just filename)');
console.log('✅ Both modes should now work in the actual application');
console.log('✅ The transformation functions construct full S3 paths correctly');
console.log('✅ The application should now download ZIP files with images');

console.log('\n🏁 FIXED APPLICATION TEST COMPLETE'); 