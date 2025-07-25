#!/bin/bash

echo "🧪 Testing Lambda function..."

# Create test payload
PAYLOAD='{"selectedImages":[{"id":"test1","filename":"test.jpg","s3Key":"users/timsdng@gmail.com/images/test.jpg"}],"formData":{"projectName":"Test","description":"Test"}}'

# Test the function with base64 encoded payload
aws lambda invoke \
    --function-name download-generator \
    --payload "$PAYLOAD" \
    response.json \
    --region eu-west-2

echo "📄 Response saved to response.json"
echo "📋 Response content:"
if [ -f response.json ]; then
    cat response.json
else
    echo "No response file created"
fi

echo ""
echo "📊 Function status:"
aws lambda get-function --function-name download-generator --region eu-west-2 --query 'Configuration.{FunctionName:FunctionName,Runtime:Runtime,Handler:Handler,Timeout:Timeout,MemorySize:MemorySize}' --output table 