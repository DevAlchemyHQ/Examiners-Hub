#!/bin/bash

# Script to fix Lambda IAM permissions for S3 access
# Run this script with appropriate AWS permissions

echo "🔧 Fixing Lambda IAM permissions..."

# Get the Lambda function details
FUNCTION_NAME="download-generator"
REGION="eu-west-2"

echo "📋 Getting Lambda function details..."
FUNCTION_INFO=$(aws lambda get-function --function-name $FUNCTION_NAME --region $REGION --query 'Configuration.Role' --output text)

if [ $? -eq 0 ]; then
    echo "✅ Lambda function found"
    echo "Role: $FUNCTION_INFO"
    
    # Extract role name from ARN
    ROLE_NAME=$(echo $FUNCTION_INFO | sed 's/.*role\///')
    echo "Role name: $ROLE_NAME"
    
    echo "🔐 Adding S3 permissions to role..."
    
    # Create inline policy for S3 access
    aws iam put-role-policy \
        --role-name $ROLE_NAME \
        --policy-name LambdaS3Access \
        --policy-document '{
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Action": [
                        "s3:GetObject",
                        "s3:PutObject",
                        "s3:ListBucket"
                    ],
                    "Resource": [
                        "arn:aws:s3:::mvp-labeler-storage",
                        "arn:aws:s3:::mvp-labeler-storage/*"
                    ]
                }
            ]
        }'
    
    if [ $? -eq 0 ]; then
        echo "✅ S3 permissions added successfully!"
        echo "🧪 Testing Lambda function..."
        
        # Test the function
        aws lambda invoke \
            --function-name $FUNCTION_NAME \
            --payload '{"selectedImages":[{"id":"test1","filename":"test.jpg","s3Key":"users/timsdng@gmail.com/images/test.jpg"}],"formData":{"projectName":"Test","description":"Test"}}' \
            response-test.json \
            --region $REGION
        
        if [ $? -eq 0 ]; then
            echo "📄 Response:"
            cat response-test.json
            echo ""
            echo "🎉 Lambda function is now working!"
        else
            echo "❌ Lambda function test failed"
        fi
    else
        echo "❌ Failed to add S3 permissions"
        echo "💡 You may need to run this script with elevated permissions"
    fi
else
    echo "❌ Failed to get Lambda function details"
fi 