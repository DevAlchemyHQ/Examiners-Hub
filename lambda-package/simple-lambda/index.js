const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const JSZip = require('jszip');

// Configure AWS S3 client
const s3Client = new S3Client({ region: 'eu-west-2' });

exports.handler = async (event) => {
  try {
    console.log('Lambda function started');
    console.log('Event:', JSON.stringify(event, null, 2));

    // Handle CORS preflight OPTIONS request
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Max-Age': '86400'
        },
        body: ''
      };
    }

    // Parse the incoming data from API Gateway
    let requestData;
    try {
      // API Gateway sends data in event.body as a JSON string
      requestData = event.body ? JSON.parse(event.body) : event;
      console.log('Parsed request data:', JSON.stringify(requestData, null, 2));
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      console.log('Raw event body:', event.body);
      throw new Error('Invalid request format');
    }

    const { selectedImages, formData, mode = 'images' } = requestData;

    if (!selectedImages || !Array.isArray(selectedImages)) {
      console.error('Validation failed:');
      console.error('- selectedImages:', selectedImages);
      console.error('- selectedImages type:', typeof selectedImages);
      console.error('- selectedImages isArray:', Array.isArray(selectedImages));
      throw new Error('No selected images provided');
    }

    console.log(`Processing ${selectedImages.length} items in ${mode} mode`);

    // Create a new ZIP file
    const zip = new JSZip();

    if (mode === 'bulk') {
      // Handle bulk mode - process bulk defects
      console.log('Processing bulk defects mode');
      
      // Format date as DD-MM-YY (shared for metadata and filenames)
      const formatDate = (dateString) => {
        try {
          const date = new Date(dateString);
          const day = date.getDate().toString().padStart(2, '0');
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          const year = date.getFullYear().toString().slice(-2);
          return `${day}-${month}-${year}`;
        } catch (error) {
          const now = new Date();
          const day = now.getDate().toString().padStart(2, '0');
          const month = (now.getMonth() + 1).toString().padStart(2, '0');
          const year = now.getFullYear().toString().slice(-2);
          return `${day}-${month}-${year}`;
        }
      };
      
      const formattedDate = formatDate(formData.date || new Date().toISOString().slice(0,10));
      
      // Create metadata file for bulk defects
      const metadataContent = selectedImages.map(defect => {
        return `Photo ${defect.photoNumber || '1'} ^ ${defect.description || 'LM'} ^ ${formattedDate}    ${defect.selectedFile}`;
      }).join('\n');

      // Add metadata file to ZIP
      const metadataFileName = `${formData.elr?.trim().toUpperCase() || 'ELR'}_${formData.structureNo?.trim() || 'STRUCT'}_bulk_defects.txt`;
      zip.file(metadataFileName, metadataContent);
      console.log(`Added metadata file: ${metadataFileName}`);

      // Process each bulk defect with its selected image
      for (const defect of selectedImages) {
        try {
          console.log(`Processing bulk defect: ${defect.photoNumber} - ${defect.selectedFile}`);

          // Find the corresponding image in the images array
          const image = defect.image || { s3Key: defect.s3Key, filename: defect.selectedFile };

          console.log(`S3 Key for defect ${defect.photoNumber}:`, image.s3Key);
          console.log(`Bucket name:`, process.env.S3_BUCKET_NAME || 'mvp-labeler-storage');

          if (!image.s3Key) {
            console.warn(`No S3 key for defect ${defect.photoNumber}, skipping`);
            continue;
          }

          // Get image from S3
          const getObjectCommand = new GetObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME || 'mvp-labeler-storage',
            Key: image.s3Key
          });

          const response = await s3Client.send(getObjectCommand);
          
          // Convert stream to buffer
          const chunks = [];
          for await (const chunk of response.Body) {
            chunks.push(chunk);
          }
          const buffer = Buffer.concat(chunks);

          // Add to ZIP with defect-specific filename in proper format
          const imageFileName = `Photo ${defect.photoNumber || '1'} ^ ${defect.description || 'LM'} ^ ${formattedDate}.jpg`;
          zip.file(imageFileName, buffer);
          console.log(`Added ${imageFileName} to ZIP`);

        } catch (error) {
          console.error(`Error processing bulk defect ${defect.photoNumber}:`, error);
          // Continue with other defects
        }
      }

    } else {
      // Handle images mode - process regular images
      console.log('Processing images mode');
      
      // Create metadata file for images mode
      const formatDate = (dateString) => {
        try {
          const date = new Date(dateString);
          const day = date.getDate().toString().padStart(2, '0');
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          const year = date.getFullYear().toString().slice(-2);
          return `${day}-${month}-${year}`;
        } catch (error) {
          const now = new Date();
          const day = now.getDate().toString().padStart(2, '0');
          const month = (now.getMonth() + 1).toString().padStart(2, '0');
          const year = now.getFullYear().toString().slice(-2);
          return `${day}-${month}-${year}`;
        }
      };
      
      const formattedDate = formatDate(formData.date || new Date().toISOString().slice(0,10));
      
      // Create metadata.txt content
      const metadataContent = `ELR: ${formData.elr || 'ELR'}
Structure: ${formData.structureNo || 'STRUCT'}
Date: ${formattedDate}

Defect List:
${selectedImages.map(image => `- Photo ${image.photoNumber || '1'} ^ ${image.description || 'LM'} ^ ${formattedDate}.jpg`).join('\n')}`;

      // Add metadata file to ZIP
      const metadataFileName = `${formData.elr?.trim().toUpperCase() || 'ELR'}_${formData.structureNo?.trim() || 'STRUCT'}_images.txt`;
      zip.file(metadataFileName, metadataContent);
      console.log(`Added metadata file: ${metadataFileName}`);
      
      // Process each selected image
      for (const image of selectedImages) {
        try {
          console.log(`Processing image: ${image.filename || image.id}`);

          // Get image from S3 using AWS SDK v3
          const getObjectCommand = new GetObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: image.s3Key
          });

          const response = await s3Client.send(getObjectCommand);
          
          // Convert stream to buffer
          const chunks = [];
          for await (const chunk of response.Body) {
            chunks.push(chunk);
          }
          const buffer = Buffer.concat(chunks);

          // Add to ZIP with custom naming
          const imageFileName = `Photo ${image.photoNumber || '1'} ^ ${image.description || 'LM'} ^ ${formattedDate}.jpg`;
          zip.file(imageFileName, buffer);
          console.log(`Added ${imageFileName} to ZIP`);

        } catch (error) {
          console.error(`Error processing image ${image.filename}:`, error);
          // Continue with other images
        }
      }
    }

    // Generate ZIP file
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    console.log(`Generated ZIP file: ${zipBuffer.length} bytes`);

    // Create unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const projectName = formData?.projectName || 'download';
    const zipFileName = mode === 'bulk' 
      ? `${formData.elr?.trim().toUpperCase() || 'ELR'}_${formData.structureNo?.trim() || 'STRUCT'}_bulk_defects.zip`
      : `${formData.elr?.trim().toUpperCase() || 'ELR'}_${formData.structureNo?.trim() || 'STRUCT'}_images.zip`;

    // Upload ZIP to S3
    const putObjectCommand = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: `downloads/${zipFileName}`,
      Body: zipBuffer,
      ContentType: 'application/zip'
    });

    await s3Client.send(putObjectCommand);
    console.log(`Uploaded ZIP to S3: downloads/${zipFileName}`);

    // Generate presigned URL for download
    const getSignedUrlCommand = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: `downloads/${zipFileName}`
    });

    const presignedUrl = await getSignedUrl(s3Client, getSignedUrlCommand, { expiresIn: 3600 });
    console.log('Generated presigned URL');

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      },
      body: JSON.stringify({
        success: true,
        downloadUrl: presignedUrl,
        filename: zipFileName,
        message: `Successfully created ZIP with ${selectedImages.length} ${mode === 'bulk' ? 'defects' : 'images'}`
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
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      },
      body: JSON.stringify({
        success: false,
        error: error.message,
        message: 'Failed to create ZIP file'
      })
    };
  }
};
