// Email Templates for OTP Verification and Password Reset

export const VERIFICATION_EMAIL_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Verification - Exametry</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .email-container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            overflow: hidden;
            max-width: 500px;
            width: 100%;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 28px;
            font-weight: 600;
            margin-bottom: 10px;
        }
        
        .header p {
            font-size: 16px;
            opacity: 0.9;
        }
        
        .content {
            padding: 40px 30px;
            text-align: center;
        }
        
        .verification-code {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            font-size: 32px;
            font-weight: bold;
            padding: 20px;
            border-radius: 15px;
            margin: 30px 0;
            letter-spacing: 8px;
            display: inline-block;
            min-width: 200px;
        }
        
        .message {
            color: #333;
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 20px;
        }
        
        .warning {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 10px;
            padding: 15px;
            margin: 20px 0;
            color: #856404;
        }
        
        .footer {
            background: #f8f9fa;
            padding: 30px;
            text-align: center;
            color: #666;
            font-size: 14px;
        }
        
        .footer a {
            color: #667eea;
            text-decoration: none;
            font-weight: 600;
        }
        
        .footer a:hover {
            text-decoration: underline;
        }
        
        .logo {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        
        @media (max-width: 600px) {
            .email-container {
                margin: 10px;
                border-radius: 15px;
            }
            
            .header, .content, .footer {
                padding: 20px;
            }
            
            .verification-code {
                font-size: 24px;
                letter-spacing: 4px;
                padding: 15px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo">🚀 Exametry</div>
            <h1>Email Verification</h1>
            <p>Complete your registration</p>
        </div>
        
        <div class="content">
            <p class="message">
                Hi <strong>{{USER_NAME}}</strong>,<br><br>
                Thank you for signing up with Exametry! To complete your registration, please use the verification code below:
            </p>
            
            <div class="verification-code">
                {{VERIFICATION_CODE}}
            </div>
            
            <p class="message">
                This verification code will expire in <strong>1 hour</strong>.<br>
                Please enter this code in the verification page to activate your account.
            </p>
            
            <div class="warning">
                <strong>⚠️ Security Notice:</strong><br>
                If you didn't request this verification code, please ignore this email and contact our support team immediately.
            </div>
        </div>
        
        <div class="footer">
            <p><strong>Need help?</strong></p>
            <p>Contact our support team at <a href="mailto:infor@exametry.xyz">infor@exametry.xyz</a></p>
            <br>
            <p>Thank you for choosing Exametry!</p>
            <p><strong>The Exametry Team</strong></p>
        </div>
    </div>
</body>
</html>
`;

export const PASSWORD_RESET_EMAIL_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset - Exametry</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .email-container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            overflow: hidden;
            max-width: 500px;
            width: 100%;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 28px;
            font-weight: 600;
            margin-bottom: 10px;
        }
        
        .header p {
            font-size: 16px;
            opacity: 0.9;
        }
        
        .content {
            padding: 40px 30px;
            text-align: center;
        }
        
        .verification-code {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            font-size: 32px;
            font-weight: bold;
            padding: 20px;
            border-radius: 15px;
            margin: 30px 0;
            letter-spacing: 8px;
            display: inline-block;
            min-width: 200px;
        }
        
        .message {
            color: #333;
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 20px;
        }
        
        .warning {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 10px;
            padding: 15px;
            margin: 20px 0;
            color: #856404;
        }
        
        .footer {
            background: #f8f9fa;
            padding: 30px;
            text-align: center;
            color: #666;
            font-size: 14px;
        }
        
        .footer a {
            color: #667eea;
            text-decoration: none;
            font-weight: 600;
        }
        
        .footer a:hover {
            text-decoration: underline;
        }
        
        .logo {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        
        @media (max-width: 600px) {
            .email-container {
                margin: 10px;
                border-radius: 15px;
            }
            
            .header, .content, .footer {
                padding: 20px;
            }
            
            .verification-code {
                font-size: 24px;
                letter-spacing: 4px;
                padding: 15px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo">🔒 Exametry</div>
            <h1>Password Reset</h1>
            <p>Secure your account</p>
        </div>
        
        <div class="content">
            <p class="message">
                Hi <strong>{{USER_NAME}}</strong>,<br><br>
                We received a request to reset your password. To proceed with the password reset, please use the verification code below:
            </p>
            
            <div class="verification-code">
                {{VERIFICATION_CODE}}
            </div>
            
            <p class="message">
                This verification code will expire in <strong>1 hour</strong>.<br>
                Please enter this code in the password reset page to continue.
            </p>
            
            <div class="warning">
                <strong>⚠️ Security Notice:</strong><br>
                If you didn't request this password reset, please ignore this email and contact our support team immediately.
            </div>
        </div>
        
        <div class="footer">
            <p><strong>Need help?</strong></p>
            <p>Contact our support team at <a href="mailto:infor@exametry.xyz">infor@exametry.xyz</a></p>
            <br>
            <p>Stay secure!</p>
            <p><strong>The Exametry Team</strong></p>
        </div>
    </div>
</body>
</html>
`;

// Utility function to replace template variables
export function replaceTemplateVariables(template: string, variables: Record<string, string>): string {
    let result = template;
    Object.entries(variables).forEach(([key, value]) => {
        result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });
    return result;
} 