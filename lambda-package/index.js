const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { nanoid } = require('nanoid');

// AWS Configuration
const sesClient = new SESClient({ region: 'eu-west-2' });
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'eu-west-2' }));

// Email templates
const VERIFICATION_EMAIL_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email - Exametry</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            background: rgba(255, 255, 255, 0.95);
            border-radius: 20px;
            padding: 40px;
            max-width: 500px;
            width: 90%;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .logo {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo img {
            width: 80px;
            height: auto;
            filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1));
        }
        h1 {
            color: #2d3748;
            text-align: center;
            margin-bottom: 10px;
            font-size: 28px;
            font-weight: 700;
        }
        .subtitle {
            color: #718096;
            text-align: center;
            margin-bottom: 30px;
            font-size: 16px;
        }
        .verification-box {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 15px;
            padding: 30px;
            text-align: center;
            margin: 30px 0;
            color: white;
        }
        .verification-code {
            font-size: 48px;
            font-weight: 700;
            letter-spacing: 8px;
            margin: 20px 0;
            text-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
            background: rgba(255, 255, 255, 0.1);
            padding: 20px;
            border-radius: 10px;
            display: inline-block;
        }
        .instructions {
            color: #4a5568;
            line-height: 1.6;
            margin: 30px 0;
            font-size: 16px;
        }
        .button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 25px;
            font-weight: 600;
            margin: 20px 0;
            transition: transform 0.3s ease;
        }
        .button:hover {
            transform: translateY(-2px);
        }
        .footer {
            text-align: center;
            color: #718096;
            font-size: 14px;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
        }
        .security-note {
            background: #f7fafc;
            border-left: 4px solid #667eea;
            padding: 15px;
            margin: 20px 0;
            border-radius: 5px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">
            <img src="https://exametry.xyz/feather-logo.svg" alt="Exametry Logo">
        </div>
        
        <h1>Welcome to Exametry! 🎉</h1>
        <p class="subtitle">Please verify your email address to complete your registration</p>
        
        <div class="verification-box">
            <h2 style="margin: 0 0 20px 0; font-size: 20px;">Your Verification Code</h2>
            <div class="verification-code">{{VERIFICATION_CODE}}</div>
            <p style="margin: 0; font-size: 14px; opacity: 0.9;">Enter this code in the app to verify your account</p>
        </div>
        
        <div class="instructions">
            <p><strong>Hello {{USER_NAME}},</strong></p>
            <p>Thank you for signing up for Exametry! To complete your registration and start using our image metadata platform, please enter the verification code above in the app.</p>
            
            <div class="security-note">
                <strong>🔒 Security Note:</strong> This code will expire in 1 hour for your security. If you didn't request this verification, please ignore this email.
            </div>
        </div>
        
        <div style="text-align: center;">
            <a href="https://exametry.xyz" class="button">Open Exametry App</a>
        </div>
        
        <div class="footer">
            <p>This email was sent to {{EMAIL}} for account verification.</p>
            <p>If you have any questions, please contact our support team.</p>
            <p>&copy; 2024 Exametry. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
`;

const PASSWORD_RESET_EMAIL_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password - Exametry</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            background: rgba(255, 255, 255, 0.95);
            border-radius: 20px;
            padding: 40px;
            max-width: 500px;
            width: 90%;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .logo {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo img {
            width: 80px;
            height: auto;
            filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1));
        }
        h1 {
            color: #2d3748;
            text-align: center;
            margin-bottom: 10px;
            font-size: 28px;
            font-weight: 700;
        }
        .subtitle {
            color: #718096;
            text-align: center;
            margin-bottom: 30px;
            font-size: 16px;
        }
        .verification-box {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 15px;
            padding: 30px;
            text-align: center;
            margin: 30px 0;
            color: white;
        }
        .verification-code {
            font-size: 48px;
            font-weight: 700;
            letter-spacing: 8px;
            margin: 20px 0;
            text-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
            background: rgba(255, 255, 255, 0.1);
            padding: 20px;
            border-radius: 10px;
            display: inline-block;
        }
        .instructions {
            color: #4a5568;
            line-height: 1.6;
            margin: 30px 0;
            font-size: 16px;
        }
        .button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 25px;
            font-weight: 600;
            margin: 20px 0;
            transition: transform 0.3s ease;
        }
        .button:hover {
            transform: translateY(-2px);
        }
        .footer {
            text-align: center;
            color: #718096;
            font-size: 14px;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
        }
        .security-note {
            background: #f7fafc;
            border-left: 4px solid #667eea;
            padding: 15px;
            margin: 20px 0;
            border-radius: 5px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">
            <img src="https://exametry.xyz/feather-logo.svg" alt="Exametry Logo">
        </div>
        
        <h1>Reset Your Password 🔐</h1>
        <p class="subtitle">Use the code below to reset your password</p>
        
        <div class="verification-box">
            <h2 style="margin: 0 0 20px 0; font-size: 20px;">Your Reset Code</h2>
            <div class="verification-code">{{VERIFICATION_CODE}}</div>
            <p style="margin: 0; font-size: 14px; opacity: 0.9;">Enter this code in the app to reset your password</p>
        </div>
        
        <div class="instructions">
            <p><strong>Hello {{USER_NAME}},</strong></p>
            <p>We received a request to reset your password for your Exametry account. Use the verification code above to complete the password reset process.</p>
            
            <div class="security-note">
                <strong>🔒 Security Note:</strong> This code will expire in 1 hour. If you didn't request this password reset, please ignore this email and your password will remain unchanged.
            </div>
        </div>
        
        <div style="text-align: center;">
            <a href="https://exametry.xyz" class="button">Open Exametry App</a>
        </div>
        
        <div class="footer">
            <p>This email was sent to {{EMAIL}} for password reset.</p>
            <p>If you have any questions, please contact our support team.</p>
            <p>&copy; 2024 Exametry. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
`;

// Utility function to replace template variables
function replaceTemplateVariables(template, variables) {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return result;
}

// Generate verification code
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Main Lambda handler
exports.handler = async (event) => {
  try {
    const { action, email, userId, code, type } = JSON.parse(event.body);
    
    switch (action) {
      case 'sendVerificationEmail':
        return await sendVerificationEmail(email, userId);
      case 'sendPasswordResetEmail':
        return await sendPasswordResetEmail(email, userId);
      case 'verifyCode':
        return await verifyCode(email, code, type);
      default:
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'POST, OPTIONS'
          },
          body: JSON.stringify({ error: 'Invalid action' })
        };
    }
  } catch (error) {
    console.error('Lambda error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

// Send verification email
async function sendVerificationEmail(email, userId) {
  try {
    const code = generateVerificationCode();
    const expiresAt = Date.now() + (60 * 60 * 1000); // 1 hour
    
    // Store code in DynamoDB
    const verificationCode = {
      id: nanoid(),
      userId,
      email,
      code,
      type: 'verification',
      expiresAt,
      used: false,
      createdAt: Date.now()
    };
    
    await dynamoClient.send(new PutCommand({
      TableName: 'mvp-labeler-verification-codes',
      Item: verificationCode
    }));
    
    // Prepare email content
    const userName = email.split('@')[0];
    const emailHtml = replaceTemplateVariables(VERIFICATION_EMAIL_TEMPLATE, {
      USER_NAME: userName,
      VERIFICATION_CODE: code,
      EMAIL: email
    });
    
    // Send email via SES
    const sendEmailCommand = new SendEmailCommand({
      Source: 'noreply@exametry.xyz',
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
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        success: true,
        message: 'Verification email sent successfully'
      })
    };
  } catch (error) {
    console.error('Error sending verification email:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        success: false,
        message: 'Failed to send verification email'
      })
    };
  }
}

