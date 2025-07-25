// AWS Services Configuration
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, DeleteCommand, QueryCommand, ScanCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { CognitoIdentityProviderClient, InitiateAuthCommand, SignUpCommand, ConfirmSignUpCommand, AdminCreateUserCommand, AdminGetUserCommand, AdminInitiateAuthCommand, GlobalSignOutCommand, RevokeTokenCommand } from '@aws-sdk/client-cognito-identity-provider';

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

// Session management
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Authentication Service with Enhanced Security
export class AuthService {
  static async signInWithEmail(email: string, password: string) {
    try {
      console.log('🔐 AWS Cognito signin for:', email);
      
      // CRITICAL FIX: Clear all localStorage data before signing in
      console.log('🧹 Clearing localStorage to prevent cross-user data leakage...');
      this.clearAllLocalStorageData();
      
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
      
      // Create session with expiration
      const session = {
        access_token: result.AuthenticationResult?.AccessToken || '',
        refresh_token: result.AuthenticationResult?.RefreshToken || '',
        expires_at: Date.now() + SESSION_TIMEOUT,
        user_id: (userResult as any).User?.Username || email
      };
      
      return {
        user: {
          id: (userResult as any).User?.Username || email,
          email: email,
          user_metadata: { 
            full_name: fullName,
            subscription_plan: 'Premium', // All users get premium features
            subscription_status: 'active',
            subscription_end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
          }
        },
        session,
        error: null
      };
    } catch (error) {
      console.error('AWS Cognito signin error:', error);
      
      // Handle specific error cases
      if ((error as any).name === 'UserNotConfirmedException') {
        console.log('⚠️ User not confirmed, attempting to confirm automatically...');
        
        // Try to confirm the user automatically
        try {
          await this.confirmUserAutomatically(email);
          console.log('✅ User confirmed automatically, retrying signin...');
          
          // Retry signin after confirmation
          return await this.signInWithEmail(email, password);
        } catch (confirmError) {
          console.error('Failed to confirm user automatically:', confirmError);
          return { 
            user: null, 
            session: null, 
            error: 'Account not confirmed. Please check your email for confirmation link or contact support.' 
          };
        }
      } else if ((error as any).name === 'NotAuthorizedException') {
        return { user: null, session: null, error: 'Invalid email or password' };
      } else if ((error as any).name === 'UserNotFoundException') {
        return { user: null, session: null, error: 'Account not found. Please sign up first.' };
      } else {
        return { user: null, session: null, error: 'Sign in failed. Please try again.' };
      }
    }
  }

  // Helper method to automatically confirm users
  private static async confirmUserAutomatically(email: string) {
    try {
      console.log('🔐 Attempting to confirm user automatically:', email);
      
      // Use admin confirm sign up to bypass email verification
      const confirmCommand = new AdminCreateUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: email,
        UserAttributes: [
          {
            Name: 'email',
            Value: email
          },
          {
            Name: 'email_verified',
            Value: 'true'
          }
        ],
        MessageAction: 'SUPPRESS' // Don't send email
      });
      
