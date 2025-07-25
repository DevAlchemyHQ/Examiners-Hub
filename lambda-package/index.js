import { S3Client, GetObjectCommand, PutObjectCommand, getSignedUrl } from '@aws-sdk/client-s3';
import JSZip from 'jszip';

const s3Client = new S3Client({ region: 'us-east-1' });

export const handler = async (event) => {
  try {
    console.log('Lambda function started');
    console.log('Event:', JSON.stringify(event, null, 2));

    const { selectedImages, formData } = event;

    if (!selectedImages || !Array.isArray(selectedImages)) {
      throw new Error('No selected images provided');
    }

    console.log(`Processing ${selectedImages.length} images`);

    const zip = new JSZip();

    for (const image of selectedImages) {
      try {
        console.log(`Processing image: ${image.filename || image.id}`);

        const getObjectCommand = new GetObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME || 'mvp-labeler-storage',
          Key: image.s3Key || image.id
        });

        const s3Response = await s3Client.send(getObjectCommand);
        const imageBuffer = await streamToBuffer(s3Response.Body);
        
        zip.file(image.filename || `${image.id}.jpg`, imageBuffer);
        console.log(`Added ${image.filename || image.id} to ZIP`);

      } catch (imageError) {
        console.error(`Error processing image ${image.filename || image.id}:`, imageError);
        const placeholderText = `Image not available: ${image.filename || image.id}`;
        zip.file(`error_${image.filename || image.id}.txt`, placeholderText);
      }
    }

    if (formData) {
      const metadata = {
        projectDetails: formData,
        processedAt: new Date().toISOString(),
        totalImages: selectedImages.length
      };
      zip.file('metadata.json', JSON.stringify(metadata, null, 2));
    }

    console.log('Generating ZIP file...');
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    console.log(`ZIP generated, size: ${zipBuffer.length} bytes`);

    const zipKey = `downloads/${Date.now()}_${Math.random().toString(36).substring(7)}.zip`;
    
    const putObjectCommand = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME || 'mvp-labeler-storage',
      Key: zipKey,
      Body: zipBuffer,
      ContentType: 'application/zip',
      ContentDisposition: 'attachment'
    });

    await s3Client.send(putObjectCommand);
    console.log(`ZIP uploaded to S3: ${zipKey}`);

    const presignedUrl = await getSignedUrl(s3Client, new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME || 'mvp-labeler-storage',
      Key: zipKey
    }), { expiresIn: 3600 });

    console.log('Generated presigned URL for download');

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        downloadUrl: presignedUrl,
        zipKey: zipKey,
        message: 'Download package created successfully',
        imageCount: selectedImages.length
      })
    };

  } catch (error) {
    console.error('Lambda function error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        error: error.message || 'Failed to create download package',
        details: error.stack
      })
    };
  }
};

async function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}
