// AWS Services Configuration
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, DeleteCommand, QueryCommand, ScanCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { CognitoIdentityProviderClient, InitiateAuthCommand, SignUpCommand, ConfirmSignUpCommand, AdminCreateUserCommand, AdminGetUserCommand, AdminInitiateAuthCommand, AdminDeleteUserCommand, AdminConfirmSignUpCommand, AdminUpdateUserAttributesCommand, ForgotPasswordCommand, ConfirmForgotPasswordCommand, ResendConfirmationCodeCommand } from '@aws-sdk/client-cognito-identity-provider';

// AWS Configuration
const AWS_CONFIG = {
  region: 'eu-west-2',
  credentials: {
    accessKeyId: 'AKIA5JMSUOLD2BUTQRRF',
    secretAccessKey: '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'
  }
};

// Initialize AWS clients
const dynamoClient = new DynamoDBClient(AWS_CONFIG);
// CRITICAL: Configure DynamoDB Document Client to remove undefined values
// DynamoDB doesn't accept undefined values - they must be removed before sending
const docClient = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: {
    removeUndefinedValues: true, // Remove undefined values (required for DynamoDB)
    convertEmptyValues: false,
  },
  unmarshallOptions: {
    wrapNumbers: false,
  },
});
const s3Client = new S3Client(AWS_CONFIG);
const cognitoClient = new CognitoIdentityProviderClient(AWS_CONFIG);

// AWS Resource Names
const BUCKET_NAME = 'mvp-labeler-storage';
const USER_POOL_ID = 'eu-west-2_opMigZV21';
const CLIENT_ID = '71l7r90qjn5r3tp3theqfahsn2';

// Authentication Service
export class AuthService {
  static async checkUserStatus(email: string) {
    console.log('🔍 checkUserStatus called for:', email);
    try {
      const userCommand = new AdminGetUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: email
      });
      
      console.log('📞 Sending AdminGetUserCommand to Cognito...');
      const userResult = await cognitoClient.send(userCommand);
      console.log('✅ AdminGetUserCommand successful:', userResult);
      
      // The user data is directly in the response, not in a 'User' property
      const user = userResult;
      console.log('👤 User object:', user);
      
      // Check if user exists and has UserStatus
      if (!user || !user.UserStatus) {
        console.log('❌ User object is null or missing UserStatus');
        return {
          exists: false,
          verified: false,
          status: 'NOT_FOUND'
        };
      }
      
