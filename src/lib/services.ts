// import { Auth, Storage, API } from 'aws-amplify';
import { 
  signInWithEmail as signIn, 
  signUpWithEmail as signUp, 
  signOut, 
  getCurrentUser as getSupabaseUser,
  resetPassword as resetSupabasePassword,
  verifyOTP as verifySupabaseOTP,
  verifyResetOTP as verifySupabaseResetOTP,
  updateUserProfile as updateSupabaseProfile,
  getOrCreateUserProfile as getSupabaseProfile,
  uploadFileWithTimeout as uploadSupabaseFile
} from './supabase';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, DeleteCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { CognitoIdentityProviderClient, InitiateAuthCommand, SignUpCommand, ConfirmSignUpCommand, AdminCreateUserCommand, AdminGetUserCommand, AdminInitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';

// Feature flags to control which service to use
const FEATURE_FLAGS = {
  AUTH_USE_AWS: false, // Temporarily disable AWS Cognito
  STORAGE_USE_AWS: false, // Temporarily disable AWS S3
  PROFILE_USE_AWS: false, // Start with Supabase profile
  DATABASE_USE_AWS: false, // Temporarily disable AWS DynamoDB
};

// Initialize DynamoDB client
const dynamoClient = new DynamoDBClient({
  region: import.meta.env.VITE_AWS_REGION || 'eu-west-2',
  credentials: {
    accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID || '',
    secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY || ''
  }
});

const docClient = DynamoDBDocumentClient.from(dynamoClient);

// Initialize S3 client
const s3Client = new S3Client({
  region: import.meta.env.VITE_AWS_REGION || 'eu-west-2',
  credentials: {
    accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID || '',
    secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY || ''
  }
});

const bucketName = 'mvp-labeler-storage';

// Initialize Cognito client
const cognitoClient = new CognitoIdentityProviderClient({
  region: import.meta.env.VITE_COGNITO_REGION || 'eu-west-2',
  credentials: {
    accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID || '',
    secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY || ''
  }
});

const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID || '';
const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID || '';

// Authentication Service
export class AuthService {
  static async signUpWithEmail(email: string, password: string, fullName?: string) {
    if (FEATURE_FLAGS.AUTH_USE_AWS) {
      try {
        console.log('🔐 Using AWS Cognito for signup');
        
        const signUpCommand = new SignUpCommand({
          ClientId: clientId,
          Username: email,
          Password: password,
          UserAttributes: [
            {
              Name: 'email',
              Value: email
            },
            ...(fullName ? [{
              Name: 'name',
              Value: fullName
            }] : [])
          ]
        });
        
        const response = await cognitoClient.send(signUpCommand);
        
        if (response.UserSub) {
          // Auto-confirm the user for immediate access
          const confirmCommand = new ConfirmSignUpCommand({
            ClientId: clientId,
            Username: email,
            ConfirmationCode: '123456' // Mock confirmation code
          });
          
          try {
            await cognitoClient.send(confirmCommand);
            console.log('✅ User auto-confirmed');
          } catch (confirmError) {
            console.log('⚠️ Auto-confirmation failed, user will need manual confirmation');
          }
          
          return {
            user: {
              id: response.UserSub,
              email: email,
              user_metadata: { full_name: fullName }
            },
            error: null
          };
        }
        
        return { user: null, error: 'Signup failed' };
      } catch (error) {
        console.error('AWS Cognito signup error:', error);
        return { user: null, error };
      }
    } else {
      return signUpWithEmail(email, password, fullName);
    }
  }

  static async signInWithEmail(email: string, password: string) {
    if (FEATURE_FLAGS.AUTH_USE_AWS) {
      try {
        console.log('🔐 Using AWS Cognito for signin');
        
        const authCommand = new AdminInitiateAuthCommand({
          AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
          UserPoolId: userPoolId,
          ClientId: clientId,
          AuthParameters: {
            USERNAME: email,
            PASSWORD: password
          }
        });
        
        const response = await cognitoClient.send(authCommand);
        
        if (response.AuthenticationResult?.AccessToken) {
          // Get user details
          const getUserCommand = new AdminGetUserCommand({
            UserPoolId: userPoolId,
            Username: email
          });
          
          const userResponse = await cognitoClient.send(getUserCommand);
          
          return {
            user: {
              id: userResponse.User?.Username || '',
              email: email,
              user_metadata: {
                full_name: userResponse.User?.Attributes?.find(attr => attr.Name === 'name')?.Value
              }
            },
            session: {
              access_token: response.AuthenticationResult.AccessToken,
              refresh_token: response.AuthenticationResult.RefreshToken
            },
            error: null
          };
        }
        
        return { user: null, session: null, error: 'Authentication failed' };
      } catch (error) {
        console.error('AWS Cognito signin error:', error);
        return { user: null, session: null, error };
      }
    } else {
      return signInWithEmail(email, password);
    }
  }

  static async signOut() {
    if (FEATURE_FLAGS.AUTH_USE_AWS) {
      try {
        // Temporarily disabled AWS functionality
        console.log('AWS Auth temporarily disabled');
        return { error: new Error('AWS Auth temporarily disabled') };
      } catch (error) {
        return { error };
      }
    } else {
      return signOut();
    }
  }

  static async getCurrentUser() {
    if (FEATURE_FLAGS.AUTH_USE_AWS) {
      try {
        console.log('🔐 Using AWS Cognito for current user');
        // For now, return null - we'll implement token validation later
        return { user: null, error: null };
      } catch (error) {
        console.error('AWS Cognito getCurrentUser error:', error);
        return { user: null, error };
      }
    } else {
      return getSupabaseUser();
    }
  }

  static async resetPassword(email: string) {
    if (FEATURE_FLAGS.AUTH_USE_AWS) {
      try {
        // Temporarily disabled AWS functionality
        console.log('AWS Auth temporarily disabled');
        return { error: new Error('AWS Auth temporarily disabled') };
      } catch (error) {
        return { error };
      }
    } else {
      return resetSupabasePassword(email);
    }
  }

  static async verifyOTP(email: string, otp: string) {
    if (FEATURE_FLAGS.AUTH_USE_AWS) {
      try {
        // Temporarily disabled AWS functionality
        console.log('AWS Auth temporarily disabled');
        return { error: new Error('AWS Auth temporarily disabled') };
      } catch (error) {
        return { error };
      }
    } else {
      return verifySupabaseOTP(email, otp);
    }
  }

  static async verifyResetOTP(email: string, otp: string, newPassword: string) {
    if (FEATURE_FLAGS.AUTH_USE_AWS) {
      try {
        // Temporarily disabled AWS functionality
        console.log('AWS Auth temporarily disabled');
        return { error: new Error('AWS Auth temporarily disabled') };
      } catch (error) {
        return { error };
      }
    } else {
      return verifySupabaseResetOTP(email, otp, newPassword);
    }
  }
}

// Storage Service
export class StorageService {
  static async uploadFile(file: File, filePath: string) {
    if (FEATURE_FLAGS.STORAGE_USE_AWS) {
      try {
        console.log('🗄️ Using AWS S3 for storage');
        
        const command = new PutObjectCommand({
          Bucket: bucketName,
          Key: filePath,
          Body: file,
          ContentType: file.type,
          CacheControl: 'max-age=31536000' // 1 year cache
        });
        
        await s3Client.send(command);
        
        // Generate signed URL for immediate access
        const getCommand = new GetObjectCommand({
          Bucket: bucketName,
          Key: filePath
        });
        
        const signedUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 }); // 1 hour
        
        return { url: signedUrl, error: null };
      } catch (error) {
        console.error('AWS S3 upload error:', error);
        return { url: null, error };
      }
    } else {
      return uploadSupabaseFile(file, filePath);
    }
  }

  static async getFileUrl(filePath: string) {
    if (FEATURE_FLAGS.STORAGE_USE_AWS) {
      try {
        console.log('🗄️ Getting file URL from AWS S3');
        
        const command = new GetObjectCommand({
          Bucket: bucketName,
          Key: filePath
        });
        
        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour
        return { url: signedUrl, error: null };
      } catch (error) {
        console.error('AWS S3 getFileUrl error:', error);
        return { url: null, error };
      }
    } else {
      // For Supabase, we return the filePath as it's already a URL
      return { url: filePath, error: null };
    }
  }

  static async deleteFile(filePath: string) {
    if (FEATURE_FLAGS.STORAGE_USE_AWS) {
      try {
        console.log('🗄️ Deleting file from AWS S3');
        
        const command = new DeleteObjectCommand({
          Bucket: bucketName,
          Key: filePath
        });
        
        await s3Client.send(command);
        return { success: true, error: null };
      } catch (error) {
        console.error('AWS S3 delete error:', error);
        return { success: false, error };
      }
    } else {
      // For Supabase, we would call the storage delete method
      return { success: true, error: null };
    }
  }
}