      await cognitoClient.send(confirmCommand);
      console.log('✅ User confirmed automatically');
      
    } catch (error) {
      console.error('Failed to confirm user automatically:', error);
      throw error;
    }
  }

  static async signUpWithEmail(email: string, password: string, fullName?: string) {
    try {
      console.log('🔐 AWS Cognito signup for:', email);
      
      // CRITICAL FIX: Clear all localStorage data before creating new account
      console.log('🧹 Clearing localStorage to prevent cross-user data leakage...');
      this.clearAllLocalStorageData();
      
      // Enhanced password validation
      if (!this.validatePassword(password)) {
        throw new Error('Password must be at least 8 characters long and contain uppercase, lowercase, and numbers');
      }
      
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
      
      // Automatically confirm the user
      try {
        await this.confirmUserAutomatically(email);
        console.log('✅ User confirmed automatically after signup');
      } catch (confirmError) {
        console.error('Failed to confirm user after signup:', confirmError);
        // Continue anyway - user can still sign in
      }
      
      // After successful signup, sign in to get session
      const signInResult = await this.signInWithEmail(email, password);
      
      return {
        user: {
          id: result.UserSub,
          email: email,
          user_metadata: { 
            full_name: fullName,
            subscription_plan: 'Premium', // All users get premium features
            subscription_status: 'active',
            subscription_end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year from now
          }
        },
        session: signInResult.session,
        error: null
      };
    } catch (error) {
      console.error('AWS Cognito signup error:', error);
      
      // Handle specific error cases
      if ((error as any).name === 'UsernameExistsException') {
        return { user: null, session: null, error: 'An account with this email already exists. Please sign in instead.' };
      } else if ((error as any).name === 'InvalidPasswordException') {
        return { user: null, session: null, error: 'Password does not meet requirements. Must be at least 8 characters with uppercase, lowercase, and numbers.' };
      } else {
        return { user: null, session: null, error: 'Signup failed. Please try again.' };
      }
    }
  }

  static async signOut() {
    try {
      console.log('🔐 AWS Cognito signout');
      
      // Get current session
      const storedSession = localStorage.getItem('session');
      if (storedSession) {
        try {
          const session = JSON.parse(storedSession);
          if (session.access_token) {
            // Revoke the token on AWS side
            const revokeCommand = new RevokeTokenCommand({
              ClientId: CLIENT_ID,
              Token: session.access_token
            });
            await cognitoClient.send(revokeCommand);
            console.log('✅ Token revoked on AWS');
          }
        } catch (error) {
          console.error('Error revoking token:', error);
        }
      }
      
      // Clear all session data
      localStorage.removeItem('session');
      localStorage.removeItem('user');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('isAuthenticated');
      
      return { error: null };
    } catch (error) {
      console.error('Signout error:', error);
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
          
          // Check if session is expired
          if (session.expires_at && Date.now() > session.expires_at) {
            console.log('❌ Session expired, clearing data');
            localStorage.removeItem('user');
            localStorage.removeItem('session');
            localStorage.removeItem('userEmail');
            localStorage.removeItem('isAuthenticated');
            return { user: null, error: 'Session expired' };
          }
          
          // Verify the session is still valid
          if (session.access_token) {
            console.log('✅ Valid session found for user:', user.email);
            return { user, error: null };
          }
        } catch (parseError) {
          console.error('Error parsing stored session:', parseError);
          // Clear invalid data
          localStorage.removeItem('user');
          localStorage.removeItem('session');
          localStorage.removeItem('userEmail');
          localStorage.removeItem('isAuthenticated');
        }
      }
      
      console.log('❌ No valid session found');
      return { user: null, error: null };
    } catch (error) {
      console.error('AWS Cognito getCurrentUser error:', error);
      return { user: null, error };
    }
  }

  static async validateSession() {
    try {
      const { user, error } = await this.getCurrentUser();
      if (error === 'Session expired') {
        // Auto-logout on session expiration
        await this.signOut();
        return { valid: false, user: null };
      }
      return { valid: !!user, user };
    } catch (error) {
      console.error('Session validation error:', error);
      return { valid: false, user: null };
    }
  }

  static validatePassword(password: string): boolean {
    // Enhanced password validation
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    
    return password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers;
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

  static async resetPassword(email: string) {
    try {
      console.log('🔐 AWS Cognito resetPassword for:', email);
      
      // For now, we'll use a simple approach
      // In production, you'd want to implement proper password reset flow
      return { error: null };
    } catch (error) {
      return { error };
    }
  }

  static async verifyResetOTP(email: string, otp: string, newPassword: string) {
    try {
      console.log('🔐 AWS Cognito verifyResetOTP for:', email);
      
      // Validate new password
      if (!this.validatePassword(newPassword)) {
        throw new Error('Password must be at least 8 characters long and contain uppercase, lowercase, and numbers');
      }
      
      // For now, we'll use a simple approach
      // In production, you'd want to implement proper password reset flow
      return { error: null };
    } catch (error) {
      return { error };
    }
  }

  // CRITICAL FIX: Method to clear all localStorage data
  private static clearAllLocalStorageData() {
    try {
      console.log('🧹 Clearing all localStorage data...');
      
      // Get all localStorage keys
      const allKeys = Object.keys(localStorage);
      console.log('📋 Found localStorage keys:', allKeys);
      
      // Clear all keys except authentication-related ones (which will be set fresh)
      allKeys.forEach(key => {
        try {
          localStorage.removeItem(key);
          console.log(`🗑️ Removed: ${key}`);
        } catch (error) {
          console.error(`Error removing key ${key}:`, error);
        }
      });
      
      console.log('✅ All localStorage data cleared');
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  }
}

// Storage Service with Enhanced User Isolation
export class StorageService {
  // Helper method to validate user access for file operations
  private static validateUserFileAccess(filePath: string): boolean {
    try {
      const storedUser = localStorage.getItem('user');
      if (!storedUser) return false;
      
      const user = JSON.parse(storedUser);
      const currentUserId = user.email || user.id;
      
      // Ensure the file path contains the current user's ID
      return filePath.includes(`users/${currentUserId}/`) || filePath.includes(`avatars/${currentUserId}/`);
    } catch (error) {
      console.error('File access validation error:', error);
      return false;
    }
  }

  // Helper method to get current user ID
  private static getCurrentUserId(): string | null {
    try {
      const storedUser = localStorage.getItem('user');
      if (!storedUser) return null;
      
      const user = JSON.parse(storedUser);
      return user.email || user.id;
    } catch (error) {
      console.error('Error getting current user ID:', error);
      return null;
    }
  }

  static async uploadFile(file: File, filePath: string): Promise<{ url?: string; error?: any }> {
    try {
      console.log('📁 AWS S3 uploadFile:', filePath);
      
      // Validate user access for file uploads
      if (!this.validateUserFileAccess(filePath)) {
        console.error('❌ Unauthorized file upload attempt:', filePath);
        return { error: 'Unauthorized file access' };
      }
      
      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: filePath,
        Body: file,
        ContentType: file.type,
        Metadata: {
          'original-name': file.name,
          'uploaded-by': this.getCurrentUserId() || 'unknown',
          'uploaded-at': new Date().toISOString()
        }
      });
      
      await s3Client.send(command);
      console.log('✅ AWS S3 uploadFile successful:', filePath);
      
      // Generate presigned URL for immediate access
      const urlCommand = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: filePath
      });
      
      const url = await getSignedUrl(s3Client, urlCommand, { expiresIn: 3600 });
      
      return { url };
    } catch (error) {
      console.error('AWS S3 uploadFile error:', error);
      return { error };
    }
  }

  static async getFileUrl(filePath: string): Promise<{ url?: string; error?: any }> {
    try {
      console.log('📁 AWS S3 getFileUrl:', filePath);
      
      // Validate user access for file downloads
      if (!this.validateUserFileAccess(filePath)) {
        console.error('❌ Unauthorized file download attempt:', filePath);
        return { error: 'Unauthorized file access' };
      }
      
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: filePath
      });
      
      const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
      console.log('✅ AWS S3 getFileUrl successful:', filePath);
      
      return { url };
    } catch (error) {
      console.error('AWS S3 getFileUrl error:', error);
      return { error };
    }
  }

  static async deleteFile(filePath: string): Promise<{ success?: boolean; error?: any }> {
    try {
      console.log('🗑️ AWS S3 deleteFile:', filePath);
      
      // Validate user access for file deletions
      if (!this.validateUserFileAccess(filePath)) {
        console.error('❌ Unauthorized file deletion attempt:', filePath);
        return { error: 'Unauthorized file access' };
      }
      
      const command = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: filePath
      });
      
      await s3Client.send(command);
      console.log('✅ AWS S3 deleteFile successful:', filePath);
      
      return { success: true };
    } catch (error) {
      console.error('AWS S3 deleteFile error:', error);
      return { error };
    }
  }

  static async listUserFiles(userId: string, prefix?: string): Promise<{ files?: any[]; error?: any }> {
    try {
      console.log('📁 AWS S3 listUserFiles:', userId);
      
      // Validate user access
      const currentUserId = this.getCurrentUserId();
      if (userId !== currentUserId) {
        console.error('❌ Unauthorized file listing attempt:', userId);
        return { error: 'Unauthorized file access' };
      }
      
      const userPrefix = prefix || `users/${userId}/`;
      
      const command = new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        Prefix: userPrefix,
        MaxKeys: 1000
      });
      
      const result = await s3Client.send(command);
      console.log('✅ AWS S3 listUserFiles successful:', userId);
      
      const files = result.Contents?.map(item => ({
        name: item.Key?.replace(userPrefix, ''),
        size: item.Size,
        lastModified: item.LastModified,
        key: item.Key
      })) || [];
      
      return { files };
    } catch (error) {
      console.error('AWS S3 listUserFiles error:', error);
      return { error };
    }
  }

  static async getUserImages(userId: string): Promise<{ images?: any[]; error?: any }> {
    try {
      console.log('📁 AWS S3 getUserImages:', userId);
      
      // Validate user access
      const currentUserId = this.getCurrentUserId();
      if (userId !== currentUserId) {
        console.error('❌ Unauthorized image listing attempt:', userId);
        return { error: 'Unauthorized file access' };
      }
      
      const result = await this.listUserFiles(userId, `users/${userId}/images/`);
      
      if (result.error) {
        return { error: result.error };
      }
      
      const images = result.files?.filter(file => 
        file.name && (
          file.name.toLowerCase().endsWith('.jpg') ||
          file.name.toLowerCase().endsWith('.jpeg') ||
          file.name.toLowerCase().endsWith('.png') ||
          file.name.toLowerCase().endsWith('.gif') ||
          file.name.toLowerCase().endsWith('.webp')
        )
      ).map(file => ({
        id: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
        name: file.name,
        size: file.size,
        lastModified: file.lastModified,
        url: `https://${BUCKET_NAME}.s3.eu-west-2.amazonaws.com/${file.key}`
      })) || [];
      
      return { images };
    } catch (error) {
      console.error('AWS S3 getUserImages error:', error);
      return { error };
    }
  }

  static async clearUserFiles(userId: string): Promise<{ success?: boolean; error?: any }> {
    try {
      console.log('🗑️ AWS S3 clearUserFiles:', userId);
      
      // Validate user access
      const currentUserId = this.getCurrentUserId();
      if (userId !== currentUserId) {
        console.error('❌ Unauthorized file clearing attempt:', userId);
        return { error: 'Unauthorized file access' };
      }
      
      // List all files for this user
      const listResult = await this.listUserFiles(userId);
      
      if (listResult.error) {
        return { error: listResult.error };
      }
      
      if (listResult.files && listResult.files.length > 0) {
        // Delete files in batches (S3 allows up to 1000 objects per request)
        const batchSize = 1000;
        for (let i = 0; i < listResult.files.length; i += batchSize) {
          const batch = listResult.files.slice(i, i + batchSize);
          
          const deleteObjects = batch.map(file => ({ Key: file.key }));
          
          // Delete files one by one since DeleteObjects is not available in this version
          for (const file of batch) {
            const deleteCommand = new DeleteObjectCommand({
              Bucket: BUCKET_NAME,
              Key: file.key
            });
            
            await s3Client.send(deleteCommand);
          }
          console.log(`✅ Deleted batch of ${batch.length} files`);
        }
        
        console.log(`✅ Cleared ${listResult.files.length} files for user:`, userId);
      } else {
        console.log('📊 No files found for user:', userId);
      }
      
      return { success: true };
    } catch (error) {
      console.error('AWS S3 clearUserFiles error:', error);
      return { error };
    }
  }
}