      console.log('✅ User found with status:', user.UserStatus);
      return {
        exists: true,
        verified: user.UserStatus === 'CONFIRMED',
        status: user.UserStatus
      };
    } catch (error: any) {
      console.error('❌ Error in checkUserStatus:', error);
      console.error('❌ Error name:', error.name);
      console.error('❌ Error message:', error.message);
      
      if (error.name === 'UserNotFoundException') {
        console.log('✅ UserNotFoundException caught - user does not exist');
        return {
          exists: false,
          verified: false,
          status: 'NOT_FOUND'
        };
      }
      
      console.log('❌ Unknown error type, re-throwing:', error.name);
      throw error;
    }
  }

  static async checkUnverifiedUserVerificationCode(email: string) {
    try {
      // Import VerificationService dynamically to avoid circular dependencies
      const { VerificationService } = await import('./verificationService');
      
      // Check if there's a valid verification code for this email
      const oneHourAgo = Date.now() - (60 * 60 * 1000); // 1 hour ago
      
      const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
      const { DynamoDBDocumentClient, QueryCommand } = await import('@aws-sdk/lib-dynamodb');
      
      const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'eu-west-2' }));
      
      const response = await dynamoClient.send(new QueryCommand({
        TableName: 'mvp-labeler-verification-codes',
        KeyConditionExpression: 'email = :email',
        FilterExpression: 'type = :type AND createdAt > :oneHourAgo AND used = :used',
        ExpressionAttributeValues: {
          ':email': email,
          ':type': 'verification',
          ':oneHourAgo': oneHourAgo,
          ':used': false
        }
      }));

      return {
        hasValidCode: (response.Items?.length || 0) > 0,
        codeCount: response.Items?.length || 0
      };
    } catch (error) {
      console.error('Error checking verification code:', error);
      return {
        hasValidCode: false,
        codeCount: 0
      };
    }
  }

  static async signUpWithEmail(email: string, password: string, fullName?: string): Promise<{ user: any; session: any; error: any }> {
    console.log('🚀 NEW CODE VERSION - signUpWithEmail called for:', email);
    try {
      console.log('🔐 AWS Cognito signup for:', email);
      
      const signUpCommand = new SignUpCommand({
        ClientId: CLIENT_ID,
        Username: email,
        Password: password,
        UserAttributes: [
          {
            Name: 'email',
            Value: email
          },
          {
            Name: 'name',
            Value: fullName || ''
          }
        ]
      });
      
      const result = await cognitoClient.send(signUpCommand);
      console.log('✅ AWS Cognito signup successful:', result);
      
      return {
        user: {
          id: result.UserSub,
          email: email,
          user_metadata: { full_name: fullName }
        },
        session: null,
        error: null
      };
    } catch (error: any) {
      console.error('AWS Cognito signup error:', error);
      
      // Handle UsernameExistsException with our custom logic
      if (error.name === 'UsernameExistsException') {
        return await this.handleUsernameExistsException(email, password, fullName);
      }
      
      // Return a generic error for any other exceptions
      return { 
        user: null, 
        session: null, 
        error: { 
          message: 'Please check your information and try again.',
          originalError: error 
        }
      };
    }
  }

  static async handleUsernameExistsException(email: string, password: string, fullName?: string): Promise<{ user: any; session: any; error: any }> {
    console.log('🔄 User exists, checking verification status...');
    
    try {
      // Check if user exists and their verification status
      console.log('🔍 Checking user status for:', email);
      const userStatus = await this.checkUserStatus(email);
      console.log('📊 User status result:', userStatus);
      
      if (userStatus.exists && userStatus.verified) {
        console.log('✅ User exists and is verified - redirecting to signin');
        // User exists and is verified - they should sign in
        return { 
          user: null, 
          session: null, 
          error: { 
            message: 'An account with this email already exists and is verified. Please sign in instead.',
            type: 'USER_EXISTS_VERIFIED'
          }
        };
      } else if (userStatus.exists && !userStatus.verified) {
        console.log('⏳ User exists but is not verified - checking verification codes');
        // User exists but is not verified - check if they have a valid verification code
        const verificationCheck = await this.checkUnverifiedUserVerificationCode(email);
        console.log('🔐 Verification check result:', verificationCheck);
        
        if (verificationCheck.hasValidCode) {
          console.log('✅ User has valid verification code - redirecting to verification');
          // User has a valid verification code - ask them to check their email
          return {
            user: null,
            session: null,
            error: {
              message: 'An account with this email exists but is not verified. Please check your email for the verification code and complete the signup process.',
              type: 'USER_EXISTS_UNVERIFIED_WITH_CODE'
            }
          };
        } else {
          console.log('🗑️ User has no valid code - deleting and recreating account');
          // User exists but no valid code - delete the old account and create new one
          try {
            const deleteCommand = new AdminDeleteUserCommand({
              UserPoolId: USER_POOL_ID,
              Username: email
            });
            await cognitoClient.send(deleteCommand);
            console.log('🗑️ Deleted unverified user account for:', email);
            
            // Now try to create the account again (but avoid infinite recursion)
            try {
              const signUpCommand = new SignUpCommand({
                ClientId: CLIENT_ID,
                Username: email,
                Password: password,
                UserAttributes: [
                  {
                    Name: 'email',
                    Value: email
                  },
                  {
                    Name: 'name',
                    Value: fullName || ''
                  }
                ]
              });
              
              const result = await cognitoClient.send(signUpCommand);
              console.log('✅ AWS Cognito signup successful after deletion:', result);
              
              return {
                user: {
                  id: result.UserSub,
                  email: email,
                  user_metadata: { full_name: fullName }
                },
                session: null,
                error: null
              };
            } catch (retryError: any) {
              console.error('Retry signup failed:', retryError);
              return { 
                user: null, 
                session: null, 
                error: { 
                  message: 'Please check your information and try again.',
                  originalError: retryError 
                }
              };
            }
          } catch (deleteError) {
            console.error('Failed to delete unverified user:', deleteError);
            return {
              user: null,
              session: null,
              error: {
                message: 'Please check your information and try again.',
                originalError: deleteError
              }
            };
          }
        }
      }
      
      // Fallback for any other case
      console.log('❓ Unknown user status - returning generic error');
      return {
        user: null,
        session: null,
        error: {
          message: 'Please check your information and try again.',
          originalError: new Error('Unknown user status')
        }
      };
    } catch (error) {
      console.error('❌ Error in handleUsernameExistsException:', error);
      return {
        user: null,
        session: null,
        error: {
          message: 'Please check your information and try again.',
          originalError: error
        }
      };
    }
  }

  static async signInWithEmail(email: string, password: string) {
    try {
      console.log('🔐 AWS Cognito signin for:', email);
      
      const authCommand = new InitiateAuthCommand({
        ClientId: CLIENT_ID,
        AuthFlow: 'USER_PASSWORD_AUTH',
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password
        }
      });
      
      const result = await cognitoClient.send(authCommand);
      console.log('✅ AWS Cognito signin successful:', result);
      
      // Get user details
      const userCommand = new AdminGetUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: email
      });
      
      const userResult = await cognitoClient.send(userCommand);
      
      // Extract user attributes properly
      const userAttributes = (userResult as any).User?.Attributes || [];
      const nameAttribute = userAttributes.find((attr: any) => attr.Name === 'name');
      const fullName = nameAttribute ? nameAttribute.Value : '';
      
      return {
        user: {
          id: (userResult as any).User?.Username || email,
          email: email,
          user_metadata: { 
            full_name: fullName
          }
        },
        session: {
          access_token: result.AuthenticationResult?.AccessToken || '',
          refresh_token: result.AuthenticationResult?.RefreshToken || ''
        },
        error: null
      };
      } catch (error: any) {
      console.error('AWS Cognito signin error:', error);
      
      // Provide more helpful error messages
      let errorMessage = 'Invalid email or password';
      
      if (error.name === 'NotAuthorizedException') {
        errorMessage = 'Invalid email or password. Please check your credentials.';
      } else if (error.name === 'UserNotFoundException') {
        errorMessage = 'No account found with this email address. Please sign up first.';
      } else if (error.name === 'UserNotConfirmedException') {
        errorMessage = 'Please verify your email address before signing in.';
      } else if (error.name === 'LimitExceededException') {
        errorMessage = 'Too many login attempts. Please wait before trying again.';
      } else if (error.name === 'InvalidParameterException') {
        errorMessage = 'Invalid email format. Please check your email address.';
      }
      
      return { user: null, session: null, error: { message: errorMessage, originalError: error } };
    }
  }

  static async signOut() {
    try {
      console.log('🔐 AWS Cognito signout');
      // Cognito doesn't require explicit signout on client side
      return { error: null };
      } catch (error) {
        return { error };
    }
  }

  static async getCurrentUser() {
    try {
      console.log('🔐 AWS Cognito getCurrentUser');
      
      // Check localStorage for stored user session
      const storedUser = localStorage.getItem('user');
      const storedSession = localStorage.getItem('session');
      
      if (storedUser && storedSession) {
        try {
          const user = JSON.parse(storedUser);
          const session = JSON.parse(storedSession);
          
          // Verify the session is still valid by checking with AWS
          if (session.access_token) {
            // Fetch fresh user attributes from AWS Cognito
            const attributesResult = await this.getUserAttributes(user.email);
            if (attributesResult.success) {
              // Update user with fresh attributes from AWS
              const updatedUser = {
                ...user,
                user_metadata: {
                  ...user.user_metadata,
                  full_name: attributesResult.attributes.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
                }
              };
              
              // Update localStorage with fresh data
              localStorage.setItem('user', JSON.stringify(updatedUser));
              
              console.log('✅ Valid session found for user:', user.email);
              console.log('✅ Updated user attributes from AWS:', updatedUser.user_metadata);
              return { user: updatedUser, error: null };
            } else {
              console.log('⚠️ Failed to fetch user attributes, using stored data');
              return { user, error: null };
            }
          }
        } catch (parseError) {
          console.error('Error parsing stored session:', parseError);
          // Clear invalid data
          localStorage.removeItem('user');
          localStorage.removeItem('session');
        }
      }
      
      console.log('❌ No valid session found');
      return { user: null, error: null };
    } catch (error) {
      console.error('AWS Cognito getCurrentUser error:', error);
      return { user: null, error };
    }
  }

  static async resetPassword(email: string) {
    try {
      console.log('🔐 AWS Cognito resetPassword for:', email);
      // Check if the user exists and is verified
      try {
        const getUserCommand = new AdminGetUserCommand({
          UserPoolId: USER_POOL_ID,
          Username: email
        });
        const userResult = await cognitoClient.send(getUserCommand);
        
        // Check UserStatus instead of email_verified attribute
        if (userResult.UserStatus !== 'CONFIRMED') {
          return {
            error: {
              message: 'Your account is not verified. Please verify your email first or sign up for a new account.',
              originalError: new Error('Account not confirmed')
            }
          };
        }
      } catch (userError) {
        if ((userError as any).name === 'UserNotFoundException') {
          return {
            error: {
              message: 'No account found with this email address. Please sign up for a new account.',
              originalError: userError
            }
          };
        }
        // If we can't check the user, do not proceed
        return {
          error: {
            message: 'Unable to check user status. Please contact support.',
            originalError: userError
          }
        };
      }
      // If verified, proceed with password reset
      const forgotPasswordCommand = new ForgotPasswordCommand({
        ClientId: CLIENT_ID,
        Username: email
      });
      await cognitoClient.send(forgotPasswordCommand);
      console.log('✅ AWS Cognito resetPassword successful');
      return { error: null };
    } catch (error: any) {
      console.error('AWS Cognito resetPassword error:', error);
      // Provide more helpful error messages
      let errorMessage = 'Failed to send password reset email. Please try again.';
      if (error.name === 'InvalidParameterException') {
        if (error.message.includes('no registered/verified email')) {
          errorMessage = 'This email address is not registered. Please sign up first or check your email address.';
        } else if (error.message.includes('phone_number')) {
          errorMessage = 'This account is registered with a phone number, not email. Please contact support.';
        }
      } else if (error.name === 'UserNotFoundException') {
        errorMessage = 'No account found with this email address. Please check your email or sign up.';
      } else if (error.name === 'NotAuthorizedException') {
        if (error.message.includes('Auto verification not turned on')) {
          errorMessage = 'Password reset is not available. Please contact support to reset your password.';
        } else {
          errorMessage = 'This account is not authorized for password reset. Please contact support.';
        }
      } else if (error.name === 'LimitExceededException') {
        errorMessage = 'Too many password reset attempts. Please wait before trying again.';
      }
      return { error: { message: errorMessage, originalError: error } };
    }
  }

  static async verifyOTP(email: string, otp: string) {
    try {
      console.log('🔐 AWS Cognito verifyOTP for:', email);
      
      const confirmCommand = new ConfirmSignUpCommand({
        ClientId: CLIENT_ID,
        Username: email,
        ConfirmationCode: otp
      });
      
      await cognitoClient.send(confirmCommand);
      
      // Sign in after confirmation
      return await this.signInWithEmail(email, '');
      } catch (error) {
      return { user: null, session: null, error };
    }
  }

  static async confirmUserInCognito(email: string) {
    try {
      console.log('🔐 Confirming user in Cognito for:', email);
      
      const confirmCommand = new AdminConfirmSignUpCommand({
        UserPoolId: USER_POOL_ID,
        Username: email
      });
      
      await cognitoClient.send(confirmCommand);
      console.log('✅ User confirmed in Cognito successfully');
      
      // Also set email_verified to true
      try {
        const updateCommand = new AdminUpdateUserAttributesCommand({
          UserPoolId: USER_POOL_ID,
          Username: email,
          UserAttributes: [
            {
              Name: 'email_verified',
              Value: 'true'
            }
          ]
        });
        
        await cognitoClient.send(updateCommand);
        console.log('✅ Email verified attribute set to true');
      } catch (updateError) {
        console.warn('⚠️ Could not set email_verified attribute:', updateError);
        // Don't fail the whole operation if this fails
      }
      
      return { success: true, error: null };
    } catch (error: any) {
      console.error('AWS Cognito user confirmation error:', error);
      return { success: false, error };
    }
  }

  static async confirmUserWithCode(email: string, code: string) {
    try {
      console.log('🔐 Confirming user in Cognito with code for:', email);
      
      const confirmCommand = new ConfirmSignUpCommand({
        ClientId: CLIENT_ID,
        Username: email,
        ConfirmationCode: code
      });
      
      await cognitoClient.send(confirmCommand);
      console.log('✅ User confirmed in Cognito successfully with code');
      
      // Also set email_verified to true
      try {
        const updateCommand = new AdminUpdateUserAttributesCommand({
          UserPoolId: USER_POOL_ID,
          Username: email,
          UserAttributes: [
            {
              Name: 'email_verified',
              Value: 'true'
            }
          ]
        });
        
        await cognitoClient.send(updateCommand);
        console.log('✅ Email verified attribute set to true');
      } catch (updateError) {
        console.warn('⚠️ Could not set email_verified attribute:', updateError);
        // Don't fail the whole operation if this fails
      }
      
      return { success: true, error: null };
    } catch (error: any) {
      console.error('AWS Cognito user confirmation with code error:', error);
      return { success: false, error };
    }
  }

  static async resendVerificationEmail(email: string) {
    try {
      console.log('🔐 AWS Cognito resendVerificationEmail for:', email);
      
      // First check if user exists and is unconfirmed
      const userStatus = await this.checkUserStatus(email);
      
      if (!userStatus.exists) {
        return { 
          success: false, 
          error: { message: 'No account found with this email address.' } 
        };
      }
      
      if (userStatus.verified) {
        return { 
          success: false, 
          error: { message: 'Account is already verified. Please sign in instead.' } 
        };
      }
      
      // Try the standard resend approach first
      try {
        const resendCommand = new ResendConfirmationCodeCommand({
          ClientId: CLIENT_ID,
          Username: email
        });
        
        const result = await cognitoClient.send(resendCommand);
        console.log('✅ AWS Cognito resendVerificationEmail successful');
        
        // In development mode, we'll simulate the OTP being sent
        if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
          console.log('📧 DEVELOPMENT MODE - Verification OTP sent to:', email);
          console.log('📧 Check your email for the verification code');
          console.log('📧 (In production, this would be sent via AWS SES)');
        }
        
        return { success: true, error: null };
      } catch (resendError: any) {
        // If auto verification is disabled, we need to handle this differently
        if (resendError.name === 'NotAuthorizedException' && 
            resendError.message.includes('Auto verification not turned on')) {
          
          console.log('⚠️ Auto verification is disabled, using alternative approach...');
          
          // For now, we'll simulate sending a code in development
          if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
            console.log('📧 DEVELOPMENT MODE - Auto verification disabled, simulating code...');
            console.log('📧 In production, you need to enable auto verification in Cognito');
            console.log('📧 Or use SES to send verification emails');
            
            return { 
              success: true, 
              error: null,
              message: 'Verification code sent (DEV MODE - Auto verification disabled)'
            };
          } else {
            return { 
              success: false, 
              error: { 
                message: 'Email verification is not enabled. Please contact support to enable this feature.' 
              } 
            };
          }
        }
        
        // Handle other errors
        throw resendError;
      }
    } catch (error: any) {
      console.error('AWS Cognito resendVerificationEmail error:', error);
      
      // Provide more helpful error messages
      let errorMessage = 'Failed to resend verification email. Please try again.';
      
      if (error.name === 'UserNotFoundException') {
        errorMessage = 'No account found with this email address.';
      } else if (error.name === 'InvalidParameterException') {
        errorMessage = 'Invalid email format. Please check your email address.';
      } else if (error.name === 'LimitExceededException') {
        errorMessage = 'Too many attempts. Please wait before trying again.';
      } else if (error.name === 'NotAuthorizedException') {
        if (error.message.includes('Auto verification not turned on')) {
          errorMessage = 'Email verification is not enabled. Please contact support.';
        } else {
          errorMessage = 'Not authorized to resend verification codes. Please contact support.';
        }
      }
      
      return { success: false, error: { message: errorMessage, originalError: error } };
    }
  }

  static async verifyResetOTP(email: string, otp: string, newPassword: string) {
    try {
      console.log('🔐 AWS Cognito verifyResetOTP for:', email);
      
      const confirmCommand = new ConfirmForgotPasswordCommand({
        ClientId: CLIENT_ID,
        Username: email,
        ConfirmationCode: otp,
        Password: newPassword
      });
      
      await cognitoClient.send(confirmCommand);
      console.log('✅ Password reset successful');
      
      return { success: true, error: null };
    } catch (error: any) {
      console.error('AWS Cognito password reset error:', error);
      return { success: false, error };
    }
  }

  static async updateUserAttributes(email: string, attributes: { name?: string; email?: string }) {
    try {
      console.log('🔐 AWS Cognito updateUserAttributes for:', email);
      
      const userAttributes = [];
      
      if (attributes.name) {
        userAttributes.push({
          Name: 'name',
          Value: attributes.name
        });
      }
      
      if (attributes.email) {
        userAttributes.push({
          Name: 'email',
          Value: attributes.email
        });
      }
      
      if (userAttributes.length === 0) {
        console.log('⚠️ No attributes to update');
        return { success: true, error: null };
      }
      
      const updateCommand = new AdminUpdateUserAttributesCommand({
        UserPoolId: USER_POOL_ID,
        Username: email,
        UserAttributes: userAttributes
      });
      
      await cognitoClient.send(updateCommand);
      console.log('✅ User attributes updated successfully');
      
      return { success: true, error: null };
    } catch (error: any) {
      console.error('AWS Cognito updateUserAttributes error:', error);
      return { success: false, error };
    }
  }

  static async getUserAttributes(email: string) {
    try {
      console.log('🔐 AWS Cognito getUserAttributes for:', email);
      
      const getUserCommand = new AdminGetUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: email
      });
      
      const result = await cognitoClient.send(getUserCommand);
      console.log('✅ User attributes fetched successfully');
      
      // Extract user attributes
      const attributes: any = {};
      if (result.UserAttributes) {
        result.UserAttributes.forEach(attr => {
          if (attr.Name && attr.Value) {
            attributes[attr.Name] = attr.Value;
          }
        });
      }
      
      return { 
        success: true, 
        attributes,
        error: null 
      };
    } catch (error: any) {
      console.error('AWS Cognito getUserAttributes error:', error);
      return { success: false, attributes: {}, error };
    }
  }
}

