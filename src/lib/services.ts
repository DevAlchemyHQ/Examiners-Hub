// AWS Services Configuration
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, DeleteCommand, QueryCommand, ScanCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
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
const docClient = DynamoDBDocumentClient.from(dynamoClient);
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
            // For now, we'll trust the stored session since Cognito doesn't have a simple token validation endpoint
            // In production, you might want to validate the token with AWS
            console.log('✅ Valid session found for user:', user.email);
            return { user, error: null };
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
      
      const resendCommand = new ResendConfirmationCodeCommand({
        ClientId: CLIENT_ID,
        Username: email
      });
      
      const result = await cognitoClient.send(resendCommand);
      console.log('✅ AWS Cognito resendVerificationEmail successful');
      
      // In development mode, we'll simulate the OTP being sent
      // In production, this would be handled by AWS SES
      if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
        console.log('📧 DEVELOPMENT MODE - Verification OTP sent to:', email);
        console.log('📧 Check your email for the verification code');
        console.log('📧 (In production, this would be sent via AWS SES)');
      }
      
      return { success: true, error: null };
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
          errorMessage = 'Password reset is not available. Please contact support to reset your password.';
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
      
      const confirmForgotPasswordCommand = new ConfirmForgotPasswordCommand({
        ClientId: CLIENT_ID,
        Username: email,
        ConfirmationCode: otp,
        Password: newPassword
      });
      
      await cognitoClient.send(confirmForgotPasswordCommand);
      console.log('✅ AWS Cognito verifyResetOTP successful');
      
      return { error: null };
    } catch (error: any) {
      console.error('AWS Cognito verifyResetOTP error:', error);
      
      // Provide more helpful error messages
      let errorMessage = 'Failed to reset password. Please try again.';
      
      if (error.name === 'CodeMismatchException') {
        errorMessage = 'Invalid verification code. Please check your email and try again.';
      } else if (error.name === 'ExpiredCodeException') {
        errorMessage = 'Verification code has expired. Please request a new code.';
      } else if (error.name === 'InvalidPasswordException') {
        errorMessage = 'Password does not meet requirements. Use at least 8 characters with uppercase, lowercase, numbers, and symbols.';
      } else if (error.name === 'LimitExceededException') {
        errorMessage = 'Too many attempts. Please wait before trying again.';
      }
      
      return { error: { message: errorMessage, originalError: error } };
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
      console.log('🗄️ AWS DynamoDB getProject:', projectId);
      
      const command = new GetCommand({
        TableName: 'mvp-labeler-projects',
        Key: { 
          user_id: userId,
          project_id: projectId 
        }
      });
      
      const result = await docClient.send(command);
      console.log('✅ AWS DynamoDB getProject result:', result);
      
      return { project: result.Item || null, error: null };
    } catch (error) {
      console.error('AWS DynamoDB getProject error:', error);
      return { project: null, error };
    }
  }

  static async updateProject(userId: string, projectId: string, projectData: any) {
    try {
      console.log('🗄️ AWS DynamoDB updateProject:', projectId);
      
      // Separate large data from small data to avoid DynamoDB size limits
      const { images, ...smallData } = projectData;
      
      // Only save small data to DynamoDB (form data, selections, etc.)
      const command = new PutCommand({
        TableName: 'mvp-labeler-projects',
        Item: {
          user_id: userId,
          project_id: projectId,
          ...smallData,
          updated_at: new Date().toISOString()
        }
      });
      
      await docClient.send(command);
      console.log('✅ AWS DynamoDB updateProject successful (small data only)');
      
      // If there are images, save them to S3 instead
      if (images && images.length > 0) {
        try {
          console.log('📁 Saving images to S3...');
          for (const image of images) {
            if (image.file) {
              const filePath = `users/${userId}/projects/${projectId}/images/${image.id}.jpg`;
              await StorageService.uploadFile(image.file, filePath);
            }
          }
          console.log('✅ Images saved to S3');
        } catch (s3Error) {
          console.error('❌ Error saving images to S3:', s3Error);
        }
      }
      
      return { success: true, error: null };
    } catch (error) {
      console.error('AWS DynamoDB updateProject error:', error);
      return { success: false, error };
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
      
      return { defects: result.Items || [], error: null };
    } catch (error) {
      console.error('AWS DynamoDB getBulkDefects error:', error);
      return { defects: [], error };
    }
  }

  static async updateBulkDefects(userId: string, defects: any[]) {
    try {
      console.log('🗄️ AWS DynamoDB updateBulkDefects:', userId);
      
      // First, get existing defects to delete them
      const queryCommand = new QueryCommand({
        TableName: 'mvp-labeler-bulk-defects',
        KeyConditionExpression: 'user_id = :userId',
        ExpressionAttributeValues: {
          ':userId': userId
        }
      });
      
      const existingDefects = await docClient.send(queryCommand);
      
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
        
        console.log(`🗑️ Deleted ${existingDefects.Items.length} existing defects`);
      }
      
      // Add new defects using batch operations
      if (defects.length > 0) {
        const putRequests = defects.map(defect => ({
          PutRequest: {
            Item: {
              user_id: userId,
              defect_id: defect.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              photoNumber: defect.photoNumber || '',
              description: defect.description || '',
              selectedFile: defect.selectedFile || null,
              severity: defect.severity || 'medium',
              created_at: new Date().toISOString()
            }
          }
        }));
        
        // DynamoDB batch operations are limited to 25 items
        const batchSize = 25;
        for (let i = 0; i < putRequests.length; i += batchSize) {
          const batch = putRequests.slice(i, i + batchSize);
          const batchPutCommand = new BatchWriteCommand({
            RequestItems: {
              'mvp-labeler-bulk-defects': batch
            }
          });
          
          await docClient.send(batchPutCommand);
        }
        
        console.log(`✅ Added ${defects.length} new defects`);
      }
      
      console.log('✅ AWS DynamoDB updateBulkDefects successful');
      
      return { success: true, error: null };
    } catch (error) {
      console.error('AWS DynamoDB updateBulkDefects error:', error);
      return { success: false, error };
    }
  }

  static async getSelectedImages(userId: string) {
    try {
      console.log('🗄️ AWS DynamoDB getSelectedImages:', userId);
      
      const command = new QueryCommand({
        TableName: 'mvp-labeler-selected-images',
        KeyConditionExpression: 'user_id = :userId',
        ExpressionAttributeValues: {
          ':userId': userId
        }
      });
      
      const result = await docClient.send(command);
      console.log('✅ AWS DynamoDB getSelectedImages result:', result);
      
      return { selectedImages: result.Items || [], error: null };
    } catch (error) {
      console.error('AWS DynamoDB getSelectedImages error:', error);
      return { selectedImages: [], error };
    }
  }

  static async updateSelectedImages(userId: string, selectedImages: any[]) {
    try {
      console.log('🗄️ AWS DynamoDB updateSelectedImages:', userId);
      
      // First, get existing selections to delete them
      const queryCommand = new QueryCommand({
        TableName: 'mvp-labeler-selected-images',
        KeyConditionExpression: 'user_id = :userId',
        ExpressionAttributeValues: {
          ':userId': userId
        }
      });
      
      const existingSelections = await docClient.send(queryCommand);
      
      // Delete existing selections using batch operations
      if (existingSelections.Items && existingSelections.Items.length > 0) {
        const deleteRequests = existingSelections.Items.map(item => ({
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
        
        console.log(`🗑️ Deleted ${existingSelections.Items.length} existing selections`);
      }
      
      // Add new selections using batch operations
      if (selectedImages.length > 0) {
        const putRequests = selectedImages.map((selection, index) => ({
          PutRequest: {
            Item: {
              user_id: userId,
              selection_id: selection.id || `${Date.now()}-${index}`,
              imageId: selection.id,
              fileName: selection.fileName || 'unknown',
              created_at: new Date().toISOString()
            }
          }
        }));
        
        // DynamoDB batch operations are limited to 25 items
        const batchSize = 25;
        for (let i = 0; i < putRequests.length; i += batchSize) {
          const batch = putRequests.slice(i, i + batchSize);
          const batchPutCommand = new BatchWriteCommand({
            RequestItems: {
              'mvp-labeler-selected-images': batch
            }
          });
          
          await docClient.send(batchPutCommand);
        }
        
        console.log(`✅ Added ${selectedImages.length} new selections`);
      }
      
      console.log('✅ AWS DynamoDB updateSelectedImages successful');
      
      return { success: true, error: null };
    } catch (error) {
      console.error('AWS DynamoDB updateSelectedImages error:', error);
      return { success: false, error };
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
      const result = await DatabaseService.getProfile(userId);
      
      if (result.profile) {
        return result.profile;
      }
      
      // Create new profile if doesn't exist
      const newProfile = {
        user_id: userId,
        email: email,
        full_name: '',
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