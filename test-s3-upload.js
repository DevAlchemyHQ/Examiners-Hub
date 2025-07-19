import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const AWS_CONFIG = {
  region: 'eu-west-2',
  credentials: {
    accessKeyId: 'AKIA5JMSUOLD2BUTQRRF',
    secretAccessKey: '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'
  }
};

const s3Client = new S3Client(AWS_CONFIG);
const BUCKET_NAME = 'mvp-labeler-storage';

async function testS3Upload() {
  try {
    console.log('🧪 Testing S3 upload...');
    
    // Create a test file content
    const testContent = 'This is a test file for S3 upload';
    const testFileName = `test-upload-${Date.now()}.txt`;
    
    const uploadCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: testFileName,
      Body: testContent,
      ContentType: 'text/plain'
      // Removed ACL since bucket doesn't support it
    });
    
    await s3Client.send(uploadCommand);
    
    console.log('✅ S3 upload test successful!');
    console.log(`File uploaded: ${testFileName}`);
    console.log(`URL: https://${BUCKET_NAME}.s3.${AWS_CONFIG.region}.amazonaws.com/${testFileName}`);
    
  } catch (error) {
    console.error('❌ S3 upload test failed:', error);
  }
}

testS3Upload(); 