import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { nanoid } from 'nanoid';
import { VERIFICATION_EMAIL_TEMPLATE, PASSWORD_RESET_EMAIL_TEMPLATE, replaceTemplateVariables } from './emailTemplates';

// AWS Configuration - Only initialize if we're in a Node.js environment
let sesClient: SESClient | null = null;
let dynamoClient: DynamoDBDocumentClient | null = null;

// Check if we're in a browser environment
const IS_BROWSER = typeof window !== 'undefined';

if (!IS_BROWSER) {
  // Only initialize AWS clients in Node.js environment
  sesClient = new SESClient({ region: 'eu-west-2' });
  dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'eu-west-2' }));
}

// Constants
const VERIFICATION_CODE_EXPIRY = 60 * 60 * 1000; // 1 hour in milliseconds
const MAX_ATTEMPTS_PER_HOUR = 3;
const LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutes

// Development mode flag
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

// Email templates are now imported from emailTemplates.ts

// Types
export interface VerificationCode {
  id: string;
  userId: string;
  email: string;
  code: string;
  type: 'verification' | 'password_reset';
  expiresAt: number;
  used: boolean;
  createdAt: number;
}

export interface VerificationResult {
  success: boolean;
  message: string;
  code?: string;
}

// Utility functions
function generateVerificationCode(): string {
  // Generate a 6-digit code with leading zeros
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  return code;
}

// replaceTemplateVariables function is now imported from emailTemplates.ts

// Rate limiting functions
async function checkRateLimit(email: string, type: 'verification' | 'password_reset'): Promise<boolean> {
  try {
    if (IS_BROWSER || !dynamoClient) {
      // In browser environment, skip rate limiting
      return true;
    }

    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    const response = await dynamoClient.send(new QueryCommand({
      TableName: 'mvp-labeler-verification-codes',
      KeyConditionExpression: 'email = :email',
      FilterExpression: 'type = :type AND createdAt > :oneHourAgo',
      ExpressionAttributeValues: {
        ':email': email,
        ':type': type,
        ':oneHourAgo': oneHourAgo
      }
    }));

    return (response.Items?.length || 0) < MAX_ATTEMPTS_PER_HOUR;
  } catch (error) {
    console.error('Error checking rate limit:', error);
    return true; // Allow if we can't check
  }
}

// Main verification service
export class VerificationService {
  // Send verification email
  static async sendVerificationEmail(email: string, userId: string): Promise<VerificationResult> {
    try {
      // Check rate limiting
      const canSend = await checkRateLimit(email, 'verification');
      if (!canSend) {
        return {
          success: false,
          message: 'Too many verification attempts. Please wait before requesting another code.'
        };
      }

      // Generate verification code
      const code = generateVerificationCode();
      const expiresAt = Date.now() + VERIFICATION_CODE_EXPIRY;

      // Store code in DynamoDB (only if not in browser)
      if (!IS_BROWSER && dynamoClient) {
        const verificationCode: VerificationCode = {
          id: nanoid(),
          userId,
          email,
          code,
          type: 'verification',
          expiresAt,
          used: false,
          createdAt: Date.now()
        };

        try {
          await dynamoClient.send(new PutCommand({
            TableName: 'mvp-labeler-verification-codes',
            Item: verificationCode
          }));
        } catch (dbError) {
          console.error('Error storing verification code:', dbError);
          // In development, we'll continue without storing to DB
          if (!IS_DEVELOPMENT) {
            throw dbError;
          }
        }
      }

      // Prepare email content
      const userName = email.split('@')[0]; // Use email prefix as username
      const emailHtml = replaceTemplateVariables(VERIFICATION_EMAIL_TEMPLATE, {
        USER_NAME: userName,
        VERIFICATION_CODE: code
      });

      if (IS_DEVELOPMENT || IS_BROWSER) {
        // In development or browser, just log the email details
        console.log('📧 DEVELOPMENT MODE - Verification Email:');
        console.log('To:', email);
        console.log('Subject: Verify Your Email - Exametry');
        console.log('Code:', code);
        console.log('HTML Preview:', emailHtml.substring(0, 200) + '...');
        
        return {
          success: true,
          message: 'Verification email sent successfully (DEV MODE)',
          code: code // Include code for testing
        };
      } else {
        // In production (Amplify), use SES directly
        if (sesClient) {
          const sendEmailCommand = new SendEmailCommand({
            Source: 'infor@exametry.xyz', // Use the verified email address
            Destination: {
              ToAddresses: [email]
            },
            Message: {
              Subject: {
                Data: 'Verify Your Email - Exametry',
                Charset: 'UTF-8'
              },
              Body: {
                Html: {
                  Data: emailHtml,
                  Charset: 'UTF-8'
                }
              }
            }
          });

          await sesClient.send(sendEmailCommand);

          return {
            success: true,
            message: 'Verification email sent successfully',
            code: code // For testing purposes only
          };
        } else {
          throw new Error('SES client not available');
        }
      }

    } catch (error) {
      console.error('Error sending verification email:', error);
      return {
        success: false,
        message: 'Failed to send verification email. Please try again.'
      };
    }
  }

