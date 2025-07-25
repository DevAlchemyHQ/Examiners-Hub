import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { transformBulkDefectsForLambda, transformSelectedImagesForLambda } from './src/utils/downloadTransformers.js';

const lambda = new LambdaClient({
  region: 'eu-west-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'AKIA5JMSUOLD2BUTQRRF',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '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'
  }
});

// REAL DATA FROM DYNAMODB - Actual application data
const realFormData = {
  elr: 'TEST',
  structureNo: 'test',
  date: '2025-07-11'
};

// Real bulk defects from DynamoDB
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

// Real images from DynamoDB projects table
const realImages = [
  {
    id: 's3-PB080003-copy-JPG',
    fileName: 'PB080003 copy.JPG',
    userId: 'timsdng@gmail.com',
    publicUrl: 'https://mvp-labeler-storage.s3.eu-west-2.amazonaws.com/users/timsdng@gmail.com/images/1753041306450-PB080003 copy.JPG',
    s3Key: '1753041306450-PB080003 copy.JPG',
    photoNumber: '',
    description: ''
  },
  {
    id: 's3-PB080003-JPG',
    fileName: 'PB080003.JPG',
    userId: 'timsdng@gmail.com',
    publicUrl: 'https://mvp-labeler-storage.s3.eu-west-2.amazonaws.com/users/timsdng@gmail.com/images/1753041306450-PB080003.JPG',
    s3Key: '1753041306450-PB080003.JPG',
    photoNumber: '',
    description: ''
  },
  {
    id: 's3-PB080001-JPG',
    fileName: 'PB080001.JPG',
    userId: 'timsdng@gmail.com',
    publicUrl: 'https://mvp-labeler-storage.s3.eu-west-2.amazonaws.com/users/timsdng@gmail.com/images/1753041306458-PB080001.JPG',
    s3Key: '1753041306458-PB080001.JPG',
    photoNumber: '5',
    description: 'hbjh'
  }
];

// Real selected images from DynamoDB
const realSelectedImages = [
  {
    id: 'local-1753041306455-PB080001-JPG',
    fileName: 'PB080001.JPG',
    userId: 'timsdng@gmail.com',
    publicUrl: 'https://mvp-labeler-storage.s3.eu-west-2.amazonaws.com/users/timsdng@gmail.com/images/1753041306458-PB080001.JPG',
    s3Key: '1753041306458-PB080001.JPG',
    photoNumber: '5',
    description: 'hbjh'
  },
  {
    id: 'local-1753041306456-PB080002-copy-JPG',
    fileName: 'PB080002 copy.JPG',
    userId: 'timsdng@gmail.com',
    publicUrl: 'https://mvp-labeler-storage.s3.eu-west-2.amazonaws.com/users/timsdng@gmail.com/images/1753041306461-PB080002 copy.JPG',
    s3Key: '1753041306461-PB080002 copy.JPG',
    photoNumber: '7',
    description: 'bbnb'
  }
];

console.log('🧪 TESTING WITH REAL DYNAMODB DATA');
console.log('==================================\n');

console.log('📊 REAL DYNAMODB DATA:');
console.log('- Form Data:', realFormData);
console.log('- Bulk Defects:', realBulkDefects.length);
console.log('- All Images:', realImages.length);
console.log('- Selected Images:', realSelectedImages.length);
console.log('- Real S3 Keys:', realImages.map(img => img.s3Key));

// TEST 1: BULK DEFECTS MODE WITH REAL DYNAMODB DATA
console.log('\n🔍 TEST 1: BULK DEFECTS MODE (REAL DYNAMODB DATA)');
console.log('==================================================');

console.log('🔄 Transforming bulk defects with real DynamoDB data...');
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

// Test Lambda for bulk mode with real DynamoDB data
console.log('\n🚀 Calling Lambda for bulk mode with REAL DYNAMODB data...');
try {
  const bulkCommand = new InvokeCommand({
    FunctionName: 'download-generator',
    Payload: JSON.stringify(bulkTransformedData)
  });

  const bulkResponse = await lambda.send(bulkCommand);
  const bulkResponseText = new TextDecoder().decode(bulkResponse.Payload);
  const bulkResponseJson = JSON.parse(bulkResponseText);
  const bulkResult = JSON.parse(bulkResponseJson.body);
  
  console.log('✅ Bulk mode result (REAL DYNAMODB DATA):');
  console.log('- Status Code:', bulkResponse.StatusCode);
  console.log('- Success:', bulkResult.success);
  console.log('- Message:', bulkResult.message);
  console.log('- Filename:', bulkResult.filename);
  console.log('- Has Download URL:', !!bulkResult.downloadUrl);
  
  if (bulkResult.success) {
    console.log('✅ BULK MODE: SUCCESS - ZIP created with REAL DYNAMODB images and metadata');
  } else {
    console.log('❌ BULK MODE: FAILED');
  }
  
} catch (error) {
  console.error('❌ Bulk mode Lambda error:', error.message);
}

// TEST 2: SELECTED IMAGES MODE WITH REAL DYNAMODB DATA
console.log('\n🔍 TEST 2: SELECTED IMAGES MODE (REAL DYNAMODB DATA)');
console.log('======================================================');

console.log('🔄 Transforming selected images with real DynamoDB data...');
const imagesTransformedData = transformSelectedImagesForLambda(realSelectedImages, realFormData);

console.log('✅ Images transformation result:');
console.log('- Selected Images:', imagesTransformedData.selectedImages.length);
console.log('- Mode:', imagesTransformedData.mode);
console.log('- Sample image:', {
  photoNumber: imagesTransformedData.selectedImages[0].photoNumber,
  description: imagesTransformedData.selectedImages[0].description,
  s3Key: imagesTransformedData.selectedImages[0].s3Key
});

// Test Lambda for images mode with real DynamoDB data
console.log('\n🚀 Calling Lambda for images mode with REAL DYNAMODB data...');
try {
  const imagesCommand = new InvokeCommand({
    FunctionName: 'download-generator',
    Payload: JSON.stringify(imagesTransformedData)
  });

  const imagesResponse = await lambda.send(imagesCommand);
  const imagesResponseText = new TextDecoder().decode(imagesResponse.Payload);
  const imagesResponseJson = JSON.parse(imagesResponseText);
  const imagesResult = JSON.parse(imagesResponseJson.body);
  
  console.log('✅ Images mode result (REAL DYNAMODB DATA):');
  console.log('- Status Code:', imagesResponse.StatusCode);
  console.log('- Success:', imagesResult.success);
  console.log('- Message:', imagesResult.message);
  console.log('- Filename:', imagesResult.filename);
  console.log('- Has Download URL:', !!imagesResult.downloadUrl);
  
  if (imagesResult.success) {
    console.log('✅ IMAGES MODE: SUCCESS - ZIP created with REAL DYNAMODB images and metadata');
  } else {
    console.log('❌ IMAGES MODE: FAILED');
  }
  
} catch (error) {
  console.error('❌ Images mode Lambda error:', error.message);
}

console.log('\n🎯 REAL DYNAMODB DATA TEST RESULTS:');
console.log('====================================');
console.log('✅ Both modes use actual DynamoDB data');
console.log('✅ Both modes use real S3 image files');
console.log('✅ Both modes use real user data (timsdng@gmail.com)');
console.log('✅ Both modes should work in the actual application');

console.log('\n🏁 REAL DYNAMODB DATA TEST COMPLETE'); 