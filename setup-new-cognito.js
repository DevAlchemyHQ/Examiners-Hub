import { CognitoIdentityProviderClient, CreateUserPoolCommand, CreateUserPoolClientCommand, AdminCreateUserCommand, AdminSetUserPasswordCommand } from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

// AWS Configuration
const AWS_CONFIG = {
  region: 'eu-west-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
};

const cognitoClient = new CognitoIdentityProviderClient(AWS_CONFIG);
const dynamoClient = new DynamoDBClient(AWS_CONFIG);
const docClient = DynamoDBDocumentClient.from(dynamoClient);

async function createNewUserPool() {
  try {
    console.log('🚀 Creating new Cognito User Pool...');
    
    // Create User Pool
    const createPoolCommand = new CreateUserPoolCommand({
      PoolName: 'mvp-labeler-real-users',
      Policies: {
        PasswordPolicy: {
          MinimumLength: 8,
          RequireUppercase: false,
          RequireLowercase: false,
          RequireNumbers: false,
          RequireSymbols: false
        }
      },
      AutoVerifiedAttributes: ['email'],
      UsernameAttributes: ['email'],
      MfaConfiguration: 'OFF',
      AdminCreateUserConfig: {
        AllowAdminCreateUserOnly: false
      }
    });
    
    const poolResult = await cognitoClient.send(createPoolCommand);
    const userPoolId = poolResult.UserPool.Id;
    console.log('✅ User Pool created:', userPoolId);
    
    // Create App Client
    const createClientCommand = new CreateUserPoolClientCommand({
      UserPoolId: userPoolId,
      ClientName: 'mvp-labeler-web-client',
      GenerateSecret: false,
      ExplicitAuthFlows: [
        'ALLOW_USER_PASSWORD_AUTH',
        'ALLOW_REFRESH_TOKEN_AUTH'
      ]
    });
    
    const clientResult = await cognitoClient.send(createClientCommand);
    const clientId = clientResult.UserPoolClient.ClientId;
    console.log('✅ App Client created:', clientId);
    
    // Get users from DynamoDB
    console.log('📊 Fetching users from DynamoDB...');
    const scanCommand = new ScanCommand({
      TableName: 'mvp-labeler-profiles'
    });
    
    const usersResult = await docClient.send(scanCommand);
    const users = usersResult.Items || [];
    console.log(`Found ${users.length} users in DynamoDB`);
    
    // Create Cognito users
    for (const user of users) {
      try {
        console.log(`👤 Creating Cognito user for: ${user.email}`);
        
        // Create user
        const createUserCommand = new AdminCreateUserCommand({
          UserPoolId: userPoolId,
          Username: user.email,
          UserAttributes: [
            {
              Name: 'email',
              Value: user.email
            },
            {
              Name: 'email_verified',
              Value: 'true'
            },
            {
              Name: 'name',
              Value: user.full_name || 'User'
            }
          ],
          MessageAction: 'SUPPRESS' // Don't send welcome email
        });
        
        await cognitoClient.send(createUserCommand);
        
        // Set a default password (user will need to change on first login)
        const setPasswordCommand = new AdminSetUserPasswordCommand({
          UserPoolId: userPoolId,
          Username: user.email,
          Password: 'TempPass123!',
          Permanent: false // User must change password on first login
        });
        
        await cognitoClient.send(setPasswordCommand);
        console.log(`✅ Created user: ${user.email}`);
        
      } catch (error) {
        console.error(`❌ Failed to create user ${user.email}:`, error.message);
      }
    }
    
    console.log('\n🎉 Setup Complete!');
    console.log('User Pool ID:', userPoolId);
    console.log('App Client ID:', clientId);
    console.log('\n📋 Environment Variables for Vercel:');
    console.log('VITE_AWS_USER_POOL_ID=' + userPoolId);
    console.log('VITE_AWS_USER_POOL_WEB_CLIENT_ID=' + clientId);
    console.log('VITE_AWS_REGION=eu-west-2');
    console.log('VITE_AWS_ACCESS_KEY_ID=' + process.env.AWS_ACCESS_KEY_ID);
    console.log('VITE_AWS_SECRET_ACCESS_KEY=' + process.env.AWS_SECRET_ACCESS_KEY);
    
  } catch (error) {
    console.error('❌ Error creating User Pool:', error);
  }
}

// Run the setup
createNewUserPool(); 