// Send password reset email
async function sendPasswordResetEmail(email, userId) {
  try {
    const code = generateVerificationCode();
    const expiresAt = Date.now() + (60 * 60 * 1000); // 1 hour
    
    // Store code in DynamoDB
    const resetCode = {
      id: nanoid(),
      userId,
      email,
      code,
      type: 'password_reset',
      expiresAt,
      used: false,
      createdAt: Date.now()
    };
    
    await dynamoClient.send(new PutCommand({
      TableName: 'mvp-labeler-verification-codes',
      Item: resetCode
    }));
    
    // Prepare email content
    const userName = email.split('@')[0];
    const emailHtml = replaceTemplateVariables(PASSWORD_RESET_EMAIL_TEMPLATE, {
      USER_NAME: userName,
      VERIFICATION_CODE: code,
      EMAIL: email
    });
    
    // Send email via SES
    const sendEmailCommand = new SendEmailCommand({
      Source: 'noreply@exametry.xyz',
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
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        success: true,
        message: 'Password reset email sent successfully'
      })
    };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        success: false,
        message: 'Failed to send password reset email'
      })
    };
  }
}

// Verify code
async function verifyCode(email, code, type) {
  try {
    // Find the verification code
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
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS'
        },
        body: JSON.stringify({
          success: false,
          message: 'Invalid or expired verification code'
        })
      };
    }
    
    const verificationCode = response.Items[0];
    
    // Check if code has expired
    if (Date.now() > verificationCode.expiresAt) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS'
        },
        body: JSON.stringify({
          success: false,
          message: 'Verification code has expired'
        })
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
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        success: true,
        message: type === 'verification' ? 'Email verified successfully!' : 'Password reset code verified successfully!'
      })
    };
  } catch (error) {
    console.error('Error verifying code:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        success: false,
        message: 'Failed to verify code'
      })
    };
  }
} 