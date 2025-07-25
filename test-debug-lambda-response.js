import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const lambda = new LambdaClient({
  region: 'eu-west-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'AKIA5JMSUOLD2BUTQRRF',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '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'
  }
});

// Simple test payload
const testPayload = {
  selectedImages: [
    {
      id: 'test-1',
      photoNumber: '01',
      description: 'Test defect',
      selectedFile: 'test.jpg',
      s3Key: 'users/test@example.com/images/test.jpg'
    }
  ],
  formData: {
    elr: 'TEST',
    structureNo: 'TEST',
    date: '2024-01-15'
  },
  mode: 'bulk'
};

console.log('🔍 DEBUGGING LAMBDA RESPONSE');
console.log('============================\n');

console.log('📤 Sending payload:', JSON.stringify(testPayload, null, 2));

try {
  const command = new InvokeCommand({
    FunctionName: 'download-generator',
    Payload: JSON.stringify(testPayload)
  });

  console.log('\n⏳ Invoking Lambda...');
  const response = await lambda.send(command);
  
  console.log('✅ Raw response:');
  console.log('- Status Code:', response.StatusCode);
  console.log('- Function Error:', response.FunctionError);
  console.log('- Log Result:', response.LogResult);
  
  const responseText = new TextDecoder().decode(response.Payload);
  console.log('\n📥 Raw response payload:');
  console.log(responseText);
  
  try {
    const responseJson = JSON.parse(responseText);
    console.log('\n📋 Parsed JSON response:');
    console.log(JSON.stringify(responseJson, null, 2));
    
    if (responseJson.success) {
      console.log('✅ SUCCESS: Lambda worked correctly');
    } else {
      console.log('❌ FAILED: Lambda returned error');
    }
  } catch (parseError) {
    console.log('❌ Failed to parse response as JSON');
    console.log('Response might be an error message or different format');
  }
  
} catch (error) {
  console.error('❌ Lambda invocation failed:', error);
}

console.log('\n🏁 DEBUG COMPLETE'); 