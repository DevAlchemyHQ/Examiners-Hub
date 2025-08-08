#!/bin/bash

# Create HTTP API Gateway in EU West 2 for download-generator Lambda

echo "🚀 Creating HTTP API Gateway in EU West 2..."

REGION="eu-west-2"
FUNCTION_NAME="download-generator"
API_NAME="mvp-labeler-download-api-eu"
ACCOUNT_ID=$(aws sts get-caller-identity --query 'Account' --output text)

if [ $? -ne 0 ]; then
    echo "❌ Failed to get account ID"
    exit 1
fi

echo "📝 Account ID: $ACCOUNT_ID"
echo "📝 Region: $REGION"
echo "📝 Function: $FUNCTION_NAME"

# Step 1: Create HTTP API
echo "🔧 Creating HTTP API..."
API_RESPONSE=$(aws apigatewayv2 create-api \
    --name "$API_NAME" \
    --protocol-type HTTP \
    --description "HTTP API for MVP Labeler download functionality in EU West 2" \
    --cors-configuration AllowCredentials=false,AllowHeaders="Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",AllowMethods="GET,POST,OPTIONS",AllowOrigins="*",MaxAge=86400 \
    --region $REGION \
    --output json)

if [ $? -ne 0 ]; then
    echo "❌ Failed to create API"
    exit 1
fi

API_ID=$(echo "$API_RESPONSE" | jq -r '.ApiId')
API_ENDPOINT=$(echo "$API_RESPONSE" | jq -r '.ApiEndpoint')

echo "✅ API created successfully"
echo "📝 API ID: $API_ID"
echo "📝 API Endpoint: $API_ENDPOINT"

# Step 2: Create Integration
echo "🔧 Creating Lambda integration..."
INTEGRATION_RESPONSE=$(aws apigatewayv2 create-integration \
    --api-id "$API_ID" \
    --integration-type AWS_PROXY \
    --integration-method POST \
    --integration-uri "arn:aws:lambda:$REGION:$ACCOUNT_ID:function:$FUNCTION_NAME" \
    --payload-format-version "2.0" \
    --region $REGION \
    --output json)

if [ $? -ne 0 ]; then
    echo "❌ Failed to create integration"
    exit 1
fi

INTEGRATION_ID=$(echo "$INTEGRATION_RESPONSE" | jq -r '.IntegrationId')
echo "✅ Integration created successfully"
echo "📝 Integration ID: $INTEGRATION_ID"

# Step 3: Create Route
echo "🔧 Creating route..."
ROUTE_RESPONSE=$(aws apigatewayv2 create-route \
    --api-id "$API_ID" \
    --route-key "POST /download" \
    --target "integrations/$INTEGRATION_ID" \
    --region $REGION \
    --output json)

if [ $? -ne 0 ]; then
    echo "❌ Failed to create route"
    exit 1
fi

ROUTE_ID=$(echo "$ROUTE_RESPONSE" | jq -r '.RouteId')
echo "✅ Route created successfully"
echo "📝 Route ID: $ROUTE_ID"

# Step 4: Add Lambda permission for API Gateway
echo "🔧 Adding Lambda permission for API Gateway..."
PERMISSION_RESULT=$(aws lambda add-permission \
    --function-name "$FUNCTION_NAME" \
    --statement-id "api-gateway-invoke-$(date +%s)" \
    --action "lambda:InvokeFunction" \
    --principal "apigateway.amazonaws.com" \
    --source-arn "arn:aws:execute-api:$REGION:$ACCOUNT_ID:$API_ID/*/*" \
    --region $REGION \
    --output json 2>/dev/null)

if [ $? -eq 0 ]; then
    echo "✅ Lambda permission added successfully"
else
    echo "⚠️  Lambda permission may already exist (this is okay)"
fi

# Step 5: Create or update $default stage (auto-deploy)
echo "🔧 Creating/updating default stage..."
STAGE_RESPONSE=$(aws apigatewayv2 create-stage \
    --api-id "$API_ID" \
    --stage-name '$default' \
    --auto-deploy \
    --region $REGION \
    --output json 2>/dev/null)

if [ $? -ne 0 ]; then
    echo "⚠️  Default stage may already exist, trying to update..."
    aws apigatewayv2 update-stage \
        --api-id "$API_ID" \
        --stage-name '$default' \
        --auto-deploy \
        --region $REGION \
        --output json > /dev/null
fi

echo ""
echo "🎉 API Gateway setup completed!"
echo ""
echo "📋 Summary:"
echo "  API ID: $API_ID"
echo "  Region: $REGION"
echo "  Full API URL: ${API_ENDPOINT}/download"
echo ""
echo "🔗 Update your frontend configuration with:"
echo "  prodUrl = \"${API_ENDPOINT}/download\";"
echo ""
echo "🧪 Test command:"
echo "curl -X POST ${API_ENDPOINT}/download \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"selectedImages\": [], \"formData\": {\"date\": \"2025-01-25\", \"elr\": \"TEST\", \"structureNo\": \"TEST\"}, \"mode\": \"images\"}'"
