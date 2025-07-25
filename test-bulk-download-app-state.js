// Test to simulate actual application state for bulk download
import { transformBulkDefectsForLambda, validateTransformedData } from './src/utils/downloadTransformers.js';

// Simulate actual application state
const mockAppState = {
  bulkDefects: [
    {
      photoNumber: '01',
      description: 'Crack in concrete',
      selectedFile: 'P1080001.jpg'
    },
    {
      photoNumber: '02',
      description: 'Spalling on column',
      selectedFile: 'P1080002.jpg'
    },
    {
      photoNumber: '03',
      description: 'Water damage',
      selectedFile: 'P1080003.jpg'
    }
  ],
  images: [
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
    },
    {
      id: 's3-test-3',
      fileName: 'P1080003.jpg',
      s3Key: '1753041306455-P1080003.jpg',
      photoNumber: '03',
      description: 'Water damage',
      preview: 'https://example.com/P1080003.jpg',
      publicUrl: 'https://mvp-labeler-storage.s3.eu-west-2.amazonaws.com/users/test@example.com/images/1753041306455-P1080003.jpg',
      userId: 'test@example.com'
    }
  ],
  formData: {
    elr: 'TEST123',
    structureNo: '456',
    date: '2025-01-20'
  }
};

console.log('🧪 TESTING BULK DOWNLOAD WITH ACTUAL APP STATE');
console.log('==============================================\n');

try {
  console.log('📝 Application state:');
  console.log('- Bulk defects:', mockAppState.bulkDefects.length);
  console.log('- Images:', mockAppState.images.length);
  console.log('- Form data:', mockAppState.formData);
  
  // Validate bulk defects have selected files
  const defectsWithImages = mockAppState.bulkDefects.filter(defect => defect.selectedFile);
  console.log('\n🔍 Validation check:');
  console.log('- Defects with images:', defectsWithImages.length);
  console.log('- All defects have selected files:', defectsWithImages.length === mockAppState.bulkDefects.length);
  
  // Test transformation
  console.log('\n🔄 Testing transformation...');
  const transformedData = transformBulkDefectsForLambda(mockAppState.bulkDefects, mockAppState.images, mockAppState.formData);
  
  console.log('\n✅ Transformation successful!');
  console.log('- Mode:', transformedData.mode);
  console.log('- Selected images:', transformedData.selectedImages.length);
  
  // Test validation
  console.log('\n🔍 Testing validation...');
  const originalData = { 
    bulkDefects: mockAppState.bulkDefects, 
    images: mockAppState.images, 
    formData: mockAppState.formData 
  };
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
      
      // Test downloading the file
      console.log('\n📥 Testing file download...');
      const downloadResponse = await fetch(result.downloadUrl);
      
      if (downloadResponse.ok) {
        const buffer = await downloadResponse.arrayBuffer();
        console.log('✅ File download successful!');
        console.log('- File size:', buffer.byteLength, 'bytes');
        console.log('- File size (KB):', Math.round(buffer.byteLength / 1024), 'KB');
        
        if (buffer.byteLength > 0) {
          console.log('✅ ZIP file contains data - bulk download is working!');
        } else {
          console.log('❌ ZIP file is empty - there might be an issue');
        }
      } else {
        console.log('❌ File download failed:', downloadResponse.status, downloadResponse.statusText);
      }
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