import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const lambda = new LambdaClient({
  region: 'eu-west-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'AKIA5JMSUOLD2BUTQRRF',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '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'
  }
});

// Test payload for selected images mode
const selectedImagesPayload = {
  selectedImages: [
    {
      id: "s3-1753036987102",
      filename: "PB080004 copy.JPG",
      s3Key: "users/timsdng@gmail.com/images/1753036987102-PB080004 copy.JPG",
      photoNumber: "1",
      description: "Test defect 1",
      publicUrl: "https://mvp-labeler-storage.s3.eu-west-2.amazonaws.com/users/timsdng@gmail.com/images/1753036987102-PB080004 copy.JPG"
    },
    {
      id: "s3-1753036987104", 
      filename: "PB080007 copy.JPG",
      s3Key: "users/timsdng@gmail.com/images/1753036987104-PB080007 copy.JPG",
      photoNumber: "2",
      description: "Test defect 2",
      publicUrl: "https://mvp-labeler-storage.s3.eu-west-2.amazonaws.com/users/timsdng@gmail.com/images/1753036987104-PB080007 copy.JPG"
    }
  ],
  formData: {
    elr: "TEST_ELR",
    structureNo: "TEST_STRUCT",
    date: "2025-07-20"
  },
  mode: "images"
};

// Test payload for bulk defects mode
const bulkDefectsPayload = {
  selectedImages: [
    {
      photoNumber: "1",
      description: "fddsf",
      selectedFile: "PB080004 copy.JPG",
      s3Key: "users/timsdng@gmail.com/images/1753036987102-PB080004 copy.JPG"
    },
    {
      photoNumber: "2", 
      description: "fdg",
      selectedFile: "PB080007 copy.JPG",
      s3Key: "users/timsdng@gmail.com/images/1753036987104-PB080007 copy.JPG"
    }
  ],
  formData: {
    elr: "TEWR",
    structureNo: "terter",
    date: "2025-07-09"
  },
  mode: "bulk"
};

async function testLambdaMode(payload, modeName) {
  try {
    console.log(`\n🧪 Testing ${modeName} mode...`);
    console.log('Payload:', JSON.stringify(payload, null, 2));
    
    const command = new InvokeCommand({
      FunctionName: 'download-generator',
      InvocationType: 'RequestResponse',
      Payload: JSON.stringify(payload)
    });

    const response = await lambda.send(command);
    console.log(`Lambda response status: ${response.StatusCode}`);
    
    const responseData = JSON.parse(new TextDecoder().decode(response.Payload));
    console.log('Response data:', JSON.stringify(responseData, null, 2));
    
    if (responseData.statusCode === 200) {
      const bodyData = JSON.parse(responseData.body);
      console.log(`✅ ${modeName} mode successful!`);
      console.log(`📦 ZIP filename: ${bodyData.filename}`);
      console.log(`🔗 Download URL: ${bodyData.downloadUrl}`);
      console.log(`📝 Message: ${bodyData.message}`);
      
      // Test downloading the ZIP file
      console.log(`\n📥 Testing download of ${bodyData.filename}...`);
      const downloadResponse = await fetch(bodyData.downloadUrl);
      
      if (downloadResponse.ok) {
        const buffer = await downloadResponse.arrayBuffer();
        console.log(`✅ Download successful! File size: ${buffer.byteLength} bytes`);
        
        // Save the file for inspection
        const fs = await import('fs');
        const filename = `test-${modeName}-${Date.now()}.zip`;
        fs.writeFileSync(filename, Buffer.from(buffer));
        console.log(`💾 Saved as: ${filename}`);
        
        // Try to list ZIP contents
        try {
          const { execSync } = await import('child_process');
          const zipList = execSync(`unzip -l ${filename}`, { encoding: 'utf8' });
          console.log(`📋 ZIP contents:\n${zipList}`);
        } catch (zipError) {
          console.log(`⚠️ Could not list ZIP contents: ${zipError.message}`);
        }
        
      } else {
        console.log(`❌ Download failed: ${downloadResponse.status} ${downloadResponse.statusText}`);
      }
      
    } else {
      console.log(`❌ ${modeName} mode failed:`, responseData);
    }
    
  } catch (error) {
    console.error(`❌ Error testing ${modeName} mode:`, error);
  }
}

async function runAllTests() {
  console.log('🚀 Starting comprehensive Lambda function tests...\n');
  
  // Test selected images mode
  await testLambdaMode(selectedImagesPayload, "Selected Images");
  
  // Test bulk defects mode  
  await testLambdaMode(bulkDefectsPayload, "Bulk Defects");
  
  console.log('\n🎉 All tests completed!');
}

runAllTests(); 