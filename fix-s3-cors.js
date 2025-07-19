import { S3Client, PutBucketCorsCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({ region: 'eu-west-2' });

const corsConfiguration = {
  CORSRules: [
    {
      AllowedHeaders: ['*'],
      AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
      AllowedOrigins: [
        'https://main.d32is7ul5okd2c.amplifyapp.com',
        'http://localhost:3000',
        'http://localhost:5173',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173'
      ],
      ExposeHeaders: ['ETag', 'x-amz-meta-custom-header'],
      MaxAgeSeconds: 3000
    }
  ]
};

async function updateBucketCors() {
  try {
    const command = new PutBucketCorsCommand({
      Bucket: 'mvp-labeler-storage',
      CORSConfiguration: corsConfiguration
    });

    await s3Client.send(command);
    console.log('✅ S3 CORS configuration updated successfully!');
    console.log('Allowed origins:', corsConfiguration.CORSRules[0].AllowedOrigins);
  } catch (error) {
    console.error('❌ Error updating S3 CORS configuration:', error);
  }
}

updateBucketCors(); 