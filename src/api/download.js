import express from 'express';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const router = express.Router();

// Configure AWS Lambda client
const lambda = new LambdaClient({
  region: 'eu-west-2', // Updated to match our Lambda region
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'AKIA5JMSUOLD2BUTQRRF',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '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'
  }
});

router.post('/download', async (req, res) => {
  try {
    const { selectedImages, formData, mode = 'images' } = req.body;

    console.log('🔍 API: Received download request');
    console.log('Mode:', mode);
    console.log('Selected images:', selectedImages);
    
    // Validate required data
    if (!selectedImages || !Array.isArray(selectedImages) || selectedImages.length === 0) {
      return res.status(400).json({
        error: 'No selected images provided',
        success: false
      });
    }
    
    console.log('Image count:', selectedImages.length);
    console.log('Sample image data:', JSON.stringify(selectedImages[0], null, 2));
    console.log('Form data:', formData);

    // Prepare payload for Lambda
    const payload = {
      selectedImages,
      formData,
      mode
    };

    // Call Lambda function
    const command = new InvokeCommand({
      FunctionName: 'download-generator', // Updated to our working function name
      InvocationType: 'RequestResponse',
      Payload: JSON.stringify(payload)
    });

    console.log('🚀 API: Calling Lambda function...');
    const lambdaResponse = await lambda.send(command);
    
    console.log('✅ API: Lambda response received');

    if (lambdaResponse.StatusCode !== 200) {
      throw new Error('Lambda function failed');
    }

    const responseData = JSON.parse(new TextDecoder().decode(lambdaResponse.Payload));
    
    console.log('📦 API: Lambda response data:', responseData);

    if (responseData.statusCode !== 200) {
      throw new Error(responseData.body || 'Download generation failed');
    }

    // Parse the body which contains our actual response
    const bodyData = JSON.parse(responseData.body);
    
    // Return the download URL and data from Lambda
    res.json({
      success: true,
      downloadUrl: bodyData.downloadUrl,
      filename: bodyData.filename,
      message: bodyData.message
    });

  } catch (error) {
    console.error('❌ API: Download error:', error);
    res.status(500).json({
      error: error.message || 'Download failed',
      success: false
    });
  }
});

export default router; 