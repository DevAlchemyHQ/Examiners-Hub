#!/bin/bash

USER_POOL_ID="eu-west-2_basIjrpjG"

echo "👤 Creating users in Cognito User Pool..."

# Get users from DynamoDB
echo "📊 Fetching users from DynamoDB..."
USERS=$(aws dynamodb scan --table-name mvp-labeler-profiles --query 'Items[*].[email.S,full_name.S]' --output text)

echo "Found users:"
echo "$USERS"

# Create each user in Cognito
while IFS=$'\t' read -r email full_name; do
    if [ ! -z "$email" ]; then
        echo "Creating user: $email ($full_name)"
        
        # Create user in Cognito
        aws cognito-idp admin-create-user \
            --user-pool-id "$USER_POOL_ID" \
            --username "$email" \
            --user-attributes Name=email,Value="$email" Name=email_verified,Value=true Name=name,Value="$full_name" \
            --message-action SUPPRESS
        
        # Set temporary password
        aws cognito-idp admin-set-user-password \
            --user-pool-id "$USER_POOL_ID" \
            --username "$email" \
            --password "TempPass123!" \
            --permanent false
        
        echo "✅ Created user: $email"
    fi
done <<< "$USERS"

echo ""
echo "🎉 All users created!"
echo "Users can now login with their email and temporary password: TempPass123!"
echo "They will be prompted to change password on first login." 