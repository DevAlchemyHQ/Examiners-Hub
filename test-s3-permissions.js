import { S3Client, GetBucketCorsCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const AWS_CONFIG = {
  region: 'eu-west-2',
  credentials: {
    accessKeyId: 'AKIA5JMSUOLD2BUTQRRF',
    secretAccessKey: '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'
  }
};

const s3Client = new S3Client(AWS_CONFIG);
const BUCKET_NAME = 'mvp-labeler-storage';

async function testS3Permissions() {
  try {
    console.log('Testing S3 bucket permissions...');
    
    // Test 1: Check CORS configuration
    console.log('\n1. Checking CORS configuration...');
    const corsCommand = new GetBucketCorsCommand({ Bucket: BUCKET_NAME });
    const corsResult = await s3Client.send(corsCommand);
    console.log('✅ CORS configuration:', corsResult.CORSConfiguration);
    
    // Test 2: Try to generate a signed URL for a test file
    console.log('\n2. Testing signed URL generation...');
    const testKey = 'test-file.txt';
    const getObjectCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: testKey
    });
    
    try {
      const signedUrl = await getSignedUrl(s3Client, getObjectCommand, { expiresIn: 3600 });
      console.log('✅ Signed URL generated successfully');
      console.log('Signed URL:', signedUrl);
    } catch (error) {
      console.log('❌ Error generating signed URL:', error.message);
    }
    
    // Test 3: List files in a user directory
    console.log('\n3. Testing file listing...');
    const { ListObjectsV2Command } = await import('@aws-sdk/client-s3');
    const listCommand = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: 'users/'
    });
    
    try {
      const listResult = await s3Client.send(listCommand);
      console.log('✅ Files found:', listResult.Contents?.length || 0);
      if (listResult.Contents && listResult.Contents.length > 0) {
        console.log('Sample files:');
        listResult.Contents.slice(0, 3).forEach(obj => {
          console.log(`  - ${obj.Key} (${obj.Size} bytes)`);
        });
      }
    } catch (error) {
      console.log('❌ Error listing files:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Error testing S3 permissions:', error);
  }
}

testS3Permissions(); 