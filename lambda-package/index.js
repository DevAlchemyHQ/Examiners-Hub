import pkg from '@aws-sdk/client-s3';
const { S3Client, GetObjectCommand, PutObjectCommand } = pkg;
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import JSZip from 'jszip';

const s3Client = new S3Client({ region: 'eu-west-2' }); // Fixed region to match bucket

export const handler = async (event) => {
  try {
    console.log('Lambda function started');
    console.log('Event:', JSON.stringify(event, null, 2));

    // Parse the JSON body from API Gateway or use event directly
    let requestBody;
    if (event.body) {
      // API Gateway invocation
      try {
        requestBody = JSON.parse(event.body);
      } catch (parseError) {
        console.error('Error parsing request body:', parseError);
        throw new Error('Invalid JSON in request body');
      }
    } else {
      // Direct invocation
      requestBody = event;
    }

    const { selectedImages, formData } = requestBody;

    if (!selectedImages || !Array.isArray(selectedImages)) {
      console.error('selectedImages validation failed:', { selectedImages });
      throw new Error('No selected images provided');
    }

    console.log(`Processing ${selectedImages.length} images`);

    const zip = new JSZip();
    
    // Create base filename from form data
    const elr = formData?.elr || 'ELR';
    const structureNo = formData?.structureNo || 'STRUCT';
    const date = formData?.date || '2025-01-01';
    
    // Format date as DD-MM-YY
    const dateParts = date.split('-');
    const year = dateParts[0]?.slice(-2) || '25';
    const month = dateParts[1] || '01';
    const day = dateParts[2] || '01';
    const formattedDate = `${day}-${month}-${year}`;
    
    // Create base filename for ZIP and TXT
    const baseFilename = `${elr}_${structureNo}_${formattedDate}`;
    
    // Array to store conversion list for TXT file
    const conversionList = [];

    for (const image of selectedImages) {
      try {
        console.log(`Processing image: ${image.filename || image.id}`);

        const getObjectCommand = new GetObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME || 'mvp-labeler-storage',
          Key: image.s3Key || image.id
        });

        const s3Response = await s3Client.send(getObjectCommand);
        const imageBuffer = await streamToBuffer(s3Response.Body);
        
        // Create filename with format: "Photo {photoNumber} ^ {description} ^ {date}"
        const photoNumber = image.photoNumber || '1';
        const description = image.description || 'LM';
        
        // Get file extension from original filename
        const originalFilename = image.filename || image.selectedFile || `${image.id}.jpg`;
        const fileExtension = originalFilename.split('.').pop() || 'jpg';
        
        // Create new filename: "Photo {photoNumber} ^ {description} ^ {date}.ext"
        const newFilename = `Photo ${photoNumber} ^ ${description} ^ ${formattedDate}.${fileExtension}`;
        
        // Add to conversion list
        conversionList.push(`${newFilename}    ${originalFilename}`);
        
        zip.file(newFilename, imageBuffer);
        console.log(`Added ${newFilename} to ZIP (original: ${originalFilename})`);

      } catch (imageError) {
        console.error(`Error processing image ${image.filename || image.id}:`, imageError);
        const placeholderText = `Image not available: ${image.filename || image.id}`;
        zip.file(`error_${image.filename || image.id}.txt`, placeholderText);
      }
    }

    // Add TXT file with conversion list
    const txtContent = conversionList.join('\n');
    zip.file(`${baseFilename}.txt`, txtContent);
    console.log(`Added ${baseFilename}.txt with ${conversionList.length} conversions`);

    console.log('Generating ZIP file...');
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    console.log(`ZIP generated, size: ${zipBuffer.length} bytes`);

    const zipKey = `downloads/${baseFilename}.zip`;
    
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
        success: true,
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
        success: false,
        error: error.message || 'Failed to create download package',
        message: 'Failed to create ZIP file'
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
