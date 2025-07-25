import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const lambda = new LambdaClient({
  region: 'eu-west-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'AKIA5JMSUOLD2BUTQRRF',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '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'
  }
});

// Test payload for BULK DEFECTS mode
const bulkDefectsPayload = {
  selectedImages: [
    {
      id: "bulk-1",
      photoNumber: "1",
      description: "Crack in concrete",
      selectedFile: "users/timsdng@gmail.com/images/1753036987102-PB080004 copy.JPG",
      s3Key: "users/timsdng@gmail.com/images/1753036987102-PB080004 copy.JPG"
    },
    {
      id: "bulk-2", 
      photoNumber: "2",
      description: "Rust on steel",
      selectedFile: "users/timsdng@gmail.com/images/1753036987104-PB080007 copy.JPG",
      s3Key: "users/timsdng@gmail.com/images/1753036987104-PB080007 copy.JPG"
    }
  ],
  formData: {
    elr: "TEST_ELR",
    structureNo: "TEST_STRUCT",
    date: "2025-07-20"
  },
  mode: "bulk"
};

// Test payload for SELECTED IMAGES mode
const selectedImagesPayload = {
  selectedImages: [
    {
      id: "s3-1753036987102",
      file: { name: "PB080004 copy.JPG" },
      filename: "PB080004 copy.JPG",
      s3Key: "users/timsdng@gmail.com/images/1753036987102-PB080004 copy.JPG",
      photoNumber: "1",
      description: "Test defect 1",
      publicUrl: "https://mvp-labeler-storage.s3.eu-west-2.amazonaws.com/users/timsdng@gmail.com/images/1753036987102-PB080004 copy.JPG",
      userId: "timsdng@gmail.com"
    },
    {
      id: "s3-1753036987104", 
      file: { name: "PB080007 copy.JPG" },
      filename: "PB080007 copy.JPG",
      s3Key: "users/timsdng@gmail.com/images/1753036987104-PB080007 copy.JPG",
      photoNumber: "2",
      description: "Test defect 2",
      publicUrl: "https://mvp-labeler-storage.s3.eu-west-2.amazonaws.com/users/timsdng@gmail.com/images/1753036987104-PB080007 copy.JPG",
      userId: "timsdng@gmail.com"
    }
  ],
  formData: {
    elr: "TEST_ELR",
    structureNo: "TEST_STRUCT",
    date: "2025-07-20"
  },
  mode: "images"
};

