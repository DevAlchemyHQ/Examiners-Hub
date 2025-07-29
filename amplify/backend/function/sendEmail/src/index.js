const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

const sesClient = new SESClient({ region: 'eu-west-2' });

exports.handler = async (event) => {
  try {
    // Parse the request body
    const body = JSON.parse(event.body);
    const { email, userId, type, code, userName } = body;

    // Email templates (simplified versions)
    const verificationEmailTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Email Verification - Exametry</title>
        <style>
          body { font-family: Arial, sans-serif; background: #0a0a0a; color: #ffffff; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px; }
          .content { background: #1a1a1a; padding: 30px; border-radius: 10px; margin-top: 20px; }
          .code { font-size: 32px; font-weight: bold; color: #667eea; text-align: center; padding: 20px; background: #2a2a2a; border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #888; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Email Verification</h1>
          </div>
          <div class="content">
            <h2>Hello ${userName}!</h2>
            <p>Thank you for signing up with Exametry. Please use the verification code below to complete your registration:</p>
            <div class="code">${code}</div>
            <p>This code will expire in 1 hour for security reasons.</p>
            <p>If you didn't request this verification, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>© 2024 Exametry. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const passwordResetTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Password Reset - Exametry</title>
        <style>
          body { font-family: Arial, sans-serif; background: #0a0a0a; color: #ffffff; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px; }
          .content { background: #1a1a1a; padding: 30px; border-radius: 10px; margin-top: 20px; }
          .code { font-size: 32px; font-weight: bold; color: #667eea; text-align: center; padding: 20px; background: #2a2a2a; border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #888; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔑 Password Reset</h1>
          </div>
          <div class="content">
            <h2>Hello ${userName}!</h2>
            <p>You requested a password reset for your Exametry account. Please use the code below to reset your password:</p>
            <div class="code">${code}</div>
            <p>This code will expire in 1 hour for security reasons.</p>
            <p>If you didn't request this reset, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>© 2024 Exametry. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Choose template based on type
    const emailHtml = type === 'verification' ? verificationEmailTemplate : passwordResetTemplate;
    const subject = type === 'verification' ? 'Verify Your Email - Exametry' : 'Reset Your Password - Exametry';

    // Send email via SES
    const sendEmailCommand = new SendEmailCommand({
      Source: 'infor@exametry.xyz',
      Destination: {
        ToAddresses: [email]
      },
      Message: {
        Subject: {
          Data: subject,
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
        message: 'Email sent successfully'
      })
    };

  } catch (error) {
    console.error('Error sending email:', error);
    
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
        message: 'Failed to send email',
        error: error.message
      })
    };
  }
}; 