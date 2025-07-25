import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

// Test Lambda connection
async function testLambdaConnection() {
  try {
    const lambda = new LambdaClient({
      region: 'us-east-1', // Update to your region
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    });

    console.log('Testing Lambda connection...');
    
    const command = new InvokeCommand({
      FunctionName: process.env.LAMBDA_FUNCTION_NAME || 'download-generator-function',
      InvocationType: 'RequestResponse',
      Payload: JSON.stringify({
        test: true,
        message: 'Hello from test script!'
      })
    });

    const response = await lambda.send(command);
    
    if (response.StatusCode === 200) {
      const responseData = JSON.parse(new TextDecoder().decode(response.Payload));
      console.log('✅ Lambda connection successful!');
      console.log('Response:', responseData);
    } else {
      console.log('❌ Lambda connection failed');
      console.log('Status Code:', response.StatusCode);
    }
    
  } catch (error) {
    console.error('❌ Lambda connection error:', error.message);
  }
}

testLambdaConnection(); 