// Storage Service
export class StorageService {
  static async uploadFile(file: File, filePath: string) {
    try {
      console.log('🗄️ AWS S3 upload:', filePath);
      
      // Use FileReader to convert File to ArrayBuffer
      const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(file);
      });
      
      const putCommand = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: filePath,
        Body: new Uint8Array(arrayBuffer), // Convert ArrayBuffer to Uint8Array
        ContentType: file.type,
        // Removed ACL: 'public-read' - bucket doesn't allow ACLs
        CacheControl: 'max-age=31536000', // Cache for 1 year
        Metadata: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      });
      
      await s3Client.send(putCommand);
      console.log('✅ AWS S3 upload successful:', filePath);
      
      // Generate public URL for the uploaded file
      const publicUrl = `https://${BUCKET_NAME}.s3.${AWS_CONFIG.region}.amazonaws.com/${filePath}`;
      
      return {
        url: publicUrl,
        publicUrl: publicUrl,
        error: null
      };
      } catch (error) {
        console.error('AWS S3 upload error:', error);
      return { url: null, publicUrl: null, error };
    }
  }

  static async getFileUrl(filePath: string) {
    try {
      console.log('🗄️ AWS S3 getFileUrl:', filePath);
      const url = `https://${BUCKET_NAME}.s3.${AWS_CONFIG.region}.amazonaws.com/${filePath}`;
      return { url, error: null };
      } catch (error) {
        console.error('AWS S3 getFileUrl error:', error);
        return { url: null, error };
      }
  }

  static async deleteFile(filePath: string) {
    try {
      console.log('🗄️ AWS S3 deleteFile:', filePath);
      
      const deleteCommand = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: filePath
      });
      
      await s3Client.send(deleteCommand);
      return { success: true, error: null };
    } catch (error) {
      console.error('AWS S3 delete error:', error);
      return { success: false, error };
    }
  }

  static async listFiles(prefix: string) {
    try {
      console.log('🗄️ AWS S3 listFiles:', prefix);
      
      const listCommand = new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        Prefix: prefix
      });
      
      const result = await s3Client.send(listCommand);
      console.log('✅ AWS S3 listFiles result:', result);
      
      if (!result.Contents) {
        return { files: [], error: null };
      }
      
      // Convert S3 objects to file objects with public URLs
      const files = result.Contents.map((obj) => {
        return {
          name: obj.Key?.split('/').pop() || '',
          url: `https://${BUCKET_NAME}.s3.${AWS_CONFIG.region}.amazonaws.com/${obj.Key}`,
          size: obj.Size || 0,
          lastModified: obj.LastModified
        };
      });
      
      return { files, error: null };
    } catch (error) {
      console.error('AWS S3 listFiles error:', error);
      
      // If it's a CORS error, try to provide a more helpful message
      if (error instanceof Error && error.message.includes('CORS')) {
        console.error('CORS error detected. Please check S3 bucket CORS configuration.');
        return { 
          files: [], 
          error: new Error('CORS configuration issue. Please contact support.') 
        };
      }
      
      return { files: [], error };
    }
  }

  static async deleteUserFiles(userId: string) {
    try {
      console.log('🗄️ AWS S3 deleteUserFiles for user:', userId);
      
      const prefix = `users/${userId}/images/`;
      
      // First, list all files for this user
      const listCommand = new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        Prefix: prefix
      });
      
      const listResult = await s3Client.send(listCommand);
      
      if (!listResult.Contents || listResult.Contents.length === 0) {
        console.log('✅ No files found for user:', userId);
        return { success: true, deletedCount: 0, error: null };
      }
      
      console.log(`📊 Found ${listResult.Contents.length} files to delete for user:`, userId);
      
      // Delete files in batches (S3 allows up to 1000 objects per batch)
      const batchSize = 1000;
      let deletedCount = 0;
      
      for (let i = 0; i < listResult.Contents.length; i += batchSize) {
        const batch = listResult.Contents.slice(i, i + batchSize);
        
        const deleteObjects = batch.map(obj => ({
          Key: obj.Key!
        }));
        
        const deleteCommand = new DeleteObjectsCommand({
          Bucket: BUCKET_NAME,
          Delete: {
            Objects: deleteObjects
          }
        });
        
        const deleteResult = await s3Client.send(deleteCommand);
        deletedCount += deleteResult.Deleted?.length || 0;
        
        console.log(`✅ Deleted batch ${Math.floor(i / batchSize) + 1}: ${deleteResult.Deleted?.length || 0} files`);
      }
      
      console.log(`✅ Successfully deleted ${deletedCount} files for user:`, userId);
      return { success: true, deletedCount, error: null };
      
    } catch (error) {
      console.error('AWS S3 deleteUserFiles error:', error);
      return { success: false, deletedCount: 0, error };
    }
  }
}