// Profile Service
export class ProfileService {
  static async updateProfile(userId: string, updates: any) {
    if (FEATURE_FLAGS.PROFILE_USE_AWS) {
      try {
        // For AWS, we'll use API calls to update profile
        // This will be implemented when we add GraphQL API
        return { error: null };
      } catch (error) {
        return { error };
      }
    } else {
      return updateSupabaseProfile(userId, updates);
    }
  }

  static async getProfile(userId: string, email: string) {
    if (FEATURE_FLAGS.PROFILE_USE_AWS) {
      try {
        // For AWS, we'll use API calls to get profile
        // This will be implemented when we add GraphQL API
        return { profile: null, error: null };
      } catch (error) {
        return { profile: null, error };
      }
    } else {
      return getSupabaseProfile(userId, email);
    }
  }
}

// Database Service
export class DatabaseService {
  static async getProfile(userId: string) {
    if (FEATURE_FLAGS.DATABASE_USE_AWS) {
      try {
        console.log('🗄️ Using AWS DynamoDB for profile');
        const command = new GetCommand({
          TableName: import.meta.env.VITE_DYNAMODB_PROFILES_TABLE || 'profiles',
          Key: { user_id: userId }
        });
        const response = await docClient.send(command);
        return { profile: response.Item, error: null };
      } catch (error) {
        console.error('AWS DynamoDB getProfile error:', error);
        return { profile: null, error };
      }
    } else {
      return getSupabaseProfile(userId, ''); // Supabase fallback
    }
  }

