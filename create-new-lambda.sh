#!/bin/bash

echo "🚀 Creating new Lambda function with S3 permissions..."

# Create a new Lambda function with a different name
FUNCTION_NAME="download-generator-fixed"
REGION="eu-west-2"
ZIP_FILE="lambda-package/simple-lambda/lambda-es-module.zip"

echo "📦 Checking ZIP file..."
if [ ! -f "$ZIP_FILE" ]; then
    echo "❌ ZIP file not found: $ZIP_FILE"
    exit 1
fi

echo "✅ ZIP file found"

echo "🔧 Creating new Lambda function..."
aws lambda create-function \
    --function-name $FUNCTION_NAME \
    --runtime nodejs18.x \
    --role arn:aws:iam::913524945607:role/service-role/download-generator-role-hn3e1qhh \
    --handler index.handler \
    --zip-file fileb://$ZIP_FILE \
    --region $REGION \
    --timeout 30 \
    --memory-size 512 \
    --environment Variables='{S3_BUCKET_NAME=mvp-labeler-storage}'

if [ $? -eq 0 ]; then
    echo "✅ Lambda function created successfully!"
    echo "🧪 Testing the new function..."
    
    # Test the function
    aws lambda invoke \
        --function-name $FUNCTION_NAME \
        --payload fileb://test-payload-final.json \
        response-new.json \
        --region $REGION
    
    if [ $? -eq 0 ]; then
        echo "📄 Response:"
        cat response-new.json
        echo ""
        echo "🎉 New Lambda function is working!"
        echo "📋 Function name: $FUNCTION_NAME"
        echo "🔗 Use this function name in your frontend"
    else
        echo "❌ Lambda function test failed"
    fi
else
    echo "❌ Failed to create Lambda function"
fi 