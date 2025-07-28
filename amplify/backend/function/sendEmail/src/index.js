const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

const sesClient = new SESClient({ region: 'eu-west-2' });

exports.handler = async (event) => {
  try {
    const { email, userId, code, emailHtml, type } = JSON.parse(event.body);
    
    console.log('Sending email:', { email, userId, code, type });
    
    // Determine subject based on type
    const subject = type === 'verification' 
      ? 'Verify Your Email - Exametry'
      : 'Reset Your Password - Exametry';
    
    // Send email via SES
    const sendEmailCommand = new SendEmailCommand({
      Source: 'noreply@exametry.xyz', // Replace with your verified domain
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
    
    console.log('Email sent successfully to:', email);
    
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