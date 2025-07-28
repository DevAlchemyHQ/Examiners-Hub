import { CognitoIdentityProviderClient, AdminGetUserCommand } from '@aws-sdk/client-cognito-identity-provider';

const client = new CognitoIdentityProviderClient({ region: 'eu-west-2' });

async function debugUser() {
  try {
    const command = new AdminGetUserCommand({
      UserPoolId: 'eu-west-2_opMigZV21',
      Username: '69tn69@gmail.com'
    });

    const response = await client.send(command);
    
    console.log('🔍 User Debug Info:');
    console.log('==================');
    console.log(`Username: ${response.Username}`);
    console.log(`UserStatus: ${response.UserStatus}`);
    console.log(`Enabled: ${response.Enabled}`);
    console.log(`UserCreateDate: ${response.UserCreateDate}`);
    
    console.log('\n📋 User Attributes:');
    console.log('==================');
    if (response.UserAttributes) {
      response.UserAttributes.forEach(attr => {
        console.log(`${attr.Name}: ${attr.Value}`);
      });
    }
    
    // Check if email_verified attribute exists
    const emailVerifiedAttr = response.UserAttributes?.find(attr => attr.Name === 'email_verified');
    console.log(`\n🔍 email_verified attribute: ${emailVerifiedAttr ? emailVerifiedAttr.Value : 'NOT FOUND'}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugUser(); 