// Database Service
export class DatabaseService {
  static async getProfile(userId: string) {
    try {
      console.log('🗄️ AWS DynamoDB getProfile:', userId);
      
      const command = new GetCommand({
        TableName: 'mvp-labeler-profiles',
        Key: { user_id: userId }
      });
      
      const result = await docClient.send(command);
      console.log('✅ AWS DynamoDB getProfile result:', result);
      
      return { profile: result.Item || null, error: null };
    } catch (error) {
      console.error('AWS DynamoDB getProfile error:', error);
      return { profile: null, error };
    }
  }

  static async updateProfile(userId: string, profileData: any) {
    try {
      console.log('🗄️ AWS DynamoDB updateProfile:', userId);
      
      const command = new PutCommand({
        TableName: 'mvp-labeler-profiles',
        Item: {
          user_id: userId,
          ...profileData,
          updated_at: new Date().toISOString()
        }
      });
      
      await docClient.send(command);
      console.log('✅ AWS DynamoDB updateProfile successful');
      
      return { success: true, error: null };
    } catch (error) {
      console.error('AWS DynamoDB updateProfile error:', error);
      return { success: false, error };
    }
  }

  static async getProject(userId: string, projectId: string) {
    try {
      // For 'current' project, use deterministic project ID (proj_6c894ef)
      if (projectId === 'current') {
        // Calculate deterministic project ID to match localStorage
        const normalized = `${userId.toLowerCase().trim()}::current`;
        let hash = 0;
        for (let i = 0; i < normalized.length; i++) {
          const char = normalized.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash;
        }
        const deterministicProjectId = `proj_${Math.abs(hash).toString(16)}`;
        
        console.log('🔑 Using deterministic projectId:', deterministicProjectId);
        
        // Use GetCommand with BOTH keys (user_id + project_id) for deterministic results
        const getCommand = new GetCommand({
          TableName: 'mvp-labeler-projects',
          Key: {
            user_id: userId,
            project_id: deterministicProjectId  // ✅ Use hash-based ID to match localStorage
          }
        });
        
        const result = await docClient.send(getCommand);
        
        if (result.Item) {
          console.log('✅ Found current project for user:', userId);
          return { project: result.Item, error: null };
        } else {
          console.log('⚠️ No current project found for user:', userId);
          return { project: null, error: null };
        }
      } else {
        // For specific project IDs, use the original logic
        const command = new GetCommand({
          TableName: 'mvp-labeler-projects',
          Key: { 
            user_id: userId,
            project_id: projectId 
          }
        });
        
        const result = await docClient.send(command);
        
        return { project: result.Item || null, error: null };
      }
    } catch (error) {
      console.error('Error getting project:', error);
      return { project: null, error };
    }
  }

