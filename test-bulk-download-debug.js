// Test to debug bulk download functionality
import { transformBulkDefectsForLambda, validateTransformedData } from './src/utils/downloadTransformers.js';

// Mock data for testing
const mockBulkDefects = [
  {
    photoNumber: '01',
    description: 'Crack in concrete',
    selectedFile: 'P1080001.jpg'
  },
  {
    photoNumber: '02', 
    description: 'Spalling on column',
    selectedFile: 'P1080002.jpg'
  }
];

const mockImages = [
  {
    id: 's3-test-1',
    fileName: 'P1080001.jpg',
    s3Key: '1753041306448-P1080001.jpg',
    photoNumber: '01',
    description: 'Crack in concrete',
    preview: 'https://example.com/P1080001.jpg',
    publicUrl: 'https://mvp-labeler-storage.s3.eu-west-2.amazonaws.com/users/test@example.com/images/1753041306448-P1080001.jpg',
    userId: 'test@example.com'
  },
  {
    id: 's3-test-2',
    fileName: 'P1080002.jpg', 
    s3Key: '1753041306450-P1080002.jpg',
    photoNumber: '02',
    description: 'Spalling on column',
    preview: 'https://example.com/P1080002.jpg',
    publicUrl: 'https://mvp-labeler-storage.s3.eu-west-2.amazonaws.com/users/test@example.com/images/1753041306450-P1080002.jpg',
    userId: 'test@example.com'
  }
];

const mockFormData = {
  elr: 'TEST123',
  structureNo: '456',
  date: '2025-01-20'
};

async function testBulkDownload() {
  console.log('🧪 TESTING BULK DOWNLOAD TRANSFORMATION');
  console.log('=====================================\n');

  try {
    console.log('📝 Input data:');
    console.log('- Bulk defects:', mockBulkDefects.length);
    console.log('- Images:', mockImages.length);
    console.log('- Form data:', mockFormData);
    
    // Test transformation
    console.log('\n🔄 Testing transformation...');
    const transformedData = transformBulkDefectsForLambda(mockBulkDefects, mockImages, mockFormData);
    
    console.log('\n✅ Transformation successful!');
    console.log('- Mode:', transformedData.mode);
    console.log('- Selected images:', transformedData.selectedImages.length);
    
    console.log('\n📋 Transformed data sample:');
    console.log(JSON.stringify(transformedData.selectedImages[0], null, 2));
    
    // Test validation
    console.log('\n🔍 Testing validation...');
    const originalData = { bulkDefects: mockBulkDefects, images: mockImages, formData: mockFormData };
    const isValid = validateTransformedData(originalData, transformedData, 'bulk');
    
    console.log('✅ Validation result:', isValid);
    
    // Test API call
    console.log('\n🚀 Testing API call...');
    const response = await fetch('http://localhost:3001/api/download', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transformedData)
    });
    
    console.log('📡 API Response status:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ API Response:', result);
      
      if (result.success) {
        console.log('🎉 BULK DOWNLOAD SUCCESS!');
        console.log('- Download URL:', result.downloadUrl);
        console.log('- Filename:', result.filename);
        console.log('- Message:', result.message);
      } else {
        console.log('❌ API returned error:', result.error);
      }
    } else {
      const errorText = await response.text();
      console.log('❌ API Error:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testBulkDownload(); 