import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { transformBulkDefectsForLambda } from './src/utils/downloadTransformers.js';

const lambda = new LambdaClient({
  region: 'eu-west-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'AKIA5JMSUOLD2BUTQRRF',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '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'
  }
});

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

console.log('🧪 FINAL LAMBDA BULK TEST');
console.log('==========================\n');

console.log('📥 INPUT DATA:');
console.log('Bulk Defects:', mockBulkDefects.length);
console.log('Images:', mockImages.length);
console.log('Form Data:', mockFormData);

console.log('\n🔄 TRANSFORMING DATA...');
const transformedData = transformBulkDefectsForLambda(mockBulkDefects, mockImages, mockFormData);

console.log('\n📤 TRANSFORMED DATA:');
console.log('Selected Images:', transformedData.selectedImages.length);
console.log('Mode:', transformedData.mode);
console.log('Sample defect:', transformedData.selectedImages[0]);

console.log('\n🚀 CALLING LAMBDA...');
const payload = {
  selectedImages: transformedData.selectedImages,
  formData: transformedData.formData,
  mode: transformedData.mode
};

console.log('Payload structure:', {
  selectedImagesCount: payload.selectedImages.length,
  hasFormData: !!payload.formData,
  mode: payload.mode
});

console.log('Sample defect in payload:', {
  photoNumber: payload.selectedImages[0].photoNumber,
  description: payload.selectedImages[0].description,
  selectedFile: payload.selectedImages[0].selectedFile,
  s3Key: payload.selectedImages[0].s3Key
});

try {
  const command = new InvokeCommand({
    FunctionName: 'download-generator',
    Payload: JSON.stringify(payload)
  });

  console.log('\n⏳ Invoking Lambda...');
  const response = await lambda.send(command);
  
  console.log('✅ Lambda response received');
  console.log('Status Code:', response.StatusCode);
  
  const responsePayload = JSON.parse(new TextDecoder().decode(response.Payload));
  console.log('Response:', responsePayload);
  
  if (responsePayload.success) {
    console.log('✅ SUCCESS: Lambda processed bulk defects correctly');
    console.log('Download URL:', responsePayload.downloadUrl);
  } else {
    console.log('❌ ERROR: Lambda failed');
    console.log('Error:', responsePayload.error);
  }
  
} catch (error) {
  console.error('❌ Lambda invocation failed:', error);
}

console.log('\n🏁 FINAL TEST COMPLETE'); 