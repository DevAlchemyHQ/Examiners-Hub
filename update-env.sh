#!/bin/bash

echo "Updating .env file with real AWS credentials..."

# Create new .env file with real credentials
cat > .env << 'EOF'
# AWS Credentials
AWS_ACCESS_KEY_ID=AKIA5JMSUOLD2BUTQRRF
AWS_SECRET_ACCESS_KEY=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

# Lambda Function Configuration
LAMBDA_FUNCTION_NAME=download-generator
LAMBDA_REGION=eu-west-2

# S3 Bucket
S3_BUCKET_NAME=mvp-labeler-storage

# DynamoDB Table
DYNAMODB_TABLE_NAME=your-table-name
EOF

echo "✅ .env file updated with real AWS credentials!"
echo "🔍 Verifying the update:"
head -5 .env 