  static async updateProfile(userId: string, profileData: any) {
    if (FEATURE_FLAGS.DATABASE_USE_AWS) {
      try {
        console.log('🗄️ Using AWS DynamoDB for profile update');
        const command = new PutCommand({
          TableName: import.meta.env.VITE_DYNAMODB_PROFILES_TABLE || 'profiles',
          Item: {
            user_id: userId,
            ...profileData,
            updated_at: new Date().toISOString()
          }
        });
        await docClient.send(command);
        return { success: true, error: null };
      } catch (error) {
        console.error('AWS DynamoDB updateProfile error:', error);
        return { success: false, error };
      }
    } else {
      return updateSupabaseProfile(userId, profileData); // Supabase fallback
    }
  }

  static async getProject(userId: string, projectId: string) {
    if (FEATURE_FLAGS.DATABASE_USE_AWS) {
      try {
        console.log('🗄️ Using AWS DynamoDB for project');
        const command = new GetCommand({
          TableName: import.meta.env.VITE_DYNAMODB_PROJECTS_TABLE || 'projects',
          Key: { 
            user_id: userId,
            project_id: projectId
          }
        });
        const response = await docClient.send(command);
        return { project: response.Item, error: null };
      } catch (error) {
        console.error('AWS DynamoDB getProject error:', error);
        return { project: null, error };
      }
    } else {
      return getSupabaseProject(userId, projectId); // Supabase fallback
    }
  }

  static async updateProject(userId: string, projectId: string, projectData: any) {
    if (FEATURE_FLAGS.DATABASE_USE_AWS) {
      try {
        console.log('🗄️ Using AWS DynamoDB for project update');
        const command = new PutCommand({
          TableName: import.meta.env.VITE_DYNAMODB_PROJECTS_TABLE || 'projects',
          Item: {
            user_id: userId,
            project_id: projectId,
            ...projectData,
            updated_at: new Date().toISOString()
          }
        });
        await docClient.send(command);
        return { success: true, error: null };
      } catch (error) {
        console.error('AWS DynamoDB updateProject error:', error);
        return { success: false, error };
      }
    } else {
      return updateSupabaseProject(userId, projectId, projectData); // Supabase fallback
    }
  }

