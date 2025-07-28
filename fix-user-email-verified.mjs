import { CognitoIdentityProviderClient, AdminUpdateUserAttributesCommand } from '@aws-sdk/client-cognito-identity-provider';

const client = new CognitoIdentityProviderClient({ region: 'eu-west-2' });

async function fixUserEmailVerified() {
  try {
    console.log('🔧 Fixing email_verified attribute for user...');
    
    const command = new AdminUpdateUserAttributesCommand({
      UserPoolId: 'eu-west-2_opMigZV21',
      Username: '69tn69@gmail.com',
      UserAttributes: [
        {
          Name: 'email_verified',
          Value: 'true'
        }
      ]
    });

    await client.send(command);
    
    console.log('✅ Successfully updated email_verified to true');
    console.log('🎉 User should now be able to reset password!');
    
  } catch (error) {
    console.error('❌ Error updating user attributes:', error.message);
  }
}

fixUserEmailVerified(); 