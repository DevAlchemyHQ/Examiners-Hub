import { CognitoIdentityProviderClient, AdminGetUserCommand } from '@aws-sdk/client-cognito-identity-provider';

const client = new CognitoIdentityProviderClient({ region: 'eu-west-2' });

async function debugUserAttributes() {
  try {
    const command = new AdminGetUserCommand({
      UserPoolId: 'eu-west-2_opMigZV21',
      Username: '69tn69@gmail.com'
    });

    const response = await client.send(command);
    
    console.log('🔍 Detailed User Analysis:');
    console.log('==========================');
    console.log(`Username: ${response.Username}`);
    console.log(`UserStatus: ${response.UserStatus}`);
    console.log(`Enabled: ${response.Enabled}`);
    console.log(`UserCreateDate: ${response.UserCreateDate}`);
    
    console.log('\n📋 All User Attributes:');
    console.log('=======================');
    if (response.UserAttributes) {
      response.UserAttributes.forEach(attr => {
        console.log(`${attr.Name}: ${attr.Value}`);
      });
    }
    
    // Check specific attributes
    const emailAttr = response.UserAttributes?.find(attr => attr.Name === 'email');
    const emailVerifiedAttr = response.UserAttributes?.find(attr => attr.Name === 'email_verified');
    const subAttr = response.UserAttributes?.find(attr => attr.Name === 'sub');
    
    console.log('\n🔍 Key Attribute Analysis:');
    console.log('==========================');
    console.log(`Email: ${emailAttr ? emailAttr.Value : 'NOT FOUND'}`);
    console.log(`Email Verified: ${emailVerifiedAttr ? emailVerifiedAttr.Value : 'NOT FOUND'}`);
    console.log(`User ID (sub): ${subAttr ? subAttr.Value : 'NOT FOUND'}`);
    
    // Analysis
    console.log('\n📊 Analysis:');
    console.log('============');
    if (response.UserStatus === 'CONFIRMED' && emailVerifiedAttr?.Value === 'false') {
      console.log('❌ ISSUE: User is CONFIRMED but email_verified is false');
      console.log('💡 This is why password reset fails - Cognito needs email_verified=true');
    } else if (response.UserStatus === 'CONFIRMED' && emailVerifiedAttr?.Value === 'true') {
      console.log('✅ User is properly verified');
    } else {
      console.log(`⚠️  User status: ${response.UserStatus}, email_verified: ${emailVerifiedAttr?.Value}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugUserAttributes(); 