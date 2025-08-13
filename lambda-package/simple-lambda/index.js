const { S3Client, GetObjectCommand, PutObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
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
      console.log('Bulk defects data structure:', JSON.stringify(selectedImages, null, 2));
      console.log('Form data:', JSON.stringify(formData, null, 2));
      
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

          // The defect object contains s3Key directly
          const s3Key = defect.s3Key;
          console.log(`S3 Key for defect ${defect.photoNumber}:`, s3Key);
          console.log(`Bucket name:`, process.env.S3_BUCKET_NAME || 'mvp-labeler-storage');

          if (!s3Key) {
            console.warn(`No S3 key for defect ${defect.photoNumber}, skipping`);
            continue;
          }

          // Try to get the image from S3 with fallback logic
          let imageBuffer = null;
          let actualS3Key = s3Key;
          
          try {
            // First, try the exact S3 key provided
            console.log(`🔍 Trying exact S3 key: ${s3Key}`);
            const getObjectCommand = new GetObjectCommand({
              Bucket: process.env.S3_BUCKET_NAME || 'mvp-labeler-storage',
              Key: s3Key
            });
            
            const response = await s3Client.send(getObjectCommand);
            
            // Convert stream to buffer
            const chunks = [];
            for await (const chunk of response.Body) {
              chunks.push(chunk);
            }
            imageBuffer = Buffer.concat(chunks);
            console.log(`✅ Found image with exact S3 key: ${s3Key}`);
            
          } catch (error) {
            console.log(`❌ Image not found with exact S3 key: ${s3Key}`);
            console.log(`Error: ${error.message}`);
            
            // If the exact key doesn't work, try to find the file by listing objects
            // and matching the filename (ignoring timestamp)
            try {
              console.log(`🔍 Trying to find file by filename: ${defect.selectedFile}`);
              const listCommand = new ListObjectsV2Command({
                Bucket: process.env.S3_BUCKET_NAME || 'mvp-labeler-storage',
                Prefix: `users/${s3Key.split('/')[1]}/images/` // Get the user's images folder
              });
              
              const listResponse = await s3Client.send(listCommand);
              const filename = defect.selectedFile;
              
              // Find a file that ends with the same filename
              const matchingFile = listResponse.Contents?.find(obj => 
                obj.Key && obj.Key.endsWith(filename)
              );
              
              if (matchingFile) {
                console.log(`✅ Found matching file: ${matchingFile.Key}`);
                actualS3Key = matchingFile.Key;
                
                // Get the image using the found key
                const getObjectCommand = new GetObjectCommand({
                  Bucket: process.env.S3_BUCKET_NAME || 'mvp-labeler-storage',
                  Key: matchingFile.Key
                });
                
                const response = await s3Client.send(getObjectCommand);
                
                // Convert stream to buffer
                const chunks = [];
                for await (const chunk of response.Body) {
                  chunks.push(chunk);
                }
                imageBuffer = Buffer.concat(chunks);
                console.log(`✅ Successfully retrieved image with fallback key`);
                
              } else {
                console.log(`❌ No matching file found for filename: ${filename}`);
                throw new Error(`No matching file found for ${filename}`);
              }
            } catch (listError) {
              console.log(`❌ Error listing objects: ${listError.message}`);
              throw error; // Re-throw the original error
            }
          }

          if (imageBuffer) {
            // Add to ZIP with defect-specific filename in proper format
            const imageFileName = `Photo ${defect.photoNumber || '1'} ^ ${defect.description || 'LM'} ^ ${formattedDate}.jpg`;
            zip.file(imageFileName, imageBuffer);
            console.log(`✅ Added ${imageFileName} to ZIP`);
          } else {
            console.error(`❌ Failed to retrieve image for defect ${defect.photoNumber}`);
          }

        } catch (error) {
          console.error(`Error processing bulk defect ${defect.photoNumber}:`, error);
          console.error(`Defect details:`, {
            photoNumber: defect.photoNumber,
            description: defect.description,
            selectedFile: defect.selectedFile,
            s3Key: defect.s3Key,
            errorMessage: error.message,
            errorCode: error.Code || error.code
          });
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
          console.log(`S3 Key: ${image.s3Key}`);
          console.log(`Bucket: ${process.env.S3_BUCKET_NAME}`);

          // Try to get the image from S3
          let imageBuffer;
          let actualS3Key = image.s3Key;
          
          try {
            // First, try the exact S3 key provided
            const getObjectCommand = new GetObjectCommand({
              Bucket: process.env.S3_BUCKET_NAME,
              Key: image.s3Key
            });
            
            const response = await s3Client.send(getObjectCommand);
            imageBuffer = await response.Body.transformToByteArray();
            console.log(`✅ Found image with exact S3 key: ${image.s3Key}`);
          } catch (error) {
            console.log(`❌ Image not found with exact S3 key: ${image.s3Key}`);
            console.log(`Error: ${error.message}`);
            
            // If the exact key doesn't work, try to find the file by listing objects
            // and matching the filename (ignoring timestamp)
            try {
              const listCommand = new ListObjectsV2Command({
                Bucket: process.env.S3_BUCKET_NAME,
                Prefix: `users/${image.s3Key.split('/')[1]}/images/` // Get the user's images folder
              });
              
              const listResponse = await s3Client.send(listCommand);
              const filename = image.filename || image.s3Key.split('/').pop();
              
              // Find a file that ends with the same filename
              const matchingFile = listResponse.Contents?.find(obj => 
                obj.Key && obj.Key.endsWith(filename)
              );
              
              if (matchingFile) {
                console.log(`✅ Found matching file: ${matchingFile.Key}`);
                actualS3Key = matchingFile.Key;
                
                // Get the image using the found key
                const getObjectCommand = new GetObjectCommand({
                  Bucket: process.env.S3_BUCKET_NAME,
                  Key: matchingFile.Key
                });
                
                const response = await s3Client.send(getObjectCommand);
                imageBuffer = await response.Body.transformToByteArray();
              } else {
                console.log(`❌ No matching file found for filename: ${filename}`);
                throw new Error(`No matching file found for ${filename}`);
              }
            } catch (listError) {
              console.log(`❌ Error listing objects: ${listError.message}`);
              throw error; // Re-throw the original error
            }
          }

          // Add to ZIP with custom naming
          const imageFileName = `Photo ${image.photoNumber || '1'} ^ ${image.description || 'LM'} ^ ${formattedDate}.jpg`;
          zip.file(imageFileName, imageBuffer);
          console.log(`Added ${imageFileName} to ZIP`);

        } catch (error) {
          console.error(`Error processing image ${image.filename}:`, error);
          console.error(`Error details:`, {
            s3Key: image.s3Key,
            bucket: process.env.S3_BUCKET_NAME,
            errorMessage: error.message,
            errorCode: error.Code || error.code
          });
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
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Max-Age': '86400'
      },
      body: JSON.stringify({
        success: true,
        downloadUrl: presignedUrl,
        zipKey: `downloads/${zipFileName}`,
        message: `Download package created successfully`,
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
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Max-Age': '86400'
      },
      body: JSON.stringify({
        success: false,
        error: error.message,
        message: 'Failed to create ZIP file'
      })
    };
  }
};
