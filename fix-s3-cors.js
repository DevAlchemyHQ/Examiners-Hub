import { S3Client, PutBucketCorsCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: 'eu-west-2',
  credentials: {
    accessKeyId: 'AKIA5JMSUOLD2BUTQRRF',
    secretAccessKey: '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'
  }
});

const BUCKET_NAME = 'mvp-labeler-storage';

async function fixS3Cors() {
  try {
    console.log('🔧 Fixing S3 CORS configuration...');
    
    const corsConfiguration = {
      CORSRules: [
        {
          AllowedHeaders: ['*'],
          AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
          AllowedOrigins: [
            'http://localhost:5173',
            'http://localhost:5174',
            'http://localhost:3000',
            'https://main.d32is7ul5okd2c.amplifyapp.com',
            'https://*.amplifyapp.com',
            'https://*.amazonaws.com'
          ],
          ExposeHeaders: ['ETag', 'Content-Length', 'Content-Type'],
          MaxAgeSeconds: 3000
        }
      ]
    };
    
    const command = new PutBucketCorsCommand({
      Bucket: BUCKET_NAME,
      CORSConfiguration: corsConfiguration
    });
    
    await s3Client.send(command);
    console.log('✅ S3 CORS configuration updated successfully!');
    console.log('🔄 Please wait 1-2 minutes for changes to propagate...');
    
  } catch (error) {
    console.error('❌ Error fixing S3 CORS:', error);
  }
}

fixS3Cors(); 