import { S3Client, PutBucketCorsCommand } from '@aws-sdk/client-s3';

const AWS_CONFIG = {
  region: 'eu-west-2',
  credentials: {
    accessKeyId: 'AKIA5JMSUOLD2BUTQRRF',
    secretAccessKey: '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'
  }
};

const s3Client = new S3Client(AWS_CONFIG);
const BUCKET_NAME = 'mvp-labeler-storage';

async function configureS3CORS() {
  try {
    console.log('Configuring CORS for S3 bucket:', BUCKET_NAME);
    
    const corsConfiguration = {
      CORSRules: [
        {
          AllowedHeaders: ['*'],
          AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
          AllowedOrigins: [
            'https://ex-ch-10224.vercel.app',
            'https://ex-ch-10224-*.vercel.app',
            'http://localhost:5173',
            'http://localhost:3000'
          ],
          ExposeHeaders: ['ETag'],
          MaxAgeSeconds: 3000
        }
      ]
    };
    
    const command = new PutBucketCorsCommand({
      Bucket: BUCKET_NAME,
      CORSConfiguration: corsConfiguration
    });
    
    await s3Client.send(command);
    console.log('✅ S3 CORS configuration updated successfully');
    
  } catch (error) {
    console.error('❌ Error configuring S3 CORS:', error);
  }
}

configureS3CORS(); 