  static async getBulkDefects(userId: string) {
    if (FEATURE_FLAGS.DATABASE_USE_AWS) {
      try {
        console.log('🗄️ Using AWS DynamoDB for bulk defects');
        const command = new QueryCommand({
          TableName: import.meta.env.VITE_DYNAMODB_BULK_DEFECTS_TABLE || 'bulk_defects',
          KeyConditionExpression: 'user_id = :userId',
          ExpressionAttributeValues: { ':userId': userId }
        });
        const response = await docClient.send(command);
        return { defects: response.Items || [], error: null };
      } catch (error) {
        console.error('AWS DynamoDB getBulkDefects error:', error);
        return { defects: [], error };
      }
    } else {
      return getSupabaseBulkDefects(userId); // Supabase fallback
    }
  }

  static async updateBulkDefects(userId: string, defects: any[]) {
    if (FEATURE_FLAGS.DATABASE_USE_AWS) {
      try {
        console.log('🗄️ Using AWS DynamoDB for bulk defects update');
        const promises = defects.map(defect => {
          const command = new PutCommand({
            TableName: import.meta.env.VITE_DYNAMODB_BULK_DEFECTS_TABLE || 'bulk_defects',
            Item: {
              user_id: userId,
              defect_id: defect.id || Date.now().toString(),
              ...defect,
              updated_at: new Date().toISOString()
            }
          });
          return docClient.send(command);
        });
        await Promise.all(promises);
        return { success: true, error: null };
      } catch (error) {
        console.error('AWS DynamoDB updateBulkDefects error:', error);
        return { success: false, error };
      }
    } else {
      return updateSupabaseBulkDefects(userId, defects); // Supabase fallback
    }
  }

  static async getDefectSets(userId: string) {
    if (FEATURE_FLAGS.DATABASE_USE_AWS) {
      try {
        console.log('🗄️ Using AWS DynamoDB for defect sets');
        const command = new QueryCommand({
          TableName: import.meta.env.VITE_DYNAMODB_DEFECT_SETS_TABLE || 'defect_sets',
          KeyConditionExpression: 'user_id = :userId',
          ExpressionAttributeValues: { ':userId': userId }
        });
        const response = await docClient.send(command);
        return { defectSets: response.Items || [], error: null };
      } catch (error) {
        console.error('AWS DynamoDB getDefectSets error:', error);
        return { defectSets: [], error };
      }
    } else {
      return getSupabaseDefectSets(userId); // Supabase fallback
    }
  }

  static async saveDefectSet(userId: string, defectSet: any) {
    if (FEATURE_FLAGS.DATABASE_USE_AWS) {
      try {
        console.log('🗄️ Using AWS DynamoDB for defect set save');
        const command = new PutCommand({
          TableName: import.meta.env.VITE_DYNAMODB_DEFECT_SETS_TABLE || 'defect_sets',
          Item: {
            user_id: userId,
            set_id: defectSet.id || Date.now().toString(),
            ...defectSet,
            updated_at: new Date().toISOString()
          }
        });
        await docClient.send(command);
        return { success: true, error: null };
      } catch (error) {
        console.error('AWS DynamoDB saveDefectSet error:', error);
        return { success: false, error };
      }
    } else {
      return saveSupabaseDefectSet(userId, defectSet); // Supabase fallback
    }
  }

  static async getPdfState(userId: string, pdfId: string) {
    if (FEATURE_FLAGS.DATABASE_USE_AWS) {
      try {
        console.log('🗄️ Using AWS DynamoDB for PDF state');
        const command = new GetCommand({
          TableName: import.meta.env.VITE_DYNAMODB_USER_PDF_STATE_TABLE || 'user_pdf_state',
          Key: { 
            user_id: userId,
            pdf_id: pdfId
          }
        });
        const response = await docClient.send(command);
        return { pdfState: response.Item, error: null };
      } catch (error) {
        console.error('AWS DynamoDB getPdfState error:', error);
        return { pdfState: null, error };
      }
    } else {
      return getSupabasePdfState(userId, pdfId); // Supabase fallback
    }
  }

