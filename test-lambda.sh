#!/bin/bash

echo "🧪 Testing Lambda function..."

# Test the function
aws lambda invoke \
    --function-name download-generator \
    --payload '{"selectedImages":[{"id":"test1","filename":"test.jpg","s3Key":"users/timsdng@gmail.com/images/test.jpg"}],"formData":{"projectName":"Test","description":"Test"}}' \
    response.json \
    --region eu-west-2

echo "📄 Response saved to response.json"
echo "📋 Response content:"
cat response.json

echo ""
echo "📊 Function status:"
aws lambda get-function --function-name download-generator --region eu-west-2 --query 'Configuration.{FunctionName:FunctionName,Runtime:Runtime,Handler:Handler,Timeout:Timeout,MemorySize:MemorySize}' --output table 