// Test Real Lambda Download
// This script tests the actual Lambda endpoint to verify download packages

console.log('🧪 Testing Real Lambda Download...\n');

// Import the actual API config
const { getFullApiUrl } = require('./src/utils/apiConfig.js');

// Test data for realistic scenarios
const testFormData = {
  elr: 'TEST123',
  structureNo: '001',
  date: '2024-01-15'
};

const testImages = [
  {
    id: 'img1',
    fileName: 'photo1.jpg',
    file: { name: 'photo1.jpg' },
    photoNumber: '1',
    description: 'Crack in wall',
    publicUrl: 'https://exametry-app.s3.amazonaws.com/users/test@email.com/images/1705123456789-photo1.jpg',
    isSketch: false
  },
  {
    id: 'img2',
    fileName: 'photo2.jpg',
    file: { name: 'photo2.jpg' },
    photoNumber: '2',
    description: 'Water damage',
    publicUrl: 'https://exametry-app.s3.amazonaws.com/users/test@email.com/images/1705123456790-photo2.jpg',
    isSketch: false
  }
];

const testSelectedImages = [testImages[0], testImages[1]];

const testBulkDefects = [
  {
    id: 'defect1',
    photoNumber: '1',
    description: 'Crack in wall',
    selectedFile: 'photo1.jpg'
  },
  {
    id: 'defect2',
    photoNumber: '2',
    description: 'Water damage',
    selectedFile: 'photo2.jpg'
  }
];

// Transform functions (same as the app)
function transformSelectedImagesForLambda(selectedImages, formData) {
  console.log('🔄 Transforming selected images for Lambda...');
  
  const unifiedImages = selectedImages.map((image, index) => {
    let s3Key;
    
    if (image.publicUrl && image.publicUrl.trim() !== '') {
      try {
        const url = new URL(image.publicUrl);
        s3Key = decodeURIComponent(url.pathname.substring(1));
        console.log('Extracted S3 key from publicUrl:', s3Key);
        
        if (!s3Key.includes('users/') || !s3Key.includes('/images/')) {
          console.warn('Extracted S3 key format looks incorrect:', s3Key);
          const pathParts = url.pathname.split('/');
          if (pathParts.length >= 4) {
            const emailIndex = pathParts.findIndex(part => part.includes('@'));
            if (emailIndex !== -1 && emailIndex + 2 < pathParts.length) {
              s3Key = `${pathParts[emailIndex]}/${pathParts[emailIndex + 1]}/${pathParts[emailIndex + 2]}/${pathParts.slice(emailIndex + 3).join('/')}`;
              console.log('Reconstructed S3 key:', s3Key);
            }
          }
        }
      } catch (error) {
        console.error('Error parsing publicUrl:', error);
        s3Key = `users/test@email.com/images/${image.file?.name || 'unknown'}`;
      }
    } else {
      s3Key = `users/test@email.com/images/${image.file?.name || 'unknown'}`;
    }
    
    return {
      id: image.id,
      photoNumber: image.photoNumber || (index + 1).toString(),
      description: image.description || 'LM',
      s3Key: s3Key,
      filename: image.file?.name || image.fileName,
      publicUrl: image.publicUrl
    };
  });
  
  console.log('✅ Selected images transformed:', unifiedImages.length);
  console.log('Sample transformed image:', unifiedImages[0]);
  
  return {
    selectedImages: unifiedImages,
    formData: formData,
    mode: 'images'
  };
}