  static async updatePdfState(userId: string, pdfId: string, pdfState: any) {
    if (FEATURE_FLAGS.DATABASE_USE_AWS) {
      try {
        console.log('🗄️ Using AWS DynamoDB for PDF state update');
        const command = new PutCommand({
          TableName: import.meta.env.VITE_DYNAMODB_USER_PDF_STATE_TABLE || 'user_pdf_state',
          Item: {
            user_id: userId,
            pdf_id: pdfId,
            ...pdfState,
            updated_at: new Date().toISOString()
          }
        });
        await docClient.send(command);
        return { success: true, error: null };
      } catch (error) {
        console.error('AWS DynamoDB updatePdfState error:', error);
        return { success: false, error };
      }
    } else {
      return updateSupabasePdfState(userId, pdfId, pdfState); // Supabase fallback
    }
  }

  static async getFeedback(userId: string) {
    if (FEATURE_FLAGS.DATABASE_USE_AWS) {
      try {
        console.log('🗄️ Using AWS DynamoDB for feedback');
        const command = new QueryCommand({
          TableName: import.meta.env.VITE_DYNAMODB_FEEDBACK_TABLE || 'feedback',
          KeyConditionExpression: 'user_id = :userId',
          ExpressionAttributeValues: { ':userId': userId }
        });
        const response = await docClient.send(command);
        return { feedback: response.Items || [], error: null };
      } catch (error) {
        console.error('AWS DynamoDB getFeedback error:', error);
        return { feedback: [], error };
      }
    } else {
      return getSupabaseFeedback(userId); // Supabase fallback
    }
  }

  static async saveFeedback(userId: string, feedback: any) {
    if (FEATURE_FLAGS.DATABASE_USE_AWS) {
      try {
        console.log('🗄️ Using AWS DynamoDB for feedback save');
        const command = new PutCommand({
          TableName: import.meta.env.VITE_DYNAMODB_FEEDBACK_TABLE || 'feedback',
          Item: {
            user_id: userId,
            feedback_id: feedback.id || Date.now().toString(),
            ...feedback,
            created_at: new Date().toISOString()
          }
        });
        await docClient.send(command);
        return { success: true, error: null };
      } catch (error) {
        console.error('AWS DynamoDB saveFeedback error:', error);
        return { success: false, error };
      }
    } else {
      return saveSupabaseFeedback(userId, feedback); // Supabase fallback
    }
  }

  static async clearUserProject(userId: string, projectId: string) {
    if (FEATURE_FLAGS.DATABASE_USE_AWS) {
      try {
        console.log('🗄️ Using AWS DynamoDB for project clear');
        const command = new DeleteCommand({
          TableName: import.meta.env.VITE_DYNAMODB_PROJECTS_TABLE || 'projects',
          Key: { 
            user_id: userId,
            project_id: projectId
          }
        });
        await docClient.send(command);
        return { success: true, error: null };
      } catch (error) {
        console.error('AWS DynamoDB clearUserProject error:', error);
        return { success: false, error };
      }
    } else {
      return clearSupabaseUserProject(userId, projectId); // Supabase fallback
    }
  }
}

// Service Manager to control feature flags
export class ServiceManager {
  static enableAWSFeature(feature: keyof typeof FEATURE_FLAGS) {
    FEATURE_FLAGS[feature] = true;
    console.log(`Enabled AWS for feature: ${feature}`);
  }

  static disableAWSFeature(feature: keyof typeof FEATURE_FLAGS) {
    FEATURE_FLAGS[feature] = false;
    console.log(`Disabled AWS for feature: ${feature}`);
  }

  static getFeatureFlags() {
    return { ...FEATURE_FLAGS };
  }

  static isUsingAWS(feature: keyof typeof FEATURE_FLAGS) {
    return FEATURE_FLAGS[feature];
  }
} 