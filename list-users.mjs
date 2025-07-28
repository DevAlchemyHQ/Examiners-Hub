import { CognitoIdentityProviderClient, ListUsersCommand } from '@aws-sdk/client-cognito-identity-provider';

const client = new CognitoIdentityProviderClient({ region: 'eu-west-2' });

async function listUsers() {
  try {
    const command = new ListUsersCommand({
      UserPoolId: 'eu-west-2_opMigZV21'
    });

    const response = await client.send(command);
    
    console.log('📊 All Users in Cognito:');
    console.log('========================');
    
    if (response.Users && response.Users.length > 0) {
      response.Users.forEach((user, index) => {
        console.log(`\n👤 User ${index + 1}:`);
        console.log(`   Username: ${user.Username}`);
        console.log(`   Status: ${user.UserStatus}`);
        console.log(`   Enabled: ${user.Enabled}`);
        console.log(`   Created: ${user.UserCreateDate}`);
        
        if (user.Attributes) {
          const emailAttr = user.Attributes.find(attr => attr.Name === 'email');
          const nameAttr = user.Attributes.find(attr => attr.Name === 'name');
          
          if (emailAttr) console.log(`   Email: ${emailAttr.Value}`);
          if (nameAttr) console.log(`   Name: ${nameAttr.Value}`);
        }
      });
      
      console.log(`\n📈 Total Users: ${response.Users.length}`);
    } else {
      console.log('No users found in the User Pool.');
    }
    
  } catch (error) {
    console.error('❌ Error listing users:', error.message);
  }
}

listUsers(); 