function transformBulkDefectsForLambda(bulkDefects, images, formData) {
  console.log('🔄 Transforming bulk defects for Lambda...');
  
  const defectsWithImages = bulkDefects.filter(defect => defect.selectedFile);
  
  if (defectsWithImages.length === 0) {
    throw new Error('No defects with images selected');
  }
  
  const unifiedImages = defectsWithImages.map(defect => {
    const correspondingImage = images.find(img => {
      const imgFileName = img.fileName || img.file?.name || '';
      return imgFileName === defect.selectedFile;
    });
    
    if (!correspondingImage) {
      console.error('Available images:', images.map(img => ({
        id: img.id,
        fileName: img.fileName,
        file_name: img.file?.name,
        selectedFile: defect.selectedFile
      })));
      throw new Error(`Image not found for defect ${defect.photoNumber}: ${defect.selectedFile}`);
    }
    
    let s3Key;
    
    if (correspondingImage.publicUrl && correspondingImage.publicUrl.trim() !== '') {
      try {
        const url = new URL(correspondingImage.publicUrl);
        s3Key = decodeURIComponent(url.pathname.substring(1));
        console.log('Extracted S3 key from publicUrl:', s3Key);
        
        if (!s3Key.includes('users/') || !s3Key.includes('/images/')) {
          console.warn('Extracted S3 key format looks incorrect:', s3Key);
          const pathParts = url.pathname.split('/');
          if (pathParts.length >= 4) {
            const emailIndex = pathParts.findIndex(part => part.includes('@'));
            if (emailIndex !== -1 && emailIndex + 2 < pathParts.length) {
              s3Key = `${pathParts[emailIndex]}/${pathParts[emailIndex + 1]}/${pathParts[emailIndex + 2]}/${pathParts.slice(emailIndex + 3).join('/')}`;
              console.log('Reconstructed S3 key:', s3Key);
            }
          }
        }
      } catch (error) {
        console.error('Error parsing publicUrl:', error);
        s3Key = `users/test@email.com/images/${defect.selectedFile}`;
      }
    } else {
      s3Key = `users/test@email.com/images/${defect.selectedFile}`;
    }
    
    return {
      id: correspondingImage.id,
      photoNumber: defect.photoNumber || '1',
      description: defect.description || 'LM',
      s3Key: s3Key,
      selectedFile: defect.selectedFile,
      filename: defect.selectedFile,
      publicUrl: correspondingImage.publicUrl
    };
  });
  
  console.log('✅ Bulk defects transformed:', unifiedImages.length);
  console.log('Sample transformed defect:', unifiedImages[0]);
  
  return {
    selectedImages: unifiedImages,
    formData: formData,
    mode: 'bulk'
  };
}

// Test 1: Images Mode Real Lambda Call
console.log('📋 Test 1: Images Mode Real Lambda Call');
console.log('========================================');

async function testImagesModeRealLambda() {
  try {
    console.log('🔄 Preparing images mode data...');
    
    const transformedData = transformSelectedImagesForLambda(testSelectedImages, testFormData);
    
    console.log('📤 Calling real Lambda for images mode...');
    console.log('Data being sent:', {
      mode: transformedData.mode,
      imageCount: transformedData.selectedImages.length,
      formData: transformedData.formData
    });
    
    // Get the API URL
    const apiUrl = getFullApiUrl();
    console.log('🌐 API endpoint:', apiUrl);
    
    const requestBody = JSON.stringify(transformedData);
    console.log('📤 Request body size:', requestBody.length, 'bytes');
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: requestBody
    });
    
    console.log('📥 Response status:', response.status);
    console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      let errorMessage = 'Images mode download failed';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || 'Images mode download failed';
      } catch (parseError) {
        console.error('Failed to parse error response:', parseError);
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }
    
    const result = await response.json();
    console.log('📥 Full Lambda response:', result);
    
    if (!result.success) {
      throw new Error(result.error || result.message || 'Images mode download failed');
    }
    
    if (!result.downloadUrl) {
      throw new Error('No download URL received from Lambda');
    }
    
    console.log('✅ Images mode Lambda call successful');
    console.log('Download URL:', result.downloadUrl);
    
    return result;
  } catch (error) {
    console.error('❌ Images mode Lambda call failed:', error.message);
    return null;
  }
}

// Test 2: Bulk Mode Real Lambda Call
console.log('\n📋 Test 2: Bulk Mode Real Lambda Call');
console.log('=======================================');

async function testBulkModeRealLambda() {
  try {
    console.log('🔄 Preparing bulk mode data...');
    
    const transformedData = transformBulkDefectsForLambda(testBulkDefects, testImages, testFormData);
    
    console.log('📤 Calling real Lambda for bulk mode...');
    console.log('Data being sent:', {
      mode: transformedData.mode,
      defectCount: transformedData.selectedImages.length,
      formData: transformedData.formData
    });
    
    // Get the API URL
    const apiUrl = getFullApiUrl();
    console.log('🌐 API endpoint:', apiUrl);
    
    const requestBody = JSON.stringify(transformedData);
    console.log('📤 Request body size:', requestBody.length, 'bytes');
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: requestBody
    });
    
    console.log('📥 Response status:', response.status);
    console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      let errorMessage = 'Bulk mode download failed';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || 'Bulk mode download failed';
      } catch (parseError) {
        console.error('Failed to parse error response:', parseError);
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }
    
    const result = await response.json();
    console.log('📥 Full Lambda response:', result);
    
    if (!result.success) {
      throw new Error(result.error || result.message || 'Bulk mode download failed');
    }
    
    if (!result.downloadUrl) {
      throw new Error('No download URL received from Lambda');
    }
    
    console.log('✅ Bulk mode Lambda call successful');
    console.log('Download URL:', result.downloadUrl);
    
    return result;
  } catch (error) {
    console.error('❌ Bulk mode Lambda call failed:', error.message);
    return null;
  }
}