  // Send password reset email
  static async sendPasswordResetEmail(email: string, userId: string): Promise<VerificationResult> {
    try {
      // Check rate limiting
      const canSend = await checkRateLimit(email, 'password_reset');
      if (!canSend) {
        return {
          success: false,
          message: 'Too many password reset attempts. Please wait before requesting another code.'
        };
      }

      // Generate reset code
      const code = generateVerificationCode();
      const expiresAt = Date.now() + VERIFICATION_CODE_EXPIRY;

      // Store code in DynamoDB (only if not in browser)
      if (!IS_BROWSER && dynamoClient) {
        const resetCode: VerificationCode = {
          id: nanoid(),
          userId,
          email,
          code,
          type: 'password_reset',
          expiresAt,
          used: false,
          createdAt: Date.now()
        };

        try {
          await dynamoClient.send(new PutCommand({
            TableName: 'mvp-labeler-verification-codes',
            Item: resetCode
          }));
        } catch (dbError) {
          console.error('Error storing reset code:', dbError);
          // In development, we'll continue without storing to DB
          if (!IS_DEVELOPMENT) {
            throw dbError;
          }
        }
      }

      // Prepare email content
      const userName = email.split('@')[0];
      const emailHtml = replaceTemplateVariables(PASSWORD_RESET_EMAIL_TEMPLATE, {
        USER_NAME: userName,
        VERIFICATION_CODE: code
      });

      if (IS_DEVELOPMENT || IS_BROWSER) {
        // In development or browser, just log the email details
        console.log('📧 DEVELOPMENT MODE - Password Reset Email:');
        console.log('To:', email);
        console.log('Subject: Reset Your Password - Exametry');
        console.log('Code:', code);
        console.log('HTML Preview:', emailHtml.substring(0, 200) + '...');
        
        return {
          success: true,
          message: 'Password reset email sent successfully (DEV MODE)',
          code: code // Include code for testing
        };
      } else {
        // In production (Amplify), use SES directly
        if (sesClient) {
          const sendEmailCommand = new SendEmailCommand({
            Source: 'infor@exametry.xyz', // Use the verified email address
            Destination: {
              ToAddresses: [email]
            },
            Message: {
              Subject: {
                Data: 'Reset Your Password - Exametry',
                Charset: 'UTF-8'
              },
              Body: {
                Html: {
                  Data: emailHtml,
                  Charset: 'UTF-8'
                }
              }
            }
          });

          await sesClient.send(sendEmailCommand);

          return {
            success: true,
            message: 'Password reset email sent successfully',
            code: code // For testing purposes only
          };
        } else {
          throw new Error('SES client not available');
        }
      }

    } catch (error) {
      console.error('Error sending password reset email:', error);
      return {
        success: false,
        message: 'Failed to send password reset email. Please try again.'
      };
    }
  }

