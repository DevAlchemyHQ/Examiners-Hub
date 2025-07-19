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
    console.log('🔧 Configuring S3 CORS settings for bucket:', BUCKET_NAME);
    
    const corsConfiguration = {
      CORSRules: [
        {
          AllowedHeaders: ['*'],
          AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
          AllowedOrigins: [
            'https://ex-ch-10224.vercel.app',
            'https://ex-ch-10224-rl55ppyzg-tns-projects-f253479d.vercel.app',
            'http://localhost:5173',
            'http://localhost:3000',
            'http://localhost:4173'
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
    console.log('Allowed origins:', corsConfiguration.CORSRules[0].AllowedOrigins);
    
  } catch (error) {
    console.error('❌ Error configuring S3 CORS:', error);
  }
}

configureS3CORS().catch(console.error); 