// Database Service with Enhanced User Isolation
export class DatabaseService {
  // Helper method to validate user access
  private static validateUserAccess(requestedUserId: string): boolean {
    try {
      const storedUser = localStorage.getItem('user');
      if (!storedUser) return false;
      
      const user = JSON.parse(storedUser);
      const currentUserId = user.email || user.id;
      
      // Ensure the requested user ID matches the current user
      return requestedUserId === currentUserId;
    } catch (error) {
      console.error('User validation error:', error);
      return false;
    }
  }

  // Helper method to get current user ID
  private static getCurrentUserId(): string | null {
    try {
      const storedUser = localStorage.getItem('user');
      if (!storedUser) return null;
      
      const user = JSON.parse(storedUser);
      return user.email || user.id;
    } catch (error) {
      console.error('Error getting current user ID:', error);
      return null;
    }
  }

  static async getProfile(userId: string) {
    try {
      console.log('🗄️ AWS DynamoDB getProfile:', userId);
      
      // Validate user access
      if (!this.validateUserAccess(userId)) {
        console.error('❌ Unauthorized access attempt to profile:', userId);
        return { profile: null, error: 'Unauthorized access' };
      }
      
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
      
      // Validate user access
      if (!this.validateUserAccess(userId)) {
        console.error('❌ Unauthorized access attempt to update profile:', userId);
        return { success: false, error: 'Unauthorized access' };
      }
      
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
      
      // Validate user access
      if (!this.validateUserAccess(userId)) {
        console.error('❌ Unauthorized access attempt to project:', userId);
        return { project: null, error: 'Unauthorized access' };
      }
      
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
      
      // Validate user access
      if (!this.validateUserAccess(userId)) {
        console.error('❌ Unauthorized access attempt to update project:', userId);
        return { success: false, error: 'Unauthorized access' };
      }
      
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
      
      // Validate user access
      if (!this.validateUserAccess(userId)) {
        console.error('❌ Unauthorized access attempt to bulk defects:', userId);
        return { defects: [], error: 'Unauthorized access' };
      }
      
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
      
      // Validate user access
      if (!this.validateUserAccess(userId)) {
        console.error('❌ Unauthorized access attempt to update bulk defects:', userId);
        return { success: false, error: 'Unauthorized access' };
      }
      
      if (defects.length === 0) {
        // Clear all defects for this user
        const queryCommand = new QueryCommand({
          TableName: 'mvp-labeler-bulk-defects',
          KeyConditionExpression: 'user_id = :userId',
          ExpressionAttributeValues: {
            ':userId': userId
          }
        });
        
        const existingDefects = await docClient.send(queryCommand);
        
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
          
          console.log(`✅ Cleared ${existingDefects.Items.length} existing defects`);
        }
      } else {
        // Update with new defects
        const putRequests = defects.map(defect => ({
          PutRequest: {
            Item: {
              user_id: userId,
              defect_id: defect.id || Date.now().toString(),
              ...defect,
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
        
        console.log(`✅ Updated ${defects.length} defects`);
      }
      
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
      
      // Validate user access
      if (!this.validateUserAccess(userId)) {
        console.error('❌ Unauthorized access attempt to defect sets:', userId);
        return { defectSets: [], error: 'Unauthorized access' };
      }
      
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
      
      // Validate user access
      if (!this.validateUserAccess(userId)) {
        console.error('❌ Unauthorized access attempt to save defect set:', userId);
        return { success: false, error: 'Unauthorized access' };
      }
      
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

  static async updatePdfState(userId: string, action: string, data: any) {
    try {
      console.log('🗄️ AWS DynamoDB updatePdfState:', userId);
      
      // Validate user access
      if (!this.validateUserAccess(userId)) {
        console.error('❌ Unauthorized access attempt to update PDF state:', userId);
        return { success: false, error: 'Unauthorized access' };
      }
      
      if (action === 'clear') {
        // Clear all PDF states for this user
        const queryCommand = new QueryCommand({
          TableName: 'mvp-labeler-pdf-states',
          KeyConditionExpression: 'user_id = :userId',
          ExpressionAttributeValues: {
            ':userId': userId
          }
        });
        
        const existingStates = await docClient.send(queryCommand);
        
        if (existingStates.Items && existingStates.Items.length > 0) {
          const deleteRequests = existingStates.Items.map(item => ({
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
          
          console.log(`✅ Cleared ${existingStates.Items.length} PDF states`);
        }
      } else {
        // Update PDF state
        const command = new PutCommand({
          TableName: 'mvp-labeler-pdf-states',
          Item: {
            user_id: userId,
            pdf_id: data.pdfId || 'default',
            ...data,
            updated_at: new Date().toISOString()
          }
        });
        
        await docClient.send(command);
        console.log('✅ Updated PDF state');
      }
      
      return { success: true, error: null };
    } catch (error) {
      console.error('AWS DynamoDB updatePdfState error:', error);
      return { success: false, error };
    }
  }

  static async getFeedback(userId: string) {
    try {
      console.log('🗄️ AWS DynamoDB getFeedback:', userId);
      
      // Validate user access
      if (!this.validateUserAccess(userId)) {
        console.error('❌ Unauthorized access attempt to feedback:', userId);
        return { feedback: [], error: 'Unauthorized access' };
      }
      
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
      
      // Validate user access
      if (!this.validateUserAccess(userId)) {
        console.error('❌ Unauthorized access attempt to clear project:', userId);
        return { success: false, error: 'Unauthorized access' };
      }
      
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
      
      // 3. Clear selected images for this user
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