  // Verify code
  static async verifyCode(email: string, code: string, type: 'verification' | 'password_reset'): Promise<VerificationResult> {
    try {
      if (IS_DEVELOPMENT || IS_BROWSER) {
        // In development or browser, accept any 6-digit code for testing
        if (code.length === 6 && /^\d{6}$/.test(code)) {
          console.log('✅ DEVELOPMENT MODE - Code verified successfully');
          return {
            success: true,
            message: type === 'verification' ? 'Email verified successfully!' : 'Password reset code verified successfully!'
          };
        } else {
          return {
            success: false,
            message: 'Invalid verification code format.'
          };
        }
      }

      // Find the verification code (only if not in browser)
      if (!dynamoClient) {
        throw new Error('DynamoDB client not available');
      }

      const response = await dynamoClient.send(new QueryCommand({
        TableName: 'mvp-labeler-verification-codes',
        KeyConditionExpression: 'email = :email',
        FilterExpression: 'code = :code AND type = :type AND used = :used',
        ExpressionAttributeValues: {
          ':email': email,
          ':code': code,
          ':type': type,
          ':used': false
        }
      }));

      if (!response.Items || response.Items.length === 0) {
        return {
          success: false,
          message: 'Invalid or expired verification code.'
        };
      }

      const verificationCode = response.Items[0] as VerificationCode;

      // Check if code has expired
      if (Date.now() > verificationCode.expiresAt) {
        return {
          success: false,
          message: 'Verification code has expired. Please request a new one.'
        };
      }

      // Mark code as used
      await dynamoClient.send(new PutCommand({
        TableName: 'mvp-labeler-verification-codes',
        Item: {
          ...verificationCode,
          used: true
        }
      }));

      return {
        success: true,
        message: type === 'verification' ? 'Email verified successfully!' : 'Password reset code verified successfully!'
      };

    } catch (error) {
      console.error('Error verifying code:', error);
      return {
        success: false,
        message: 'Failed to verify code. Please try again.'
      };
    }
  }

  // Check if account is verified
  static async isAccountVerified(email: string): Promise<boolean> {
    try {
      if (IS_DEVELOPMENT || IS_BROWSER) {
        // In development or browser, assume all accounts are verified
        return true;
      }

      if (!dynamoClient) {
        return false;
      }

      // This would typically check against your user database
      // For now, we'll check if there's a successful verification record
      const response = await dynamoClient.send(new QueryCommand({
        TableName: 'mvp-labeler-verification-codes',
        KeyConditionExpression: 'email = :email',
        FilterExpression: 'type = :type AND used = :used',
        ExpressionAttributeValues: {
          ':email': email,
          ':type': 'verification',
          ':used': true
        }
      }));

      return response.Items && response.Items.length > 0;
    } catch (error) {
      console.error('Error checking account verification:', error);
      return false;
    }
  }

  // Resend verification code
  static async resendVerificationCode(email: string, userId: string): Promise<VerificationResult> {
    return this.sendVerificationEmail(email, userId);
  }

  // Clean up expired codes (can be run periodically)
  static async cleanupExpiredCodes(): Promise<void> {
    try {
      if (IS_BROWSER || !dynamoClient) {
        return; // Skip in browser environment
      }

      const expiredTime = Date.now() - VERIFICATION_CODE_EXPIRY;
      
      // Note: This is a simplified cleanup. In production, you might want to use a scheduled Lambda function
      const response = await dynamoClient.send(new QueryCommand({
        TableName: 'mvp-labeler-verification-codes',
        FilterExpression: 'createdAt < :expiredTime',
        ExpressionAttributeValues: {
          ':expiredTime': expiredTime
        }
      }));

      if (response.Items) {
        for (const item of response.Items) {
          await dynamoClient.send(new DeleteCommand({
            TableName: 'mvp-labeler-verification-codes',
            Key: {
              id: item.id,
              email: item.email
            }
          }));
        }
      }
    } catch (error) {
      console.error('Error cleaning up expired codes:', error);
    }
  }
} 