async function testBothModesHonestly() {
  console.log('🧪 HONEST TESTING OF BOTH MODES');
  console.log('=====================================\n');

  // Test BULK DEFECTS mode
  console.log('📦 TESTING BULK DEFECTS MODE...');
  try {
    const bulkCommand = new InvokeCommand({
      FunctionName: 'download-generator',
      InvocationType: 'RequestResponse',
      Payload: JSON.stringify(bulkDefectsPayload)
    });

    const bulkResponse = await lambda.send(bulkCommand);
    console.log(`Bulk Lambda response status: ${bulkResponse.StatusCode}`);
    
    const bulkResponseData = JSON.parse(new TextDecoder().decode(bulkResponse.Payload));
    console.log('Bulk response data:', JSON.stringify(bulkResponseData, null, 2));
    
    if (bulkResponseData.statusCode === 200) {
      const bulkBodyData = JSON.parse(bulkResponseData.body);
      console.log(`✅ Bulk mode successful!`);
      console.log(`📦 ZIP filename: ${bulkBodyData.filename}`);
      console.log(`📝 Message: ${bulkBodyData.message}`);
      
      // Test downloading the bulk ZIP file
      console.log(`\n📥 Testing download of ${bulkBodyData.filename}...`);
      const bulkDownloadResponse = await fetch(bulkBodyData.downloadUrl);
      
      if (bulkDownloadResponse.ok) {
        const bulkBuffer = await bulkDownloadResponse.arrayBuffer();
        console.log(`✅ Bulk download successful! File size: ${bulkBuffer.byteLength} bytes`);
        
        // Save the file for inspection
        const fs = await import('fs');
        const bulkFilename = `bulk-test-${Date.now()}.zip`;
        fs.writeFileSync(bulkFilename, Buffer.from(bulkBuffer));
        console.log(`💾 Saved as: ${bulkFilename}`);
        
        // Try to list ZIP contents
        try {
          const { execSync } = await import('child_process');
          const bulkZipList = execSync(`unzip -l "${bulkFilename}"`, { encoding: 'utf8' });
          console.log(`📋 Bulk ZIP contents:\n${bulkZipList}`);
          
          // Check if images are actually in the ZIP
          const bulkLines = bulkZipList.split('\n');
          const bulkImageFiles = bulkLines.filter(line => line.includes('.jpg'));
          console.log(`\n🔍 Found ${bulkImageFiles.length} image files in bulk ZIP:`);
          bulkImageFiles.forEach(file => console.log(`  - ${file.trim()}`));
          
          if (bulkImageFiles.length === 0) {
            console.log(`❌ NO IMAGES FOUND IN BULK ZIP!`);
          } else {
            console.log(`✅ Images found in bulk ZIP`);
          }
          
        } catch (zipError) {
          console.log(`⚠️ Could not list bulk ZIP contents: ${zipError.message}`);
        }
        
      } else {
        console.log(`❌ Bulk download failed: ${bulkDownloadResponse.status} ${bulkDownloadResponse.statusText}`);
      }
      
    } else {
      console.log(`❌ Bulk mode failed:`, bulkResponseData);
    }
    
  } catch (error) {
    console.error(`❌ Error testing bulk mode:`, error);
  }

  console.log('\n=====================================\n');

  // Test SELECTED IMAGES mode
  console.log('🖼️ TESTING SELECTED IMAGES MODE...');
  try {
    const imagesCommand = new InvokeCommand({
      FunctionName: 'download-generator',
      InvocationType: 'RequestResponse',
      Payload: JSON.stringify(selectedImagesPayload)
    });

    const imagesResponse = await lambda.send(imagesCommand);
    console.log(`Images Lambda response status: ${imagesResponse.StatusCode}`);
    
    const imagesResponseData = JSON.parse(new TextDecoder().decode(imagesResponse.Payload));
    console.log('Images response data:', JSON.stringify(imagesResponseData, null, 2));
    
    if (imagesResponseData.statusCode === 200) {
      const imagesBodyData = JSON.parse(imagesResponseData.body);
      console.log(`✅ Selected Images mode successful!`);
      console.log(`📦 ZIP filename: ${imagesBodyData.filename}`);
      console.log(`📝 Message: ${imagesBodyData.message}`);
      
      // Test downloading the images ZIP file
      console.log(`\n📥 Testing download of ${imagesBodyData.filename}...`);
      const imagesDownloadResponse = await fetch(imagesBodyData.downloadUrl);
      
      if (imagesDownloadResponse.ok) {
        const imagesBuffer = await imagesDownloadResponse.arrayBuffer();
        console.log(`✅ Images download successful! File size: ${imagesBuffer.byteLength} bytes`);
        
        // Save the file for inspection
        const fs = await import('fs');
        const imagesFilename = `images-test-${Date.now()}.zip`;
        fs.writeFileSync(imagesFilename, Buffer.from(imagesBuffer));
        console.log(`💾 Saved as: ${imagesFilename}`);
        
        // Try to list ZIP contents
        try {
          const { execSync } = await import('child_process');
          const imagesZipList = execSync(`unzip -l "${imagesFilename}"`, { encoding: 'utf8' });
          console.log(`📋 Images ZIP contents:\n${imagesZipList}`);
          
          // Check if images are actually in the ZIP
          const imagesLines = imagesZipList.split('\n');
          const imagesImageFiles = imagesLines.filter(line => line.includes('.jpg'));
          console.log(`\n🔍 Found ${imagesImageFiles.length} image files in images ZIP:`);
          imagesImageFiles.forEach(file => console.log(`  - ${file.trim()}`));
          
          if (imagesImageFiles.length === 0) {
            console.log(`❌ NO IMAGES FOUND IN IMAGES ZIP!`);
          } else {
            console.log(`✅ Images found in images ZIP`);
          }
          
        } catch (zipError) {
          console.log(`⚠️ Could not list images ZIP contents: ${zipError.message}`);
        }
        
      } else {
        console.log(`❌ Images download failed: ${imagesDownloadResponse.status} ${imagesDownloadResponse.statusText}`);
      }
      
    } else {
      console.log(`❌ Selected Images mode failed:`, imagesResponseData);
    }
    
  } catch (error) {
    console.error(`❌ Error testing selected images mode:`, error);
  }

  console.log('\n=====================================');
  console.log('🏁 HONEST TESTING COMPLETE');
}

testBothModesHonestly(); 