// Test 3: Package Content Analysis
console.log('\n📋 Test 3: Package Content Analysis');
console.log('====================================');

function analyzePackageContent(transformedData, mode) {
  console.log(`Analyzing ${mode} mode package content...`);
  
  const images = transformedData.selectedImages;
  const formData = transformedData.formData;
  
  console.log('\n📊 Package Analysis:');
  console.log(`- Mode: ${mode}`);
  console.log(`- Total images: ${images.length}`);
  console.log(`- Form data: ${JSON.stringify(formData)}`);
  
  console.log('\n📋 Image Details:');
  images.forEach((img, index) => {
    console.log(`  ${index + 1}. Photo ${img.photoNumber}:`);
    console.log(`     Description: "${img.description}"`);
    console.log(`     S3 Key: ${img.s3Key}`);
    console.log(`     Filename: ${img.filename}`);
    console.log(`     Public URL: ${img.publicUrl ? 'Present' : 'Missing'}`);
  });
  
  // Check for potential issues
  const issues = [];
  
  images.forEach((img, index) => {
    if (!img.photoNumber) {
      issues.push(`Image ${index + 1}: Missing photo number`);
    }
    if (!img.description) {
      issues.push(`Image ${index + 1}: Missing description`);
    }
    if (!img.s3Key) {
      issues.push(`Image ${index + 1}: Missing S3 key`);
    }
    if (!img.publicUrl) {
      issues.push(`Image ${index + 1}: Missing public URL`);
    }
  });
  
  if (!formData.elr) {
    issues.push('Missing ELR');
  }
  if (!formData.structureNo) {
    issues.push('Missing Structure No');
  }
  if (!formData.date) {
    issues.push('Missing Date');
  }
  
  if (issues.length === 0) {
    console.log('\n✅ Package content analysis: No issues found');
  } else {
    console.log('\n⚠️ Package content analysis issues:');
    issues.forEach(issue => console.log(`  - ${issue}`));
  }
  
  return issues.length === 0;
}

// Run all tests
async function runRealLambdaTests() {
  console.log('🚀 Running real Lambda download tests...\n');
  
  // Test 1: Images Mode
  const imagesResult = await testImagesModeRealLambda();
  
  // Test 2: Bulk Mode
  const bulkResult = await testBulkModeRealLambda();
  
  // Test 3: Content Analysis
  if (imagesResult) {
    console.log('\n🔍 Analyzing Images Mode Content:');
    const imagesData = transformSelectedImagesForLambda(testSelectedImages, testFormData);
    analyzePackageContent(imagesData, 'images');
  }
  
  if (bulkResult) {
    console.log('\n🔍 Analyzing Bulk Mode Content:');
    const bulkData = transformBulkDefectsForLambda(testBulkDefects, testImages, testFormData);
    analyzePackageContent(bulkData, 'bulk');
  }
  
  // Summary
  console.log('\n🎯 Test Summary:');
  console.log('================');
  console.log(`Images Mode Lambda: ${imagesResult ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Bulk Mode Lambda: ${bulkResult ? '✅ PASS' : '❌ FAIL'}`);
  
  if (imagesResult) {
    console.log(`Images Download URL: ${imagesResult.downloadUrl}`);
  }
  if (bulkResult) {
    console.log(`Bulk Download URL: ${bulkResult.downloadUrl}`);
  }
  
  console.log('\n💡 Key Findings:');
  console.log('- Real Lambda endpoint testing');
  console.log('- Actual download URL generation');
  console.log('- Package content validation');
  console.log('- Error handling verification');
}

runRealLambdaTests(); 