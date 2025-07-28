import { CognitoIdentityProviderClient, ListUsersCommand, AdminUpdateUserAttributesCommand } from '@aws-sdk/client-cognito-identity-provider';

const client = new CognitoIdentityProviderClient({ region: 'eu-west-2' });

async function fixAllUsersEmailVerified() {
  try {
    console.log('🔧 Fixing email_verified attribute for all users...');
    
    // First, list all users
    const listCommand = new ListUsersCommand({
      UserPoolId: 'eu-west-2_opMigZV21'
    });
    
    const response = await client.send(listCommand);
    
    console.log(`📊 Found ${response.Users?.length || 0} users`);
    
    if (response.Users) {
      for (const user of response.Users) {
        console.log(`\n👤 Processing user: ${user.Username}`);
        console.log(`   Status: ${user.UserStatus}`);
        
        // Check if user is CONFIRMED but email_verified might be false
        if (user.UserStatus === 'CONFIRMED') {
          const emailVerifiedAttr = user.Attributes?.find(attr => attr.Name === 'email_verified');
          console.log(`   Email Verified: ${emailVerifiedAttr ? emailVerifiedAttr.Value : 'NOT FOUND'}`);
          
          // Fix if email_verified is false or missing
          if (!emailVerifiedAttr || emailVerifiedAttr.Value === 'false') {
            console.log(`   🔧 Fixing email_verified for ${user.Username}...`);
            
            try {
              const updateCommand = new AdminUpdateUserAttributesCommand({
                UserPoolId: 'eu-west-2_opMigZV21',
                Username: user.Username,
                UserAttributes: [
                  {
                    Name: 'email_verified',
                    Value: 'true'
                  }
                ]
              });
              
              await client.send(updateCommand);
              console.log(`   ✅ Fixed email_verified for ${user.Username}`);
            } catch (updateError) {
              console.log(`   ❌ Failed to fix ${user.Username}:`, updateError.message);
            }
          } else {
            console.log(`   ✅ ${user.Username} already has email_verified=true`);
          }
        } else {
          console.log(`   ⏭️  Skipping ${user.Username} (not CONFIRMED)`);
        }
      }
    }
    
    console.log('\n🎉 Finished processing all users!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fixAllUsersEmailVerified(); 