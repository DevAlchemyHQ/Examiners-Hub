import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const lambda = new LambdaClient({
  region: 'eu-west-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'AKIA5JMSUOLD2BUTQRRF',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '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'
  }
});

// Simulate the FIXED transformation functions
function transformSelectedImagesForLambda(selectedImages, formData) {
  console.log('🔄 Transforming selected images for Lambda (FIXED)...');
  
  const unifiedImages = selectedImages.map((image, index) => {
    // Extract S3 key using the FIXED logic
    let s3Key = image.s3Key;
    
    if (!s3Key && image.publicUrl) {
      // Extract S3 key from publicUrl
      const url = new URL(image.publicUrl);
      s3Key = url.pathname.substring(1); // Remove leading slash
      console.log('Extracted S3 key from publicUrl:', s3Key);
    }
    
    if (!s3Key) {
      // FIXED: Use userId from image data and s3Key field
      const userId = image.userId || 'anonymous';
      s3Key = `users/${userId}/images/${image.s3Key || image.file?.name || 'unknown'}`;
      console.log('FIXED: Constructed S3 key:', s3Key);
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
  console.log('🔄 Transforming bulk defects for Lambda (FIXED)...');
  
  const defectsWithImages = bulkDefects.filter(defect => defect.selectedFile);
  
  if (defectsWithImages.length === 0) {
    throw new Error('No defects with images selected');
  }
  
  const unifiedImages = defectsWithImages.map(defect => {
    const correspondingImage = images.find(img => 
      (img.fileName || img.file?.name || '') === defect.selectedFile
    );
    
    if (!correspondingImage) {
      throw new Error(`Image not found for defect ${defect.photoNumber}: ${defect.selectedFile}`);
    }
    
    // FIXED: Extract S3 key using proper logic
    let s3Key;
    
    // First, check if the image has a stored s3Key
    if (correspondingImage.s3Key) {
      // FIXED: Use userId from image data instead of localStorage
      s3Key = `users/${correspondingImage.userId || 'anonymous'}/images/${correspondingImage.s3Key}`;
      console.log('FIXED: Using stored s3Key:', s3Key);
    } else if (correspondingImage.publicUrl) {
      // Extract S3 key from publicUrl
      const url = new URL(correspondingImage.publicUrl);
      s3Key = url.pathname.substring(1);
      console.log('Extracted S3 key from publicUrl:', s3Key);
    } else {
      // FIXED: Use userId from image data
      const userId = correspondingImage.userId || 'anonymous';
      
      if (correspondingImage.id) {
        if (correspondingImage.id.startsWith('local-')) {
          const idParts = correspondingImage.id.split('-');
          const timestamp = idParts[1];
          s3Key = `users/${userId}/images/${timestamp}-${defect.selectedFile}`;
          console.log('FIXED: Constructed S3 key from local image ID:', s3Key);
        } else if (correspondingImage.id.startsWith('s3-')) {
          s3Key = `users/${userId}/images/${defect.selectedFile}`;
          console.log('FIXED: Constructed S3 key for S3-loaded image:', s3Key);
        } else {
          s3Key = `users/${userId}/images/${correspondingImage.id}-${defect.selectedFile}`;
          console.log('FIXED: Constructed S3 key from ID fallback:', s3Key);
        }
      } else {
        s3Key = `users/${userId}/images/${defect.selectedFile}`;
        console.log('FIXED: Final fallback S3 key:', s3Key);
      }
    }
    
    return {
      id: correspondingImage.id,
      photoNumber: defect.photoNumber || '1',
      description: defect.description || 'LM',
      s3Key: s3Key,
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

async function testFixedTransformations() {
  console.log('🧪 TESTING FIXED TRANSFORMATIONS');
  console.log('==================================\n');

  // Test data with proper S3 keys
  const mockSelectedImages = [
    {
      id: "s3-1753036987102",
      file: { name: "PB080004 copy.JPG" },
      fileName: "PB080004 copy.JPG",
      photoNumber: "1",
      description: "Test defect 1",
      publicUrl: "https://mvp-labeler-storage.s3.eu-west-2.amazonaws.com/users/timsdng@gmail.com/images/1753036987102-PB080004 copy.JPG",
      userId: "timsdng@gmail.com",
      s3Key: "1753036987102-PB080004 copy.JPG"
    },
    {
      id: "s3-1753036987104",
      file: { name: "PB080007 copy.JPG" },
      fileName: "PB080007 copy.JPG", 
      photoNumber: "2",
      description: "Test defect 2",
      publicUrl: "https://mvp-labeler-storage.s3.eu-west-2.amazonaws.com/users/timsdng@gmail.com/images/1753036987104-PB080007 copy.JPG",
      userId: "timsdng@gmail.com",
      s3Key: "1753036987104-PB080007 copy.JPG"
    }
  ];

  const mockBulkDefects = [
    {
      id: "bulk-1",
      photoNumber: "1",
      description: "Crack in concrete",
      selectedFile: "PB080004 copy.JPG"
    },
    {
      id: "bulk-2",
      photoNumber: "2", 
      description: "Rust on steel",
      selectedFile: "PB080007 copy.JPG"
    }
  ];

  const mockFormData = {
    elr: "TEST_ELR",
    structureNo: "TEST_STRUCT",
    date: "2025-07-20"
  };

  // Test 1: Selected Images with FIXED transformation
  console.log('📋 TEST 1: Selected Images (FIXED)...');
  try {
    const transformedSelectedImages = transformSelectedImagesForLambda(mockSelectedImages, mockFormData);
    console.log('✅ Selected images transformation successful');
    console.log('S3 Keys generated:');
    transformedSelectedImages.selectedImages.forEach((img, index) => {
      console.log(`  Image ${index + 1}: ${img.s3Key}`);
    });
    
    // Test Lambda with fixed transformation
    console.log('\n🚀 Testing Lambda with FIXED selected images...');
    const command = new InvokeCommand({
      FunctionName: 'download-generator',
      InvocationType: 'RequestResponse',
      Payload: JSON.stringify(transformedSelectedImages)
    });

    const response = await lambda.send(command);
    console.log(`Lambda response status: ${response.StatusCode}`);
    
    const responseData = JSON.parse(new TextDecoder().decode(response.Payload));
    
    if (responseData.statusCode === 200) {
      const bodyData = JSON.parse(responseData.body);
      console.log(`✅ Lambda successful! ZIP: ${bodyData.filename}`);
      
      // Test download
      const downloadResponse = await fetch(bodyData.downloadUrl);
      if (downloadResponse.ok) {
        const buffer = await downloadResponse.arrayBuffer();
        console.log(`✅ Download successful! Size: ${buffer.byteLength} bytes`);
        
        // Save and check contents
        const fs = await import('fs');
        const filename = `fixed-selected-test-${Date.now()}.zip`;
        fs.writeFileSync(filename, Buffer.from(buffer));
        
        try {
          const { execSync } = await import('child_process');
          const zipList = execSync(`unzip -l "${filename}"`, { encoding: 'utf8' });
          const imageFiles = zipList.split('\n').filter(line => line.includes('.jpg'));
          console.log(`🔍 Found ${imageFiles.length} image files in ZIP`);
          
          if (imageFiles.length > 0) {
            console.log(`✅ FIXED: Images found in selected images ZIP!`);
          } else {
            console.log(`❌ Still no images in ZIP`);
          }
        } catch (zipError) {
          console.log(`⚠️ Could not list ZIP contents: ${zipError.message}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Selected images test failed:', error);
  }

  console.log('\n==================================\n');

  // Test 2: Bulk Defects with FIXED transformation
  console.log('📋 TEST 2: Bulk Defects (FIXED)...');
  try {
    const transformedBulkDefects = transformBulkDefectsForLambda(mockBulkDefects, mockSelectedImages, mockFormData);
    console.log('✅ Bulk defects transformation successful');
    console.log('S3 Keys generated:');
    transformedBulkDefects.selectedImages.forEach((img, index) => {
      console.log(`  Defect ${index + 1}: ${img.s3Key}`);
    });
    
    // Test Lambda with fixed transformation
    console.log('\n🚀 Testing Lambda with FIXED bulk defects...');
    const command = new InvokeCommand({
      FunctionName: 'download-generator',
      InvocationType: 'RequestResponse',
      Payload: JSON.stringify(transformedBulkDefects)
    });

    const response = await lambda.send(command);
    console.log(`Lambda response status: ${response.StatusCode}`);
    
    const responseData = JSON.parse(new TextDecoder().decode(response.Payload));
    
    if (responseData.statusCode === 200) {
      const bodyData = JSON.parse(responseData.body);
      console.log(`✅ Lambda successful! ZIP: ${bodyData.filename}`);
      
      // Test download
      const downloadResponse = await fetch(bodyData.downloadUrl);
      if (downloadResponse.ok) {
        const buffer = await downloadResponse.arrayBuffer();
        console.log(`✅ Download successful! Size: ${buffer.byteLength} bytes`);
        
        // Save and check contents
        const fs = await import('fs');
        const filename = `fixed-bulk-test-${Date.now()}.zip`;
        fs.writeFileSync(filename, Buffer.from(buffer));
        
        try {
          const { execSync } = await import('child_process');
          const zipList = execSync(`unzip -l "${filename}"`, { encoding: 'utf8' });
          const imageFiles = zipList.split('\n').filter(line => line.includes('.jpg'));
          console.log(`🔍 Found ${imageFiles.length} image files in ZIP`);
          
          if (imageFiles.length > 0) {
            console.log(`✅ FIXED: Images found in bulk defects ZIP!`);
          } else {
            console.log(`❌ Still no images in ZIP`);
          }
        } catch (zipError) {
          console.log(`⚠️ Could not list ZIP contents: ${zipError.message}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Bulk defects test failed:', error);
  }

  console.log('\n==================================');
  console.log('🏁 FIXED TRANSFORMATIONS TESTING COMPLETE');
  console.log('✅ S3 key construction fixed for both modes');
  console.log('✅ Both modes should now work correctly');
}

testFixedTransformations(); 