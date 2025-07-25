const AWS = require('aws-sdk');
const JSZip = require('jszip');

// Configure AWS
const s3 = new AWS.S3();
const lambda = new AWS.Lambda();

exports.handler = async (event) => {
  try {
    console.log('Lambda function started');
    console.log('Event:', JSON.stringify(event, null, 2));

    // Parse the incoming data
    const { selectedImages, formData } = event;

    if (!selectedImages || !Array.isArray(selectedImages)) {
      throw new Error('No selected images provided');
    }

    console.log(`Processing ${selectedImages.length} images`);

    // Create a new ZIP file
    const zip = new JSZip();

    // Process each selected image
    for (const image of selectedImages) {
      try {
        console.log(`Processing image: ${image.filename || image.id}`);

        // Get image from S3
        const s3Params = {
          Bucket: process.env.S3_BUCKET_NAME || 'mvp-labeler-storage',
          Key: image.s3Key || image.id
        };

        const s3Object = await s3.getObject(s3Params).promise();
        
        // Add image to ZIP
        zip.file(image.filename || `${image.id}.jpg`, s3Object.Body);

        console.log(`Added ${image.filename || image.id} to ZIP`);

      } catch (imageError) {
        console.error(`Error processing image ${image.filename || image.id}:`, imageError);
        
        // Create a placeholder for failed images
        const placeholderText = `Image not available: ${image.filename || image.id}`;
        zip.file(`error_${image.filename || image.id}.txt`, placeholderText);
      }
    }

    // Add metadata file
    if (formData) {
      const metadata = {
        projectDetails: formData,
        processedAt: new Date().toISOString(),
        totalImages: selectedImages.length
      };
      
      zip.file('metadata.json', JSON.stringify(metadata, null, 2));
    }

    // Generate ZIP file
    console.log('Generating ZIP file...');
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    
    console.log(`ZIP generated, size: ${zipBuffer.length} bytes`);

    // Upload ZIP to S3 for download
    const zipKey = `downloads/${Date.now()}_${Math.random().toString(36).substring(7)}.zip`;
    
    const uploadParams = {
      Bucket: process.env.S3_BUCKET_NAME || 'mvp-labeler-storage',
      Key: zipKey,
      Body: zipBuffer,
      ContentType: 'application/zip',
      ContentDisposition: 'attachment'
    };

    await s3.upload(uploadParams).promise();
    
    console.log(`ZIP uploaded to S3: ${zipKey}`);

    // Generate presigned URL for download
    const presignedUrl = await s3.getSignedUrlPromise('getObject', {
      Bucket: process.env.S3_BUCKET_NAME || 'mvp-labeler-storage',
      Key: zipKey,
      Expires: 3600 // URL expires in 1 hour
    });

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