#!/bin/bash

echo "🚀 Creating new Cognito User Pool..."

# Create User Pool
USER_POOL_RESPONSE=$(aws cognito-idp create-user-pool \
  --pool-name "mvp-labeler-real-users" \
  --auto-verified-attributes email \
  --username-attributes email \
  --mfa-configuration OFF \
  --admin-create-user-config '{"AllowAdminCreateUserOnly":false}' \
  --policies '{"PasswordPolicy":{"MinimumLength":8,"RequireUppercase":false,"RequireLowercase":false,"RequireNumbers":false,"RequireSymbols":false}}')

echo "✅ User Pool created:"
echo "$USER_POOL_RESPONSE"

# Extract User Pool ID
USER_POOL_ID=$(echo "$USER_POOL_RESPONSE" | jq -r '.UserPool.Id')
echo "User Pool ID: $USER_POOL_ID"

# Create App Client
CLIENT_RESPONSE=$(aws cognito-idp create-user-pool-client \
  --user-pool-id "$USER_POOL_ID" \
  --client-name "mvp-labeler-web-client" \
  --no-generate-secret \
  --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH)

echo "✅ App Client created:"
echo "$CLIENT_RESPONSE"

# Extract Client ID
CLIENT_ID=$(echo "$CLIENT_RESPONSE" | jq -r '.UserPoolClient.ClientId')
echo "App Client ID: $CLIENT_ID"

echo ""
echo "🎉 Setup Complete!"
echo "User Pool ID: $USER_POOL_ID"
echo "App Client ID: $CLIENT_ID"
echo ""
echo "📋 Environment Variables for Vercel:"
echo "VITE_AWS_USER_POOL_ID=$USER_POOL_ID"
echo "VITE_AWS_USER_POOL_WEB_CLIENT_ID=$CLIENT_ID"
echo "VITE_AWS_REGION=eu-west-2" 