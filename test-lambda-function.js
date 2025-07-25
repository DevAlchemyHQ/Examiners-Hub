import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const lambda = new LambdaClient({
  region: 'eu-west-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'AKIA5JMSUOLD2BUTQRRF',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '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'
  }
});

const testPayload = {
  selectedImages: [
    {
      photoNumber: "1",
      description: "fddsf",
      selectedFile: "PB080004 copy.JPG",
      s3Key: "users/timsdng@gmail.com/images/1753036987102-PB080004 copy.JPG"
    }
  ],
  formData: {
    elr: "TEWR",
    structureNo: "terter",
    date: "2025-07-09"
  },
  mode: "bulk"
};

async function testLambda() {
  try {
    console.log('Testing Lambda function...');
    console.log('Payload:', JSON.stringify(testPayload, null, 2));
    
    const command = new InvokeCommand({
      FunctionName: 'download-generator',
      InvocationType: 'RequestResponse',
      Payload: JSON.stringify(testPayload)
    });

    const response = await lambda.send(command);
    console.log('Lambda response status:', response.StatusCode);
    
    const responseData = JSON.parse(new TextDecoder().decode(response.Payload));
    console.log('Response data:', JSON.stringify(responseData, null, 2));
    
  } catch (error) {
    console.error('Error testing Lambda:', error);
  }
}

testLambda(); 