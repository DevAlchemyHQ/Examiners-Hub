#!/bin/bash

echo "🔧 Setting up SES permissions for IAM user..."

# Create the policy
echo "📝 Creating SES policy..."
aws iam create-policy \
  --policy-name ExametrySESPolicy \
  --policy-document file://ses-policy.json \
  --description "SES and DynamoDB permissions for Exametry verification system" \
  --region eu-west-2

# Attach the policy to the user
echo "🔗 Attaching policy to user..."
aws iam attach-user-policy \
  --user-name Exametry_migrate \
  --policy-arn arn:aws:iam::913524945607:policy/ExametrySESPolicy \
  --region eu-west-2

echo "✅ SES permissions applied successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Verify your domain in SES console: https://eu-west-2.console.aws.amazon.com/ses/"
echo "2. Add the TXT record to your DNS for exametry.xyz"
echo "3. Request to move out of SES sandbox mode if needed"
echo ""
echo "🔍 You can now run: node setup-ses-permissions.js" 