#!/bin/bash

# AWS Lambda Deployment Script
# This script deploys the download-generator Lambda function

echo "🚀 Starting Lambda deployment..."

# Set variables
FUNCTION_NAME="download-generator"
REGION="eu-west-2"
ZIP_FILE="lambda-package/simple-lambda/lambda.zip"
HANDLER="index.handler"
RUNTIME="nodejs18.x"
TIMEOUT=30
MEMORY_SIZE=512

echo "📋 Configuration:"
echo "  Function Name: $FUNCTION_NAME"
echo "  Region: $REGION"
echo "  ZIP File: $ZIP_FILE"
echo "  Handler: $HANDLER"
echo "  Runtime: $RUNTIME"
echo "  Timeout: $TIMEOUT seconds"
echo "  Memory: $MEMORY_SIZE MB"

# Check if ZIP file exists
if [ ! -f "$ZIP_FILE" ]; then
    echo "❌ Error: ZIP file not found at $ZIP_FILE"
    exit 1
fi

echo "✅ ZIP file found"

# Check if function already exists
echo "🔍 Checking if function exists..."
FUNCTION_EXISTS=$(aws lambda list-functions --region $REGION --query "Functions[?FunctionName=='$FUNCTION_NAME'].FunctionName" --output text)

if [ "$FUNCTION_EXISTS" = "$FUNCTION_NAME" ]; then
    echo "📝 Function exists, updating code..."
    
    # Update function code
    aws lambda update-function-code \
        --function-name $FUNCTION_NAME \
        --zip-file fileb://$ZIP_FILE \
        --region $REGION
    
    if [ $? -eq 0 ]; then
        echo "✅ Function code updated successfully"
    else
        echo "❌ Failed to update function code"
        exit 1
    fi
    
    # Update function configuration
    echo "⚙️  Updating function configuration..."
    aws lambda update-function-configuration \
        --function-name $FUNCTION_NAME \
        --timeout $TIMEOUT \
        --memory-size $MEMORY_SIZE \
        --environment Variables='{S3_BUCKET_NAME=mvp-labeler-storage}' \
        --region $REGION
    
    if [ $? -eq 0 ]; then
        echo "✅ Function configuration updated successfully"
    else
        echo "❌ Failed to update function configuration"
        exit 1
    fi
    
else
    echo "🆕 Function doesn't exist, creating new function..."
    
    # Get account ID
    ACCOUNT_ID=$(aws sts get-caller-identity --query 'Account' --output text)
    
    if [ $? -ne 0 ]; then
        echo "❌ Failed to get account ID"
        exit 1
    fi
    
    echo "📝 Account ID: $ACCOUNT_ID"
    
    # Create function
    aws lambda create-function \
        --function-name $FUNCTION_NAME \
        --runtime $RUNTIME \
        --role arn:aws:iam::$ACCOUNT_ID:role/lambda-execution-role \
        --handler $HANDLER \
        --zip-file fileb://$ZIP_FILE \
        --timeout $TIMEOUT \
        --memory-size $MEMORY_SIZE \
        --environment Variables='{S3_BUCKET_NAME=mvp-labeler-storage}' \
        --region $REGION
    
    if [ $? -eq 0 ]; then
        echo "✅ Function created successfully"
    else
        echo "❌ Failed to create function"
        echo "💡 You may need to create the IAM role first"
        echo "💡 Or the function name might already exist"
        exit 1
    fi
fi

echo ""
echo "🎉 Deployment completed!"
echo ""
echo "📋 Next steps:"
echo "1. Test the function in AWS Console"
echo "2. Check CloudWatch logs for any errors"
echo "3. Verify environment variables are set"
echo ""
echo "🔗 Test command:"
echo "aws lambda invoke --function-name $FUNCTION_NAME --payload '{\"selectedImages\":[{\"id\":\"test1\",\"filename\":\"test.jpg\",\"s3Key\":\"users/timsdng@gmail.com/images/test.jpg\"}],\"formData\":{\"projectName\":\"Test\",\"description\":\"Test\"}}' response.json --region $REGION" 