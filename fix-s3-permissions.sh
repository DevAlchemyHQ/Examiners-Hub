#!/bin/bash

# Script to fix S3 bucket permissions for image uploads
# This script updates the bucket policy to allow uploads to users/* path

echo "🔧 Fixing S3 bucket permissions for image uploads..."

BUCKET_NAME="mvp-labeler-storage"
REGION="eu-west-2"

echo "📋 Updating S3 bucket policy..."

# Create a new bucket policy that allows uploads to users/* path
cat > bucket-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowPublicRead",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::mvp-labeler-storage/*"
    },
    {
      "Sid": "AllowUserUploads",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::123456789012:user/mvp-labeler-user"
      },
      "Action": [
        "s3:PutObject",
        "s3:PutObjectAcl",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::mvp-labeler-storage/*",
        "arn:aws:s3:::mvp-labeler-storage/users/*"
      ]
    }
  ]
}
EOF

echo "📄 Created bucket policy:"
cat bucket-policy.json

echo ""
echo "🔐 Applying bucket policy..."
aws s3api put-bucket-policy \
    --bucket $BUCKET_NAME \
    --policy file://bucket-policy.json \
    --region $REGION

if [ $? -eq 0 ]; then
    echo "✅ S3 bucket policy updated successfully!"
    echo "🧪 Testing S3 access..."
    
    # Test upload to users path
    echo "test upload" > test-upload.txt
    aws s3 cp test-upload.txt s3://$BUCKET_NAME/users/test/test-upload.txt --region $REGION
    
    if [ $? -eq 0 ]; then
        echo "✅ Test upload successful!"
        echo "🧹 Cleaning up test file..."
        aws s3 rm s3://$BUCKET_NAME/users/test/test-upload.txt --region $REGION
        rm test-upload.txt
        echo "🎉 S3 permissions are now working!"
    else
        echo "❌ Test upload failed"
    fi
else
    echo "❌ Failed to update S3 bucket policy"
    echo "💡 You may need to run this script with elevated permissions"
fi

# Clean up
rm -f bucket-policy.json