  static async updateProject(userId: string, projectId: string, projectData: any, isClearing: boolean = false) {
    try {
      // For 'current' project, use deterministic project ID (proj_6c894ef)
      if (projectId === 'current') {
        // Calculate deterministic project ID to match localStorage
        const normalized = `${userId.toLowerCase().trim()}::current`;
        let hash = 0;
        for (let i = 0; i < normalized.length; i++) {
          const char = normalized.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash;
        }
        const actualProjectId = `proj_${Math.abs(hash).toString(16)}`;
        
        console.log('🔑 Using deterministic projectId for update:', actualProjectId);
        
        // Get existing project (will be null if doesn't exist)
        const getProjectResult = await this.getProject(userId, 'current');
        
        if (getProjectResult.project) {
          // Update existing "current" project
          console.log('🔄 Updating current project');
          
          // Separate large data from small data to avoid DynamoDB size limits
          const { images, ...smallData } = projectData;
          
          // Merge new data with existing project data to preserve images and other data
          const existingProject = getProjectResult.project;
          
          // ✅ CRITICAL: Always use NEW formData from root level, NEVER from sessionState.formData
          // Priority: 1) smallData.formData (explicitly sent) 2) empty object
          // Do NOT use sessionState.formData as it may be stale
          const formDataToSave = smallData.formData || {};
          
          // Deep merge sessionState if it exists in both objects
          // BUT remove formData from sessionState to prevent conflicts with root formData
          let mergedSessionState = existingProject.sessionState || {};
          if (smallData.sessionState) {
            const { formData: _, ...sessionStateWithoutFormData } = smallData.sessionState;
            mergedSessionState = {
              ...mergedSessionState,
              ...sessionStateWithoutFormData,
              // ✅ Explicitly set formData in sessionState to match root formData (for consistency)
              formData: formDataToSave
            };
          }
          
          console.log('🔄 AWS Update Merge Debug:', {
            existingFormData: existingProject.formData,
            newFormData: smallData.formData,
            formDataToSave: formDataToSave,
            sessionStateFormData: smallData.sessionState?.formData,
            mergedSessionStateFormData: mergedSessionState.formData
          });
          
          const mergedProjectData = isClearing ? {
            // When clearing, replace data instead of merging
            ...smallData,
            updated_at: new Date().toISOString()
          } : {
            // Normal update: preserve existing data and apply new data
            ...existingProject,  // Preserve existing data (like images)
            ...smallData,        // Apply new data (formData, sessionState, etc.) - OVERWRITES existingProject values
            formData: formDataToSave,  // ✅ Explicitly set formData to ensure new data
            sessionState: mergedSessionState, // Use deep-merged sessionState with matching formData
            updated_at: new Date().toISOString()
          };
          
          console.log('🔄 Final merged data being saved:', {
            formData: mergedProjectData.formData,
            formDataElr: mergedProjectData.formData?.elr,
            formDataStructureNo: mergedProjectData.formData?.structureNo,
            sessionStateFormData: mergedProjectData.sessionState?.formData,
            sessionStateFormDataElr: mergedProjectData.sessionState?.formData?.elr
          });
          
          // Ensure both keys are explicitly set (user_id + project_id)
          const command = new PutCommand({
            TableName: 'mvp-labeler-projects',
            Item: {
              ...mergedProjectData,
              user_id: userId,      // ✅ Explicitly set both keys
              project_id: actualProjectId  // ✅ Use hash-based ID to match localStorage
            }
          });
          
          await docClient.send(command);
          console.log('✅ Updated current project successfully with merged data');
        } else {
          // No existing project, create one with deterministic project ID
          console.log('🆕 Creating new current project');
          
          // Separate large data from small data to avoid DynamoDB size limits
          const { images, ...smallData } = projectData;
          
          const command = new PutCommand({
            TableName: 'mvp-labeler-projects',
            Item: {
              user_id: userId,
              project_id: actualProjectId,  // ✅ Use hash-based ID to match localStorage
              ...smallData,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          });
          
          await docClient.send(command);
          console.log('✅ Created new current project successfully');
        }
      } else {
        // For specific project IDs, get existing project and merge data
        const getProjectResult = await this.getProject(userId, projectId);
        
        if (getProjectResult.project) {
          // Merge new data with existing project data
          const { images, ...smallData } = projectData;
          const existingProject = getProjectResult.project;
          const mergedProjectData = {
            ...existingProject,  // Preserve existing data
            ...smallData,        // Apply new data
            updated_at: new Date().toISOString()
          };
          
          const command = new PutCommand({
            TableName: 'mvp-labeler-projects',
            Item: mergedProjectData
          });
          
          await docClient.send(command);
          console.log('✅ Updated specific project successfully with merged data');
        } else {
          // No existing project, create a new one
          const { images, ...smallData } = projectData;
          
          const command = new PutCommand({
            TableName: 'mvp-labeler-projects',
            Item: {
              user_id: userId,
              project_id: projectId,
              ...smallData,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          });
          
          await docClient.send(command);
          console.log('✅ Created new specific project successfully');
        }
      }
    } catch (error) {
      console.error('Error updating project:', error);
      throw error;
    }
  }

  static async getBulkDefects(userId: string) {
    try {
      console.log('🗄️ AWS DynamoDB getBulkDefects:', userId);
      
      const command = new QueryCommand({
        TableName: 'mvp-labeler-bulk-defects',
        KeyConditionExpression: 'user_id = :userId',
        ExpressionAttributeValues: {
          ':userId': userId
        }
      });
      
      const result = await docClient.send(command);
      console.log('✅ AWS DynamoDB getBulkDefects result:', result);
      console.log('🔍 Raw DynamoDB items:', result.Items);
      
      // Transform DynamoDB items back to the expected format
      const transformedDefects = (result.Items || []).map(item => ({
        id: item.defect_id,
        photoNumber: item.photoNumber || '',
        description: item.description || '',
        selectedFile: item.selectedFile || null,
        severity: item.severity || 'medium',
        created_at: item.created_at
      }));
      
      console.log('📥 Loaded defects from AWS:', {
        count: transformedDefects.length,
        sample: transformedDefects[0] ? {
          id: transformedDefects[0].id,
          photoNumber: transformedDefects[0].photoNumber,
          description: transformedDefects[0].description,
          selectedFile: transformedDefects[0].selectedFile
        } : null
      });
      
      return { defects: transformedDefects, error: null };
    } catch (error) {
      console.error('AWS DynamoDB getBulkDefects error:', error);
      return { defects: [], error };
    }
  }

  static async updateBulkDefects(userId: string, defects: any[]) {
    try {
      console.log('🗄️ AWS DynamoDB updateBulkDefects:', userId);
      console.log('📊 Defects to save:', defects);
      
      // First, get existing defects to delete them
      const queryCommand = new QueryCommand({
        TableName: 'mvp-labeler-bulk-defects',
        KeyConditionExpression: 'user_id = :userId',
        ExpressionAttributeValues: {
          ':userId': userId
        }
      });
      
      console.log('🔍 Querying existing defects...');
      const existingDefects = await docClient.send(queryCommand);
      console.log('📊 Existing defects found:', existingDefects.Items?.length || 0);
      
      // Delete existing defects using batch operations
      if (existingDefects.Items && existingDefects.Items.length > 0) {
        const deleteRequests = existingDefects.Items.map(item => ({
          DeleteRequest: {
            Key: {
              user_id: item.user_id,
              defect_id: item.defect_id
            }
          }
        }));
        
        console.log('🗑️ Deleting existing defects...');
        // DynamoDB batch operations are limited to 25 items
        const batchSize = 25;
        for (let i = 0; i < deleteRequests.length; i += batchSize) {
          const batch = deleteRequests.slice(i, i + batchSize);
          const batchDeleteCommand = new BatchWriteCommand({
            RequestItems: {
              'mvp-labeler-bulk-defects': batch
            }
          });
          
          console.log(`🗑️ Deleting batch ${Math.floor(i / batchSize) + 1}...`);
          const deleteResult = await docClient.send(batchDeleteCommand);
          console.log('🗑️ Delete result:', deleteResult);
        }
        
        console.log(`🗑️ Deleted ${existingDefects.Items.length} existing defects`);
      }
      
      // Add new defects using batch operations
      if (defects.length > 0) {
        console.log('➕ Adding new defects...');
        const putRequests = defects.map(defect => {
          const defectId = defect.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          console.log(`➕ Processing defect:`, { defectId, defect });
          
          return {
            PutRequest: {
              Item: {
                user_id: userId,
                defect_id: defectId,
                photoNumber: defect.photoNumber || '',
                description: defect.description || '',
                selectedFile: defect.selectedFile || '',
                severity: defect.severity || 'medium',
                created_at: new Date().toISOString()
              }
            }
          };
        });
        
        console.log('📊 Put requests prepared:', putRequests.length);
        
        // DynamoDB batch operations are limited to 25 items
        const batchSize = 25;
        for (let i = 0; i < putRequests.length; i += batchSize) {
          const batch = putRequests.slice(i, i + batchSize);
          const batchPutCommand = new BatchWriteCommand({
            RequestItems: {
              'mvp-labeler-bulk-defects': batch
            }
          });
          
          console.log(`➕ Adding batch ${Math.floor(i / batchSize) + 1}...`);
          const putResult = await docClient.send(batchPutCommand);
          console.log('➕ Put result:', putResult);
        }
        
        console.log(`✅ Added ${defects.length} new defects`);
      } else {
        console.log('⚠️ No defects to add');
      }
      
      return { success: true, error: null };
    } catch (error) {
      console.error('❌ AWS DynamoDB updateBulkDefects error:', error);
      console.error('❌ Error details:', {
        name: error.name,
        message: error.message,
        code: error.code,
        statusCode: error.statusCode
      });
      return { success: false, error };
    }
  }

  static async getSelectedImages(userId: string) {
    try {
      const command = new QueryCommand({
        TableName: 'mvp-labeler-selected-images',
        KeyConditionExpression: 'user_id = :userId',
        ExpressionAttributeValues: {
          ':userId': userId
        }
      });
      
      const result = await docClient.send(command);
      
      // Transform the data to match the expected format
      const selectedImages = (result.Items || []).map(item => ({
        id: item.imageId,
        instanceId: item.instanceId || item.selection_id,
        fileName: item.fileName || 'unknown'
      }));
      
      return selectedImages;
    } catch (error) {
      console.error('Error getting selected images:', error);
      return [];
    }
  }

  static async updateSelectedImages(userId: string, selectedImages: any[]) {
    try {
      // Load existing selections
      const scanCommand = new ScanCommand({
        TableName: 'mvp-labeler-selected-images',
        FilterExpression: 'user_id = :userId',
        ExpressionAttributeValues: { ':userId': userId }
      });
      const existingSelections = await docClient.send(scanCommand);

      const existingByInstance = new Map<string, any>();
      for (const item of (existingSelections.Items || [])) {
        existingByInstance.set(String(item.instanceId || item.selection_id), item);
      }

      // Build desired set keyed by instanceId
      const desiredByInstance = new Map<string, any>();
      selectedImages.forEach((sel, index) => {
        const selectionId = String(sel.instanceId || sel.id || `${Date.now()}-${index}`);
        desiredByInstance.set(selectionId, {
          user_id: userId,
          selection_id: selectionId,
          imageId: String(sel.id || ''),
          instanceId: selectionId,
          fileName: String(sel.fileName || 'unknown'),
          created_at: new Date().toISOString()
        });
      });

      // Compute diffs
      const toDelete: any[] = [];
      const toPut: any[] = [];

      // Items to delete: in existing but not desired
      for (const [instId, item] of existingByInstance.entries()) {
        if (!desiredByInstance.has(instId)) {
          toDelete.push({
            DeleteRequest: { Key: { user_id: item.user_id, selection_id: item.selection_id } }
          });
        }
      }

      // Items to put: in desired but not existing (or changed imageId/fileName)
      for (const [instId, desired] of desiredByInstance.entries()) {
        const existing = existingByInstance.get(instId);
        if (!existing || existing.imageId !== desired.imageId || existing.fileName !== desired.fileName) {
          toPut.push({ PutRequest: { Item: desired } });
        }
      }

      console.log(`📦 updateSelectedImages diffs: put=${toPut.length}, delete=${toDelete.length}`);

      // Helper: batch write with backoff and unprocessed retry
      const sendBatches = async (requests: any[]) => {
        for (let i = 0; i < requests.length; i += 25) {
          const batch = requests.slice(i, i + 25);
          let attempt = 0;
          const maxAttempts = 5;
          let delay = 200; // ms
          // eslint-disable-next-line no-constant-condition
          while (true) {
            try {
              const cmd = new BatchWriteCommand({
                RequestItems: { 'mvp-labeler-selected-images': batch }
              });
              const res = await docClient.send(cmd);
              if (res.UnprocessedItems && Object.keys(res.UnprocessedItems).length > 0) {
                const retryItems = res.UnprocessedItems['mvp-labeler-selected-images'] || [];
                if (retryItems.length === 0) break;
                await new Promise(r => setTimeout(r, delay));
                delay = Math.min(delay * 2, 2000);
                // replace batch with unprocessed
                batch.length = 0;
                retryItems.forEach((ri: any) => batch.push(ri));
                continue;
              }
              break; // success
            } catch (e: any) {
              attempt += 1;
              const retriable = e?.name === 'ProvisionedThroughputExceededException' || e?.$metadata?.httpStatusCode === 400;
              if (attempt >= maxAttempts || !retriable) throw e;
              await new Promise(r => setTimeout(r, delay));
              delay = Math.min(delay * 2, 2000);
            }
          }
        }
      };

      if (toDelete.length > 0) await sendBatches(toDelete);
      if (toPut.length > 0) await sendBatches(toPut);

      console.log('✅ updateSelectedImages completed');
    } catch (error) {
      console.error('Error updating selected images:', error);
      throw error;
    }
  }

  static async saveInstanceMetadata(userId: string, instanceMetadata: any) {
    try {
      const command = new UpdateCommand({
        TableName: 'mvp-labeler-projects',
        Key: {
          user_id: userId,
          project_id: 'current'
        },
        UpdateExpression: 'SET instanceMetadata = :instanceMetadata, updated_at = :updatedAt',
        ExpressionAttributeValues: {
          ':instanceMetadata': instanceMetadata,
          ':updatedAt': new Date().toISOString()
        }
      });
      
      await docClient.send(command);
    } catch (error) {
      console.error('Error saving instance metadata:', error);
      throw error;
    }
  }

  /**
   * PHASE 1: OPERATION QUEUE SYSTEM
   * Save operations to DynamoDB and apply them to current state
   * 
   * @param userId User ID
   * @param operations Array of operations to save
   * @returns Last version (timestamp) of processed operation
   */
  static async saveOperations(userId: string, operations: any[]) {
    try {
      if (!operations || operations.length === 0) {
        console.log('⚠️ No operations to save');
        return { lastVersion: Date.now(), processedCount: 0 };
      }

      console.log(`📝 [OPERATION QUEUE] Saving ${operations.length} operations to AWS for user:`, userId);

      // 1. Store operations in DynamoDB table: mvp-labeler-operations
      // Schema: user_id (partition), operation_id (sort), operation (JSON), timestamp
      // CRITICAL: Remove undefined values from operation data before saving (DynamoDB doesn't accept undefined)
      const cleanOperation = (op: any) => {
        const cleaned: any = {
          id: op.id,
          type: op.type,
          timestamp: op.timestamp,
          browserId: op.browserId,
        };
        
        // Only include optional fields if they are defined
        if (op.instanceId !== undefined) cleaned.instanceId = op.instanceId;
        if (op.imageId !== undefined) cleaned.imageId = op.imageId;
        if (op.fileName !== undefined) cleaned.fileName = op.fileName;
        if (op.data !== undefined && op.data !== null) {
          // Clean data object - remove undefined fields
          cleaned.data = {};
          if (op.data.photoNumber !== undefined) cleaned.data.photoNumber = op.data.photoNumber;
          if (op.data.description !== undefined) cleaned.data.description = op.data.description;
          if (op.data.sortDirection !== undefined) cleaned.data.sortDirection = op.data.sortDirection;
          // FormData fields
          if (op.data.elr !== undefined) cleaned.data.elr = op.data.elr;
          if (op.data.structureNo !== undefined) cleaned.data.structureNo = op.data.structureNo;
          if (op.data.date !== undefined) cleaned.data.date = op.data.date;
        }
        
        return cleaned;
      };
      
      const putRequests = operations.map((op) => ({
        PutRequest: {
          Item: {
            user_id: userId,
            operation_id: op.id, // Use operation.id as sort key
            operation: cleanOperation(op), // Store cleaned operation object (no undefined values)
            timestamp: op.timestamp,
            processed: false, // Will be marked true after applying to state
            created_at: new Date().toISOString(),
          },
        },
      }));

      // Batch write operations (DynamoDB limit: 25 per batch)
      for (let i = 0; i < putRequests.length; i += 25) {
        const batch = putRequests.slice(i, i + 25);
        try {
          const batchWriteCommand = new BatchWriteCommand({
            RequestItems: {
              'mvp-labeler-operations': batch,
            },
          });

          console.log(`💾 Saving operation batch ${Math.floor(i / 25) + 1} (${batch.length} items)...`);
          const result = await docClient.send(batchWriteCommand);

          // Handle unprocessed items (retry)
          if (result.UnprocessedItems && Object.keys(result.UnprocessedItems).length > 0) {
            console.warn('⚠️ Unprocessed operations detected, retrying...');
            await new Promise((resolve) => setTimeout(resolve, 100));
            const retryCommand = new BatchWriteCommand({
              RequestItems: result.UnprocessedItems,
            });
            await docClient.send(retryCommand);
            console.log('✅ Retry completed for unprocessed operations');
          }

          console.log(`✅ Operation batch ${Math.floor(i / 25) + 1} saved successfully`);
        } catch (batchError: any) {
          console.error(`❌ Error saving operation batch ${Math.floor(i / 25) + 1}:`, batchError);
          throw batchError;
        }
      }

      // 2. Apply operations to current state
      // Get current state from database
      const currentSelected = await this.getSelectedImages(userId);
      const currentProject = await this.getProject(userId, 'current');
      const currentInstanceMetadata = await this.getInstanceMetadata(userId);
      const currentSortPreferences = currentProject.project?.sortPreferences || {};
      const currentFormData = currentProject.project?.formData || {};
      
      // Apply operations in order (this is simplified - in production we'd use a more robust state machine)
      // For now, we'll update the tables directly based on operations
      let updatedSelected = [...currentSelected];
      let updatedInstanceMetadata = currentInstanceMetadata || {};
      let updatedDefectSortDirection = currentSortPreferences.defectSortDirection || null;
      let updatedFormData = { ...currentFormData };
      let formDataChanged = false;
      
      for (const op of operations) {
        if (op.type === 'ADD_SELECTION') {
          // Add if not already present
          if (!updatedSelected.find(item => item.instanceId === op.instanceId)) {
            updatedSelected.push({
              id: op.imageId,
              instanceId: op.instanceId,
              fileName: op.fileName || 'unknown'
            });
          }
        } else if (op.type === 'DELETE_SELECTION') {
          // Remove if present
          updatedSelected = updatedSelected.filter(item => item.instanceId !== op.instanceId);
        } else if (op.type === 'UPDATE_METADATA') {
          // Update instance metadata
          if (op.instanceId && op.data) {
            updatedInstanceMetadata[op.instanceId] = {
              ...updatedInstanceMetadata[op.instanceId],
              photoNumber: op.data.photoNumber !== undefined ? op.data.photoNumber : updatedInstanceMetadata[op.instanceId]?.photoNumber,
              description: op.data.description !== undefined ? op.data.description : updatedInstanceMetadata[op.instanceId]?.description,
              lastModified: op.timestamp,
            };
          }
        } else if (op.type === 'SORT_CHANGE') {
          // Update sort direction
          if (op.data?.sortDirection !== undefined) {
            updatedDefectSortDirection = op.data.sortDirection;
          }
        } else if (op.type === 'UPDATE_FORMDATA') {
          // ✅ UPDATE_FORMDATA: Operation contains COMPLETE formData - use directly
          // No merging needed - operation already has all fields ({ elr, structureNo, date })
          if (op.data) {
            const oldFormDataStr = JSON.stringify(updatedFormData);
            updatedFormData = op.data; // ✅ Direct assignment (complete formData)
            const newFormDataStr = JSON.stringify(updatedFormData);
            if (oldFormDataStr !== newFormDataStr) {
              formDataChanged = true;
              console.log('📝 [OPERATION QUEUE] FormData updated (complete):', {
                old: currentFormData,
                new: updatedFormData,
                operationData: op.data,
                elr: updatedFormData.elr,
                structureNo: updatedFormData.structureNo,
                date: updatedFormData.date
              });
            }
          }
        }
      }

      // 3. Save updated state (using existing methods)
      const stateChanged = 
        updatedSelected.length !== currentSelected.length || 
        JSON.stringify(updatedSelected.map(i => i.instanceId).sort()) !== 
        JSON.stringify(currentSelected.map(i => i.instanceId).sort()) ||
        JSON.stringify(updatedInstanceMetadata) !== JSON.stringify(currentInstanceMetadata || {}) ||
        updatedDefectSortDirection !== currentSortPreferences.defectSortDirection ||
        formDataChanged;
      
      if (stateChanged) {
        console.log('📝 [OPERATION QUEUE] Applying operations to state...');
        
        // Save selected images if changed
        if (updatedSelected.length !== currentSelected.length || 
            JSON.stringify(updatedSelected.map(i => i.instanceId).sort()) !== 
            JSON.stringify(currentSelected.map(i => i.instanceId).sort())) {
          await this.updateSelectedImages(userId, updatedSelected);
        }
        
        // Save instance metadata if changed
        if (JSON.stringify(updatedInstanceMetadata) !== JSON.stringify(currentInstanceMetadata || {})) {
          await this.saveInstanceMetadata(userId, updatedInstanceMetadata);
        }
        
        // Save sort preferences if changed
        if (updatedDefectSortDirection !== currentSortPreferences.defectSortDirection) {
          await this.updateProject(userId, 'current', {
            sortPreferences: {
              defectSortDirection: updatedDefectSortDirection,
              sketchSortDirection: currentSortPreferences.sketchSortDirection || null,
            }
          });
        }
        
        // ✅ Save formData if changed
        if (formDataChanged) {
          await this.updateProject(userId, 'current', {
            formData: updatedFormData
          });
          console.log('✅ [OPERATION QUEUE] FormData saved to AWS:', updatedFormData);
        }
        
        console.log(`✅ [OPERATION QUEUE] Applied ${operations.length} operations to state`);
      }

      // 4. Mark operations as processed (optional - for cleanup later)
      // We could update the operations table, but for now we'll just return success
      
      // 5. Return last version (highest timestamp)
      const lastVersion = Math.max(...operations.map(op => op.timestamp));
      console.log(`✅ [OPERATION QUEUE] Successfully saved ${operations.length} operations, lastVersion: ${lastVersion}`);
      
      return { 
        lastVersion, 
        processedCount: operations.length,
        success: true 
      };
    } catch (error) {
      console.error('❌ Error saving operations:', error);
      throw error;
    }
  }

  /**
   * PHASE 1: OPERATION QUEUE SYSTEM
   * Get operations since a given version/timestamp
   * Used for polling and refresh sync
   * 
   * @param userId User ID
   * @param sinceVersion Timestamp of last synced operation
   * @returns Array of operations since that timestamp
   */
  static async getOperationsSince(userId: string, sinceVersion: number): Promise<any[]> {
    try {
      console.log(`📥 [OPERATION QUEUE] Fetching operations since version ${sinceVersion} for user:`, userId);

      // Query operations table where timestamp > sinceVersion
      // Note: This requires a GSI on timestamp, or we use Scan with FilterExpression
      // For now, we'll use Scan with FilterExpression (less efficient but works without GSI)
      // CRITICAL: 'timestamp' is a reserved keyword in DynamoDB, must use ExpressionAttributeNames
      const scanCommand = new ScanCommand({
        TableName: 'mvp-labeler-operations',
        FilterExpression: 'user_id = :userId AND #timestamp > :since',
        ExpressionAttributeNames: {
          '#timestamp': 'timestamp',
        },
        ExpressionAttributeValues: {
          ':userId': userId,
          ':since': sinceVersion,
        },
      });

      const result = await docClient.send(scanCommand);
      
      console.log(`🔍 [OPERATION QUEUE] Scan result:`, {
        itemsCount: result.Items?.length || 0,
        scannedCount: result.ScannedCount,
        items: result.Items?.map(item => ({
          operationType: item.operation?.type,
          operationTimestamp: item.operation?.timestamp,
          tableTimestamp: item.timestamp,
          userId: item.user_id
        })) || []
      });
      
      const operations = (result.Items || [])
        .map(item => item.operation)
        .filter(op => op && op.timestamp) // Filter out invalid operations
        .sort((a, b) => a.timestamp - b.timestamp); // Sort by timestamp ascending
      
      console.log(`✅ [OPERATION QUEUE] Found ${operations.length} operations since version ${sinceVersion}`);
      if (operations.length > 0) {
        console.log('📋 [OPERATION QUEUE] Operations found:', operations.map(op => ({
          type: op.type,
          timestamp: op.timestamp,
          id: op.id,
          dataPreview: op.type === 'UPDATE_FORMDATA' ? {
            elr: op.data?.elr,
            structureNo: op.data?.structureNo,
            date: op.data?.date
          } : op.data
        })));
      }
      
      return operations;
    } catch (error) {
      console.error('❌ Error getting operations:', error);
      // If table doesn't exist yet, return empty array (backward compatible)
      if (error instanceof Error && (error.message.includes('does not exist') || error.message.includes('ResourceNotFoundException'))) {
        console.warn('⚠️ Operations table does not exist yet, returning empty array');
        return [];
      }
      throw error;
    }
  }

  static async getInstanceMetadata(userId: string) {
    try {
      const command = new GetCommand({
        TableName: 'mvp-labeler-projects',
        Key: {
          user_id: userId,
          project_id: 'current'
        }
      });
      
      const result = await docClient.send(command);
      return result.Item?.instanceMetadata || null;
    } catch (error) {
      console.error('Error getting instance metadata:', error);
      return null;
    }
  }

  static async getDefectSets(userId: string) {
    try {
      console.log('🗄️ AWS DynamoDB getDefectSets:', userId);
      
      const command = new QueryCommand({
        TableName: 'mvp-labeler-defect-sets',
        KeyConditionExpression: 'user_id = :userId',
        ExpressionAttributeValues: {
          ':userId': userId
        }
      });
      
      const result = await docClient.send(command);
      console.log('✅ AWS DynamoDB getDefectSets result:', result);
      
      return { defectSets: result.Items || [], error: null };
    } catch (error) {
      console.error('AWS DynamoDB getDefectSets error:', error);
      return { defectSets: [], error };
    }
  }

  static async saveDefectSet(userId: string, defectSet: any) {
    try {
      console.log('🗄️ AWS DynamoDB saveDefectSet:', userId);
      
      const command = new PutCommand({
        TableName: 'mvp-labeler-defect-sets',
        Item: {
          user_id: userId,
          set_id: defectSet.id || Date.now().toString(),
          ...defectSet,
          created_at: new Date().toISOString()
        }
      });
      
      await docClient.send(command);
      console.log('✅ AWS DynamoDB saveDefectSet successful');
      
      return { success: true, error: null };
    } catch (error) {
      console.error('AWS DynamoDB saveDefectSet error:', error);
      return { success: false, error };
    }
  }

  static async deleteDefectSet(userId: string, setId: string) {
    try {
      console.log('🗄️ AWS DynamoDB deleteDefectSet:', userId, setId);
      
      const command = new DeleteCommand({
        TableName: 'mvp-labeler-defect-sets',
        Key: {
          user_id: userId,
          set_id: setId
        }
      });
      
      await docClient.send(command);
      console.log('✅ AWS DynamoDB deleteDefectSet successful');
      
      return { success: true, error: null };
    } catch (error) {
      console.error('AWS DynamoDB deleteDefectSet error:', error);
      return { success: false, error };
    }
  }

  static async getPdfState(userId: string, pdfId: string) {
    try {
      console.log('🗄️ AWS DynamoDB getPdfState:', pdfId);
      
      const command = new GetCommand({
        TableName: 'mvp-labeler-pdf-states',
        Key: { 
          user_id: userId,
          pdf_id: pdfId 
        }
      });
      
      const result = await docClient.send(command);
      console.log('✅ AWS DynamoDB getPdfState result:', result);
      
      return { pdfState: result.Item || null, error: null };
    } catch (error) {
      console.error('AWS DynamoDB getPdfState error:', error);
      return { pdfState: null, error };
    }
  }

  static async updatePdfState(userId: string, pdfId: string, pdfState: any) {
    try {
      console.log('🗄️ AWS DynamoDB updatePdfState:', pdfId);
      
      const command = new PutCommand({
        TableName: 'mvp-labeler-pdf-states',
        Item: {
          user_id: userId,
          pdf_id: pdfId,
          ...pdfState,
          updated_at: new Date().toISOString()
        }
      });
      
      await docClient.send(command);
      console.log('✅ AWS DynamoDB updatePdfState successful');
      
      return { success: true, error: null };
    } catch (error) {
      console.error('AWS DynamoDB updatePdfState error:', error);
      return { success: false, error };
    }
  }

  static async getFeedback(userId: string) {
    try {
      console.log('🗄️ AWS DynamoDB getFeedback:', userId);
      
      const command = new QueryCommand({
        TableName: 'mvp-labeler-feedback',
        KeyConditionExpression: 'user_id = :userId',
        ExpressionAttributeValues: {
          ':userId': userId
        }
      });
      
      const result = await docClient.send(command);
      console.log('✅ AWS DynamoDB getFeedback result:', result);
      
      return { feedback: result.Items || [], error: null };
    } catch (error) {
      console.error('AWS DynamoDB getFeedback error:', error);
      return { feedback: [], error };
    }
  }

  static async saveFeedback(userId: string, feedback: any) {
    try {
      console.log('🗄️ AWS DynamoDB saveFeedback:', userId);
      
      const command = new PutCommand({
        TableName: 'mvp-labeler-feedback',
        Item: {
          user_id: userId,
          feedback_id: feedback.id || Date.now().toString(),
          ...feedback,
          created_at: new Date().toISOString()
        }
      });
      
      await docClient.send(command);
      console.log('✅ AWS DynamoDB saveFeedback successful');
      
      return { success: true, error: null };
    } catch (error) {
      console.error('AWS DynamoDB saveFeedback error:', error);
      return { success: false, error };
    }
  }

  static async clearUserProject(userId: string, projectId: string) {
    try {
      console.log('🗄️ AWS DynamoDB clearUserProject:', projectId);
      
      // 1. Clear project data from projects table
      const projectCommand = new DeleteCommand({
        TableName: 'mvp-labeler-projects',
        Key: { 
          user_id: userId,
          project_id: projectId 
        }
      });
      
      await docClient.send(projectCommand);
      console.log('✅ Cleared project data from mvp-labeler-projects');
      
      // 2. Clear all bulk defects for this user
      const bulkDefectsQuery = new QueryCommand({
        TableName: 'mvp-labeler-bulk-defects',
        KeyConditionExpression: 'user_id = :userId',
        ExpressionAttributeValues: {
          ':userId': userId
        }
      });
      
      const bulkDefectsResult = await docClient.send(bulkDefectsQuery);
      if (bulkDefectsResult.Items && bulkDefectsResult.Items.length > 0) {
        const deleteRequests = bulkDefectsResult.Items.map(item => ({
          DeleteRequest: {
            Key: {
              user_id: item.user_id,
              defect_id: item.defect_id
            }
          }
        }));
        
        // DynamoDB batch operations are limited to 25 items
        const batchSize = 25;
        for (let i = 0; i < deleteRequests.length; i += batchSize) {
          const batch = deleteRequests.slice(i, i + batchSize);
          const batchDeleteCommand = new BatchWriteCommand({
            RequestItems: {
              'mvp-labeler-bulk-defects': batch
            }
          });
          
          await docClient.send(batchDeleteCommand);
        }
        
        console.log(`✅ Cleared ${bulkDefectsResult.Items.length} bulk defects from mvp-labeler-bulk-defects`);
      }
      
      // 3. Clear all selected images for this user
      const selectedImagesQuery = new QueryCommand({
        TableName: 'mvp-labeler-selected-images',
        KeyConditionExpression: 'user_id = :userId',
        ExpressionAttributeValues: {
          ':userId': userId
        }
      });
      
      const selectedImagesResult = await docClient.send(selectedImagesQuery);
      if (selectedImagesResult.Items && selectedImagesResult.Items.length > 0) {
        const deleteRequests = selectedImagesResult.Items.map(item => ({
          DeleteRequest: {
            Key: {
              user_id: item.user_id,
              selection_id: item.selection_id
            }
          }
        }));
        
        // DynamoDB batch operations are limited to 25 items
        const batchSize = 25;
        for (let i = 0; i < deleteRequests.length; i += batchSize) {
          const batch = deleteRequests.slice(i, i + batchSize);
          const batchDeleteCommand = new BatchWriteCommand({
            RequestItems: {
              'mvp-labeler-selected-images': batch
            }
          });
          
          await docClient.send(batchDeleteCommand);
        }
        
        console.log(`✅ Cleared ${selectedImagesResult.Items.length} selected images from mvp-labeler-selected-images`);
      }
      
      // 4. Clear PDF states for this user
      const pdfStatesQuery = new QueryCommand({
        TableName: 'mvp-labeler-pdf-states',
        KeyConditionExpression: 'user_id = :userId',
        ExpressionAttributeValues: {
          ':userId': userId
        }
      });
      
      const pdfStatesResult = await docClient.send(pdfStatesQuery);
      if (pdfStatesResult.Items && pdfStatesResult.Items.length > 0) {
        const deleteRequests = pdfStatesResult.Items.map(item => ({
          DeleteRequest: {
            Key: {
              user_id: item.user_id,
              pdf_id: item.pdf_id
            }
          }
        }));
        
        // DynamoDB batch operations are limited to 25 items
        const batchSize = 25;
        for (let i = 0; i < deleteRequests.length; i += batchSize) {
          const batch = deleteRequests.slice(i, i + batchSize);
          const batchDeleteCommand = new BatchWriteCommand({
            RequestItems: {
              'mvp-labeler-pdf-states': batch
            }
          });
          
          await docClient.send(batchDeleteCommand);
        }
        
        console.log(`✅ Cleared ${pdfStatesResult.Items.length} PDF states from mvp-labeler-pdf-states`);
      }
      
      console.log('✅ AWS DynamoDB clearUserProject successful - all project data cleared');
      
      return { success: true, error: null };
    } catch (error) {
      console.error('AWS DynamoDB clearUserProject error:', error);
      return { success: false, error };
    }
  }
}

// Profile Service
export class ProfileService {
  static async updateProfile(userId: string, updates: any) {
      try {
      console.log('🗄️ AWS ProfileService updateProfile:', userId);
      return await DatabaseService.updateProfile(userId, updates);
      } catch (error) {
        return { error };
    }
  }

  static async getProfile(userId: string, email: string) {
      try {
      console.log('🗄️ AWS ProfileService getProfile:', userId);
      return await DatabaseService.getProfile(userId);
      } catch (error) {
        return { profile: null, error };
    }
  }

  static async getOrCreateUserProfile(userId: string, email: string) {
    try {
      console.log('🗄️ AWS ProfileService getOrCreateUserProfile:', userId);
      
      // First try to get existing profile
      const result = await DatabaseService.getProfile(userId);
      
      if (result.profile && result.profile.avatar_url) {
        console.log('✅ Found existing profile with avatar:', result.profile.avatar_url);
        return result.profile;
      }
      
      // If profile exists but has no avatar, return it (don't overwrite)
      if (result.profile) {
        console.log('⚠️ Found existing profile but no avatar, returning as-is');
        return result.profile;
      }
      
      // Only create new profile if none exists
      console.log('🆕 Creating new profile for user:', userId);
      const newProfile = {
        user_id: userId,
        email: email,
        full_name: email.split('@')[0] || 'User',
        avatar_url: '',
        avatar_emoji: '😊',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      await DatabaseService.updateProfile(userId, newProfile);
      return newProfile;
    } catch (error) {
      console.error('AWS ProfileService getOrCreateUserProfile error:', error);
      return null;
    }
  }

  static async updateUserProfile(userId: string, updates: any) {
    try {
      console.log('🗄️ AWS ProfileService updateUserProfile:', userId);
      return await DatabaseService.updateProfile(userId, updates);
    } catch (error) {
      return { error };
    }
  }
} 